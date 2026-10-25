/* ============================================================================
 *  webui.c  —  图形界面外壳（表单式窗口，浏览器中显示）
 *  ---------------------------------------------------------------------------
 *  为什么要这样做：
 *    纯 C 没有标准 GUI 库，GTK / Qt 都要额外安装几百 MB 的依赖。
 *    这里用「C 程序自带一个极小的本地 HTTP 服务 + 一个 HTML 页面」的方式，
 *    既不需要任何第三方库，也能在 macOS / Windows / Linux 上得到同样的窗口界面，
 *    而所有计算仍然由 C 完成。
 *
 *  页面分四个区域，对应四个实验：
 *    实验一 线性表（Polynomial.c / LinearSolver.c）
 *    实验四 数组·迷宫（maze.c）
 *    实验五 树·二叉树与哈夫曼（tree.c）
 *    实验六 图·校园导游（graph.c）
 *
 *  所有接口都是 POST /api，参数用 URL 编码，返回纯文本；
 *  端口可用环境变量 PORT 或命令行参数指定，部署时可设 HOST=0.0.0.0。
 *
 *  运行：./build.sh web   然后浏览器访问 http://127.0.0.1:8765
 * ==========================================================================*/

#include <ctype.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32)
#  include <winsock2.h>
#  include <ws2tcpip.h>
#  include <windows.h>
#  define CLOSE_SOCKET closesocket
typedef SOCKET sock_t;
#else
#  include <arpa/inet.h>
#  include <netinet/in.h>
#  include <sys/socket.h>
#  include <unistd.h>
#  define CLOSE_SOCKET close
#  define INVALID_SOCKET (-1)
typedef int sock_t;
#endif

#include "LinearSolver.h"
#include "Polynomial.h"
#include "graph.h"
#include "maze.h"
#include "tree.h"

#define DEFAULT_PORT 8765
#define MAX_REQUEST  65536
#define MAX_PAGE     262144
#define WEB_ROOT     "web"      /* 静态资源根目录 */

/* ==========================================================================
 *  一、字符串小工具
 * ==========================================================================*/

/* 往缓冲区追加内容（带长度检查），返回新的写入位置 */
static size_t Append(char *buf, size_t cap, size_t used, const char *fmt, ...) {
    if (used + 1 >= cap) return used;

    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(buf + used, cap - used, fmt, ap);
    va_end(ap);

    if (n < 0) return used;
    used += (size_t)n;
    if (used >= cap) used = cap - 1;
    return used;
}

/* URL 解码：%XX → 原字符，'+' → 空格 */
static void UrlDecode(const char *src, char *dst, size_t cap) {
    size_t i = 0;

    while (*src != '\0' && i + 1 < cap) {
        if (*src == '%' && src[1] != '\0' && src[2] != '\0') {
            char hex[3] = { src[1], src[2], '\0' };
            dst[i++] = (char)strtol(hex, NULL, 16);
            src += 3;
        } else if (*src == '+') {
            dst[i++] = ' ';
            src++;
        } else {
            dst[i++] = *src++;
        }
    }
    dst[i] = '\0';
}

/* 从 "a=1&b=2" 中取出某个参数的值，找不到返回 0 */
static int GetParam(const char *body, const char *key, char *out, size_t cap) {
    size_t klen = strlen(key);
    const char *p = body;

    while (*p != '\0') {
        while (*p == '&') p++;
        if (strncmp(p, key, klen) == 0 && p[klen] == '=') {
            const char *v = p + klen + 1;
            const char *e = strchr(v, '&');
            size_t len = (e != NULL) ? (size_t)(e - v) : strlen(v);

            char tmp[4096];
            if (len >= sizeof tmp) len = sizeof tmp - 1;
            memcpy(tmp, v, len);
            tmp[len] = '\0';
            UrlDecode(tmp, out, cap);
            return 1;
        }
        /* 跳到下一个参数 */
        p = strchr(p, '&');
        if (p == NULL) break;
    }
    out[0] = '\0';
    return 0;
}

/* ==========================================================================
 *  二、业务计算：把界面的请求翻译成对 Polynomial / LinearSolver 的调用
 * ==========================================================================*/

