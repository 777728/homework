/* ============================================================================
 *  lab4.js —— 实验四：3D 校园地图上的 Dijkstra / DFS 动画
 *  算法步骤对齐 lab4/PathAlgorithms.cpp：
 *    dijkstra()            65-110 行
 *    depthFirstTraversal() 21-42 行
 * ==========================================================================*/

(() => {
  const FILE_ALGO = 'src/lab4/PathAlgorithms.cpp';
  const FILE_DATA = 'src/lab4/CampusData.cpp';

  const FILES = [
    { key: 'algo', path: FILE_ALGO, label: 'PathAlgorithms.cpp', note: 'Dijkstra / Floyd / 哈密尔顿，人工编写 392 行' },
    { key: 'data', path: FILE_DATA, label: 'CampusData.cpp', note: '22 个地点、46 条道路' },
    { key: 'graph', path: 'src/lab4/CampusGraph.h', label: 'CampusGraph.h', note: '邻接矩阵图 ADT' }
  ];

  const N = CAMPUS.nodes.length;
  const INF = 1e9;

  const ADJ = Array.from({ length: N }, () => Array(N).fill(INF));
  CAMPUS.edges.forEach(e => {
    ADJ[e.a][e.b] = e.w;
    ADJ[e.b][e.a] = e.w;
  });

  const nameOf = (id) => CAMPUS.nodes[id].short;

  /* ======================================================================
   *  Dijkstra 步骤
   * ==================================================================== */
  function dijkstraSteps(source, target) {
    const dist = Array(N).fill(INF);
    const prev = Array(N).fill(-1);
    const done = Array(N).fill(false);
    const pq = [{ d: 0, v: source }];
    const steps = [];

    const st = {
      dist: dist.slice(), prev: prev.slice(), done: done.slice(),
      cur: null, activeEdge: null, path: [], found: false,
      note: '', phase: 'init', source, target
    };
    const push = (line, desc, extra = {}, hold) => {
      Object.assign(st, extra);
      steps.push({
        file: FILE_ALGO, line, desc,
        state: { ...st, dist: st.dist.slice(), prev: st.prev.slice(), done: st.done.slice(), path: st.path.slice() },
        hold: hold || 1
      });
    };

    push(70, `std::vector<int> dist(${N}, kInf)：22 个顶点的距离先全部设成 ∞`, { phase: 'init' }, 1.4);
    push(71, 'prev 全部置 −1：用来最后回溯路径', { phase: 'init' });

    dist[source] = 0;
    push(75, `dist[${source}] = 0：起点「${nameOf(source)}」到自己是 0 米`, { phase: 'run' }, 1.3);
    push(76, `pq.push({0, ${source}})：起点入小根堆`, { phase: 'run' });

    let guard = 0;
    while (pq.length && guard++ < 200) {
      pq.sort((a, b) => a.d - b.d || a.v - b.v);
      const { d: du, v: u } = pq.shift();

      push(78, `pq.top()：弹出当前距离最小的顶点 ${u}「${nameOf(u)}」，du = ${du === INF ? '∞' : du}`, {
        cur: u, activeEdge: null
      });

      if (du !== dist[u]) {
        push(80, `du ≠ dist[${u}]，这是堆里的旧记录（懒惰删除），跳过`, { cur: u });
        continue;
      }

      if (u === target) {
        push(83, `u == target：已经到达「${nameOf(target)}」，可以提前 break`, { cur: u, phase: 'arrive' }, 1.8);
        break;
      }

      done[u] = true;
      push(86, `扫描 ${u}「${nameOf(u)}」的所有邻边（邻接矩阵一行 ${N} 个格子）`, {
        cur: u, done: done.slice(), phase: 'run'
      });

      for (let v = 0; v < N; v++) {
        const w = ADJ[u][v];
        if (w >= INF) continue;

        push(87, `邻点 ${v}「${nameOf(v)}」：w(${u},${v}) = ${w} 米`, {
          cur: u, activeEdge: [u, v], note: '松弛'
        }, 0.7);

        const nd = dist[u] + w;
        if (nd >= dist[v]) {
          push(88, `dist[${u}] + ${w} = ${nd} ≥ dist[${v}] = ${dist[v] === INF ? '∞' : dist[v]}，不松弛`, {
            cur: u, activeEdge: [u, v]
          }, 0.6);
          continue;
        }

        dist[v] = nd;
        prev[v] = u;
        pq.push({ d: nd, v });
        push(91, `松弛成功：dist[${v}] = ${nd}，prev[${v}] = ${u}，入堆`, {
          cur: u, activeEdge: [u, v], dist: dist.slice(), prev: prev.slice()
        }, 0.75);
        push(93, `pq.push({${nd}, ${v}})`, { cur: u, activeEdge: null }, 0.6);
      }
    }

    const result = { distance: dist[target], path: [] };
    if (dist[target] >= INF) {
      push(99, `dist[target] = ∞：「${nameOf(target)}」不可达，返回空路径`, { phase: 'fail' }, 2);
      return { steps, result };
    }

    const path = [];
    for (let v = target; v !== -1; v = prev[v]) {
      path.push(v);
      if (v === source) break;
    }
    path.reverse();

    push(102, '回溯 prev 指针：for (v = target; v != -1; v = prev[v])', {
      phase: 'path', path: path.slice(), cur: target
    }, 1.3);
    path.forEach((v, i) => {
      push(103, `path.push_back(${v})「${nameOf(v)}」`, {
        phase: 'path', path: path.slice(0, i + 1), cur: v
      }, 1.1);
    });
    push(108, 'std::reverse：路径翻正，从起点到终点', { phase: 'path', path: path.slice(), cur: null }, 1.2);

    const distTotal = dist[target];
    push(101, `最短距离 ${distTotal} 米，途经 ${path.length - 1} 段道路，步行约 ${Math.round(distTotal / 75)} 分钟`, {
      phase: 'done', path: path.slice(), note: '完成', cur: null
    }, 2.4);

    result.path = path;
    return { steps, result };
  }

  /* ======================================================================
   *  DFS 步骤
   * ==================================================================== */
  function dfsSteps(start) {
    const steps = [];
    const seen = Array(N).fill(false);
    const stack = [start];
    const order = [];

    const st = { visited: seen.slice(), stack: stack.slice(), cur: null, order: [], note: '', phase: 'init' };
    const push = (line, desc, extra = {}, hold) => {
      Object.assign(st, extra);
      steps.push({
        file: FILE_ALGO, line, desc,
        state: { ...st, visited: st.visited.slice(), stack: st.stack.slice(), order: st.order.slice() },
        hold: hold || 1
      });
    };

    push(24, `visited 全部清零，stack = {${start}}：「${nameOf(start)}」入栈`, { phase: 'run' }, 1.3);

    let guard = 0;
    while (stack.length && guard++ < 120) {
      const u = stack.pop();
      push(27, `u = stack.back() = ${u}「${nameOf(u)}」，pop`, { cur: u });

      if (seen[u]) {
        push(29, `visited[${u}] 已标记，continue（显式栈里会有重复顶点）`, { cur: u });
        continue;
      }

      seen[u] = true;
      order.push(u);
      push(32, `visited[${u}] = 1，order.push_back(${u})「${nameOf(u)}」`, {
        visited: seen.slice(), order: order.slice(), cur: u
      }, 1.2);

      const next = [];
      for (let v = 0; v < N; v++) if (ADJ[u][v] < INF) next.push(v);
      for (let i = next.length - 1; i >= 0; i--) {
        const v = next[i];
        if (!seen[v]) {
          stack.push(v);
          push(37, `邻点 ${v}「${nameOf(v)}」未访问，push 入栈（逆序压入，弹出时按编号升序）`, {
            stack: stack.slice(), cur: u
          }, 0.7);
        }
      }
    }

    push(41, `遍历结束，访问序列：${order.map(nameOf).join(' → ')}`, {
      phase: 'done', note: '完成', cur: null
    }, 2.2);

    return { steps, order };
  }

  /* ======================================================================
   *  挂载
   * ==================================================================== */
  WB.mountLab({
    id: 4,
    files: FILES,
    modes: (lab) => {
      let scene = null;
      let host = null;
      let labelsEl = null;
      let hud = null;
      let card = null;
      let cur = null;
      let mode = 'dijkstra';

      /* ---- 地点信息卡 ---- */
      function showPoi(id) {
        if (!card) return;
        const n = CAMPUS.nodes[id];
        const near = [];
        CAMPUS.edges.forEach(e => {
          if (e.a === id) near.push(`${CAMPUS.nodes[e.b].short} ${e.w} m`);
          if (e.b === id) near.push(`${CAMPUS.nodes[e.a].short} ${e.w} m`);
        });

        card.innerHTML = `
          <button class="close" aria-label="关闭">×</button>
          <h4>${n.name}</h4>
          <span class="cat">${n.cat}</span>
          <p>${n.intro}</p>
          <div class="near"><b>相邻道路 ${near.length} 条：</b>${near.join('、')}</div>
        `;
        card.style.display = '';
        card.querySelector('.close').addEventListener('click', () => { card.style.display = 'none'; });
      }

      function ensureScene() {
        if (scene) return scene;
        host = WB.$('[data-canvas="4"]');
        labelsEl = WB.$('[data-labels="4"]');
        const dummy = host.querySelector('canvas');
        if (dummy) dummy.remove();

        labelsEl.innerHTML = '';

        card = document.createElement('div');
        card.className = 'poi-card';
        card.style.display = 'none';
        host.appendChild(card);

        scene = new CampusScene(host, labelsEl, { onPick: showPoi });
        return scene;
      }

      /* ---- 把一步的状态刷到 3D 场景 ---- */
      function applyDijkstra(s) {
        scene.resetNodes();
        scene.clearEdges();

        for (let v = 0; v < N; v++) {
          if (s.done[v]) scene.setNodeState(v, 'settled');
        }
        (s.path || []).forEach(v => scene.setNodeState(v, 'path'));
        if (s.cur != null) scene.setNodeState(s.cur, 'current');

        if (s.activeEdge) scene.setEdgeState(s.activeEdge[0], s.activeEdge[1], 'active');

        if (s.path && s.path.length > 1) scene.setPath(s.path);
        else scene.setPath([]);

        if (hud) {
          const reach = s.dist.filter(d => d < INF).length;
          hud.textContent = `已确定 ${s.done.filter(Boolean).length} / ${N} 个顶点 · 可达 ${reach} 个 · 当前 ${s.cur == null ? '—' : nameOf(s.cur)}`;
        }
      }

      function applyDfs(s) {
        scene.resetNodes();
        scene.clearEdges();
        s.visited.forEach((v, i) => { if (v) scene.setNodeState(i, 'settled'); });
        (s.order || []).forEach(v => scene.setNodeState(v, 'path'));
        if (s.cur != null) scene.setNodeState(s.cur, 'current');
        scene.setPath([]);

        if (hud) {
          hud.textContent = `已访问 ${s.order.length} / ${N} 个地点 · 栈深 ${s.stack.length} · 当前 ${s.cur == null ? '—' : nameOf(s.cur)}`;
        }
      }

      function buildSteps() {
        const sSel = WB.$('[data-pt="s"]');
        const tSel = WB.$('[data-pt="t"]');
        const s = Number(sSel?.value ?? 0);
        const t = Number(tSel?.value ?? 6);

        if (mode === 'dfs') {
          const { steps } = dfsSteps(s);
          return {
            steps,
            files: ['algo'],
            render: () => {},
            onStep: (step) => { cur = step.state; applyDfs(cur); }
          };
        }

        const { steps } = dijkstraSteps(s, t);
        return {
          steps,
          files: ['algo'],
          render: () => {},
          onStep: (step) => { cur = step.state; applyDijkstra(cur); }
        };
      }

      /* ---- 地点下拉框 ---- */
      function fillSelects() {
        const sSel = WB.$('[data-pt="s"]');
        const tSel = WB.$('[data-pt="t"]');
        if (!sSel || sSel.dataset.filled === '1') return;
        CAMPUS.nodes.forEach(n => {
          [sSel, tSel].forEach(sel => {
            const o = document.createElement('option');
            o.value = n.id;
            o.textContent = n.name;
            sel.appendChild(o);
          });
        });
        sSel.value = '0';
        tSel.value = '6';
        sSel.dataset.filled = '1';

        [sSel, tSel].forEach(sel => {
          sel.addEventListener('change', () => {
            if (mode !== 'dijkstra') return;
            lab.mode = null;
            lab.setMode('dijkstra');
          });
        });
      }

      return {
        dijkstra: {
          build: async () => {
            mode = 'dijkstra';
            ensureScene();
            fillSelects();
            return buildSteps();
          },
          after: () => {
            mode = 'dijkstra';
            lab.getScene = () => scene;
            hud = WB.$('[data-hud="4"]');
            scene.setRunning(true);
          }
        },
        dfs: {
          build: async () => {
            mode = 'dfs';
            ensureScene();
            fillSelects();
            const sel = WB.$('[data-pt="t"]');
            if (sel) sel.disabled = true;
            return buildSteps();
          },
          after: () => {
            mode = 'dfs';
            lab.getScene = () => scene;
            hud = WB.$('[data-hud="4"]');
            const sel = WB.$('[data-pt="t"]');
            if (sel) sel.disabled = true;
            scene.setRunning(true);
          }
        }
      };
    }
  });

  /* 环绕开关：让相机自己慢慢转，拖拽时自动停下 */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rotate="4"]');
    if (!btn) return;
    const lab = WB.labs.get(4);
    const sc = lab && lab.getScene ? lab.getScene() : null;
    if (!sc) return;
    sc.autoRotate = !sc.autoRotate;
    btn.classList.toggle('is-on', sc.autoRotate);
  });

  /* 切换模式时恢复“终点”下拉框 */
  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-modes="4"] .mode');
    if (!m) return;
    const sel = WB.$('[data-pt="t"]');
    if (sel) sel.disabled = m.dataset.mode === 'dfs';
  });
})();
