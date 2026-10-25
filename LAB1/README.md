# 数据结构实验 · 算法可视化（实验一 / 二 / 三 / 四）

> 四个实验共用一套 C 算法模块和一个本地界面服务：
>
> - **实验一 线性表**：一元稀疏多项式计算器（带头结点单链表）+ 线性方程组求解（难度 C）；
> - **实验四 数组**：m×n 矩阵迷宫，链表栈 + 深度优先搜索求通路，输出三元组路径；
> - **实验五 树**：二叉树建树与四种遍历（递归 / 非递归）、树与二叉树互转、哈夫曼编码译码；
> - **实验六 图**：校园导游（邻接矩阵无向带权图），遍历、Dijkstra 最短路径、Floyd、校园环游。
>
> 语言：C（C11）；依赖：无第三方库，仅需标准库。

---

## 一、功能一览

| 编号 | 功能 | 对应难度 |
| :--: | ---- | :------: |
| 1 | 输入并建立多项式（支持直接书写数学表达式） | A |
| 2 | 按指数降序输出多项式，符合教材输出格式 | A |
| 3 | 多项式相加 `A+B` | B |
| 4 | 多项式相减 `A-B` | B |
| 5 | 多项式相乘 `A*B` | B（选做） |
| 6 | 多项式求导 `A'` | B |
| 7 | 给定 x 求多项式的值 | A |
| 8 | 线性方程组求解：判定无解 / 唯一解 / 无穷多解，输出基础解系与通解 | C |
| 9 | 自动生成 / 自定义迷宫，求出入口到出口的通路（三元组输出） | 实验四 |
| 10 | 二叉树建树、先/中/后/层序遍历（递归 + 非递归）、树形打印 | 实验五 |
| 11 | 树与二叉树相互转换（左孩子—右兄弟） | 实验五 |
| 12 | 哈夫曼编码 / 译码器（按电文或按频度表建树） | 实验五 |
| 13 | 校园导游：遍历、最短路径、任意两点距离、不重复环游 | 实验六 |
| 14 | 自检测试：实验一 17 条 + 实验四/五/六 30 条固定用例 | — |

程序有两个入口，共用同一套算法模块：

- `app`：控制台菜单版（实验一，验收、答辩时最稳妥）；
- `app-web`：**图形界面版**，一个页面分四个区域展示四个实验，鼠标点击操作；
- `selftest`：实验四 / 五 / 六的自检测试程序（`./build.sh test`）。

---

## 二、目录结构

```
LAB1/
├── main.c            控制台版入口：主菜单、多项式菜单、方程组菜单、自检测试
├── Polynomial.h      多项式类型定义与接口声明
├── Polynomial.c      带头结点单链表 + 多项式运算 + 表达式解析
├── LinearSolver.h    矩阵与解的类型定义
├── LinearSolver.c    高斯-约当消元、秩与解的判定、通解输出
├── ui.h / ui.c       控制台界面工具（分隔线、颜色、安全输入）
├── maze.h / maze.c       实验四：迷宫（二维数组 + 链栈 + 深度优先搜索）
├── tree.h / tree.c       实验五：二叉树遍历、树与二叉树转换、哈夫曼编码
├── graph.h / graph.c     实验六：校园导游图（邻接矩阵、Dijkstra、Floyd、回路）
├── selftest.c            实验四 / 五 / 六的自检测试（30 条用例）
├── webui.c               图形界面版入口：本地服务 + 四区域页面
├── web/index.html        图形界面的页面（四个区域）
├── build.sh          一键编译脚本（macOS / Linux）
├── Makefile          make / make run / make web / make test-all / make clean
├── README.md         本文件：软件使用说明
└── 实验报告.md        CDIO 四阶段报告、算法分析与思考题
```

---

## 三、编译与运行

### macOS / Linux

```bash
./build.sh          # 编译，生成 ./app（控制台版）和 ./app-web（图形界面版）
./build.sh run      # 编译并运行控制台版
./build.sh web      # 编译并启动图形界面，浏览器自动打开
./build.sh clean    # 清理
```

或使用 make：

```bash
make && ./app        # 控制台版（实验一）
make web             # 图形界面版（实验一 / 四 / 五 / 六）
make test            # 实验一自检（17 条）
make test-all        # 实验四 / 五 / 六自检（30 条）
```

### 部署（服务器）