/* 把多项式写进输出缓冲，返回新的写入位置 */
static size_t AppendPoly(char *out, size_t cap, size_t used,
                         const char *label, const Polynomial *p) {
    char text[8192];
    PolyFormat(p, text, sizeof text);
    return Append(out, cap, used, "%s = %s\n", label, text);
}

/* 处理 add / sub / mul / deriv / eval 五种请求 */
static void CalcPolynomial(const char *body, char *out, size_t cap) {
    char op[16], exprA[512], exprB[512], exprX[64];

    GetParam(body, "op", op, sizeof op);
    GetParam(body, "A", exprA, sizeof exprA);
    GetParam(body, "B", exprB, sizeof exprB);
    GetParam(body, "x", exprX, sizeof exprX);

    /* 先建 A，再按需建 B */
    Polynomial a, b;
    int rc = CreatPolynFromString(&a, exprA);
    if (rc == POLY_EPARSE) { snprintf(out, cap, "ERR:多项式 A 格式有误。\n合法写法：3x^2-2x+1、-x^3+5、2*x、x、7"); return; }
    if (rc != POLY_OK)     { snprintf(out, cap, "ERR:内存不足"); return; }

    /* 求值：只需要 A 和 x */
    if (strcmp(op, "eval") == 0) {
        char *end = NULL;
        double x = strtod(exprX, &end);
        if (end == exprX || *end != '\0') {
            DestroyPolyn(&a);
            snprintf(out, cap, "ERR:x 必须是数字");
            return;
        }
        size_t used = Append(out, cap, 0, "A(%g) = %.10g\n", x, EvalPolyn(&a, x));

        if (CreatPolynFromString(&b, exprB) == POLY_OK) {
            used = Append(out, cap, used, "B(%g) = %.10g\n", x, EvalPolyn(&b, x));
            DestroyPolyn(&b);
        }
        DestroyPolyn(&a);
        return;
    }

    if (strcmp(op, "deriv") == 0) {
        Polynomial d;
        if (DerivPolyn(&a, &d) != POLY_OK) {
            DestroyPolyn(&a);
            snprintf(out, cap, "ERR:求导失败");
            return;
        }
        size_t used = Append(out, cap, 0, "");
        used = AppendPoly(out, cap, used, "A ", &a);
        used = AppendPoly(out, cap, used, "A'", &d);
        DestroyPolyn(&a);
        DestroyPolyn(&d);
        return;
    }

    /* 加、减、乘：需要 A、B 都有 */
    rc = CreatPolynFromString(&b, exprB);
    if (rc == POLY_EPARSE) { DestroyPolyn(&a); snprintf(out, cap, "ERR:多项式 B 格式有误。"); return; }
    if (rc != POLY_OK)     { DestroyPolyn(&a); snprintf(out, cap, "ERR:内存不足"); return; }

    Polynomial r;
    const char *label;

    if (strcmp(op, "add") == 0)      { rc = AddPolyn(&a, &b, &r);      label = "A + B"; }
    else if (strcmp(op, "sub") == 0) { rc = SubPolyn(&a, &b, &r);      label = "A - B"; }
    else                             { rc = MultiplyPolyn(&a, &b, &r); label = "A × B"; }

    if (rc != POLY_OK) {
        DestroyPolyn(&a);
        DestroyPolyn(&b);
        snprintf(out, cap, "ERR:运算失败（内存不足或指数超出范围）");
        return;
    }

    size_t used = Append(out, cap, 0, "");
    used = AppendPoly(out, cap, used, "A", &a);
    used = AppendPoly(out, cap, used, "B", &b);
    AppendPoly(out, cap, used, label, &r);

    DestroyPolyn(&a);
    DestroyPolyn(&b);
    DestroyPolyn(&r);
}

/* 解析一行实数，返回个数；-1 表示有非法字符 */
static int ParseDoubles(const char *s, double *out, int max) {
    int   cnt = 0;
    char *end = NULL;

    while (cnt < max) {
        while (*s == ' ' || *s == '\t' || *s == '\r') s++;
        if (*s == '\0') break;

        double v = strtod(s, &end);
        if (end == s) return -1;
        out[cnt++] = v;
        s = end;
    }
    return cnt;
}

