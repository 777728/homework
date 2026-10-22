/* ============================================================================
 *  graph.c  —  实验六：校园导游图（邻接矩阵 + 遍历 + 最短路径 + 回路）
 * ==========================================================================*/
#include "graph.h"

#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define INF 1000000                  /* 表示两点之间不连通 */

/* ==========================================================================
 *  一、小工具
 * ==========================================================================*/

static size_t Put(char *out, size_t cap, size_t used, const char *fmt, ...) {
    if (used + 1 >= cap) return used;

    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(out + used, cap - used, fmt, ap);
    va_end(ap);

    if (n < 0) return used;
    used += (size_t)n;
    return (used < cap) ? used : cap - 1;
}

/* 汉字按 2 列计算宽度，保证表格对齐 */
static int DisplayWidth(const char *s) {
    int w = 0;
    for (const unsigned char *p = (const unsigned char *)s; *p != '\0'; p++) {
        if ((*p & 0xC0) == 0x80) continue;
        w += (*p >= 0xE0) ? 2 : 1;
    }
    return w;
}

static void PadTo(char *out, size_t cap, const char *text, int width) {
    snprintf(out, cap, "%s", text);
    int pad = width - DisplayWidth(text);
    size_t len = strlen(out);
    while (pad-- > 0 && len + 1 < cap) out[len++] = ' ';
    out[len] = '\0';
}

/* 无向边：两个方向都记上 */
static void AddEdge(Campus *G, int a, int b, int meters) {
    G->w[a][b] = meters;
    G->w[b][a] = meters;
}

/* ==========================================================================
 *  二、校园数据
 * ==========================================================================*/

void CampusInit(Campus *G) {
    memset(G, 0, sizeof *G);
    G->n = 12;

    const char *names[12] = {
        "南门", "校车站", "图书馆", "明远楼",
        "文汇楼", "格物楼", "学生会堂", "泽湖",
        "田径场", "梓苑食堂", "桦苑宿舍", "梓苑宿舍"
    };
    const char *infos[12] = {
        "学校正门，呈贡校区主入口",
        "校车与公交乘车点，进出校区必经",
        "馆藏图书 300 余万册，自习座位充足",
        "行政办公楼，教务处、学生处所在地",
        "文科教学楼群，公共课主要上课地点",
        "理工科实验楼，专业实验室集中于此",
        "大型活动、演出与开学典礼场地",
        "校园中心景观湖，环湖步道适合散步",
        "标准 400 米塑胶跑道与足球场",
        "学生第一食堂，紧邻梓苑宿舍",
        "本科生宿舍区，生活配套齐全",
        "研究生宿舍区，靠近泽湖"
    };

    for (int i = 0; i < 12; i++) {
        snprintf(G->v[i].name, sizeof G->v[i].name, "%s", names[i]);
        snprintf(G->v[i].info, sizeof G->v[i].info, "%s", infos[i]);
    }

    /* 环校主路：把 12 个地点串成一圈 */
    AddEdge(G, 0, 1, 120);
    AddEdge(G, 1, 2, 260);
    AddEdge(G, 2, 3, 180);
    AddEdge(G, 3, 4, 220);
    AddEdge(G, 4, 5, 150);
    AddEdge(G, 5, 6, 200);
    AddEdge(G, 6, 7, 240);
    AddEdge(G, 7, 8, 170);
    AddEdge(G, 8, 9, 210);
    AddEdge(G, 9, 10, 130);
    AddEdge(G, 10, 11, 160);
    AddEdge(G, 11, 0, 300);

    /* 校内支路：走这些“近道”往往比沿环路更快 */
    AddEdge(G, 0, 2, 340);
    AddEdge(G, 2, 4, 300);
    AddEdge(G, 4, 6, 280);
    AddEdge(G, 6, 8, 330);
    AddEdge(G, 8, 10, 260);
    AddEdge(G, 1, 3, 300);
    AddEdge(G, 3, 11, 350);
    AddEdge(G, 5, 9, 240);
    AddEdge(G, 7, 11, 290);
    AddEdge(G, 3, 7, 380);
}

int CampusFind(const Campus *G, const char *text) {
    char buf[64];

    if (text == NULL) return -1;

    /* 去掉首尾空格 */
    while (*text == ' ' || *text == '\t') text++;
    snprintf(buf, sizeof buf, "%s", text);
    size_t len = strlen(buf);
    while (len > 0 && (buf[len - 1] == ' ' || buf[len - 1] == '\t' ||
                       buf[len - 1] == '\r' || buf[len - 1] == '\n')) {
        buf[--len] = '\0';
    }

    if (buf[0] == '\0') return -1;

    /* 纯数字按编号处理 */
    int allDigit = 1;
    for (size_t i = 0; i < len; i++) {
        if (buf[i] < '0' || buf[i] > '9') { allDigit = 0; break; }
    }
    if (allDigit) {
        int idx = atoi(buf);
        return (idx >= 0 && idx < G->n) ? idx : -1;
    }

    for (int i = 0; i < G->n; i++) {
        if (strcmp(G->v[i].name, buf) == 0) return i;
    }
    return -1;
}

