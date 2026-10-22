/* ============================================================================
 *  selftest.c  —  实验四 / 五 / 六 的自检测试
 *  ---------------------------------------------------------------------------
 *  用固定用例验证核心算法，同时把关键输出打印出来，可直接用于验收演示。
 *  编译：cc -std=c11 selftest.c maze.c tree.c graph.c -o selftest
 *  运行：./selftest
 * ==========================================================================*/
#include <stdio.h>
#include <string.h>

#include "graph.h"
#include "maze.h"
#include "tree.h"

static int g_total = 0;
static int g_pass  = 0;

static void Check(const char *title, int ok) {
    g_total++;
    if (ok) {
        g_pass++;
        printf("  [PASS] %s\n", title);
    } else {
        printf("  [FAIL] %s\n", title);
    }
}

static void Section(const char *title) {
    printf("\n== %s ==\n", title);
}

/* ---------------- 实验四：迷宫 ---------------- */

static void TestMaze(void) {
    static Maze     M;
    static MazePath P;
    char            buf[8192];

    Section("实验四  迷宫");

    /* 1. 随机迷宫：一定连通，必然能走到出口 */
    MazeGenerate(&M, 15, 21, 2025);
    int found = MazeSolve(&M, 1, 1, M.rows - 2, M.cols - 2, &P);
    Check("随机迷宫可以求出通路", found == 1);
    Check("路径从入口开始", found && P.r[0] == 1 && P.c[0] == 1);
    Check("路径在出口结束", found && P.r[P.len - 1] == M.rows - 2 &&
                            P.c[P.len - 1] == M.cols - 2);

    /* 2. 检查每一步都相邻，且方向编号与位移一致 */
    int stepOK = 1;
    for (int k = 0; found && k + 1 < P.len; k++) {
        int dr = P.r[k + 1] - P.r[k];
        int dc = P.c[k + 1] - P.c[k];
        if (dr < -1 || dr > 1 || dc < -1 || dc > 1 || (dr == 0 && dc == 0)) stepOK = 0;
    }
    Check("路径每一步都走到相邻格子", stepOK);

    /* 3. 障碍把起点和终点隔开时，应报告没有通路 */
    const char *blocked = "000\n111\n000";
    Check("能读入自定义迷宫", MazeParse(&M, blocked) == 1);
    Check("被隔断的迷宫判为无通路",
          MazeSolve(&M, 1, 1, M.rows - 2, M.cols - 2, &P) == 0);

    /* 4. 自定义迷宫：只有一条绕行的路 */
    const char *open = "0000\n0110\n0000";
    MazeParse(&M, open);
    int ok = MazeSolve(&M, 1, 1, M.rows - 2, M.cols - 2, &P);
    Check("自定义迷宫求出通路", ok == 1 && P.len == 6);

    MazeDraw(&M, buf, sizeof buf);
    printf("\n迷宫与路径（# 墙  * 路径  x 死路）：\n%s", buf);
    MazePathText(&P, buf, sizeof buf);
    printf("三元组路径：%s\n", buf);
}

/* ---------------- 实验五：二叉树与哈夫曼 ---------------- */