/* 处理 solve：解析多行增广矩阵并求解 */
static void CalcLinear(const char *body, char *out, size_t cap) {
    char text[2048];
    GetParam(body, "mat", text, sizeof text);

    Matrix   M;
    Solution S = {0};
    double   row[MAT_MAX_VARS + 1];
    int      m = 0, n = -1;

    MatSetSize(&M, 0, 0);

    /* 逐行处理（直接在 text 上切分，不额外申请内存） */
    char *line = text;
    while (line != NULL && *line != '\0') {
        char *nl = strchr(line, '\n');
        if (nl != NULL) *nl = '\0';

        int got = ParseDoubles(line, row, MAT_MAX_VARS + 1);

        if (got < 0) {
            snprintf(out, cap, "ERR:第 %d 行含有非法字符", m + 1);
            return;
        }
        if (got > 0) {
            if (n < 0) n = got - 1;                     /* 第一行决定未知数个数 */
            if (got - 1 != n) {
                snprintf(out, cap, "ERR:第 %d 行有 %d 个数，应为 %d 个", m + 1, got, n + 1);
                return;
            }
            if (m >= MAT_MAX_ROWS || n > MAT_MAX_VARS) {
                snprintf(out, cap, "ERR:规模超出限制（最多 %d 个方程、%d 个未知数）",
                         MAT_MAX_ROWS, MAT_MAX_VARS);
                return;
            }
            for (int j = 0; j <= n; j++) M.a[m][j] = row[j];
            m++;
        }

        line = (nl != NULL) ? nl + 1 : NULL;
    }

    if (m == 0 || n < 1) {
        snprintf(out, cap, "ERR:请输入至少一行，每行至少两个数（系数 + 常数项）");
        return;
    }

    M.m = m;
    M.n = n;

    MatGaussJordan(&M, &S);
    MatClassify(&M, &S);

    char matText[4096];
    char solText[8192];
    MatFormat(&M, matText, sizeof matText);
    MatSolutionText(&M, &S, solText, sizeof solText);

    size_t used = Append(out, cap, 0,
                         "规模：%d 个方程，%d 个未知数\nr(A) = %d，r(A|b) = %d\n\n行最简形：\n",
                         m, n, S.rankA, S.rankAug);
    used = Append(out, cap, used, "%s", matText);
    Append(out, cap, used, "\n%s", solText);
}

/* ==========================================================================
 *  三、实验四 / 五 / 六的计算入口
 * ==========================================================================*/

/* 取一个整数参数，缺省时用 def */
static int GetInt(const char *body, const char *key, int def) {
    char tmp[32];
    if (!GetParam(body, key, tmp, sizeof tmp)) return def;
    return atoi(tmp);
}