/* ==========================================================================
 *  三、输出地点与邻接矩阵
 * ==========================================================================*/

void CampusList(const Campus *G, char *out, size_t cap) {
    size_t used = 0;

    used = Put(out, cap, used, "%-4s %-10s %s\n", "编号", "地点", "简介");
    used = Put(out, cap, used,
               "------------------------------------------------------------\n");

    for (int i = 0; i < G->n; i++) {
        char name[32];
        PadTo(name, sizeof name, G->v[i].name, 12);
        used = Put(out, cap, used, "%2d   %s %s\n", i, name, G->v[i].info);
    }
}

void CampusMatrix(const Campus *G, char *out, size_t cap) {
    size_t used = 0;

    used = Put(out, cap, used, "邻接矩阵（单位：米，- 表示没有直接道路）\n");

    used = Put(out, cap, used, "%6s", "");
    for (int j = 0; j < G->n; j++) used = Put(out, cap, used, "%6d", j);
    used = Put(out, cap, used, "\n");

    for (int i = 0; i < G->n; i++) {
        used = Put(out, cap, used, "%4d  ", i);
        for (int j = 0; j < G->n; j++) {
            if (i == j)                 used = Put(out, cap, used, "%6d", 0);
            else if (G->w[i][j] == 0)   used = Put(out, cap, used, "%6s", "-");
            else                        used = Put(out, cap, used, "%6d", G->w[i][j]);
        }
        used = Put(out, cap, used, "\n");
    }
}

/* ==========================================================================
 *  四、图的遍历
 * ==========================================================================*/

static void DfsRec(const Campus *G, int u, int *vis, char *out, size_t cap,
                   size_t *used, int *first) {
    vis[u] = 1;
    if (!*first) *used = Put(out, cap, *used, " → ");
    *used = Put(out, cap, *used, "%s", G->v[u].name);
    *first = 0;

    for (int v = 0; v < G->n; v++) {
        if (G->w[u][v] > 0 && !vis[v]) {
            DfsRec(G, v, vis, out, cap, used, first);
        }
    }
}

void CampusDFS(const Campus *G, int start, char *out, size_t cap) {
    int vis[GRAPH_MAX] = {0};
    size_t used = 0;
    int first = 1;

    out[0] = '\0';
    if (start < 0 || start >= G->n) return;

    DfsRec(G, start, vis, out, cap, &used, &first);
    Put(out, cap, used, "\n");
}

void CampusBFS(const Campus *G, int start, char *out, size_t cap) {
    int queue[GRAPH_MAX], head = 0, tail = 0;
    int vis[GRAPH_MAX] = {0};
    size_t used = 0;
    int first = 1;

    out[0] = '\0';
    if (start < 0 || start >= G->n) return;

    vis[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
        int u = queue[head++];

        if (!first) used = Put(out, cap, used, " → ");
        used = Put(out, cap, used, "%s", G->v[u].name);
        first = 0;

        for (int v = 0; v < G->n; v++) {
            if (G->w[u][v] > 0 && !vis[v]) {
                vis[v] = 1;
                if (tail < GRAPH_MAX) queue[tail++] = v;
            }
        }
    }
    Put(out, cap, used, "\n");
}

/* ==========================================================================
 *  五、最短路径
 * ==========================================================================*/

int CampusDijkstra(const Campus *G, int start, int end, char *out, size_t cap) {
    int dist[GRAPH_MAX], prev[GRAPH_MAX], done[GRAPH_MAX] = {0};

    if (start < 0 || end < 0 || start >= G->n || end >= G->n) return 0;

    for (int i = 0; i < G->n; i++) {
        dist[i] = INF;
        prev[i] = -1;
    }
    dist[start] = 0;

    /* 每次取出一个距离最小的未确定顶点，用它去更新邻居 */
    for (int step = 0; step < G->n; step++) {
        int u = -1, best = INF;
        for (int i = 0; i < G->n; i++) {
            if (!done[i] && dist[i] < best) {
                best = dist[i];
                u = i;
            }
        }
        if (u < 0) break;                 /* 剩下的点都不连通 */
        done[u] = 1;
        if (u == end) break;              /* 终点已确定，可以提前结束 */

        for (int v = 0; v < G->n; v++) {
            if (G->w[u][v] > 0 && dist[u] + G->w[u][v] < dist[v]) {
                dist[v] = dist[u] + G->w[u][v];
                prev[v] = u;
            }
        }
    }

    size_t used = 0;
    out[0] = '\0';

    if (dist[end] >= INF) {
        Put(out, cap, used, "从「%s」到「%s」没有通路。\n",
            G->v[start].name, G->v[end].name);
        return 0;
    }

    /* 由 prev 数组倒推出路线 */
    int path[GRAPH_MAX], len = 0;
    for (int cur = end; cur >= 0 && len < GRAPH_MAX; cur = prev[cur]) {
        path[len++] = cur;
        if (cur == start) break;
    }

    used = Put(out, cap, used, "从「%s」到「%s」的最短距离：%d 米\n\n",
               G->v[start].name, G->v[end].name, dist[end]);
    used = Put(out, cap, used, "路线：");

    for (int i = len - 1; i >= 0; i--) {
        used = Put(out, cap, used, "%s%s", G->v[path[i]].name,
                   (i > 0) ? " → " : "\n");
    }

    /* 顺便列出到其它各点的距离，方便比较 */
    used = Put(out, cap, used, "\n到各地点距离：\n");
    for (int i = 0; i < G->n; i++) {
        char name[32];
        PadTo(name, sizeof name, G->v[i].name, 12);

        if (dist[i] >= INF) used = Put(out, cap, used, "  %s 不通\n", name);
        else                used = Put(out, cap, used, "  %s %4d 米\n", name, dist[i]);
    }
    return 1;
}