界面服务只依赖标准库，编译出的 `app-web` 可直接部署：

```bash
HOST=0.0.0.0 PORT=8080 ./app-web --no-open   # 对外监听 8080 端口
```

- `PORT` / 命令行第一个数字：监听端口（默认 8765）；
- `HOST=0.0.0.0`：对外开放（默认只监听本机 127.0.0.1）；
- `--no-open`：启动时不自动打开浏览器；
- 静态页面内嵌在程序读取的 `web/index.html` 中，把 `web/` 目录随程序一起部署即可。

### Windows（MinGW / Dev-C++）

把所有 `.c`、`.h` 放在同一目录，编译命令：

```
gcc -std=c11 main.c Polynomial.c LinearSolver.c ui.c -o app.exe
gcc -std=c11 webui.c Polynomial.c LinearSolver.c maze.c tree.c graph.c -o app-web.exe -lws2_32
gcc -std=c11 selftest.c maze.c tree.c graph.c -o selftest.exe
```

> 建议在 Windows Terminal 或 VS Code 终端中运行控制台版，以正常显示中文与颜色。
> 若出现乱码，请将终端编码设为 UTF-8（`chcp 65001`）。

### 手动逐个编译（便于理解）

```bash
cc -std=c11 -c Polynomial.c      # 生成 Polynomial.o
cc -std=c11 -c LinearSolver.c    # 生成 LinearSolver.o
cc -std=c11 -c ui.c              # 生成 ui.o
cc -std=c11 -c main.c            # 生成 main.o
cc main.o Polynomial.o LinearSolver.o ui.o -o app -lm
```

---

## 四、算法可视化页面（浏览器）

页面已重写为**算法可视化剧场**：左边放动画，右边同步显示 `lab_without_ai/` 里的真实源码，
动画自动循环播放，每一步都会高亮对应的代码行。

```
┌ 算法可视化剧场 ───────────────────────────────────────────────┐
│ [01 线性表] [02 栈与迷宫] [03 树与编码] [04 图·校园]            │
├────────────────────────────────┬───────────────────────────────┤
│  可视化画布（2D Canvas / 3D）  │  源码面板（行号 + 高亮）        │
│  · 多项式链表 / 高斯消元       │  Polynominal.cpp              │
│  · 迷宫 + 链表栈               │  LinearSystem.cpp  …          │
│  · 二叉树遍历 / 哈夫曼         │  · 绿=人工核心  灰=配套        │
│  · 3D 呈贡校区 + Dijkstra      │  · 黄=人工整理的数据           │
├────────────────────────────────┴───────────────────────────────┤
│ [播放] [上一步] [下一步] [重播] 进度 速度 [∞循环] [全屏]          │
└────────────────────────────────────────────────────────────────┘
```

- **实验一**：稀疏多项式（带头结点单链表）的建表 / 归并 / 合并同类项，以及列主元高斯-约当消元；
- **实验二**：二维数组迷宫 + 链表栈的深度优先回溯，栈的内容实时可见；
- **实验三**：先序建树 + 递归遍历（先序/中序/后序可切换），哈夫曼静态数组建树与编码；
- **实验四**：云南大学呈贡校区 3D 地图（three.js + 卡通渲染），Dijkstra 逐点松弛与 DFS 遍历。
  鼠标左键拖拽旋转、右键拖拽平移、滚轮缩放，点击建筑查看简介与相邻道路。

快捷键：`空格` 播放/暂停，`←` `→` 单步，`F` 全屏。每个实验都支持一键全屏并继续循环。

> **页面不再包含**卡片式表单、文件星图、过程演示与部署区块；
> 原来的 `POST /api` 计算接口保留在 `webui.c` 中，方便对照与二次开发。
>
> 为什么还用浏览器？纯 C 没有标准 GUI 库，GTK/Qt 要装几百 MB 依赖。
> `webui.c` 现在只做两件事：托管 `web/` 下的静态文件、保留原 `/api` 计算接口。
> 2D 动画用 Canvas 2D，3D 用 three.js（唯一的前端第三方库，已放在 `web/vendor/`）。

页面结构：