/* 实验四：生成迷宫 / 求解迷宫 */
static void CalcMaze(const char *body, char *out, size_t cap) {
    static Maze     M;
    static MazePath P;

    char op[16], grid[8192];
    GetParam(body, "op", op, sizeof op);
    GetParam(body, "grid", grid, sizeof grid);

    /* 判断用户是否真的填了迷宫（只认 0 和 1） */
    int hasGrid = 0;
    for (const char *p = grid; *p != '\0'; p++) {
        if (*p == '0' || *p == '1') { hasGrid = 1; break; }
    }

    if (hasGrid) {
        if (!MazeParse(&M, grid)) {
            snprintf(out, cap, "ERR:迷宫格式有误。每行只能有 0 和 1，且各行长度要相同。");
            return;
        }
    } else {
        /* 用同一个种子生成，结果可重现，所以“生成”和“求解”看到的是同一张图 */
        MazeGenerate(&M, GetInt(body, "rows", 15), GetInt(body, "cols", 21),
                     (unsigned)GetInt(body, "seed", 1));
    }

    char draw[4096];
    MazeDraw(&M, draw, sizeof draw);

    size_t used = 0;

    /* ---- 只生成，不求解 ---- */
    if (strcmp(op, "mazegen") == 0) {
        used = Append(out, cap, used,
                      "已生成 %d 行 × %d 列的迷宫（# 墙，空格 通路）\n\n",
                      M.rows, M.cols);
        used = Append(out, cap, used, "%s", draw);
        Append(out, cap, used, "\n下一步点击「求解迷宫」。");
        return;
    }

    /* ---- 求解 ---- */
    int sr = GetInt(body, "sr", 1);
    int sc = GetInt(body, "sc", 1);
    int er = GetInt(body, "er", M.rows - 2);
    int ec = GetInt(body, "ec", M.cols - 2);

    int found = MazeSolve(&M, sr, sc, er, ec, &P);

    used = Append(out, cap, used,
                  "%d 行 × %d 列，入口 (%d,%d)，出口 (%d,%d)\n\n",
                  M.rows, M.cols, sr, sc, er, ec);
    used = Append(out, cap, used, "%s\n", draw);

    if (found) {
        char pathText[16384];
        MazePathText(&P, pathText, sizeof pathText);
        used = Append(out, cap, used, "找到通路，共 %d 步。\n", P.len);
        used = Append(out, cap, used, "三元组 (i,j,d)：%s\n", pathText);
        Append(out, cap, used, "\n（d：1 东，2 南，3 西，4 北；最后一步为 0）");
    } else {
        Append(out, cap, used,
               "没有从入口到出口的通路。\n\n"
               "提示：可以把入口 / 出口改成别的坐标，或点「生成迷宫」换一张图。");
    }
}

/* 实验五：二叉树的遍历与树形，或树与二叉树转换 */
static void CalcTree(const char *body, char *out, size_t cap) {
    char op[16], pre[1024], text[1024];
    GetParam(body, "op", op, sizeof op);
    GetParam(body, "pre", pre, sizeof pre);
    GetParam(body, "text", text, sizeof text);

    /* ---- 树 <-> 二叉树 ---- */
    if (strcmp(op, "treeconv") == 0) {
        Tree t = TreeFromGeneral(text);
        if (t == NULL) {
            snprintf(out, cap, "ERR:括号表示有误。示例：A(B(E,F),C(G),D)");
            return;
        }

        char draw[8192], back[1024];
        TreeDraw(t, draw, sizeof draw);
        TreeToGeneral(t, back, sizeof back);

        size_t used = 0;
        used = Append(out, cap, used, "树的括号表示：%s\n", text);
        used = Append(out, cap, used, "转换为二叉树（左孩子—右兄弟）：\n%s\n", draw);
        used = Append(out, cap, used, "再由二叉树还原成树：%s\n", back);
        Append(out, cap, used, "\n说明：二叉树中左指针指向第一个孩子，右指针指向下一个兄弟。");

        TreeFree(&t);
        return;
    }

    /* ---- 先序序列建树并遍历 ---- */
    for (const char *p = pre; *p != '\0'; p++) {
        if ((unsigned char)*p > 126) {
            snprintf(out, cap, "ERR:先序序列只能包含英文字母、数字和 #");
            return;
        }
    }

    Tree t = TreeBuild(pre);
    if (t == NULL) {
        snprintf(out, cap, "ERR:先序序列为空，或全部是 #（空树）。示例：ABC##DE#G##F###");
        return;
    }

    char a[1024], b[1024], c[1024], d[1024];
    char e[1024], f[1024], g[1024];

    TreePreRec(t, a, sizeof a);
    TreeInRec(t, b, sizeof b);
    TreePostRec(t, c, sizeof c);
    TreePreIter(t, d, sizeof d);
    TreeInIter(t, e, sizeof e);
    TreePostIter(t, f, sizeof f);
    TreeLevel(t, g, sizeof g);

    char draw[8192];
    TreeDraw(t, draw, sizeof draw);

    size_t used = 0;
    used = Append(out, cap, used, "先序序列：%s\n\n", pre);

    used = Append(out, cap, used, "递归遍历\n");
    used = Append(out, cap, used, "  先序：%s\n", a);
    used = Append(out, cap, used, "  中序：%s\n", b);
    used = Append(out, cap, used, "  后序：%s\n\n", c);

    used = Append(out, cap, used, "非递归遍历（显式栈）\n");
    used = Append(out, cap, used, "  先序：%s\n", d);
    used = Append(out, cap, used, "  中序：%s\n", e);
    used = Append(out, cap, used, "  后序：%s\n\n", f);

    used = Append(out, cap, used, "层次遍历：%s\n", g);
    used = Append(out, cap, used, "树高 %d，结点 %d 个，叶子 %d 个\n\n",
                  TreeHeight(t), TreeNodes(t), TreeLeaves(t));
    used = Append(out, cap, used, "二叉树形状：\n%s", draw);

    TreeFree(&t);
}

