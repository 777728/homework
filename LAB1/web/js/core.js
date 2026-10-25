/* ============================================================================
 *  core.js —— 播放器 / 源码面板 / 画布 / 实验注册
 *  页面里的四个实验共用这一套骨架：
 *    1) Player  负责“自动循环 + 单步 + 倍速 + 进度条”
 *    2) CodePanel 负责“真实源码 + 行号 + 人工核心代码标注 + 高亮滚动”
 *    3) CanvasView 负责 2D 画布的自适应与重绘
 *    4) mountLab 把三者接到一起
 * ==========================================================================*/

const WB = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------------- 源码加载（带缓存，只取一次） ---------------- */
  const srcCache = new Map();

  async function fetchText(path) {
    if (srcCache.has(path)) return srcCache.get(path);
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${path} 读取失败 (${res.status})`);
    const text = await res.text();
    srcCache.set(path, text);
    return text;
  }

  /* ---------------- 源码面板 ---------------- */
  class CodePanel {
    constructor(root, files) {
      this.root = root;                 // .code-pane
      this.scroll = $('[data-code]', root);
      this.tabs = $('[data-files]', root);
      this.foot = $('[data-codefoot]', root);
      this.files = files;               // [{key,path,label,note}]
      this.byKey = new Map(files.map(f => [f.key, f]));
      this.byPath = new Map(files.map(f => [f.path, f.key]));
      this.rendered = new Map();        // key -> rows[]
      this.activeKey = null;
      this.activeLine = -1;
      this.buildTabs();
    }

    buildTabs() {
      this.tabs.innerHTML = '';
      this.files.forEach(f => {
        const b = document.createElement('button');
        b.className = 'file-tab';
        b.textContent = f.label;
        b.title = f.path;
        b.addEventListener('click', () => this.show(f.key));
        b.dataset.key = f.key;
        this.tabs.appendChild(b);
      });
    }

    async show(keyOrPath) {
      /* 允许直接传源码路径（步骤里带的是 file 路径），也允许传文件 key */
      const key = this.byPath.get(keyOrPath) || keyOrPath;
      if (!this.byKey.has(key)) return;
      if (this.activeKey === key && this.rendered.has(key)) return;
      this.activeKey = key;
      $$('.file-tab', this.tabs).forEach(b => b.classList.toggle('is-active', b.dataset.key === key));

      if (!this.rendered.has(key)) {
        const file = this.byKey.get(key);
        const text = await fetchText(file.path);
        this.rendered.set(key, this.renderSource(text, file));
        if (this.activeKey !== key) return;   // 用户已切走
      }

      this.scroll.innerHTML = '';
      const frag = document.createDocumentFragment();
      const head = document.createElement('div');
      head.className = 'code-file-head';
      head.textContent = this.byKey.get(key).path;
      frag.appendChild(head);
      this.rendered.get(key).nodes.forEach(n => frag.appendChild(n));
      this.scroll.appendChild(frag);

      const file = this.byKey.get(key);
      if (this.foot) {
        this.foot.textContent = `${file.path} · ${this.rendered.get(key).total} 行 · ${file.note || ''}`;
      }
      if (this.activeLine > 0) this.highlight(this.activeLine, true);
    }

    /** 把源码文本变成带行号、带人工标注的 DOM（只做一次） */
    renderSource(text, file) {
      const lines = text.replace(/\t/g, '    ').replace(/\s+$/, '').split('\n');
      const annots = (WB.ANNOT && WB.ANNOT[file.path]) || [];
      const nodes = [];
      let coreCount = 0;

      const kindAt = (n) => {
        let hit = null;
        for (const a of annots) if (n >= a.from && n <= a.to) hit = a;
        return hit;
      };

      lines.forEach((line, i) => {
        const n = i + 1;
        const a = kindAt(n);
        if (a && a.kind === 'core') coreCount++;

        if (a && a.from === n) {
          const tag = document.createElement('div');
          tag.className = 'code-tagline ' + a.kind;
          tag.innerHTML = `<b>${a.kind === 'core' ? '人工编写 · 核心算法' : a.kind === 'data' ? '人工整理 · 数据' : '人工编写 · 配套'}</b> — ${a.label}`;
          nodes.push(tag);
        }

        const row = document.createElement('div');
        row.className = 'code-row' + (a ? ' gutter-' + a.kind + ' is-' + a.kind : '');
        row.dataset.line = n;

        const ln = document.createElement('span');
        ln.className = 'ln';
        ln.textContent = String(n);

        const lc = document.createElement('span');
        lc.className = 'lc';
        lc.textContent = line.length ? line : ' ';

        row.append(ln, lc);
        nodes.push(row);
      });

      return { nodes, total: lines.length, coreCount, annots };
    }

    async highlight(line, force = false) {
      if (!force && line === this.activeLine) return;
      this.activeLine = line;

      const rows = this.scroll.querySelectorAll('.code-row');
      rows.forEach(r => r.classList.toggle('is-active', Number(r.dataset.line) === line));

      const row = this.scroll.querySelector(`.code-row[data-line="${line}"]`);
      if (!row) return;

      const top = row.offsetTop - this.scroll.clientHeight * 0.42;
      this.scroll.scrollTop = clamp(top, 0, this.scroll.scrollHeight);
    }

    /** 某一行属于哪个函数（用于底部信息） */
    functionAt(line) {
      const key = this.activeKey;      if (!key) return '';
      const file = this.byKey.get(key);
      const annots = (WB.ANNOT && WB.ANNOT[file.path]) || [];
      const hit = annots.find(a => line >= a.from && line <= a.to);
      return hit ? hit.label : '';
    }
  }

  /* ---------------- 播放器 ---------------- */
  const BASE_MS = 520;

  class Player {
    constructor(shell, handlers = {}) {
      this.shell = shell;
      this.onStep = handlers.onStep || (() => {});
      this.onTick = handlers.onTick || (() => {});
      this.onEnd = handlers.onEnd || (() => {});
      this.steps = [];
      this.index = -1;
      this.playing = false;
      this.loop = true;
      this.speed = 1.15;
      this.timer = 0;
      this.build();
    }

    build() {
      const bar = $('[data-playbar]', this.shell) || $('.playbar', this.shell);
      bar.innerHTML = `
        <button class="pb-btn primary" data-act="toggle">▶ 播放</button>
        <button class="pb-btn" data-act="prev">◀ 上一步</button>
        <button class="pb-btn" data-act="next">下一步 ▶</button>
        <button class="pb-btn" data-act="replay">↺ 重播</button>
        <span class="pb-sep"></span>
        <div class="pb-progress" data-act="seek"><i></i></div>
        <span class="pb-count">0 / 0</span>
        <span class="pb-sep"></span>
        <label class="pb-speed">速度 <input type="range" min="0.4" max="3" step="0.1" value="1.15"></label>
        <button class="pb-btn is-on" data-act="loop" title="循环播放">∞ 循环</button>
      `;

      this.toggleBtn = $('[data-act="toggle"]', bar);
      this.progress = $('.pb-progress i', bar);
      this.count = $('.pb-count', bar);
      this.speedInput = $('.pb-speed input', bar);
      this.loopBtn = $('[data-act="loop"]', bar);

      bar.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'toggle') this.toggle();
        if (act === 'prev') this.prev();
        if (act === 'next') this.next();
        if (act === 'replay') this.replay();
        if (act === 'loop') this.setLoop(!this.loop);
        if (act === 'seek') {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
          this.seek(Math.round(ratio * (this.steps.length - 1)));
        }
      });

      this.speedInput.addEventListener('input', (e) => this.setSpeed(Number(e.target.value)));
    }

    load(steps, opts = {}) {
      this.pause();
      this.steps = steps;
      this.index = -1;
      this.autoStart = opts.autostart !== false;
      this.count.textContent = `0 / ${steps.length}`;
      this.progress.style.width = '0%';
      if (this.autoStart) this.play();
    }

    setSpeed(x) {
      this.speed = x;
      if (this.speedInput) this.speedInput.value = String(x);
      if (this.playing) { this.pause(); this.play(); }
    }

    setLoop(v) {
      this.loop = v;
      this.loopBtn.classList.toggle('is-on', v);
      this.loopBtn.textContent = v ? '∞ 循环' : '→ 单次';
    }

    play() {
      if (!this.steps.length) return;
      if (this.index >= this.steps.length - 1) this.index = -1;
      this.playing = true;
      this.toggleBtn.textContent = '❚❚ 暂停';
      this.shell.classList.add('is-playing');
      this.step();
    }

    pause() {
      this.playing = false;
      clearTimeout(this.timer);
      this.timer = 0;
      if (this.toggleBtn) this.toggleBtn.textContent = '▶ 播放';
      this.shell.classList.remove('is-playing');
    }

    toggle() { this.playing ? this.pause() : this.play(); }

    next() {
      if (this.index < this.steps.length - 1) this.seek(this.index + 1);
      else if (this.loop) this.seek(0);
    }

    prev() { this.seek(Math.max(0, this.index - 1)); }

    replay() { this.seek(0); if (!this.playing) this.play(); }

    seek(i) {
      this.index = clamp(i, 0, this.steps.length - 1);
      const step = this.steps[this.index];
      this.onStep(step, this.index);
      this.count.textContent = `${this.index + 1} / ${this.steps.length}`;
      this.progress.style.width = `${((this.index + 1) / this.steps.length) * 100}%`;
      this.onTick(step, this.index);

      if (this.playing) {
        clearTimeout(this.timer);
        const delay = Math.max(60, BASE_MS * (step.hold || 1) / this.speed);
        this.timer = setTimeout(() => {
          if (!this.playing) return;
          if (this.index >= this.steps.length - 1) {
            if (this.loop) { this.index = -1; this.step(); }
            else { this.pause(); this.onEnd(); }
          } else {
            this.step();
          }
        }, delay);
      }
    }

    step() {
      if (!this.playing) return;
      this.seek(this.index + 1);
    }
  }

  /* ---------------- 画布 ---------------- */
  class CanvasView {
    constructor(host, draw) {
      this.host = host;
      this.canvas = host.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.draw = draw;
      this.w = 0;
      this.h = 0;
      this.dpr = 1;
      this.dirty = false;

      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(host);
      this.resize();
    }

    resize() {
      const rect = this.host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = rect.width;
      this.h = rect.height;
      this.canvas.width = Math.round(rect.width * this.dpr);
      this.canvas.height = Math.round(rect.height * this.dpr);
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.requestDraw();
    }

    requestDraw() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.clearRect(0, 0, this.w, this.h);
        this.draw(this.ctx, this.w, this.h);
      });
    }
  }

  /* ---------------- 2D 绘图小工具（漫画风） ---------------- */
  const P = {
    ink: '#1b2230',
    red: '#d8453c',
    blue: '#2f6fb5',
    cyan: '#2a9d97',
    amber: '#d99b24',
    green: '#3f8f5f',
    pink: '#e08aa4',
    paper: '#fffdf5',
    muted: '#6d7583',

    /** 墨线描边 + 平涂的圆角矩形（漫画分镜常用画法） */
    box(ctx, x, y, w, h, { fill = '#fff', stroke = P.ink, lw = 1.6, r = 6, shadow = 0 } = {}) {
      ctx.save();
      if (shadow) {
        ctx.fillStyle = 'rgba(27,34,48,.16)';
        roundRect(ctx, x + shadow, y + shadow, w, h, r);
        ctx.fill();
      }
      ctx.beginPath();
      roundRect(ctx, x, y, w, h, r);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
      ctx.restore();
    },

    arrow(ctx, x1, y1, x2, y2, { color = P.ink, lw = 1.6, head = 6, dash = null } = {}) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(a - 0.42), y2 - head * Math.sin(a - 0.42));
      ctx.lineTo(x2 - head * Math.cos(a + 0.42), y2 - head * Math.sin(a + 0.42));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    text(ctx, str, x, y, { size = 12, weight = 500, color = P.ink, align = 'left', baseline = 'middle', mono = false } = {}) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = `${weight} ${size}px ${mono ? 'ui-monospace, Menlo, monospace' : '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'}`;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(str, x, y);
      ctx.restore();
    },

    /** 网点填充（漫画灰网） */
    halftone(ctx, x, y, w, h, { gap = 5, r = 0.9, color = 'rgba(27,34,48,.22)' } = {}) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = color;
      for (let yy = y; yy < y + h; yy += gap) {
        for (let xx = x + ((yy / gap) % 2 ? gap / 2 : 0); xx < x + w; xx += gap) {
          ctx.beginPath();
          ctx.arc(xx, yy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  };

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* ---------------- 实验挂载 ---------------- */
  const labs = new Map();

  function mountLab(config) {
    const id = config.id;
    const section = document.getElementById('lab-' + id);
    const shell = $('.player-shell', section);
    const view = new CanvasView($(`[data-canvas="${id}"]`), (ctx, w, h) => {
      const lab = labs.get(id);
      if (lab && lab.render) lab.render(ctx, w, h);
    });

    const code = new CodePanel($(`[data-code="${id}"]`).closest('.code-pane'), config.files);

    const player = new Player(shell, {
      onStep: (step, index) => {
        const lab = labs.get(id);
        if (!lab) return;
        if (step.file && step.file !== code.activeKey) code.show(step.file);
        code.highlight(step.line);
        const tag = $(`[data-tag="${id}"]`);
        const desc = $(`[data-desc="${id}"]`);
        if (tag) tag.textContent = 'STEP ' + (index + 1);
        if (desc) desc.textContent = step.desc || '';
        if (lab.onStepLocal) lab.onStepLocal(step, index);
        view.requestDraw();
      },
    });

    const lab = {
      id, section, shell, view, code, player, config,
      stepNo: 0,
      render: null,
      onStepLocal: null,
      mods: {},
      mode: null,
      async setMode(mode) {
        if (this.mode === mode) return;
        this.mode = mode;
        $$(`[data-modes="${id}"] .mode`).forEach(b => b.classList.toggle('is-active', b.dataset.mode === mode));
        const mod = this.mods[mode];
        if (!mod) return;
        const built = await mod.build();
        this.onStepLocal = built.onStep || null;
        this.render = built.render;
        if (built.files && built.files.length) await this.code.show(built.files[0]);
        this.player.load(built.steps, { autostart: true });
        view.requestDraw();
        if (mod.after) mod.after();
      },
      async start() {
        if (!this.mode) {
          const first = $(`[data-modes="${id}"] .mode`);
          await this.setMode(first ? first.dataset.mode : Object.keys(this.mods)[0]);
        } else {
          this.player.play();
        }
      },
    };

    lab.mods = config.modes(lab, view);
    labs.set(id, lab);

    $$(`[data-modes="${id}"] .mode`).forEach(btn => {
      btn.addEventListener('click', () => lab.setMode(btn.dataset.mode));
    });

    /* 全屏：整块“可视化 + 源码 + 控制条”一起放大，动画继续循环 */
    const fsBtn = $('.fs-btn', shell);
    if (fsBtn) {
      fsBtn.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await shell.requestFullscreen();
        } catch (err) { console.warn('全屏失败', err); }
      });
    }
    document.addEventListener('fullscreenchange', () => {
      setTimeout(() => {
        view.resize();
        if (lab.onResize) lab.onResize();
      }, 60);
    });

    return lab;
  }

  /* ---------------- 顶部选项卡 ---------------- */
  function setupTabs(registry) {
    const tabs = $$('#tabs .tab');
    const activate = (rawId) => {
      const id = Number(rawId);
      tabs.forEach(t => t.classList.toggle('is-active', Number(t.dataset.lab) === id));
      $$('.lab').forEach(sec => sec.classList.toggle('is-active', sec.id === 'lab-' + id));
      registry.forEach(l => { if (l.id !== id) l.player.pause(); });
      const lab = registry.find(l => l.id === id);
      if (lab) setTimeout(() => lab.start(), 60);
    };
    tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.lab)));
    return activate;
  }

  return { $, $$, clamp, fetchText, CodePanel, Player, CanvasView, P, mountLab, setupTabs, labs, BASE_MS };
})();
