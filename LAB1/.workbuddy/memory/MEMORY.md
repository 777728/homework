# LAB1 项目长期约定

## 项目性质
数据结构课程实验（云南大学，张德海班）：实验一（多项式计算器，难度 A/B/C）、
实验四（数组·迷宫）、实验五（树·二叉树与哈夫曼）、实验六（图·校园导游）。
C 语言实现；实验一用带头结点的单链表存储多项式。
题目来源：`../2025秋-张德海《数据结构与算法》课程实验方案.docx` 与
`../数据结构实验指导书-2015修订版.pdf`（实验四=迷宫、五=树、六=校园导游图）。

## 技术约定
- 语言标准：C11；编译：`cc -std=c11 -Wall -Wextra -O2`，要求零警告。
- 不使用 C++ 特性（new/delete/引用/vector），`new` 对应 `malloc`，`delete` 对应 `free`。
- 数值类型统一 `double`；浮点零判定用 `fabs(v) < POLY_EPS`（1e-12），禁止 `== 0`。
- 接口命名对齐教材（严蔚敏）：`MakeNode / InitList / DestroyList / CreatPolyn /
  DestroyPolyn / PrintPolyn / AddPolyn / SubPolyn / MultiplyPolyn`；
  C 语言中用指针替代 C++ 引用。
- 所有分配结点的函数返回状态码（`POLY_OK / POLY_ENOMEM / POLY_EINVAL / POLY_EPARSE`），
  调用者必须检查；临时结果用完立即 `DestroyPolyn`。
- 输入一律走 `fgets`（`uiReadLine`），不要用 `scanf`，避免遗留换行符。

## 模块边界
- `Polynomial.c` 只管数据结构与算法，不含菜单逻辑。
- `ui.c` 只管分隔线、颜色、安全输入，不认识业务类型。
- `main.c` 负责流程编排；`LinearSolver.c` 独立于多项式模块。
- 实验四/五/六各有独立模块：`maze.c/h`、`tree.c/h`、`graph.c/h`，
  同样不依赖任何界面代码；`selftest.c` 用 30 条用例覆盖三者（`make test-all`）。

## 输出格式（题目硬性要求）
指数降序，形如 `34X^100+45X^60-4X^2+3`；系数 ±1 的非零次项省略系数；
指数 1 省略指数；零多项式输出 `0`；系数用 `%.10g`。
迷宫路径输出三元组 `(i,j,d)`，d：1 东 2 南 3 西 4 北。

## 构建
`./build.sh`（编译 app + app-web + selftest）、`make`；
`./build.sh run|web|test`，`make run|web|test|test-all|clean`。
Windows：`gcc -std=c11 webui.c Polynomial.c LinearSolver.c maze.c tree.c graph.c -o app-web.exe -lws2_32`。

## 界面
- 控制台版 `app`（实验一）与界面版 `app-web` 二选一，共用全部算法模块。
- `app-web`：webui.c 内置本地 HTTP 服务 + `web/index.html`，零第三方依赖；
  页面分四个区域（实验一/四/五/六），2×2 卡片布局。
- 部署：`PORT=8080 HOST=0.0.0.0 ./app-web --no-open`；接口统一 `POST /api`，
  返回纯文本，错误以 `ERR:` 开头（README 第十章有接口表）。