/* 实验五：哈夫曼编码 / 译码 */
static void CalcHuff(const char *body, char *out, size_t cap) {
    char mode[16], text[2048], table[4096], bits[32768];
    GetParam(body, "mode", mode, sizeof mode);
    GetParam(body, "text", text, sizeof text);
    GetParam(body, "table", table, sizeof table);
    GetParam(body, "bits", bits, sizeof bits);

    Huffman H;
    char    err[128] = {0};
    int     hasTable = 0;

    for (const char *p = table; *p != '\0'; p++) {
        if (*p != ' ' && *p != '\n' && *p != '\r' && *p != '\t' && *p != '#') {
            hasTable = 1;
            break;
        }
    }

    int built = hasTable ? HuffmanBuildTable(&H, table, err, sizeof err)
                         : HuffmanBuildText(&H, text, err, sizeof err);
    if (!built) {
        snprintf(out, cap, "ERR:%s", err[0] ? err : "建树失败");
        return;
    }

    char tableText[8192];
    HuffmanTableText(&H, tableText, sizeof tableText);

    size_t used = 0;

    if (strcmp(mode, "decode") == 0) {
        char plain[4096];
        if (bits[0] == '\0') {
            snprintf(out, cap, "ERR:请先填入 0/1 编码串");
            return;
        }

        int ok = HuffmanDecode(&H, bits, plain, sizeof plain);

        used = Append(out, cap, used, "译码结果：\n%s\n", plain);
        if (!ok) {
            used = Append(out, cap, used,
                          "\n注意：编码串结尾不完整，最后几位不足以构成一个字符。");
        }
        used = Append(out, cap, used, "\n使用同一棵哈夫曼树，共 %d 种字符。\n", H.n);
        Append(out, cap, used, "%s", tableText);
        return;
    }

    /* 编码：结果里用 ===BITS=== 分隔，页面会把后面的 0/1 串填进译码框 */
    char encoded[32768];
    HuffmanEncode(&H, text, encoded, sizeof encoded);

    used = Append(out, cap, used, "编码结果（%d 位）：\n%s\n", (int)strlen(encoded), encoded);
    used = Append(out, cap, used,
                  "\n原文 %d 个字符，编码后约 %d 字节。\n\n",
                  (int)strlen(text), (int)((strlen(encoded) + 7) / 8));
    used = Append(out, cap, used, "%s", tableText);
    Append(out, cap, used, "\n===BITS===\n%s", encoded);
}

