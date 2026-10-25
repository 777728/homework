/* ============================================================================
 *  annotations.js —— 人工编写标注
 *  ---------------------------------------------------------------------------
 *  以函数为单位标注源码的归属：
 *    core   人工编写的核心算法（考试/答辩要看的部分）
 *    helper 人工编写的配套代码（输入输出、菜单、内存释放、样板）
 *    data   人工整理/测量的数据
 *  行号与 web/src/ 下的真实文件一一对应（文件直接从 lab_without_ai 拷来，未改一行）。
 * ==========================================================================*/

WB.ANNOT = {
  'src/lab1/Polynominal.cpp': [
    { from: 4, to: 13, kind: 'helper', label: 'MakeNode 申请结点' },
    { from: 14, to: 21, kind: 'helper', label: 'InitList 带头结点的空表' },
    { from: 22, to: 32, kind: 'helper', label: 'DestroyList 释放整表' },
    { from: 33, to: 115, kind: 'helper', label: 'ParsePolyn 表达式解析（手写词法扫描）' },
    { from: 116, to: 144, kind: 'core', label: 'InsertInOrder 按指数降序插入 / 合并同类项' },
    { from: 145, to: 151, kind: 'helper', label: 'CreatePolyn 由系数数组建表' },
    { from: 152, to: 154, kind: 'helper', label: 'DestroyPolyn' },
    { from: 155, to: 188, kind: 'helper', label: 'PrintPolyn 输出格式（系数 ±1、指数 1 的省略）' },
    { from: 189, to: 227, kind: 'core', label: 'AddPolyn 双指针归并相加' },
    { from: 228, to: 266, kind: 'core', label: 'SubPolyn 双指针归并相减' },
    { from: 267, to: 277, kind: 'core', label: 'MultiplyPolyn 逐项相乘 + 有序插入' },
    { from: 278, to: 287, kind: 'core', label: 'DiffPolyn 求导' }
  ],

  'src/lab1/LinearSystem.cpp': [
    { from: 6, to: 9, kind: 'helper', label: 'EPS 与浮点零判定' },
    { from: 11, to: 107, kind: 'core', label: 'SolveLinearSystem 列主元高斯-约当消元' },
    { from: 109, to: 150, kind: 'helper', label: 'PrintSolution 三种解的输出' }
  ],

  'src/lab2/maze_solver.cpp': [
    { from: 7, to: 9, kind: 'core', label: 'Pass 通行判定' },
    { from: 10, to: 19, kind: 'core', label: 'NextPos 方向码 → 相邻坐标' },
    { from: 20, to: 64, kind: 'core', label: 'MazePath 链表栈 + 深度优先 + 回溯' },
    { from: 65, to: 86, kind: 'helper', label: 'PrintPath 逆序输出三元组' }
  ],

  'src/lab2/link_stack.cpp': [
    { from: 4, to: 7, kind: 'helper', label: 'InitStack' },
    { from: 8, to: 10, kind: 'helper', label: 'StackEmpty' },
    { from: 11, to: 19, kind: 'helper', label: 'DestroyStack' },
    { from: 20, to: 22, kind: 'helper', label: 'StackLength' },
    { from: 23, to: 29, kind: 'core', label: 'Push 头插法压栈' },
    { from: 30, to: 40, kind: 'core', label: 'Pop 弹栈并回填元素' },
    { from: 41, to: 47, kind: 'helper', label: 'GetTop' }
  ],

  'src/lab3/BiTree.cpp': [
    { from: 5, to: 14, kind: 'core', label: 'CreateBiTree 先序序列递归建树' },
    { from: 15, to: 21, kind: 'helper', label: 'DestroyBiTree' },
    { from: 22, to: 39, kind: 'core', label: '递归遍历：先序 / 中序 / 后序' },
    { from: 40, to: 49, kind: 'core', label: 'PreOrderIter 显式栈先序' },
    { from: 50, to: 59, kind: 'core', label: 'InOrderIter 显式栈中序' },
    { from: 60, to: 69, kind: 'core', label: 'PostOrderIter 双指针后序' },
    { from: 70, to: 76, kind: 'helper', label: 'PrintBiTree 逆中序凹入打印' }
  ],

  'src/lab3/Huffman.cpp': [
    { from: 6, to: 13, kind: 'core', label: 'Select 取两个权值最小的根' },
    { from: 14, to: 32, kind: 'core', label: 'CreateHuffmanTree 静态数组建树' },
    { from: 33, to: 49, kind: 'core', label: 'HuffmanCoding 由叶子回溯求编码' },
    { from: 50, to: 56, kind: 'helper', label: 'DestroyHuffman' },
    { from: 57, to: 67, kind: 'helper', label: 'PrintHuffmanCode 编码表' },
    { from: 68, to: 81, kind: 'core', label: 'Encode 电文 → 0/1 串' },
    { from: 82, to: 98, kind: 'core', label: 'Decode 0/1 串 → 电文' }
  ],

  'src/lab3/TreeConvert.cpp': [
    { from: 4, to: 30, kind: 'core', label: 'CreateTree 括号表示建一般树' },
    { from: 32, to: 38, kind: 'helper', label: 'DestroyTree' },
    { from: 40, to: 53, kind: 'helper', label: 'PrintTreeBracket' },
    { from: 56, to: 63, kind: 'core', label: 'TreeToBiTree 左孩子—右兄弟' },
    { from: 65, to: 72, kind: 'core', label: 'BiTreeToTree 逆变换' }
  ],

  'src/lab4/PathAlgorithms.cpp': [
    { from: 13, to: 17, kind: 'helper', label: 'checkVertex 入参校验' },
    { from: 21, to: 42, kind: 'core', label: 'depthFirstTraversal 显式栈 DFS' },
    { from: 44, to: 63, kind: 'core', label: 'breadthFirstTraversal 队列 BFS' },
    { from: 65, to: 110, kind: 'core', label: 'dijkstra 小根堆 + 松弛 + prev 回溯' },
    { from: 112, to: 144, kind: 'core', label: 'floydWarshall 三重循环全源最短路' },
    { from: 146, to: 168, kind: 'core', label: 'reconstructPath 用 next 矩阵还原路径' },
    { from: 170, to: 266, kind: 'core', label: 'planBestTour 状态压缩 DP 排途经点' },
    { from: 268, to: 389, kind: 'core', label: 'findHamiltonianCycle 回溯 + 三重剪枝' }
  ],

  'src/lab4/CampusData.cpp': [
    { from: 7, to: 103, kind: 'data', label: '22 个地点 + 46 条道路（人工按示意图量取）' },
    { from: 105, to: 113, kind: 'helper', label: 'gateIndices 取出五个校门' },
    { from: 115, to: 126, kind: 'data', label: 'classicStops 经典打卡路线' }
  ],

  'src/lab4/CampusGraph.h': [
    { from: 10, to: 18, kind: 'data', label: 'Place 顶点结构：名称/类别/简介/坐标' },
    { from: 21, to: 43, kind: 'core', label: 'CampusGraph 邻接矩阵图 ADT' }
  ]
};