static void TestTree(void) {
    char buf[4096];

    Section("实验五  二叉树与哈夫曼");

    /* 课本示例：ABC##DE#G##F### */
    Tree t = TreeBuild("ABC##DE#G##F###");
    Check("先序建树成功", t != NULL);

    TreePreRec(t, buf, sizeof buf);
    Check("先序遍历 = A B C D E G F", strcmp(buf, "A B C D E G F") == 0);

    TreeInRec(t, buf, sizeof buf);
    Check("中序遍历 = C B E G D F A", strcmp(buf, "C B E G D F A") == 0);

    TreePostRec(t, buf, sizeof buf);
    Check("后序遍历 = C G E F D B A", strcmp(buf, "C G E F D B A") == 0);

    TreeLevel(t, buf, sizeof buf);
    Check("层次遍历 = A B C D E F G", strcmp(buf, "A B C D E F G") == 0);

    TreePreIter(t, buf, sizeof buf);
    Check("非递归先序与递归一致", strcmp(buf, "A B C D E G F") == 0);

    TreeInIter(t, buf, sizeof buf);
    Check("非递归中序与递归一致", strcmp(buf, "C B E G D F A") == 0);

    TreePostIter(t, buf, sizeof buf);
    Check("非递归后序与递归一致", strcmp(buf, "C G E F D B A") == 0);

    Check("树高 = 5", TreeHeight(t) == 5);
    Check("结点数 = 7", TreeNodes(t) == 7);
    Check("叶子数 = 3", TreeLeaves(t) == 3);

    TreeDraw(t, buf, sizeof buf);
    printf("\n二叉树形状：\n%s", buf);

    /* 树与二叉树互转 */
    Tree g = TreeFromGeneral("A(B(E,F),C(G),D)");
    TreeToGeneral(g, buf, sizeof buf);
    Check("树->二叉树->树 能还原", strcmp(buf, "A(B(E,F),C(G),D)") == 0);
    printf("转换后的二叉树：\n");
    TreeDraw(g, buf, sizeof buf);
    printf("%s", buf);

    /* 哈夫曼：用题目给出的字符频度表 */
    const char *table =
        "A 186\nB 64\nC 13\nD 22\nE 103\nF 32\nG 21\nH 15\nI 47\nJ 57\n"
        "K 1\nL 32\nM 20\nN 57\nO 63\nP 15\nQ 1\nR 48\nS 51\nT 80\n"
        "U 23\nV 8\nW 18\nX 1\nY 16\nZ 1\n_ 200\n";

    Huffman H;
    char    err[128];
    Check("按频度表建哈夫曼树", HuffmanBuildTable(&H, table, err, sizeof err) == 1);

    const char *msg = "THIS PROGRAM IS MY FAVORITE";
    char bits[4096], back[256];

    HuffmanEncode(&H, msg, bits, sizeof bits);
    int ok = HuffmanDecode(&H, bits, back, sizeof back);
    Check("编码后再译码能还原原文", ok == 1 && strcmp(back, msg) == 0);

    HuffmanTableText(&H, buf, sizeof buf);
    printf("\n哈夫曼编码表：\n%s", buf);
    printf("原文 %d 个字符，编码后 %d 位（约 %d 字节）\n",
           (int)strlen(msg), (int)strlen(bits), (int)((strlen(bits) + 7) / 8));

    TreeFree(&t);
    TreeFree(&g);
}

/* ---------------- 实验六：校园导游图 ---------------- */

/* 统计子串出现次数 */
static int CountSub(const char *text, const char *sub) {
    int cnt = 0;
    for (const char *p = text; (p = strstr(p, sub)) != NULL; p += strlen(sub)) cnt++;
    return cnt;
}

static void TestGraph(void) {
    Campus G;
    char   buf[8192];

    Section("实验六  校园导游图");

    CampusInit(&G);
    Check("校园地点不少于 10 个", G.n >= 10);

    /* 用 " → " 的个数判断遍历访问了几个地点 */
    CampusDFS(&G, 0, buf, sizeof buf);
    Check("深度优先遍历访问全部地点", CountSub(buf, " → ") == G.n - 1);

    CampusBFS(&G, 0, buf, sizeof buf);
    Check("广度优先遍历访问全部地点", CountSub(buf, " → ") == G.n - 1);

    /* 最短路径：南门 -> 学生会堂 */
    int ok = CampusDijkstra(&G, 0, 6, buf, sizeof buf);
    Check("南门到学生会堂存在最短路径", ok == 1);
    printf("%s", buf);

    /* 用一个独立的小算法（Bellman-Ford 松弛）算参考值，校验 Dijkstra */
    {
        const int INF = 1000000;
        int ref[GRAPH_MAX];

        for (int i = 0; i < G.n; i++) ref[i] = INF;
        ref[0] = 0;
        for (int round = 0; round < G.n - 1; round++) {
            for (int u = 0; u < G.n; u++) {
                for (int v = 0; v < G.n; v++) {
                    if (G.w[u][v] > 0 && ref[u] < INF &&
                        ref[u] + G.w[u][v] < ref[v]) {
                        ref[v] = ref[u] + G.w[u][v];
                    }
                }
            }
        }

        int shown = -1;
        const char *p = strstr(buf, "最短距离：");
        if (p != NULL) sscanf(p, "最短距离：%d", &shown);

        Check("最短距离与参考算法一致", shown == ref[6]);
        Check("路线包含起点与终点",
              strstr(buf, "南门") != NULL && strstr(buf, "学生会堂") != NULL);
    }

    /* 哈密尔顿回路 */
    ok = CampusTour(&G, 0, buf, sizeof buf);
    Check("存在不重复游览全部地点的回路", ok == 1);
    Check("回路访问了全部地点", CountSub(buf, " → ") == G.n);
    printf("%s", buf);

    CampusFloyd(&G, buf, sizeof buf);
    Check("Floyd 输出距离矩阵", strlen(buf) > 100);
}

int main(void) {
    printf("================================================\n");
    printf("  数据结构实验四 / 五 / 六  自检测试\n");
    printf("================================================\n");

    TestMaze();
    TestTree();
    TestGraph();

    printf("\n================================================\n");
    if (g_pass == g_total) {
        printf("  全部通过：%d / %d\n", g_pass, g_total);
    } else {
        printf("  通过 %d / %d，存在失败用例\n", g_pass, g_total);
    }
    printf("================================================\n");
    return (g_pass == g_total) ? 0 : 1;
}