/* 实验六：校园导游图 */
static void CalcGraph(const char *body, char *out, size_t cap) {
    Campus G;
    CampusInit(&G);

    char mode[16], sName[64], tName[64];
    GetParam(body, "mode", mode, sizeof mode);
    GetParam(body, "s", sName, sizeof sName);
    GetParam(body, "t", tName, sizeof tName);

    /* 页面加载时用这个接口拿到地点列表，避免前端写死数据 */
    if (strcmp(mode, "names") == 0) {
        size_t used = 0;
        for (int i = 0; i < G.n; i++) {
            used = Append(out, cap, used, "%d|%s\n", i, G.v[i].name);
        }
        return;
    }

    size_t used = 0;

    if (strcmp(mode, "matrix") == 0) {
        CampusMatrix(&G, out, cap);
        return;
    }
    if (strcmp(mode, "floyd") == 0) {
        CampusFloyd(&G, out, cap);
        return;
    }
    if (strcmp(mode, "list") == 0) {
        CampusList(&G, out, cap);
        return;
    }

    int s = CampusFind(&G, sName[0] ? sName : "0");
    if (s < 0) {
        snprintf(out, cap, "ERR:找不到起点「%s」，请从下拉框中选择。", sName);
        return;
    }

    if (strcmp(mode, "dfs") == 0) {
        used = Append(out, cap, used, "从「%s」出发的深度优先遍历：\n\n", G.v[s].name);
        CampusDFS(&G, s, out + used, cap - used);
        return;
    }
    if (strcmp(mode, "bfs") == 0) {
        used = Append(out, cap, used, "从「%s」出发的广度优先遍历：\n\n", G.v[s].name);
        CampusBFS(&G, s, out + used, cap - used);
        return;
    }
    if (strcmp(mode, "tour") == 0) {
        CampusTour(&G, s, out, cap);
        return;
    }

    /* 默认：最短路径 */
    int t = CampusFind(&G, tName[0] ? tName : "6");
    if (t < 0) {
        snprintf(out, cap, "ERR:找不到终点「%s」，请从下拉框中选择。", tName);
        return;
    }
    CampusDijkstra(&G, s, t, out, cap);
}

/* ==========================================================================
 *  四、极简 HTTP 服务
 * ==========================================================================*/

/* 循环发送，直到数据写完 */
static void SendAll(sock_t fd, const char *data, size_t len) {
    size_t sent = 0;
    while (sent < len) {
        int n = send(fd, data + sent, (int)(len - sent), 0);
        if (n <= 0) return;
        sent += (size_t)n;
    }
}

/* 发送一个完整的 HTTP 响应 */
static void Respond(sock_t fd, const char *status, const char *type,
                    const char *body, size_t len) {
    char head[256];
    int  n = snprintf(head, sizeof head,
                      "HTTP/1.1 %s\r\n"
                      "Content-Type: %s\r\n"
                      "Content-Length: %zu\r\n"
                      "Cache-Control: no-store\r\n"
                      "Connection: close\r\n\r\n",
                      status, type, len);

    SendAll(fd, head, (size_t)n);
    SendAll(fd, body, len);
}

/* 从请求头里取 Content-Length */
static int ContentLength(const char *req) {
    const char *p = strstr(req, "Content-Length:");
    if (p == NULL) return 0;
    return atoi(p + strlen("Content-Length:"));
}

/* ==========================================================================
 *  五、静态资源（web/ 目录）
 *  --------------------------------------------------------------------------
 *  页面拆成了 index.html + css/js/src/vendor 多份文件，
 *  服务端按 URL 直接映射到 web/ 下，不再把整页读进内存。
 *  只允许字母、数字、'-'、'_'、'.'、'/'，并拒绝 ".."，避免目录穿越。
 * ==========================================================================*/

static const char *MimeType(const char *path) {
    const char *dot = strrchr(path, '.');

    if (dot == NULL) return "application/octet-stream";
    if (strcmp(dot, ".html") == 0) return "text/html; charset=utf-8";
    if (strcmp(dot, ".css")  == 0) return "text/css; charset=utf-8";
    if (strcmp(dot, ".js")   == 0) return "application/javascript; charset=utf-8";
    if (strcmp(dot, ".json") == 0) return "application/json; charset=utf-8";
    if (strcmp(dot, ".cpp")  == 0 || strcmp(dot, ".h") == 0 ||
        strcmp(dot, ".c")    == 0) return "text/plain; charset=utf-8";
    if (strcmp(dot, ".svg")  == 0) return "image/svg+xml";
    if (strcmp(dot, ".png")  == 0) return "image/png";
    if (strcmp(dot, ".jpg")  == 0 || strcmp(dot, ".jpeg") == 0) return "image/jpeg";
    if (strcmp(dot, ".ico")  == 0) return "image/x-icon";
    return "application/octet-stream";
}

/* 路径安全：拒绝 ..、反斜杠和控制字符 */
static int SafePath(const char *url) {
    if (url[0] != '/') return 0;
    for (const char *p = url; *p != '\0'; p++) {
        unsigned char c = (unsigned char)*p;
        if (c < 0x20 || c == '\\') return 0;
        if (!(isalnum(c) || c == '/' || c == '-' || c == '_' || c == '.')) return 0;
    }
    return strstr(url, "..") == NULL;
}

