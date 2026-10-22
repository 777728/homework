/* ============================================================================
 *  maze.h  —  实验四：数组的表示及其应用（迷宫求解）
 *  ---------------------------------------------------------------------------
 *  迷宫用一个二维数组表示：0 通路，1 障碍。
 *  求解用「链表栈 + 深度优先」的非递归算法，路径以三元组 (i, j, d) 输出，
 *  d 表示从当前格走向下一格的方向：1 东、2 南、3 西、4 北。
 * ==========================================================================*/
#ifndef MAZE_H
#define MAZE_H

#include <stddef.h>

#define MAZE_MAX 41                  /* 最大边长（含四周的墙） */

#define MAZE_OPEN   0                /* 通路 */
#define MAZE_WALL   1                /* 障碍 */
#define MAZE_PATH   2                /* 求解后：路径上的格子 */
#define MAZE_TRIED  3                /* 求解后：走过但不通的格子 */

/* 迷宫：rows × cols 的字符矩阵 */
typedef struct {
    int rows, cols;
    unsigned char cell[MAZE_MAX][MAZE_MAX];
} Maze;

/* 一条路径：第 k 步在 (r[k], c[k])，d[k] 是走向下一步的方向，最后一步为 0 */
typedef struct {
    int len;
    int r[MAZE_MAX * MAZE_MAX];
    int c[MAZE_MAX * MAZE_MAX];
    int d[MAZE_MAX * MAZE_MAX];
} MazePath;

/* 随机生成 rows×cols 的迷宫（四周是墙，内部保证连通），seed 相同则结果相同 */
void MazeGenerate(Maze *M, int rows, int cols, unsigned seed);

/* 由文本生成迷宫：每行一串 0/1，程序会自动在四周补一圈墙
 * 成功返回 1，格式不对返回 0 */
int MazeParse(Maze *M, const char *text);

/* 求解：找到路径返回 1，并把沿途格子标记为 PATH / TRIED */
int MazeSolve(Maze *M, int sr, int sc, int er, int ec, MazePath *P);

/* 把迷宫画成字符方阵（# 墙，空格 通路，* 路径，x 死路） */
void MazeDraw(const Maze *M, char *out, size_t cap);

/* 把路径写成三元组序列，例如 (1,1,1) (1,2,2) ... */
void MazePathText(const MazePath *P, char *out, size_t cap);

#endif /* MAZE_H */
