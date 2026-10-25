/* ============================================================================
 *  lab1.js —— 实验一：稀疏多项式链表 + 列主元高斯消元（2D）
 *  动画步骤严格照抄 lab1/Polynominal.cpp 与 lab1/LinearSystem.cpp 的语句顺序，
 *  每一步都带 file + line，右侧源码据此高亮。
 * ==========================================================================*/

(() => {
  const P = WB.P;
  const FILE_POLY = 'src/lab1/Polynominal.cpp';
  const FILE_GAUSS = 'src/lab1/LinearSystem.cpp';

  const FILES = [
    { key: 'poly', path: FILE_POLY, label: 'Polynominal.cpp', note: '单链表多项式，人工编写 268 行' },
    { key: 'gauss', path: FILE_GAUSS, label: 'LinearSystem.cpp', note: '列主元高斯-约当，人工编写 150 行' }
  ];

  /* ======================================================================
   *  一、多项式：数据与步骤
   * ==================================================================== */

  // 特意选一组能演示“同类项合并 + 系数抵消删结点”的数据
  const TERMS_A = [{ c: 3, e: 6 }, { c: 2, e: 3 }, { c: -5, e: 0 }];
  const TERMS_B = [{ c: 4, e: 6 }, { c: -2, e: 3 }, { c: 7, e: 1 }, { c: 1, e: 0 }];

  const clone = (o) => JSON.parse(JSON.stringify(o));

  function fmtCoef(c) {
    const s = Number.isInteger(c) ? String(c) : String(Math.round(c * 100) / 100);
    return s;
  }

  function polyText(list) {
    if (!list.length) return '0';
    return list.map((t, i) => {
      const abs = Math.abs(t.c);
      const sign = t.c < 0 ? '−' : (i ? '+' : '');
      let body;
      if (t.e === 0) body = fmtCoef(abs);
      else if (t.e === 1) body = (abs === 1 ? '' : fmtCoef(abs)) + 'x';
      else body = (abs === 1 ? '' : fmtCoef(abs)) + 'x^' + t.e;
      return sign + body;
    }).join('');
  }

  /** 复刻 InsertInOrder：返回是否插入成功，并把过程写进 steps
   *  target = 'R' 时是 AddPolyn 里的 psum，'A' / 'B' 时是建构多项式本身
   */
  function insertInOrder(st, steps, term, target = 'R') {
    const list = st[target];
    const label = target === 'R' ? 'psum' : target;
    const push = (line, desc, extra = {}, hold) => {
      Object.assign(st, extra);
      steps.push({
        file: FILE_POLY, line, desc,
        state: clone(st), hold: hold || 1
      });
    };

    push(118, `InsertInOrder(${label}, ${fmtCoef(term.c)}, ${term.e})：pre 指向头结点`,
      { insPre: -1, insGhost: target === 'R' ? term : null, insSlot: 0, flash: null });

    let pre = -1;
    while (pre + 1 < list.length && list[pre + 1].e > term.e) {
      pre++;
      push(119, `pre->next 的指数 ${list[pre].e} > ${term.e}，pre 继续后移`,
        { insPre: pre, insGhost: target === 'R' ? term : null, insSlot: pre + 1 });
    }

    if (pre + 1 < list.length && list[pre + 1].e === term.e) {
      const merged = list[pre + 1].c + term.c;
      push(122, `发现同类项：${list[pre + 1].e} 次项已存在，系数 ${fmtCoef(list[pre + 1].c)} + ${fmtCoef(term.c)}`,
        { insPre: pre, insGhost: null, flash: { list: target, i: pre + 1 } });
      if (Math.abs(merged) < 1e-12) {
        list.splice(pre + 1, 1);
        push(124, '合并后系数为 0，删除该结点（链表里不留零项）',
          { insGhost: null, flash: null, insPre: -1 });
      } else {
        list[pre + 1].c = merged;
        push(123, `系数写回：${fmtCoef(merged)}x^${term.e}`,
          { flash: { list: target, i: pre + 1 } });
      }
      return;
    }

    list.splice(pre + 1, 0, { c: term.c, e: term.e });
    push(135, '申请新结点 s，填入系数与指数',
      { insPre: pre, insGhost: null, insSlot: pre + 1, flash: { list: target, i: pre + 1 } });
    push(138, 's->next = pre->next：先把后面的链挂到 s 上',
      { flash: { list: target, i: pre + 1 } });
    push(139, 'pre->next = s：再把 s 接到 pre 后面（顺序不能反）',
      { flash: { list: target, i: pre + 1 } });
  }

  function buildPolySteps() {
    const steps = [];
    const st = {
      A: [], B: [], R: [],
      pa: null, pb: null,
      insPre: -1, insGhost: null, insSlot: null,
      flash: null, phase: 'build', result: '',
      cmp: '', note: ''
    };
    const push = (line, desc, extra = {}, hold) => {
      Object.assign(st, extra);
      steps.push({ file: FILE_POLY, line, desc, state: clone(st), hold: hold || 1 });
    };

    /* ---- 建 A、B 两个有序表 ---- */
    push(146, 'CreatePolyn(A)：先 InitList，申请头结点，表长为 0',
      { note: '建表' });
    TERMS_A.forEach((t) => {
      insertInOrder(st, steps, t, 'A');
    });
    push(146, 'A 建好了：' + polyText(st.A) + '（指数降序）', { note: '建表' }, 1.6);

    push(146, 'CreatePolyn(B)：同样按指数降序插入', { note: '建表' });
    TERMS_B.forEach((t) => insertInOrder(st, steps, t, 'B'));
    push(146, 'B 建好了：' + polyText(st.B), { note: '建表' }, 1.6);

    /* ---- AddPolyn ---- */
    push(190, 'AddPolyn 开始：InitList(psum)，结果表为空', { phase: 'merge', note: '归并' });
    st.pa = 0; st.pb = 0;
    push(191, 'tempa = pa.head->next：指针落在 A 的第一个结点', { pa: 0 });
    push(192, 'tempb = pb.head->next：指针落在 B 的第一个结点', { pb: 0 });

    let guard = 0;
    while (st.pa < st.A.length && st.pb < st.B.length && guard++ < 60) {
      const a = st.A[st.pa], b = st.B[st.pb];
      push(194, `while 条件成立：A 的 ${a.e} 次项 vs B 的 ${b.e} 次项`,
        { cmp: `${fmtCoef(a.c)}x^${a.e}  vs  ${fmtCoef(b.c)}x^${b.e}`, flash: null });

      if (a.e < b.e) {
        push(195, `A 的指数 ${a.e} < B 的 ${b.e}，先处理 A 的项`, { cmp: '' });
        push(196, `InsertInOrder(psum, ${fmtCoef(a.c)}, ${a.e})`);
        insertInOrder(st, steps, a);
        st.pa++;
        push(197, 'tempa = tempa->next，A 指针后移', { flash: null, cmp: '' });
      } else if (a.e > b.e) {
        push(199, `A 的指数 ${a.e} > B 的 ${b.e}，先处理 B 的项`, { cmp: '' });
        push(200, `InsertInOrder(psum, ${fmtCoef(b.c)}, ${b.e})`);
        insertInOrder(st, steps, b);
        st.pb++;
        push(201, 'tempb = tempb->next，B 指针后移', { flash: null, cmp: '' });
      } else {
        const c = a.c + b.c;
        push(204, `指数相同（${a.e}），进入 else 分支合并系数`, { cmp: '' });
        push(205, `double c = ${fmtCoef(a.c)} + ${fmtCoef(b.c)} = ${fmtCoef(c)}`);
        if (Math.abs(c) > 1e-12) {
          push(206, `c ≠ 0，把 ${fmtCoef(c)}x^${a.e} 插入结果表`);
          insertInOrder(st, steps, { c, e: a.e });
        } else {
          push(206, 'c = 0：这一项抵消了，整项不进入结果表（链表中不留零项）',
            { flash: null, insGhost: null });
        }
        st.pa++; st.pb++;
        push(210, 'tempa、tempb 同时后移', { flash: null });
      }
    }

    while (st.pa < st.A.length) {
      const a = st.A[st.pa];
      push(214, 'A 还有剩余，while (tempa != NULL) 把剩下的项全部搬过去');
      push(215, `InsertInOrder(psum, ${fmtCoef(a.c)}, ${a.e})`);
      insertInOrder(st, steps, a);
      st.pa++;
      push(216, 'tempa = tempa->next', { flash: null });
    }

    while (st.pb < st.B.length) {
      const b = st.B[st.pb];
      push(219, 'B 还有剩余，整段搬到结果表');
      push(220, `InsertInOrder(psum, ${fmtCoef(b.c)}, ${b.e})`);
      insertInOrder(st, steps, b);
      st.pb++;
      push(221, 'tempb = tempb->next', { flash: null });
    }

    push(226, 'psum 建好：' + polyText(st.R) + '。函数返回，结果表由调用者负责销毁',
      { phase: 'done', result: polyText(st.R), note: '完成', pa: null, pb: null, insGhost: null, insPre: -1 }, 2.2);

    return steps;
  }

  /* ---------------- 多项式绘制 ---------------- */

  function termNode(ctx, x, y, w, h, term, opt = {}) {
    const { fill = '#fffdf5', stroke = P.ink, lw = 1.8, label = null, alpha = 1, dash = false } = opt;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (dash) ctx.setLineDash([4, 3]);
    P.box(ctx, x, y, w, h, { fill, stroke, lw, r: 5, shadow: dash ? 0 : 3 });
    ctx.setLineDash([]);

    P.text(ctx, `${fmtCoef(term.c)}`, x + w / 2, y + h * 0.36, {
      size: Math.max(13, Math.min(20, h * 0.4)), weight: 800, align: 'center', mono: true
    });
    P.text(ctx, `x^${term.e}`, x + w / 2, y + h * 0.73, {
      size: Math.max(10, Math.min(14, h * 0.26)), weight: 600, align: 'center', color: '#5b6577', mono: true
    });
    if (label) {
      P.text(ctx, label, x + w / 2, y - 8, { size: 10, align: 'center', color: P.muted });
    }
    ctx.restore();
  }

  function drawPoly(ctx, w, h, st) {
    const compact = w < 620;
    const maxLen = Math.max(st.A.length, st.B.length, st.R.length, 4);
    const gap = compact ? 14 : Math.max(18, Math.min(32, w * 0.024));
    const nodeW = WB.clamp((w - 150 - gap * maxLen) / maxLen, 58, 148);
    const nodeH = WB.clamp(nodeW * 0.5, 38, 64);
    const headW = compact ? 38 : 46;
    const totalW = headW + 10 + maxLen * (nodeW + gap);
    const startX = Math.max(72, (w - totalW) / 2 + headW + 10);

    const rows = [
      { key: 'A', y: h * 0.20, list: st.A, ptr: st.pa, title: 'A', expr: polyText(st.A) },
      { key: 'B', y: h * 0.43, list: st.B, ptr: st.pb, title: 'B', expr: polyText(st.B) },
      { key: 'R', y: h * 0.71, list: st.R, ptr: null, title: 'psum', expr: polyText(st.R) }
    ];

    // 输入区 / 结果区之间的分界
    ctx.save();
    ctx.strokeStyle = 'rgba(27,34,48,.18)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(18, h * 0.565);
    ctx.lineTo(w - 18, h * 0.565);
    ctx.stroke();
    ctx.restore();

    rows.forEach(row => {
      const isR = row.key === 'R';
      // 表名
      P.text(ctx, row.title, 14, row.y + nodeH / 2, {
        size: isR ? 12 : 16, weight: 800, color: isR ? P.red : P.ink
      });

      // 头结点
      P.box(ctx, startX - headW - 8, row.y, headW, nodeH, {
        fill: '#ece5d4', stroke: P.ink, lw: 1.6, r: 4, shadow: 2
      });
      P.text(ctx, 'H', startX - headW / 2 - 8, row.y + nodeH * 0.38, {
        size: 11, weight: 800, align: 'center', color: '#5b5f6e'
      });
      P.text(ctx, 'head', startX - headW / 2 - 8, row.y + nodeH * 0.72, {
        size: 8.5, align: 'center', color: P.muted
      });

      // 头指针箭头
      P.arrow(ctx, startX - headW - 6, row.y + nodeH / 2, startX - 4, row.y + nodeH / 2, { lw: 1.4 });

      row.list.forEach((t, i) => {
        const x = startX + i * (nodeW + gap);
        const active = row.key === 'A' ? st.pa === i : row.key === 'B' ? st.pb === i : false;
        const flash = st.flash && st.flash.list === row.key && st.flash.i === i;

        let fill = '#fffdf5';
        if (active) fill = '#ffe9b0';
        if (flash) fill = '#cdebd5';

        termNode(ctx, x, row.y, nodeW, nodeH, t, {
          fill,
          lw: active || flash ? 2.4 : 1.8,
          alpha: 1
        });

        if (active) {
          P.text(ctx, row.key === 'A' ? 'pa' : 'pb', x + nodeW / 2, row.y - 12, {
            size: 11, weight: 800, align: 'center', color: P.red
          });
          P.arrow(ctx, x + nodeW / 2, row.y - 9, x + nodeW / 2, row.y - 2, { color: P.red, lw: 1.4, head: 5 });
        }

        // next 指针
        if (i < row.list.length - 1) {
          P.arrow(ctx, x + nodeW + 2, row.y + nodeH / 2, x + nodeW + gap - 3, row.y + nodeH / 2, { lw: 1.4 });
        } else {
          P.arrow(ctx, x + nodeW + 2, row.y + nodeH / 2, x + nodeW + gap - 3, row.y + nodeH / 2, { lw: 1.2 });
          P.text(ctx, '∧', x + nodeW + gap, row.y + nodeH / 2, { size: 13, weight: 700, color: '#8b93a3' });
        }
      });

      if (!row.list.length) {
        P.text(ctx, 'NULL', startX + 6, row.y + nodeH / 2, { size: 10.5, color: '#9aa2b1', mono: true });
      }

      // 表达式：右侧放得下就放右边，放不下就放到链表下方
      const listEnd = startX + row.list.length * (nodeW + gap) + 22;
      const exprText = '= ' + row.expr;
      ctx.font = '500 11.5px ui-monospace, Menlo, monospace';
      const exprW = ctx.measureText(exprText).width + 16;

      if (listEnd + exprW < w - 16) {
        P.text(ctx, exprText, listEnd, row.y + nodeH / 2 - 4, {
          size: 11.5, color: '#7f8899', mono: true
        });
        P.text(ctx, '表长 ' + row.list.length, listEnd, row.y + nodeH / 2 + 13, {
          size: 9.5, color: '#b0b7c3', mono: true
        });
      } else {
        P.text(ctx, exprText, startX, row.y + nodeH + 16, {
          size: 10.5, color: '#7f8899', mono: true
        });
      }

      // pre 指针（结果表插入位置的前驱）
      if (isR && st.insPre != null && !st.insGhost) {
        const px2 = st.insPre < 0
          ? startX - headW / 2 - 8
          : startX + st.insPre * (nodeW + gap) + nodeW / 2;
        P.text(ctx, 'pre', px2, row.y + nodeH + 14, {
          size: 10, weight: 800, align: 'center', color: P.red
        });
        P.arrow(ctx, px2, row.y + nodeH + 9, px2, row.y + nodeH + 2, {
          color: P.red, lw: 1.3, head: 5
        });
      }

      // 插入位置标记（结果表）
      if (isR && st.insGhost) {
        const slot = st.insSlot == null ? row.list.length : st.insSlot;
        const x = startX + slot * (nodeW + gap);
        termNode(ctx, x, row.y, nodeW, nodeH, st.insGhost, {
          fill: 'rgba(205,235,213,.55)', stroke: P.green, lw: 2, dash: true, alpha: .95
        });
        P.text(ctx, '待插入', x + nodeW / 2, row.y + nodeH + 11, {
          size: 9.5, align: 'center', color: P.green
        });
      }
    });

    // 比较气泡
    if (st.cmp) {
      const bw = Math.min(w - 40, 240);
      const bx = w - bw - 18;
      const by = h * 0.53;
      P.box(ctx, bx, by, bw, 40, { fill: '#fff8e4', stroke: P.ink, lw: 1.6, r: 4, shadow: 3 });
      P.text(ctx, '比较指数', bx + 10, by + 13, { size: 9.5, color: P.muted });
      P.text(ctx, st.cmp, bx + 10, by + 28, { size: 12, weight: 700, mono: true });
    }

    // 图例 / 结果
    if (st.phase === 'done') {
      const text = 'psum = ' + st.result;
      ctx.font = '800 13.5px "PingFang SC", sans-serif';
      const bw = Math.min(w - 36, ctx.measureText(text).width + 90);
      P.box(ctx, 18, h - 62, Math.max(bw, 220), 40, { fill: '#fff3d6', stroke: P.ink, lw: 2, r: 4, shadow: 3 });
      P.text(ctx, '运算结果', 30, h - 49, { size: 9.5, color: P.muted });
      P.text(ctx, text, 30, h - 32, { size: 13.5, weight: 800, color: P.red });
    }

  }

  /* ======================================================================
   *  二、高斯消元：数据与步骤
   * ==================================================================== */

  const GAUSS_BASE = [
    [1, 1, 1, 6],
    [2, -1, 1, 3],
    [3, 2, -1, 4]
  ];

  const gfmt = (v) => {
    if (Math.abs(v) < 1e-9) return '0';
    const r = Math.round(v * 1000) / 1000;
    return Number.isInteger(r) ? String(r) : r.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  };

  function buildGaussSteps() {
    const m = GAUSS_BASE.length;
    const n = GAUSS_BASE[0].length - 1;
    const steps = [];

    const st = {
      M: GAUSS_BASE.map(r => r.slice()),
      m, n,
      row: 0, col: -1,
      scan: null,          // 正在扫描的主元列候选
      pivotRow: null,
      swap: null,
      active: null,        // [i,j]
      factor: null,
      normalize: null,
      pivotCol: [],
      op: '',
      rank: null,
      answer: null,
      phase: 'init'
    };

    const push = (line, desc, extra = {}, hold) => {
      Object.assign(st, extra);
      steps.push({ file: FILE_GAUSS, line, desc, state: clone(st), hold: hold || 1 });
    };

    push(21, '构造增广矩阵 M = [A | b]，规模 3 行 × 4 列', { phase: 'build' });
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) st.M[i][j] = GAUSS_BASE[i][j];
      st.M[i][n] = GAUSS_BASE[i][n];
    }
    push(24, '常数项搬到第 4 列，接下来只对 M 做行变换', { phase: 'gauss' }, 1.3);

    let row = 0;
    const pivotCol = [];

    for (let col = 0; col < n && row < m; col++) {
      let pivot = -1;
      let best = 1e-9;
      push(29, `处理第 ${col + 1} 列：for (col = ${col}; col < ${n} && row < ${m}; ++col)`,
        { col, row, pivotRow: null, active: null, normalize: null, factor: null, op: '' });

      for (let i = row; i < m; i++) {
        const v = Math.abs(st.M[i][col]);
        push(34, `扫描第 ${i + 1} 行：|M[${i}][${col}]| = ${gfmt(v)}，当前最大 ${gfmt(best)}`,
          { active: [i, col], scan: i });
        if (v > best) {
          best = v;
          pivot = i;
          push(35, `更大，记下主元行 pivot = ${i}（值 ${gfmt(st.M[i][col])}）`,
            { active: [i, col], pivotRow: i });
        }
      }

      if (pivot === -1) {
        push(39, `第 ${col + 1} 列全为 0，跳过：x${col + 1} 是自由变量`,
          { op: `第 ${col + 1} 列无主元`, active: null, pivotRow: null });
        continue;
      }

      st.pivotRow = pivot;
      if (pivot !== row) {
        const tmp = st.M[row]; st.M[row] = st.M[pivot]; st.M[pivot] = tmp;
        push(41, `std::swap(M[${row}], M[${pivot}])：把主元行换到第 ${row + 1} 行`,
          { op: `R${row + 1} ⇄ R${pivot + 1}`, swap: [row, pivot], active: null }, 1.4);
      } else {
        push(41, `主元本来就在第 ${row + 1} 行，不需要交换`, { op: '无需换行', active: null });
      }

      const pv = st.M[row][col];
      push(44, `主元 pv = M[${row}][${col}] = ${gfmt(pv)}，准备把主元行归一化`,
        { active: [row, col], op: `pv = ${gfmt(pv)}` });
      for (let j = col; j <= n; j++) {
        st.M[row][j] = st.M[row][j] / pv;
        push(45, `M[${row}][${j}] /= ${gfmt(pv)} → ${gfmt(st.M[row][j])}`,
          { active: [row, j], normalize: row, op: `R${row + 1} ÷ ${gfmt(pv)}` });
      }

      for (let i = 0; i < m; i++) {
        if (i === row) continue;
        const factor = st.M[i][col];
        if (Math.abs(factor) < 1e-9) {
          push(51, `第 ${i + 1} 行主元列已是 0，跳过`, { active: [i, col], factor: 0 });
          continue;
        }
        push(50, `factor = M[${i}][${col}] = ${gfmt(factor)}，用它消去第 ${i + 1} 行的 x${col + 1}`,
          { active: [i, col], factor, op: `R${i + 1} − ${gfmt(factor)}·R${row + 1}` }, 1.3);
        for (let j = col; j <= n; j++) {
          st.M[i][j] = st.M[i][j] - factor * st.M[row][j];
          push(52, `M[${i}][${j}] -= ${gfmt(factor)} × M[${row}][${j}] → ${gfmt(st.M[i][j])}`,
            { active: [i, j], factor });
        }
      }

      pivotCol[row] = col;
      row++;
      push(56, `pivotCol[${row - 1}] = ${col}，主元行数 ++row = ${row}`, {
        pivotCol: pivotCol.slice(), active: null, factor: null, normalize: null, swap: null
      }, 1.3);
    }

    push(61, '消元结束，开始判解：检查是否存在 0 = 非零 的行', {
      phase: 'classify', active: null, factor: null, normalize: null
    });

    st.rank = row;
    push(68, `rank = ${row}，未知数个数 n = ${n}`,
      { phase: 'classify', op: `r(A) = ${row}` });

    if (row === n) {
      // 唯一解：主元变量取值就是最后一列
      st.answer = [];
      for (let i = 0; i < row; i++) st.answer[pivotCol[i]] = st.M[i][n];
      push(71, 'rank == n，方程组有唯一解', { phase: 'done', op: '唯一解' });
      st.answer.forEach((v, i) => {
        push(74, `x${i + 1} = M[${i}][${n}] = ${gfmt(v)}`, {
          active: [i, n], phase: 'done'
        }, 1.5);
      });
    }

    push(75, '返回 Solution：type = 1（唯一解），系数矩阵已是行最简形', {
      phase: 'done', active: null, op: '完成'
    }, 1.8);

    return steps;
  }

  /* ---------------- 高斯消元绘制 ---------------- */

  function drawGauss(ctx, w, h, st) {
    const m = st.m, n = st.n;
    const cw = Math.min(106, Math.max(56, (w - 230) / (n + 1)));
    const ch = Math.min(58, Math.max(38, cw * 0.62));
    const gapY = 12;
    const gridW = cw * (n + 1);
    const gridH = ch * m + gapY * (m - 1);
    const ox = (w - gridW) / 2;
    const oy = Math.max(62, (h - gridH) / 2 - 18);
    const fs2 = Math.max(12, Math.min(18, cw * 0.26));

    // 标题
    P.text(ctx, '增广矩阵 [ A | b ]', ox, oy - 34, { size: 13, weight: 800 });
    P.text(ctx, '行变换不改变解集', ox + gridW, oy - 34, {
      size: 10.5, align: 'right', color: P.muted
    });

    // 列标题
    for (let j = 0; j < n; j++) {
      P.text(ctx, 'x' + (j + 1), ox + j * cw + cw / 2, oy - 12, {
        size: 10.5, align: 'center', color: P.muted, mono: true
      });
    }
    P.text(ctx, 'b', ox + n * cw + cw / 2, oy - 12, {
      size: 11, align: 'center', color: P.amber, mono: true, weight: 700
    });

    // 方括号
    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 2;
    const bx1 = ox - 16, bx2 = ox + gridW + 10;
    ctx.beginPath();
    ctx.moveTo(bx1 + 8, oy - 8); ctx.lineTo(bx1, oy - 8); ctx.lineTo(bx1, oy + gridH + 8); ctx.lineTo(bx1 + 8, oy + gridH + 8);
    ctx.moveTo(bx2 - 8, oy - 8); ctx.lineTo(bx2, oy - 8); ctx.lineTo(bx2, oy + gridH + 8); ctx.lineTo(bx2 - 8, oy + gridH + 8);
    ctx.stroke();
    ctx.restore();

    // 增广竖线
    ctx.save();
    ctx.strokeStyle = 'rgba(27,34,48,.45)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(ox + n * cw - 1, oy - 2);
    ctx.lineTo(ox + n * cw - 1, oy + gridH + 2);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < m; i++) {
      const y = oy + i * (ch + gapY);
      P.text(ctx, 'R' + (i + 1), ox - 24, y + ch / 2, {
        size: 10.5, align: 'right', mono: true,
        color: i === st.row ? P.red : P.muted,
        weight: i === st.row ? 800 : 500
      });

      for (let j = 0; j <= n; j++) {
        const x = ox + j * cw;
        const isActive = st.active && st.active[0] === i && st.active[1] === j;
        const isPivotRow = st.pivotRow === i;
        const isScan = st.scan === i && st.col === j;

        let fill = j === n ? '#fdf4dd' : '#fffdf6';
        if (isPivotRow) fill = j === n ? '#fbeccb' : '#eef5fd';
        if (isScan && !isActive) fill = '#ffeec2';
        if (isActive) fill = '#ffd98a';

        P.box(ctx, x, y, cw - 2, ch, {
          fill, stroke: isActive ? P.ink : '#cbc3b0',
          lw: isActive ? 2.2 : 1.2, r: 2,
          shadow: isActive ? 2 : 0
        });

        const v = st.M[i][j];
        P.text(ctx, gfmt(v), x + (cw - 2) / 2, y + ch / 2 + 1, {
          size: fs2, weight: isActive ? 800 : 600, align: 'center', mono: true,
          color: Math.abs(v) < 1e-9 ? '#a9afba' : P.ink
        });
      }
    }

    // 主元位置：蓝色虚线框
    if (st.pivotCol && st.pivotCol.length) {
      ctx.save();
      ctx.strokeStyle = P.blue;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 3]);
      st.pivotCol.forEach((c, r) => {
        const y = oy + r * (ch + gapY);
        ctx.strokeRect(ox + c * cw - 1, y - 1, cw, ch + 2);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 当前操作：左上角
    if (st.op) {
      ctx.font = '800 12.5px ui-monospace, Menlo, monospace';
      const tw = ctx.measureText(st.op).width;
      const bw = Math.min(w - 40, tw + 28);
      P.box(ctx, 16, 12, bw, 30, { fill: '#fff3d0', stroke: P.ink, lw: 1.6, r: 3, shadow: 3 });
      P.text(ctx, st.op, 16 + bw / 2, 28, {
        size: 12.5, weight: 800, align: 'center', mono: true
      });
    }

    // 解
    if (st.answer) {
      const bw = Math.min(w - 40, 330);
      const bx = 18;
      const by = h - 64;
      P.box(ctx, bx, by, bw, 44, { fill: '#eaf7ec', stroke: P.ink, lw: 2, r: 4, shadow: 3 });
      P.text(ctx, '唯一解', bx + 12, by + 16, { size: 9.5, color: P.muted });
      P.text(ctx, st.answer.map((v, i) => 'x' + (i + 1) + '=' + gfmt(v)).join('   '), bx + 12, by + 32, {
        size: 13, weight: 800, color: P.green, mono: true
      });
    }

    P.text(ctx, '蓝色虚线：主元位置　·　虚线右侧为常数列', 18, h - 14, { size: 9.5, color: '#9aa2b1' });
  }

  /* ======================================================================
   *  三、挂载
   * ==================================================================== */

  WB.mountLab({
    id: 1,
    files: FILES,
    modes: (lab, view) => {
      let cur = null;
      let hud = null;

      const applyStep = (step) => { cur = step.state; };

      const drawPolyView = (ctx, w, h) => { if (cur) drawPoly(ctx, w, h, cur); };
      const drawGaussView = (ctx, w, h) => { if (cur) drawGauss(ctx, w, h, cur); };

      const hudText = (step) => {
        let txt = '';
        if (step.file === FILE_POLY) {
          const s = step.state;
          txt = `A ${s.A.length} 项 · B ${s.B.length} 项 · psum ${s.R.length} 项`;
        } else {
          const s = step.state;
          txt = `pivotCol = [${(s.pivotCol || []).join(', ')}] · row = ${s.row}`;
        }
        if (hud) hud.textContent = txt;
      };

      return {
        poly: {
          build: async () => {
            const steps = buildPolySteps();
            return {
              steps,
              files: ['poly'],
              render: drawPolyView,
              onStep: (step) => { applyStep(step); hudText(step); }
            };
          },
          after: () => {
            hud = WB.$('[data-hud="1"]');
            const lg = WB.$('[data-legend="1"]');
            if (lg) lg.innerHTML = '<i class="lg-cur">当前指针</i><i class="lg-done">刚插入</i><i class="lg-wait">普通结点</i>';
          }
        },
        gauss: {
          build: async () => {
            const steps = buildGaussSteps();
            return {
              steps,
              files: ['gauss'],
              render: drawGaussView,
              onStep: (step) => { applyStep(step); hudText(step); }
            };
          },
          after: () => {
            hud = WB.$('[data-hud="1"]');
            const lg = WB.$('[data-legend="1"]');
            if (lg) lg.innerHTML = '<i class="lg-cur">当前单元格</i><i class="lg-done">主元行</i><i class="lg-wait">待处理</i>';
          }
        }
      };
    }
  });
})();