/* 把文件分块发出去，避免为大文件准备整块内存 */
static void SendFile(sock_t fd, FILE *fp, const char *type, long size) {
    char head[256];
    char buf[16384];

    int n = snprintf(head, sizeof head,
                     "HTTP/1.1 200 OK\r\n"
                     "Content-Type: %s\r\n"
                     "Content-Length: %ld\r\n"
                     "Cache-Control: no-store\r\n"
                     "Connection: close\r\n\r\n",
                     type, size);
    SendAll(fd, head, (size_t)n);

    size_t got;
    while ((got = fread(buf, 1, sizeof buf, fp)) > 0) {
        SendAll(fd, buf, got);
    }
}

/* 返回 1 表示已经响应（无论命中与否） */
static int ServeStatic(sock_t fd, const char *url) {
    char rel[512];
    FILE *fp;

    if (!SafePath(url)) goto not_found;

    /* "/" 和 "/index.html" 都指向首页 */
    if (strcmp(url, "/") == 0) {
        snprintf(rel, sizeof rel, "%s/index.html", WEB_ROOT);
    } else {
        snprintf(rel, sizeof rel, "%s%s", WEB_ROOT, url);
    }

    fp = fopen(rel, "rb");
    if (fp == NULL) goto not_found;

    if (fseek(fp, 0L, SEEK_END) != 0) { fclose(fp); goto not_found; }
    long size = ftell(fp);
    rewind(fp);
    if (size < 0) { fclose(fp); goto not_found; }

    SendFile(fd, fp, MimeType(rel), size);
    fclose(fp);
    return 1;

not_found: {
        const char *msg = "not found";
        Respond(fd, "404 Not Found", "text/plain; charset=utf-8", msg, strlen(msg));
        return 1;
    }
}

/* 处理一个连接：解析请求 → 分发 → 响应 */
static void HandleClient(sock_t fd) {
    static char req[MAX_REQUEST];
    static char out[MAX_PAGE / 4];

    size_t used = 0;
    int    header_len = 0;

    /* 先把请求头和请求体读完整 */
    while (used + 1 < sizeof req) {
        int n = recv(fd, req + used, (int)(sizeof req - used - 1), 0);
        if (n <= 0) break;
        used += (size_t)n;
        req[used] = '\0';

        char *end = strstr(req, "\r\n\r\n");
        if (end != NULL) {
            header_len = (int)(end - req) + 4;
            if (used >= (size_t)header_len + (size_t)ContentLength(req)) break;
        }
    }
    if (used == 0) return;

    /* ---- 解析请求行 ---- */
    char method[8] = {0}, path[256] = {0};
    sscanf(req, "%7s %255s", method, path);

    /* 去掉 ? 后面的查询参数，只按路径分发 */
    char *query = strchr(path, '?');
    if (query != NULL) *query = '\0';

    /* ---- 首页与静态资源（web/ 目录） ---- */
    if (strcmp(method, "GET") == 0) {
        ServeStatic(fd, path);
        return;
    }

    /* ---- 计算接口 ---- */
    if (strcmp(method, "POST") == 0 && strcmp(path, "/api") == 0) {
        char *end  = strstr(req, "\r\n\r\n");
        char *body = (end != NULL) ? end + 4 : req;
        char  op[24] = {0};

        GetParam(body, "op", op, sizeof op);

        if (strcmp(op, "solve") == 0)      CalcLinear(body, out, sizeof out);
        else if (strcmp(op, "mazegen") == 0 ||
                 strcmp(op, "mazesolve") == 0) CalcMaze(body, out, sizeof out);
        else if (strcmp(op, "tree") == 0 ||
                 strcmp(op, "treeconv") == 0)  CalcTree(body, out, sizeof out);
        else if (strcmp(op, "huff") == 0)     CalcHuff(body, out, sizeof out);
        else if (strcmp(op, "graph") == 0)    CalcGraph(body, out, sizeof out);
        else                                  CalcPolynomial(body, out, sizeof out);

        Respond(fd, "200 OK", "text/plain; charset=utf-8", out, strlen(out));
        return;
    }

    /* ---- 其他请求 ---- */
    const char *nf = "not found";
    Respond(fd, "404 Not Found", "text/plain; charset=utf-8", nf, strlen(nf));
}

