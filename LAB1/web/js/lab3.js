/* ============================================================================
 *  lab3.js —— 实验三：二叉树遍历 + 哈夫曼编码（2D）
 *  建树 / 遍历对齐 lab3/BiTree.cpp；建哈夫曼树 / 编码对齐 lab3/Huffman.cpp。
 * ==========================================================================*/

(() => {
  const P = WB.P;
  const FILE_TREE = 'src/lab3/BiTree.cpp';
  const FILE_HUFF = 'src/lab3/Huffman.cpp';

  const FILES = [
    { key: 'tree', path: FILE_TREE, label: 'BiTree.cpp', note: '建树与递归/非递归遍历，人工编写 76 行' },
    { key: 'huff', path: FILE_HUFF, label: 'Huffman.cpp', note: '静态数组哈夫曼树与编码，人工编写 98 行' },
    { key: 'conv', path: 'src/lab3/TreeConvert.cpp', label: 'TreeConvert.cpp', note: '树 ⇄ 二叉树（左孩子右兄弟）' }
  ];

  /* ======================================================================
   *  一、二叉树
   * ==================================================================== */

  const PRE_SEQ = 'ABC##DE#G##F###';

  function buildTreeSteps() {
    const steps = [];
    const st = { tree: null, idx: 0, ch: '', note: '建树', phase: 'build' };

    const clone = (o) => JSON.parse(JSON.stringify(o));

    // 先按先序序列算出真实结构（供渲染），再把每一步“正在建的结点”记录下来
    let idx = 0;
    function makeNode() {
      if (idx >= PRE_SEQ.length) return null;
      const ch = PRE_SEQ[idx++];
      if (ch === '#') return null;
      const n = { ch, left: makeNode(), right: makeNode() };
      return n;
    }
    const full = makeNode();

    // 用一次带记录的递归，产生“进入 / 新建 / 空子树 / 回溯”的细步
    let pos = 0;
    const rootHolder = { root: null };

    const push = (line, desc, extra = {}, hold) => {
      Object.assign(st, extra);
      st.tree = rootHolder.root ? clone(rootHolder.root) : null;
      steps.push({ file: FILE_TREE, line, desc, state: clone(st), hold: hold || 1 });
    };

    function rec(parent, side, depth) {
      if (pos >= PRE_SEQ.length) {
        push(6, `idx = ${pos} 已超出序列长度，返回空树`, { idx: pos });
        return null;
      }

      const ch = PRE_SEQ[pos];
      push(7, `读取 s[${pos}] = '${ch}'，idx 后移`, { idx: pos, ch });
      pos++;

      if (ch === '#') {
        push(8, `'#' 表示空子树：把 ${parent ? parent.ch : '根'} 的${side === 'L' ? '左' : side === 'R' ? '右' : ''}指针置空`,
          { idx: pos, ch });
        return null;
      }

      const node = { ch, left: null, right: null, depth };
      if (!rootHolder.root) rootHolder.root = node;
      else if (parent) parent[side === 'L' ? 'left' : 'right'] = node;

      push(9, `new BiTNode：结点 ${ch} 申请成功`, { idx: pos, ch });
      push(10, `T->data = '${ch}'`, { idx: pos, ch });
      push(11, `T->lchild = T->rchild = NULL`, { idx: pos, ch });

      push(12, `CreateBiTree(T->lchild)：递归建立 ${ch} 的左子树`, { idx: pos, ch });
      rec(node, 'L', depth + 1);

      push(13, `CreateBiTree(T->rchild)：递归建立 ${ch} 的右子树`, { idx: pos, ch });
      rec(node, 'R', depth + 1);

      return node;
    }

    push(5, `CreateBiTree：先序序列 "${PRE_SEQ}"，用 # 表示空子树`, { phase: 'build' }, 1.4);
    rec(null, null, 0);
    push(13, `序列读完，二叉树建立完成（共 7 个结点，树高 4）`, { phase: 'built', note: '建树完成' }, 1.8);

    return { steps, tree: full };
  }

  function traverseSteps(tree, order) {
    const steps = [];
    const st = { tree, cur: null, visited: [], out: [], stack: [], note: '遍历', phase: 'walk', order };

    const clone = (o) => JSON.parse(JSON.stringify(o));
    const LINE = {
      pre: { enter: 23, visit: 24, left: 25, right: 26, back: 27, name: 'PreOrder' },
      in: { enter: 29, visit: 31, left: 30, right: 32, back: 33, name: 'InOrder' },
      post: { enter: 35, visit: 38, left: 36, right: 37, back: 39, name: 'PostOrder' }
    }[order];

    const push = (line, desc, extra = {}, hold) => {
      Object.assign(st, extra);
      steps.push({ file: FILE_TREE, line, desc, state: clone(st), hold: hold || 1 });
    };

    const stack = [];
    const out = [];
    const visited = [];

    function rec(n, depth) {
      if (!n) {
        push(LINE.enter, `${LINE.name}(NULL)：空子树，直接 return`, {});
        return;
      }

      stack.push(n.ch);
      push(LINE.enter, `${LINE.name}('${n.ch}')：结点非空，进入递归（第 ${depth} 层）`, {
        cur: n.ch, stack: [...stack]
      });

      if (order === 'pre') {
        out.push(n.ch);
        visited.push(n.ch);
        push(LINE.visit, `std::cout << '${n.ch}'：先访问根，输出序列 → ${out.join(' ')}`, {
          cur: n.ch, out: [...out], visited: [...visited]
        });
      }

      push(LINE.left, `${LINE.name}(T->lchild)：深入 ${n.ch} 的左子树`, { cur: n.ch });
      rec(n.left, depth + 1);

      if (order === 'in') {
        out.push(n.ch);
        visited.push(n.ch);
        push(LINE.visit, `左子树回来了，再输出根 '${n.ch}' → ${out.join(' ')}`, {
          cur: n.ch, out: [...out], visited: [...visited]
        });
      }

      push(LINE.right, `${LINE.name}(T->rchild)：深入 ${n.ch} 的右子树`, { cur: n.ch });
      rec(n.right, depth + 1);

      if (order === 'post') {
        out.push(n.ch);
        visited.push(n.ch);
        push(LINE.visit, `左右子树都处理完，最后输出根 '${n.ch}' → ${out.join(' ')}`, {
          cur: n.ch, out: [...out], visited: [...visited]
        });
      }

      stack.pop();
      push(LINE.back, `${n.ch} 的子树处理完毕，return 上一层`, {
        cur: null, stack: [...stack]
      });
    }

    push(LINE.enter, `从根开始 ${LINE.name}(T)。递归就是“自己调用自己”，栈帧在这里生长和收缩`, {
      phase: 'walk'
    }, 1.4);

    rec(tree, 1);

    const label = { pre: '先序', in: '中序', post: '后序' }[order];
    push(LINE.back, `${label}遍历结束：${out.join(' ')}（共 ${out.length} 个结点）`, {
      phase: 'done', note: '完成', cur: null, out: [...out]
    }, 2.2);

    return steps;
  }

  /* ---------------- 通用树布局与绘制 ---------------- */

  /** 叶子占格、父结点居中于子结点之上：比纯中序更像课本插图 */
  function layout(root) {
    const nodes = [];
    const byCh = new Map();
    let leaf = 0;
    let maxDepth = 0;

    (function walk(n, depth) {
      if (!n) return null;
      maxDepth = Math.max(maxDepth, depth);
      const l = walk(n.left, depth + 1);
      const r = walk(n.right, depth + 1);

      let x;
      if (l == null && r == null) x = leaf++;
      else if (l != null && r != null) x = (l + r) / 2;
      else x = (l != null ? l : r);

      n._x = x;
      n._y = depth;
      nodes.push(n);
      if (n.ch) byCh.set(n.ch, n);
      return x;
    })(root, 0);

    return { nodes, cols: Math.max(1, leaf), depth: maxDepth + 1, byCh };
  }

  function drawTree(ctx, w, h, tree, st, opts = {}) {
    if (!tree) {
      P.text(ctx, '（等待建树…）', w / 2, h / 2, { size: 13, align: 'center', color: P.muted });
      return;
    }

    const { nodes, cols, depth } = layout(tree);
    const padX = 44, padTop = 54, padBottom = 92;
    const usableW = w - padX * 2;
    const usableH = h - padTop - padBottom;
    const gapX = cols > 1 ? Math.min(usableW / (cols - 1), 122) : 0;
    const gapY = depth > 1 ? Math.min(usableH / (depth - 1), 92) : 0;
    const startX = w / 2 - (gapX * (cols - 1)) / 2;
    const startY = padTop + Math.max(0, (usableH - gapY * (depth - 1)) / 2);
    const R = Math.max(17, Math.min(26, (gapX || 72) * 0.3, (gapY || 72) * 0.3));

    const px = (n) => startX + n._x * gapX;
    const py = (n) => startY + n._y * gapY;

    // 边
    nodes.forEach(n => {
      [['left', -1], ['right', 1]].forEach(([k, side]) => {
        const c = n[k];
        if (!c) return;
        const x1 = px(n), y1 = py(n);
        const x2 = px(c), y2 = py(c);
        ctx.save();
        ctx.strokeStyle = '#1b2230';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(x1, y1 + R * 0.8);
        ctx.lineTo(x2, y2 - R * 0.8);
        ctx.stroke();
        ctx.restore();

        // 左右孩子标记
        P.text(ctx, side < 0 ? 'L' : 'R', (x1 + x2) / 2 + side * 9, (y1 + y2) / 2, {
          size: 8.5, color: '#9aa2b1', align: 'center'
        });
      });
    });

    // 结点
    nodes.forEach(n => {
      const x = px(n), y = py(n);
      const isCur = st.cur === n.ch;
      const isVisited = st.visited && st.visited.includes(n.ch);
      const inStack = st.stack && st.stack.includes(n.ch);

      let fill = '#fffdf5';
      if (isVisited) fill = '#cfe4f6';
      if (inStack) fill = '#ffe9b0';
      if (isCur) fill = '#ffb3a8';

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = isCur ? 2.6 : 1.8;
      ctx.strokeStyle = P.ink;
      ctx.stroke();
      ctx.restore();

      P.text(ctx, n.ch, x, y + 1, {
        size: Math.min(14, R * 0.8), weight: 800, align: 'center', mono: true
      });

      if (isCur) {
        P.text(ctx, '当前结点', x + R + 7, y - 2, { size: 9.5, color: P.red, weight: 700 });
        P.arrow(ctx, x + R + 4, y - 2, x + R - 2, y - 2, { color: P.red, lw: 1.2, head: 4 });
      }
    });

    // 调用栈
    const stack = st.stack || [];
    const sy = h - 62;
    P.text(ctx, '递归栈', 16, sy - 12, { size: 10.5, weight: 800, color: P.muted });
    stack.forEach((ch, i) => {
      const bx = 16 + i * 44;
      P.box(ctx, bx, sy, 38, 24, {
        fill: i === stack.length - 1 ? '#ffe9b0' : '#fffdf5',
        stroke: P.ink, lw: 1.3, r: 3, shadow: 2
      });
      P.text(ctx, ch, bx + 19, sy + 12, { size: 11.5, weight: 800, align: 'center', mono: true });
    });
    if (!stack.length) {
      P.text(ctx, '（空）', 34, sy + 12, { size: 10, color: '#9aa2b1' });
    }

    // 输出序列
    const out = st.out || [];
    P.text(ctx, '访问序列', w - 16, sy - 12, { size: 10.5, weight: 800, align: 'right', color: P.muted });
    P.text(ctx, out.length ? out.join(' ') : '—', w - 16, sy + 12, {
      size: 13, weight: 800, align: 'right', color: P.red, mono: true
    });

  }

  /* ======================================================================
   *  二、哈夫曼
   * ==================================================================== */

  const HUFF_CHARS = ['A', 'B', 'C', 'D', 'E'];
  const HUFF_W = [5, 3, 2, 2, 1];

  function buildHuffSteps() {
    const n = HUFF_CHARS.length;
    const m = 2 * n - 1;
    const HT = Array.from({ length: m + 1 }, () => ({ weight: 0, parent: 0, l: 0, r: 0, ch: '' }));

    const steps = [];
    const st = { HT: [], n, m, i: 0, s1: 0, s2: 0, scan: 0, code: {}, codes: {}, note: '建树', phase: 'build', cur: 0 };

    const clone = (o) => JSON.parse(JSON.stringify(o));
    const push = (line, desc, extra = {}, hold) => {
      Object.assign(st, extra);
      st.HT = HT.map(x => ({ ...x }));
      steps.push({ file: FILE_HUFF, line, desc, state: clone(st), hold: hold || 1 });
    };

    push(17, `CreateHuffmanTree：n = ${n}，静态数组开 2n−1 = ${m} 个结点（0 号不用）`, { phase: 'build' }, 1.4);

    for (let i = 1; i <= m; i++) {
      HT[i].parent = HT[i].l = HT[i].r = 0;
      HT[i].weight = 0;
      HT[i].ch = '';
    }
    push(20, '全部结点初始化：parent = lchild = rchild = 0，权值清零', { phase: 'build' });

    for (let i = 1; i <= n; i++) {
      HT[i].weight = HUFF_W[i - 1];
      HT[i].ch = HUFF_CHARS[i - 1];
      push(22, `叶子 ${i}：字符 '${HT[i].ch}'，权值 ${HT[i].weight}`, { phase: 'build' }, 0.8);
    }

    push(24, `开始合并：i 从 ${n + 1} 到 ${m}，每次取两个最小的根`, { phase: 'merge' }, 1.4);

    for (let i = n + 1; i <= m; i++) {
      push(26, `第 ${i - n} 轮 Select(HT, ${i - 1}, s1, s2)：在前 ${i - 1} 个无父结点的结点里找最小两个`, {});

      let s1 = 0, s2 = 0;
      for (let k = 1; k <= i - 1; k++) {
        if (HT[k].parent !== 0) {
          push(9, `结点 ${k}（'${HT[k].ch || '内部'}', w=${HT[k].weight}）已有父结点，跳过`, { scan: k });
          continue;
        }
        push(8, `扫描结点 ${k}：w = ${HT[k].weight}，当前 s1 = ${s1 || '—'}，s2 = ${s2 || '—'}`,
          { scan: k, s1, s2 });

        if (s1 === 0 || HT[k].weight < HT[s1].weight) {
          s2 = s1;
          s1 = k;
          push(10, `w(${k}) 更小：s2 = ${s2 || '—'}，s1 = ${k}`, { scan: k, s1, s2 });
        } else if (s2 === 0 || HT[k].weight < HT[s2].weight) {
          s2 = k;
          push(11, `w(${k}) 只能排第二：s2 = ${k}`, { scan: k, s1, s2 });
        }
      }

      push(26, `选出 s1 = ${s1}（w=${HT[s1].weight}）、s2 = ${s2}（w=${HT[s2].weight}），准备合并`, { s1, s2 }, 1.4);

      HT[s1].parent = HT[s2].parent = i;
      push(27, `HT[${s1}].parent = HT[${s2}].parent = ${i}`, { s1, s2, i });
      HT[i].l = s1;
      HT[i].r = s2;
      push(28, `内部结点 ${i}：左孩子 = ${s1}，右孩子 = ${s2}`, { s1, s2, i });
      HT[i].weight = HT[s1].weight + HT[s2].weight;
      push(30, `权值相加：${HT[s1].weight} + ${HT[s2].weight} = ${HT[i].weight}`, { s1, s2, i }, 1.5);
    }

    push(31, `哈夫曼树建成，根结点 = ${m}，WPL = Σ(权值 × 路径长度) 最小`, { phase: 'built', note: '建树完成' }, 1.8);

    /* ---- 编码：从叶子沿 parent 回溯 ---- */
    const codes = {};
    push(34, 'HuffmanCoding：为每个叶子申请编码串，从叶子往根走', { phase: 'code' }, 1.3);

    for (let i = 1; i <= n; i++) {
      let start = n - 1;
      let c = i;
      let f = HT[i].parent;
      let bits = '';
      push(39, `叶子 '${HT[i].ch}'：c = ${i}，f = parent = ${f}`, { cur: i, phase: 'code' }, 1.1);

      while (f !== 0) {
        const bit = HT[f].l === c ? '0' : '1';
        bits = bit + bits;
        push(41, `HT[${f}].lchild ${HT[f].l === c ? '==' : '!='} ${c} → 取 '${bit}'，当前编码 ${bits}`,
          { cur: f, phase: 'code' });
        c = f;
        f = HT[f].parent;
        push(43, `c = ${c}，f = ${f}${f === 0 ? '（到根了，回溯结束）' : ''}`, { cur: c, phase: 'code' });
      }

      codes[HT[i].ch] = bits;
      push(46, `strcpy：'${HT[i].ch}' 的编码是 ${bits}`, { codes: { ...codes }, phase: 'code' }, 1.4);
    }

    push(48, '编码完成：出现频率高的字符码长短，整段电文的平均码长最小', {
      phase: 'done', note: '完成', codes: { ...codes }
    }, 2.2);

    return steps;
  }

  /* ---------------- 哈夫曼绘制 ---------------- */

  function huffForest(HT, m) {
    // 哈夫曼建树过程中是一片“森林”：parent = 0 的结点各自是一棵子树的根
    const roots = [];
    for (let i = 1; i <= m; i++) {
      const nd = HT[i];
      if (!nd || nd.parent !== 0) continue;
      if (!nd.weight && !nd.ch) continue;      // 还没用到的空槽
      roots.push(i);
    }

    function make(i, depth) {
      if (!i || !HT[i]) return null;
      const node = {
        ch: HT[i].ch || '',
        weight: HT[i].weight,
        idx: i,
        depth,
        left: null, right: null
      };
      if (HT[i].l) node.left = make(HT[i].l, depth + 1);
      if (HT[i].r) node.right = make(HT[i].r, depth + 1);
      return node;
    }

    return roots.map(i => make(i, 0));
  }

  /** 多棵树的横向排列布局 */
  function layoutForest(roots) {
    const nodes = [];
    let leaf = 0;
    let maxDepth = 0;

    roots.forEach(root => {
      (function walk(n, depth) {
        if (!n) return null;
        maxDepth = Math.max(maxDepth, depth);
        const l = walk(n.left, depth + 1);
        const r = walk(n.right, depth + 1);

        let x;
        if (l == null && r == null) x = leaf++;
        else if (l != null && r != null) x = (l + r) / 2;
        else x = (l != null ? l : r);

        n._x = x;
        n._y = depth;
        nodes.push(n);
        return x;
      })(root, 0);
      leaf += 0.4;   // 树与树之间的空隙
    });

    return { nodes, cols: Math.max(1, leaf), depth: maxDepth + 1 };
  }

  function drawHuff(ctx, w, h, st) {
    const tableW = Math.min(278, w * 0.43);
    const treeW = w - tableW - 20;

    const forest = huffForest(st.HT, st.m);

    /* ---- 左：树（建树过程中是森林） ---- */
    if (forest.length) {
      const { nodes, cols, depth } = layoutForest(forest);
      const padTop = 44, padBottom = 22;
      const gapX = cols > 1 ? Math.min((treeW - 60) / Math.max(1, cols - 1), 66) : 0;
      const gapY = depth > 1 ? Math.min((h - padTop - padBottom) / (depth - 1), 76) : 0;
      const startX = 16 + Math.max(0, (treeW - gapX * (cols - 1)) / 2 - 8);
      const startY = padTop + Math.max(0, (h - padTop - padBottom - gapY * (depth - 1)) / 2);
      const R = 20;

      const px = (n) => startX + n._x * gapX;
      const py = (n) => startY + n._y * gapY;

      nodes.forEach(n => {
        [['left', '0'], ['right', '1']].forEach(([k, bit]) => {
          const c = n[k];
          if (!c) return;
          ctx.save();
          ctx.strokeStyle = '#1b2230';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(px(n), py(n) + R);
          ctx.lineTo(px(c), py(c) - R);
          ctx.stroke();
          ctx.restore();
          P.box(ctx, (px(n) + px(c)) / 2 - 8, (py(n) + py(c)) / 2 - 8, 16, 15, {
            fill: '#fff8e4', stroke: P.ink, lw: 1, r: 2
          });
          P.text(ctx, bit, (px(n) + px(c)) / 2, (py(n) + py(c)) / 2, {
            size: 9, weight: 800, align: 'center', mono: true
          });
        });
      });

      nodes.forEach(n => {
        const isLeaf = !n.left && !n.right;
        const isCur = st.cur === n.idx;
        let fill = isLeaf ? '#cfeed8' : '#fffdf5';
        if (isCur) fill = '#ffb3a8';

        ctx.save();
        ctx.beginPath();
        ctx.arc(px(n), py(n), R, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = isCur ? 2.4 : 1.7;
        ctx.strokeStyle = P.ink;
        ctx.stroke();
        ctx.restore();

        P.text(ctx, n.ch || String(n.weight), px(n), py(n) - (isLeaf ? 3 : 0), {
          size: isLeaf ? 12 : 12, weight: 800, align: 'center', mono: true
        });
        if (isLeaf) {
          P.text(ctx, String(n.weight), px(n), py(n) + 8, {
            size: 8.5, align: 'center', color: '#5b6577', mono: true
          });
        }
        P.text(ctx, String(n.idx), px(n) - R + 4, py(n) - R + 2, {
          size: 8, color: '#a3aab8', mono: true
        });
      });

      P.text(ctx, '哈夫曼树（叶子标字符，内部结点标权值）', 16, 18, { size: 11.5, weight: 800 });
    }

    /* ---- 右：静态数组 ---- */
    const tx = w - tableW - 6;
    const ty = 52;
    const rowH = Math.min(26, (h - 106) / (st.m + 1));
    const colW = [30, 38, 52, 48, 46, 46];
    const heads = ['i', 'ch', 'w', 'p', 'l', 'r'];

    P.text(ctx, '静态数组 HT[1 .. 2n−1]', tx, 18, { size: 11.5, weight: 800 });

    heads.forEach((hd, j) => {
      P.text(ctx, hd, tx + colW.slice(0, j).reduce((a, b) => a + b, 0) + colW[j] / 2, ty - 12, {
        size: 10, align: 'center', color: P.muted, mono: true
      });
    });

    for (let i = 1; i <= st.m; i++) {
      const y = ty + (i - 1) * rowH;
      const row = st.HT[i] || { weight: 0, parent: 0, l: 0, r: 0, ch: '' };
      const isScan = st.scan === i;
      const isS1 = st.s1 === i;
      const isS2 = st.s2 === i;
      const isCur = st.cur === i;
      const isLeaf = i <= st.n;

      if (i === st.i && st.phase === 'merge') { /* 正在生成的结点留空 */ }

      let bg = isLeaf ? '#f2f8f2' : '#fffdf6';
      if (isScan) bg = '#fff0c4';
      if (isS1) bg = '#ffd0c8';
      if (isS2) bg = '#ffe4bb';
      if (isCur) bg = '#ffb3a8';

      P.box(ctx, tx, y, colW.reduce((a, b) => a + b, 0), rowH - 1.5, {
        fill: bg, stroke: 'rgba(27,34,48,.18)', lw: 0.9, r: 1.5
      });

      const vals = [String(i), row.ch || '·', String(row.weight), String(row.parent), String(row.l), String(row.r)];
      let cx = tx;
      vals.forEach((v, j) => {
        P.text(ctx, v, cx + colW[j] / 2, y + rowH / 2, {
          size: 10.5, align: 'center', mono: true,
          weight: j === 2 ? 700 : 500,
          color: v === '0' ? '#b3b9c4' : P.ink
        });
        cx += colW[j];
      });
    }

    // 编码表
    const codes = st.codes || {};
    const keys = Object.keys(codes);
    if (keys.length) {
      const cy = ty + st.m * rowH + 16;
      P.text(ctx, '编码表', tx, cy, { size: 10.5, weight: 800 });
      keys.forEach((k, i) => {
        const x = tx + (i % 3) * 78;
        const y = cy + 16 + Math.floor(i / 3) * 20;
        P.box(ctx, x, y - 11, 72, 18, { fill: '#eef7ef', stroke: P.ink, lw: 1.1, r: 2 });
        P.text(ctx, `${k} : ${codes[k]}`, x + 36, y - 2, {
          size: 9.5, align: 'center', mono: true, weight: 700
        });
      });
    }

  }

  /* ======================================================================
   *  三、挂载
   * ==================================================================== */

  WB.mountLab({
    id: 3,
    files: FILES,
    modes: (lab) => {
      let cur = null;
      let hud = null;
      let order = 'pre';

      const drawTreeView = (ctx, w, h) => { if (cur) drawTree(ctx, w, h, cur.tree, cur); };
      const drawHuffView = (ctx, w, h) => { if (cur) drawHuff(ctx, w, h, cur); };

      const setHud = (step) => {
        if (!hud) return;
        if (step.file === FILE_TREE) {
          hud.textContent = cur.stack ? `深度 ${cur.stack.length} · 已访问 ${(cur.visited || []).length}` : '';
        } else {
          hud.textContent = cur.i || cur.s1 ? `s1=${cur.s1 || '—'} s2=${cur.s2 || '—'} i=${cur.i}` : '';
        }
      };

      const makeTreeSteps = async () => {
        const built = buildTreeSteps();
        const walk = traverseSteps(built.tree, order);
        return {
          steps: built.steps.concat(walk),
          files: ['tree'],
          render: drawTreeView,
          onStep: (step) => { cur = step.state; setHud(step); }
        };
      };

      return {
        tree: {
          build: async () => {
            order = WB.$('[data-order="3"]')?.value || 'pre';
            return makeTreeSteps();
          },
          after: () => {
            hud = WB.$('[data-hud="3"]');
            const lg = WB.$('[data-legend="3"]');
            if (lg) lg.innerHTML = '<i class="lg-cur">当前结点</i><i class="lg-done">已访问</i><i class="lg-wait">未访问</i>';
            const wrap = WB.$('[data-order-wrap="3"]');
            if (wrap) wrap.style.display = '';
          }
        },
        huff: {
          build: async () => {
            const steps = buildHuffSteps();
            return {
              steps,
              files: ['huff'],
              render: drawHuffView,
              onStep: (step) => { cur = step.state; setHud(step); }
            };
          },
          after: () => {
            hud = WB.$('[data-hud="3"]');
            const lg = WB.$('[data-legend="3"]');
            if (lg) lg.innerHTML = '<i class="lg-cur">扫描/当前</i><i class="lg-done">叶子</i><i class="lg-wait">内部结点</i>';
            const wrap = WB.$('[data-order-wrap="3"]');
            if (wrap) wrap.style.display = 'none';
          }
        }
      };
    }
  });

  // 遍历次序改变：重建当前实验的步骤（保持循环播放）
  document.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-order="3"]');
    if (!sel) return;
    const lab = WB.labs.get(3);
    if (!lab) return;
    lab.mode = null;
    lab.setMode('tree');
  });
})();
