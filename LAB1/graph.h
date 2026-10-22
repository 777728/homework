/* ============================================================================
 *  graph.h  —  实验六：图及其应用（校园导游）
 *  ---------------------------------------------------------------------------
 *  校园道路抽象成一张带权无向图：
 *    顶点 = 建筑，边 = 道路，权值 = 距离（米）
 *  存储结构用邻接矩阵，实现遍历、最短路径（Dijkstra / Floyd）
 *  以及“不重复游览所有建筑再回到起点”的哈密尔顿回路。
 * ==========================================================================*/
#ifndef GRAPH_H
#define GRAPH_H

#include <stddef.h>

#define GRAPH_MAX 16                 /* 最多 16 个地点 */

typedef struct {
    char name[24];                   /* 建筑名称 */
    char info[80];                   /* 简介 */
} Spot;

typedef struct {
    int  n;                                       /* 顶点数 */
    Spot v[GRAPH_MAX];                            /* 顶点表 */
    int  w[GRAPH_MAX][GRAPH_MAX];                 /* 邻接矩阵，0 表示没有直接道路 */
} Campus;

/* 载入校园数据（云南大学呈贡校区 12 个地点） */
void CampusInit(Campus *G);

/* 按编号（"0"）或名称（"图书馆"）查找顶点，找不到返回 -1 */
int CampusFind(const Campus *G, const char *text);

/* 输出地点列表 */
void CampusList(const Campus *G, char *out, size_t cap);

/* 输出邻接矩阵 */
void CampusMatrix(const Campus *G, char *out, size_t cap);

/* 深度优先 / 广度优先遍历，输出访问顺序 */
void CampusDFS(const Campus *G, int start, char *out, size_t cap);
void CampusBFS(const Campus *G, int start, char *out, size_t cap);

/* 求 start 到 end 的最短路径与距离；不连通返回 0 */
int CampusDijkstra(const Campus *G, int start, int end, char *out, size_t cap);

/* Floyd：输出任意两点间的最短距离矩阵 */
void CampusFloyd(const Campus *G, char *out, size_t cap);

/* 哈密尔顿回路：从 start 出发不重复地走遍所有地点再回到 start
 * 找到返回 1，并输出路线与总路程 */
int CampusTour(const Campus *G, int start, char *out, size_t cap);

#endif /* GRAPH_H */