/* 把请求里剩下的路径映射到 web/ 下，本地服务不需要额外的静态服务器 */
static void CheckWebRoot(void) {
    FILE *fp = fopen(WEB_ROOT "/index.html", "rb");
    if (fp == NULL) {
        fprintf(stderr, "警告：找不到 %s/index.html，请在 LAB1 目录下运行本程序。\n", WEB_ROOT);
    } else {
        fclose(fp);
    }
}

/* 打开默认浏览器 */
static void OpenBrowser(int port) {
    char cmd[256];

#if defined(_WIN32)
    snprintf(cmd, sizeof cmd, "start \"\" http://127.0.0.1:%d", port);
#elif defined(__APPLE__)
    snprintf(cmd, sizeof cmd, "open http://127.0.0.1:%d >/dev/null 2>&1", port);
#else
    snprintf(cmd, sizeof cmd, "xdg-open http://127.0.0.1:%d >/dev/null 2>&1 &", port);
#endif
    system(cmd);
}

int main(int argc, char **argv) {
    int port = DEFAULT_PORT;
    int openBrowser = 1;

    /* 端口优先级：命令行参数 > 环境变量 PORT > 默认 8765
     * 部署到服务器时通常这样启动：PORT=8080 HOST=0.0.0.0 ./app-web --no-open */
    const char *envPort = getenv("PORT");
    if (envPort != NULL && atoi(envPort) > 0) port = atoi(envPort);

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--no-open") == 0) {
            openBrowser = 0;
        } else if (atoi(argv[i]) > 0) {
            port = atoi(argv[i]);
        }
    }

    CheckWebRoot();

#if defined(_WIN32)
    WSADATA wsa;
    WSAStartup(MAKEWORD(2, 2), &wsa);
#endif

    /* 创建监听套接字 */
    sock_t server = socket(AF_INET, SOCK_STREAM, 0);
    if (server == INVALID_SOCKET) {
        fprintf(stderr, "无法创建套接字。\n");
        return 1;
    }

    /* 允许端口快速重用，避免重启时报“地址已占用” */
    int yes = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, (const char *)&yes, sizeof yes);

    /* 默认只监听本机；部署时设 HOST=0.0.0.0 才会对外开放 */
    const char *envHost = getenv("HOST");
    int expose = (envHost != NULL && strcmp(envHost, "0.0.0.0") == 0);

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof addr);
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = htonl(expose ? INADDR_ANY : INADDR_LOOPBACK);
    addr.sin_port        = htons((unsigned short)port);

    if (bind(server, (struct sockaddr *)&addr, sizeof addr) != 0) {
        fprintf(stderr, "端口 %d 被占用，请关闭占用它的程序，或用 ./app-web 9000 换一个端口。\n",
                port);
        CLOSE_SOCKET(server);
        return 1;
    }
    if (listen(server, 8) != 0) {
        fprintf(stderr, "监听失败。\n");
        CLOSE_SOCKET(server);
        return 1;
    }

    printf("=====================================================\n");
    printf("  数据结构实验 · 算法可视化  （实验一 / 二 / 三 / 四）\n");
    printf("  地址：http://127.0.0.1:%d\n", port);
    printf("  静态资源：%s/    接口：POST /api\n", WEB_ROOT);
    printf("  关闭本窗口即退出程序。\n");
    printf("=====================================================\n");

    if (openBrowser) OpenBrowser(port);

    /* 主循环：一次处理一个连接，够用且足够简单 */
    for (;;) {
        struct sockaddr_in peer;
        socklen_t peer_len = sizeof peer;

        sock_t client = accept(server, (struct sockaddr *)&peer, &peer_len);
        if (client == INVALID_SOCKET) continue;

        HandleClient(client);
        CLOSE_SOCKET(client);
    }
}