void CampusFloyd(const Campus *G, char *out, size_t cap) {
    int d[GRAPH_MAX][GRAPH_MAX];

    for (int i = 0; i < G->n; i++) {
        for (int j = 0; j < G->n; j++) {
            d[i][j] = (i == j) ? 0 : (G->w[i][j] > 0 ? G->w[i][j] : INF);
        }
    }

    /* 依次允许经过第 k 个点，逐步松弛 */
    for (int k = 0; k < G->n; k++) {
        for (int i = 0; i < G->n; i++) {
            for (int j = 0; j < G->n; j++) {
                if (d[i][k] + d[k][j] < d[i][j]) {
                    d[i][j] = d[i][k] + d[k][j];
                }
            }
        }
    }

    size_t used = 0;
    used = Put(out, cap, used, "任意两点间的最短距离（单位：米，- 表示不通）\n");
    used = Put(out, cap, used, "%6s", "");
    for (int j = 0; j < G->n; j++) used = Put(out, cap, used, "%6d", j);
    used = Put(out, cap, used, "\n");

    for (int i = 0; i < G->n; i++) {
        used = Put(out, cap, used, "%4d  ", i);
        for (int j = 0; j < G->n; j++) {
            if (d[i][j] >= INF) used = Put(out, cap, used, "%6s", "-");
            else                used = Put(out, cap, used, "%6d", d[i][j]);
        }
        used = Put(out, cap, used, "\n");
    }

    used = Put(out, cap, used, "\n编号对照：");
    for (int i = 0; i < G->n; i++) {
        used = Put(out, cap, used, "%d=%s%s", i, G->v[i].name,
                   (i + 1 < G->n) ? "，" : "\n");
    }
}

/* ==========================================================================
 *  六、哈密尔顿回路（不重复地游览所有地点后回到起点）
 * ==========================================================================*/

static long g_tourSteps = 0;         /* 搜索步数，防止极端情况下卡住 */

static int TourRec(const Campus *G, int start, int u, int depth,
                   int *path, int *vis, long limit) {
    if (++g_tourSteps > limit) return 0;

    if (depth == G->n) {
        return G->w[u][start] > 0;   /* 走完全部地点，还要能回到起点 */
    }

    for (int v = 0; v < G->n; v++) {
        if (G->w[u][v] > 0 && !vis[v]) {
            vis[v] = 1;
            path[depth] = v;
            if (TourRec(G, start, v, depth + 1, path, vis, limit)) return 1;
            vis[v] = 0;
        }
    }
    return 0;
}

int CampusTour(const Campus *G, int start, char *out, size_t cap) {
    int path[GRAPH_MAX], vis[GRAPH_MAX] = {0};

    if (start < 0 || start >= G->n) return 0;

    path[0] = start;
    vis[start] = 1;
    g_tourSteps = 0;

    if (!TourRec(G, start, start, 1, path, vis, 2000000L)) {
        snprintf(out, cap, "从「%s」出发找不到不重复走遍全部地点的路线。\n",
                 G->v[start].name);
        return 0;
    }

    int total = 0;
    for (int i = 0; i < G->n; i++) {
        int a = path[i];
        int b = (i + 1 < G->n) ? path[i + 1] : start;
        total += G->w[a][b];
    }

    size_t used = 0;
    used = Put(out, cap, used,
               "从「%s」出发，不重复地游览全部 %d 个地点并回到起点：\n\n",
               G->v[start].name, G->n);
    used = Put(out, cap, used, "路线：");

    for (int i = 0; i < G->n; i++) {
        used = Put(out, cap, used, "%s → ", G->v[path[i]].name);
    }
    used = Put(out, cap, used, "%s\n\n总路程：%d 米\n", G->v[start].name, total);
    return 1;
}