```
web/
├── index.html            四个实验的舞台
├── css/app.css           漫画风主题（米色纸面 / 墨线 / 网点）
├── js/core.js            播放器、源码面板、画布、实验挂载
├── js/annotations.js     人工核心代码标注（按函数、按行号）
├── js/lab1.js            多项式链表 + 高斯消元
├── js/lab2.js            迷宫 DFS
├── js/lab3.js            二叉树 + 哈夫曼
├── js/campus-data.js     22 地点 / 46 道路（与 CampusData.cpp 一致）
├── js/lab4-scene.js      3D 场景：地形、建筑、泽湖、云山、交互
├── js/lab4.js            Dijkstra / DFS 步骤与 3D 联动
├── src/lab1..lab4/       从 lab_without_ai 原样拷入的源码（面板显示用）
└── vendor/three.min.js   three.js r160
```

---

## 五、控制台版界面说明

启动后进入主菜单：

```
==============================================================
  数据结构实验 · 一元稀疏多项式计算器
==============================================================
   A = （未输入）
   B = （未输入）
--------------------------------------------------------------
   [1] 多项式计算器（加 / 减 / 乘 / 求导 / 求值）
   [2] 线性方程组求解器（难度 C）
   [3] 帮助 / 使用说明
   [4] 运行自检测试
   [0] 退出
--------------------------------------------------------------
   请选择 >
```

输入编号后回车即可。任何要求输入数字的地方，**直接回车表示取消**当前操作。

---

## 六、多项式输入格式

直接按数学书写习惯输入，程序会自动解析、合并同类项、删除零系数项：

| 输入 | 含义 |
| ---- | ---- |
| `3x^2-2x+1` | 3x² − 2x + 1 |
| `-x^3+5` | −x³ + 5 |
| `2*x^4+x` | 乘号可写可不写 |
| `9X^8+3X+7` | 指数用 `^`，X 大小写均可 |
| `7` | 常数多项式 |
| `x^2 + 3 x - 1` | 允许空格 |

规则说明：

1. 指数必须是非负整数，上限 100000；
2. 同类项自动合并，合并后系数为 0 的项自动删除；
3. 空输入表示取消，不会清空已有内容。

输出遵循教材格式 `34X^100+45X^60-4X^2+3`：

- 按指数**降序**排列；
- 系数为 ±1 的非零次项省略系数：`1x^2` 输出 `X^2`，`-x` 输出 `-X`；
- 指数为 1 时省略指数：`x^1` 输出 `X`；
- 零多项式输出 `0`。

---

## 七、线性方程组输入格式

先输入方程个数 `m` 与未知数个数 `n`，再**逐行**输入增广矩阵，每行 `n+1` 个数
（前 n 个是系数，最后一个是常数项），数与数之间用空格分隔。

例：解方程组

```
 x + y = 3
 x - y = 1
```

操作：`m = 2`，`n = 2`，两行分别输入

```
1 1 3
1 -1 1
```

然后依次选择：

- `[3]` 高斯-约当消元 → 显示行最简形；
- `[4]` 判定解的情况 → 输出 r(A)、r(A|b) 与结论；
- `[5]` 输出基础解系与通解。

---

## 八、验收测试用例（对应《数据结构题集》P81）

**多项式部分**

A(x) = 9x⁸ + 3x + 7，B(x) = x⁷ − 3.2x

| 操作 | 期望输出 |
| ---- | -------- |
| A | `9X^8+3X+7` |
| B | `X^7-3.2X` |
| A + B | `9X^8+X^7-0.2X+7` |
| A − B | `9X^8-X^7+6.2X+7` |
| A × B | `9X^15-28.8X^9+3X^8+7X^7-9.6X^2-22.4X` |
| A(1) | 19 |
| B(1) | −2.2 |
| A(1)×B(1) | −41.8 |

**其他典型用例**

| 输入 A | 输入 B | 检验点 |
| ------ | ------ | ------ |
| `x^2+2x+1` | `x^2-1` | 常数项、同类项合并 |
| `x-x` | `0` | 结果应为 `0`（系数抵消后删除结点） |
| `-x^3+5` | `x^3` | 首项为负号时的输出格式 |
| `3x^3-2x+5` | — | 求导得 `9X^2-2`（常数项丢弃） |

**方程组部分**

| 方程组 | 期望结论 |
| ------ | -------- |
| x+y=3，x−y=1 | 唯一解 (2, 1) |
| x+y=1，x+y=2 | 无解（r(A)=1 < r(A\|b)=2） |
| x+y+z=6，2x+2y+2z=12，x−y=0 | 无穷多解，1 个自由变量 |

