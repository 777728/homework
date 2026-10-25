/* ============================================================================
 *  lab2.js —— 实验二：迷宫求解（链表栈 + DFS 回溯，2D）
 *  步骤完全按 lab2/maze_solver.cpp 的 do-while 骨架推进。
 * ==========================================================================*/

(() => {
  const P = WB.P;
  const FILE = 'src/lab2/maze_solver.cpp';

  const FILES = [
    { key: 'maze', path: FILE, label: 'maze_solver.cpp', note: 'MazePath 主循环，人工编写 86 行' },
    { key: 'stack', path: 'src/lab2/link_stack.cpp', label: 'link_stack.cpp', note: '链表栈 Push/Pop' },
    { key: 'type', path: 'src/lab2/maze_type.h', label: 'maze_type.h', note: '迷宫与栈元素类型' }
  ];

  const ROWS = 11;
  const COLS = 15;

  /* ---------------- 随机数与迷宫生成（与课程要求一致：二维数组 + 0/1） ---------------- */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeMaze(rows, cols, seed) {
    const g = Array.from({ length: rows }, () => Array(cols).fill(1));
    const rnd = mulberry32(seed);
    const stack = [[1, 1]];
    g[1][1] = 0;

    const dirs = [[0, 2], [2, 0], [0, -2], [-2, 0]];

    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      // Fisher-Yates，用固定种子保证每次刷新同一张图
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }
      let moved = false;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && g[nr][nc] === 1) {
          g[r + dr / 2][c + dc / 2] = 0;
          g[nr][nc] = 0;
          stack.push([nr, nc]);
          moved = true;
          break;
        }
      }
      if (!moved) stack.pop();
    }
    return g;
  }

  const STEP_DIR = { 1: [0, 1], 2: [1, 0], 3: [0, -1], 4: [-1, 0] };
  const DIR_NAME = { 1: '东', 2: '南', 3: '西', 4: '北' };

  function buildMazeSteps() {
    const R = ROWS, C = COLS;
    const base = makeMaze(R, C, 20251019);
    const start = { r: 1, c: 1 };
    const end = { r: R - 2, c: C - 2 };

    const cells = base.map(row => row.slice());   // 0 通路 1 墙 2 足迹 3 死路 4 最终路径
    const steps = [];
    const stack = [];

    const st = {
      cells: cells.map(r => r.slice()),
      stack: [],
      cur: { ...start },
      curstep: 1,
      found: false,
      phase: 'init',
      dirTried: 1,
      dead: null,
      note: ''
    };

    const push = (line, desc, extra = {}, hold) => {
      Object.assign(st, extra);
      st.cells = cells.map(r => r.slice());
      st.stack = stack.map(e => ({ ...e }));
      steps.push({ file: FILE, line, desc, state: JSON.parse(JSON.stringify(st)), hold: hold || 1 });
    };

    push(21, `入口 (${start.r},${start.c})，出口 (${end.r},${end.c})。curpos = start，curstep = 1`, {
      phase: 'run', note: '初始化'
    }, 1.4);

    let cur = { ...start };
    let curstep = 1;
    let found = false;
    let guard = 0;

    do {
      if (guard++ > 900) break;

      const pass = cells[cur.r][cur.c] === 0;
      push(26, `Pass(maze, (${cur.r},${cur.c}))：该格是 '0'，可以落脚 → true`, {
        cur: { ...cur }, phase: 'run'
      });

      if (pass) {
        cells[cur.r][cur.c] = 2;
        stack.push({ step: curstep, r: cur.r, c: cur.c, di: 1 });
        push(31, `FootPrint + Push：把 (${cur.r},${cur.c},1) 压栈，curstep = ${curstep}`, {
          cur: { ...cur }, curstep, dirTried: 1
        });

        if (cur.r === end.r && cur.c === end.c) {
          found = true;
          push(35, 'SamePos(curpos, end) 成立：找到出口，found = true', {
            cur: { ...cur }, found: true, note: '找到通路'
          }, 2);
          break;
        }

        push(34, '还没到出口：SamePos 为假，继续向东试探', { cur: { ...cur } });
        cur = { r: cur.r + STEP_DIR[1][0], c: cur.c + STEP_DIR[1][1] };
        curstep++;
        push(38, `curpos = NextPos(curpos, 1) → (${cur.r},${cur.c})，curstep = ${curstep}`, {
          cur: { ...cur }, curstep
        });
      } else {
        push(41, `(${cur.r},${cur.c}) 是墙 '1'：Pass 为假，撞墙了，准备回溯`, {
          cur: { ...cur }, phase: 'back'
        });

        if (stack.length) {
          let e = stack.pop();
          push(45, `Pop：弹出栈顶 (${e.r},${e.c},di=${e.di})`, {
            cur: { ...cur }, dead: { r: e.r, c: e.c }
          });

          while (e.di === 4 && stack.length) {
            cells[e.r][e.c] = 3;
            push(48, `(${e.r},${e.c}) 四个方向都试过 → 标成死路 'x'`, {
              dead: { r: e.r, c: e.c }
            });
            e = stack.pop();
            curstep--;
            push(49, `再 Pop 一个：(${e.r},${e.c},di=${e.di})，curstep = ${curstep}`, {
              dead: { r: e.r, c: e.c }, curstep
            });
          }

          if (e.di < 4) {
            e.di++;
            stack.push(e);
            push(55, `(${e.r},${e.c}) 还有方向没试：di 改成 ${e.di}（${DIR_NAME[e.di]}），重新压栈`, {
              dead: null, dirTried: e.di
            });
            const d = STEP_DIR[e.di];
            cur = { r: e.r + d[0], c: e.c + d[1] };
            push(57, `curpos = NextPos(( ${e.r},${e.c} ), ${e.di}) → (${cur.r},${cur.c})`, {
              cur: { ...cur }, dirTried: e.di
            });
          } else {
            cells[e.r][e.c] = 3;
            push(48, `(${e.r},${e.c}) 也走不通，标成死路`, { dead: { r: e.r, c: e.c } });
          }
        } else {
          push(61, '栈空了：while 条件不成立，循环结束，没有通路', { phase: 'fail' }, 2);
          break;
        }
      }
    } while (stack.length && !found);

    if (found) {
      // 栈里保存的就是从入口到出口的路径
      stack.forEach(e => { if (cells[e.r][e.c] !== 1) cells[e.r][e.c] = 4; });
      push(63, `MazePath 返回 true：路径共 ${stack.length} 个三元组（栈底→栈顶即入口→出口）`, {
        phase: 'done', note: '完成', cur: { ...end }, found: true
      }, 2.2);
    }

    return steps;
  }

  /* ---------------- 绘制 ---------------- */

  function drawMaze(ctx, w, h, st) {
    const rows = st.cells.length;
    const cols = st.cells[0].length;

    const stackW = w >= 560 ? Math.min(180, w * 0.26) : 0;
    const padTop = 34;
    const availW = w - stackW - 28;
    const availH = h - padTop - 26;
    const cell = Math.max(10, Math.min(availW / cols, availH / rows));
    const ox = 14 + (availW - cell * cols) / 2;
    const oy = padTop + (availH - cell * rows) / 2;

    // 标题
    P.text(ctx, `迷宫 ${rows} × ${cols}`, 16, 18, { size: 12.5, weight: 800 });
    P.text(ctx, `curstep = ${st.curstep}`, 16 + 86, 18, {
      size: 10.5, color: P.muted, mono: true
    });

    // 出口旗帜
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = st.cells[r][c];
        const x = ox + c * cell;
        const y = oy + r * cell;

        if (v === 1) {
          P.box(ctx, x, y, cell - 0.6, cell - 0.6, {
            fill: '#39405a', stroke: '#20263a', lw: 0.8, r: 2, shadow: 0
          });
          // 墙上的网点，漫画感的灰面
          if (cell > 16 && (r + c) % 3 === 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,.14)';
            ctx.fillRect(x + 2, y + 2, cell - 5, 2);
            ctx.restore();
          }
          continue;
        }

        let fill = '#fffdf5';
        if (v === 2) fill = '#cfe4f6';
        if (v === 3) fill = '#f3d9d6';
        if (v === 4) fill = '#ffe08a';

        P.box(ctx, x, y, cell - 0.6, cell - 0.6, {
          fill, stroke: 'rgba(27,34,48,.18)', lw: 0.8, r: 2, shadow: 0
        });

        if (v === 3) {
          ctx.save();
          ctx.strokeStyle = 'rgba(216,69,60,.75)';
          ctx.lineWidth = 1.2;
          const p = cell * 0.28;
          ctx.beginPath();
          ctx.moveTo(x + p, y + p); ctx.lineTo(x + cell - p, y + cell - p);
          ctx.moveTo(x + cell - p, y + p); ctx.lineTo(x + p, y + cell - p);
          ctx.stroke();
          ctx.restore();
        }

        if (v === 2 || v === 4) {
          P.text(ctx, '·', x + cell / 2, y + cell / 2, {
            size: 12, align: 'center', color: v === 4 ? '#a06a00' : '#5b8bb5'
          });
        }
      }
    }

    // 起点 / 终点
    const sx = ox + cell * 0.5, sy = oy + cell * 0.5;
    P.text(ctx, 'S', sx, sy + 1, { size: 12, weight: 800, align: 'center', color: P.green });
    const ex = ox + (cols - 2) * cell + cell / 2;
    const ey = oy + (rows - 2) * cell + cell / 2;
    P.text(ctx, 'E', ex, ey + 1, { size: 12, weight: 800, align: 'center', color: P.red });

    // 当前格（红色方框 + 方向箭头）
    if (st.cur) {
      const x = ox + st.cur.c * cell;
      const y = oy + st.cur.r * cell;
      ctx.save();
      ctx.strokeStyle = P.red;
      ctx.lineWidth = 2.2;
      ctx.strokeRect(x + 1, y + 1, cell - 3, cell - 3);
      ctx.restore();

      const d = STEP_DIR[st.dirTried] || STEP_DIR[1];
      P.arrow(ctx, x + cell / 2, y + cell / 2,
        x + cell / 2 + d[1] * cell * 0.3, y + cell / 2 + d[0] * cell * 0.3,
        { color: P.red, lw: 1.6, head: 5 });
    }

    // 死路格高亮
    if (st.dead) {
      ctx.save();
      ctx.strokeStyle = P.amber;
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + st.dead.c * cell + 1, oy + st.dead.r * cell + 1, cell - 3, cell - 3);
      ctx.restore();
    }

    // 栈可视化
    if (stackW) {
      const bx = w - stackW - 12;
      const by = padTop;
      const bh = h - padTop - 24;

      P.text(ctx, '链表栈 path', bx, by - 8, { size: 11, weight: 800 });
      P.text(ctx, `size = ${st.stack.length}`, bx + stackW - 4, by - 8, {
        size: 9.5, align: 'right', color: P.muted, mono: true
      });

      P.box(ctx, bx, by, stackW, bh, { fill: '#fbf6e8', stroke: '#c9c2b0', lw: 1.2, r: 3 });

      const rowH = 21;
      const maxRows = Math.floor((bh - 8) / rowH);
      const list = st.stack.slice(-maxRows);
      const skipped = st.stack.length - list.length;

      if (skipped > 0) {
        P.text(ctx, `… 栈底还有 ${skipped} 项`, bx + 8, by + 12, {
          size: 9, color: '#a39a86'
        });
      }

      list.forEach((e, i) => {
        const y = by + 6 + (i + (skipped > 0 ? 1 : 0)) * rowH;
        const isTop = i === list.length - 1;
        if (isTop) {
          P.box(ctx, bx + 4, y - 2, stackW - 8, rowH - 2, {
            fill: '#ffe08a', stroke: P.ink, lw: 1.2, r: 2
          });
        }
        P.text(ctx, `#${e.step}`, bx + 9, y + 8, { size: 9.5, color: P.muted, mono: true });
        P.text(ctx, `(${e.r},${e.c})`, bx + 34, y + 8, { size: 9.5, weight: 700, mono: true });
        P.text(ctx, `d${e.di}${DIR_NAME[e.di]}`, bx + stackW - 10, y + 8, {
          size: 9.5, align: 'right', color: isTop ? P.red : P.muted, mono: true
        });
      });

      // 栈顶指针
      const topIdx = list.length - 1 + (skipped > 0 ? 1 : 0);
      if (topIdx >= 0) {
        const y = by + 6 + topIdx * rowH + rowH / 2 - 2;
        P.text(ctx, 'top', bx - 6, y, { size: 9, align: 'right', color: P.red, weight: 700 });
        P.arrow(ctx, bx - 4, y, bx + 2, y, { color: P.red, lw: 1.2, head: 4 });
      }
    }


    if (st.phase === 'done') {
      const text = `通路：${st.stack.length} 个三元组，栈底 → 栈顶`;
      P.box(ctx, 14, h - 26, Math.min(w - 30, 330), 20, { fill: '#fff3d6', stroke: P.ink, lw: 1.4, r: 3 });
      P.text(ctx, text, 22, h - 16, { size: 10.5, weight: 700, color: P.red });
    }

    // 右下角图例
    P.text(ctx, '蓝 = 足迹　红 × = 死路　黄 = 最终路径', w - 14, h - 6, {
      size: 9, align: 'right', color: '#9aa2b1'
    });
  }

  WB.mountLab({
    id: 2,
    files: FILES,
    modes: (lab) => {
      let cur = null;
      let hud = null;

      return {
        maze: {
          build: async () => {
            const steps = buildMazeSteps();
            return {
              steps,
              files: ['maze'],
              render: (ctx, w, h) => { if (cur) drawMaze(ctx, w, h, cur); },
              onStep: (step) => {
                cur = step.state;
                if (hud) {
                  hud.textContent = `栈 ${cur.stack.length} 项 · curstep ${cur.curstep} · 足迹 ${cur.cells.flat().filter(v => v === 2 || v === 4).length} 格`;
                }
              }
            };
          },
          after: () => {
            hud = WB.$('[data-hud="2"]');
            lab.player.setSpeed(1.7);
            const lg = WB.$('[data-legend="2"]');
            if (lg) lg.innerHTML = '<i class="lg-cur">当前格</i><i class="lg-done">足迹/路径</i><i class="lg-wait">死路</i>';
          }
        }
      };
    }
  });
})();