点主菜单 `[4] 运行自检测试`，以上核心结论会被自动验证，全部通过时显示 `17 / 17`。

---

## 九、实验四 / 五 / 六 使用说明（算法要点）

**实验四 迷宫**

- 存储：`Maze.cell[i][j]` 二维数组，0 通路、1 障碍；求解后 2 是路径、3 是死路；
- 栈：单链表实现（`maze.c` 内的 `Step` / `Push` / `Pop`），结点保存
  「当前位置 + 下一个要试的方向」；
- 求解：非递归深度优先。当前位置四个方向都试过仍走不通就标记死路并退栈；
- 输出：三元组 `(i, j, d)`，d 表示走向下一格的方向（1 东 2 南 3 西 4 北），
  与《数据结构题集》的格式一致；
- 生成：随机深度优先“挖洞”，同一 seed 生成的迷宫完全相同。

**实验五 树**

- 二叉树用二叉链表存储，先序序列建树（`#` 为空）；
- 三种遍历各有递归与非递归两个版本，非递归用显式栈（后序用
  「根—右—左」再倒置的技巧）；层序遍历用队列；
- 树与二叉树转换采用左孩子—右兄弟表示法：括号表示 `A(B(E,F),C(G),D)`
  中，括号里是孩子（挂到 left，用 right 串兄弟）；
- 哈夫曼树用静态三叉数组（weight / parent / left / right）实现，
  每次选两个最小权值合并，编码由叶到根收集再倒置。

**实验六 图**

- 校园 12 个地点 + 21 条道路构成无向带权图，邻接矩阵存储；
- 遍历：DFS（递归）、BFS（队列）；
- 最短路径：Dijkstra（贪心 + prev 数组回溯路线），Floyd（三重循环松弛）；
- 校园环游：哈密尔顿回路，深度优先回溯，步数上限 200 万防止极端卡死。

---

## 十、HTTP 接口说明（供部署 / 二次开发）

所有接口都是 `POST /api`，请求体为 URL 编码的表单，返回纯文本；
出错时文本以 `ERR:` 开头。页面即是通过这些接口工作。

| op | 参数 | 功能 |
| -- | ---- | ---- |
| `add` / `sub` / `mul` | `A`, `B` | 多项式加 / 减 / 乘 |
| `deriv` | `A` | 求导 |
| `eval` | `A`, `B`, `x` | 求值 |
| `solve` | `mat`（多行方程） | 解线性方程组 |
| `mazegen` | `rows`, `cols`, `seed` | 生成迷宫 |
| `mazesolve` | 同上 + `grid`（可留空） | 生成（或解析）并求解迷宫 |
| `tree` | `pre` | 先序建树 + 四种遍历 + 树形 |
| `treeconv` | `text` | 树（括号表示）⇄ 二叉树 |
| `huff` | `mode=encode/decode`, `text`, `table`, `bits` | 哈夫曼编码 / 译码 |
| `graph` | `mode=names/list/dfs/bfs/dijkstra/floyd/tour`, `s`, `t` | 校园导游 |

curl 示例：

```bash
curl -X POST --data 'op=add&A=x^2+1&B=-x^2+x&x=1'  http://127.0.0.1:8765/api
curl -X POST --data 'op=mazesolve&rows=15&cols=21&seed=1' http://127.0.0.1:8765/api
curl -X POST --data 'op=huff&mode=encode&text=HELLO&table=' http://127.0.0.1:8765/api
curl -X POST --data 'op=graph&mode=dijkstra&s=南门&t=学生会堂' http://127.0.0.1:8765/api
```

---

## 十一、模块接口一览

```c
/* 单链表底层 */
int  MakeNode(Link *p, double coef, int expn);   /* 生成结点，指针的指针带回地址 */
int  InitList(LinkList *L);                      /* 建立头结点，head = tail */
void DestroyList(LinkList *L);                   /* 释放整表 */
void ClearList(LinkList *L);                     /* 只清数据，保留头结点 */
int  ListLength(const LinkList *L);

/* 多项式 */
int    CreatPolyn(Polynomial *p, const double *coef, const int *expn, int n);
int    CreatPolynFromString(Polynomial *p, const char *expr);  /* "3x^2-2x+1" */
void   DestroyPolyn(Polynomial *p);
int    PolyFormat(const Polynomial *p, char *buf, size_t size);
void   PrintPolyn(const Polynomial *p);
int    PolyIsZero(const Polynomial *p);
int    AddPolyn(const Polynomial *pa, const Polynomial *pb, Polynomial *psum);
int    SubPolyn(const Polynomial *pa, const Polynomial *pb, Polynomial *psub);
int    MultiplyPolyn(const Polynomial *pa, const Polynomial *pb, Polynomial *pmul);
int    DerivPolyn(const Polynomial *p, Polynomial *pd);
double EvalPolyn(const Polynomial *p, double x);

/* 线性方程组 */
void MatSetSize(Matrix *M, int m, int n);
int  MatSetValues(Matrix *M, int m, int n, const double *vals);
void MatPrint(const Matrix *M);
int  MatGaussJordan(Matrix *M, Solution *S);
void MatClassify(const Matrix *M, Solution *S);
void MatPrintSolution(const Matrix *M, const Solution *S);

/* 实验四：迷宫 */
void MazeGenerate(Maze *M, int rows, int cols, unsigned seed);
int  MazeParse(Maze *M, const char *text);          /* 文本 -> 迷宫 */
int  MazeSolve(Maze *M, int sr, int sc, int er, int ec, MazePath *P);
void MazeDraw(const Maze *M, char *out, size_t cap);
void MazePathText(const MazePath *P, char *out, size_t cap);

/* 实验五：二叉树与哈夫曼 */
Tree TreeBuild(const char *pre);                    /* 先序建树 */
void TreeFree(Tree *t);
void TreePreRec / TreeInRec / TreePostRec(...);     /* 递归遍历 */
void TreePreIter / TreeInIter / TreePostIter(...);  /* 非递归遍历 */
void TreeLevel(...);                                /* 层次遍历 */
void TreeDraw(Tree t, char *out, size_t cap);       /* 树形打印 */
Tree TreeFromGeneral(const char *text);             /* 树 -> 二叉树 */
void TreeToGeneral(Tree t, char *out, size_t cap);  /* 二叉树 -> 树 */
int  HuffmanBuildTable / HuffmanBuildText(...);     /* 建树 */
void HuffmanTableText / HuffmanEncode / HuffmanDecode(...);

/* 实验六：校园导游 */
void CampusInit(Campus *G);                         /* 载入 12 个地点 */
int  CampusFind(const Campus *G, const char *text); /* 按编号或名称找顶点 */
void CampusList / CampusMatrix / CampusDFS / CampusBFS(...);
int  CampusDijkstra(const Campus *G, int s, int t, char *out, size_t cap);
void CampusFloyd(const Campus *G, char *out, size_t cap);
int  CampusTour(const Campus *G, int s, char *out, size_t cap);
```

所有接口统一返回状态码：`POLY_OK`、`POLY_ENOMEM`（内存不足）、
`POLY_EINVAL`（参数非法）、`POLY_EPARSE`（表达式语法错误）。

---

## 十二、常见问题

**Q1：为什么不直接存成数组，而要用链表？**
一元稀疏多项式的项数远小于其最高次数。例如 `x^1000 + 1` 只有 2 项，
若用数组按次数存储需要 1001 个单元且绝大部分是 0。链表只存非零项，
空间与项数成正比，这正是本实验选择链式存储的原因（详见实验报告思考题）。

**Q2：为什么必须带头结点？**
头结点让「第一个位置」也有前驱，插入、删除第一个结点时不必单独判断
空表 / 表头，代码更统一。本程序所有插删除操作都只写一种情况。

**Q3：为什么系数用 `double` 而不是 `float`？**
`float` 只有约 7 位有效数字，`3.2`、`28.8` 这类小数在连续加减后容易出现
`28.799999` 这样的误差；`double` 有 15~16 位有效数字，配合 `1e-12` 的零判定
阈值足够稳定。

**Q4：输出里的 `0.2` 为什么不是 `0.200000`？**
格式化统一使用 `%.10g`，会自动去掉无意义的尾随 0，并保留 10 位有效数字。

**Q5：程序退出前需要释放内存吗？**
需要。`main` 返回前调用了 `DestroyPolyn(&A)`、`DestroyPolyn(&B)`，
每个临时结果在 `ShowResultAndAsk` 中要么转存为 A，要么立即释放。
用 `leaks --atExit -- ./app` 检测结果为 `0 leaks for 0 total leaked bytes`。
