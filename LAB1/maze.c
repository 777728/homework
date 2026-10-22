/* ============================================================================
 *  maze.c  —  实验四：迷宫（二维数组 + 链栈 + 深度优先搜索）
 *  ---------------------------------------------------------------------------
 *  算法思路：
 *    从入口出发，把「当前位置 + 下一个要试的方向」压入栈；
 *    依次尝试东、南、西、北，能走就前进（把新格子压栈），
 *    四个方向都走不通就标记为死路并退栈，直到走到出口或栈空。
 *    栈用单链表实现，正符合题目「先实现一个以链表作存储结构的栈类型」。
 * ==========================================================================*/
#include "maze.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* 方向编号 1~4 对应的行、列增量：东、南、西、北 */
static const int DR[5] = { 0, 0, 1, 0, -1 };
static const int DC[5] = { 0, 1, 0, -1, 0 };

/* ---------------------------- 链表栈 ---------------------------- */

typedef struct Step {
    int r, c;              /* 当前位置 */
    int di;                /* 下一个要尝试的方向 1~4 */
    struct Step *next;
} Step;

/* 压栈，成功返回 1 */
static int Push(Step **top, int r, int c, int di) {
    Step *s = (Step *)malloc(sizeof(Step));
    if (s == NULL) return 0;

    s->r = r;
    s->c = c;
    s->di = di;
    s->next = *top;
    *top = s;
    return 1;
}

/* 弹栈（调用者保证栈非空） */
static void Pop(Step **top) {
    Step *s = *top;
    *top = s->next;
    free(s);
}

/* 释放整个栈 */
static void ClearStack(Step **top) {
    while (*top != NULL) Pop(top);
}

/* ---------------------------- 生成迷宫 ---------------------------- */

/* 在 [lo, hi] 中取随机数 */
static int RandRange(int lo, int hi) {
    return lo + rand() % (hi - lo + 1);
}

void MazeGenerate(Maze *M, int rows, int cols, unsigned seed) {
    /* 房间取奇数坐标，所以边长要取奇数；范围限制在 5 ~ MAZE_MAX */
    if (rows < 5) rows = 5;
    if (cols < 5) cols = 5;
    if (rows > MAZE_MAX) rows = MAZE_MAX;
    if (cols > MAZE_MAX) cols = MAZE_MAX;
    if (rows % 2 == 0) rows--;
    if (cols % 2 == 0) cols--;

    M->rows = rows;
    M->cols = cols;

    /* 先全部填成墙，再从左下角开始“挖洞” */
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < cols; j++)
            M->cell[i][j] = MAZE_WALL;

    if (seed == 0) seed = 1;
    srand(seed);

    /* 用数组当栈保存待挖的格子（挖洞过程本身不需要链表栈） */
    typedef struct { int r, c; } Pos;
    static Pos stack[MAZE_MAX * MAZE_MAX];
    int sp = 0;

    M->cell[1][1] = MAZE_OPEN;
    stack[sp].r = 1;
    stack[sp].c = 1;
    sp++;

    while (sp > 0) {
        Pos cur = stack[sp - 1];

        /* 收集四个方向中可以“跳两格”挖过去的方向 */
        int cand[4], cnt = 0;
        for (int d = 1; d <= 4; d++) {
            int nr = cur.r + 2 * DR[d];
            int nc = cur.c + 2 * DC[d];
            if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 &&
                M->cell[nr][nc] == MAZE_WALL) {
                cand[cnt++] = d;
            }
        }

        if (cnt == 0) {          /* 四周都挖过了，退回上一格 */
            sp--;
            continue;
        }

        int d = cand[RandRange(0, cnt - 1)];
        M->cell[cur.r + DR[d]][cur.c + DC[d]] = MAZE_OPEN;       /* 打通中间的墙 */
        M->cell[cur.r + 2 * DR[d]][cur.c + 2 * DC[d]] = MAZE_OPEN; /* 打通目标格 */

        stack[sp].r = cur.r + 2 * DR[d];
        stack[sp].c = cur.c + 2 * DC[d];
        sp++;
    }
}

int MazeParse(Maze *M, const char *text) {
    static unsigned char tmp[MAZE_MAX][MAZE_MAX];
    int rows = 0, cols = 0;

    /* 逐行读 0/1，忽略空格和其他字符 */
    const char *p = text;
    while (*p != '\0') {
        int  cnt = 0;
        int  empty = 1;

        while (*p != '\0' && *p != '\n') {
            if (*p == '0' || *p == '1') {
                if (cnt >= MAZE_MAX) return 0;
                tmp[rows][cnt++] = (unsigned char)(*p - '0');
                empty = 0;
            }
            p++;
        }
        if (*p == '\n') p++;

        if (empty) continue;                  /* 跳过空行 */
        if (rows == 0) cols = cnt;            /* 第一行决定列数 */
        if (cnt != cols || rows >= MAZE_MAX) return 0;
        rows++;
    }

    if (rows < 2 || cols < 2) return 0;
    if (rows + 2 > MAZE_MAX || cols + 2 > MAZE_MAX) return 0;

    /* 四周补一圈墙，方便判断越界 */
    M->rows = rows + 2;
    M->cols = cols + 2;
    for (int i = 0; i < M->rows; i++)
        for (int j = 0; j < M->cols; j++)
            M->cell[i][j] = MAZE_WALL;

    for (int i = 0; i < rows; i++)
        for (int j = 0; j < cols; j++)
            M->cell[i + 1][j + 1] = tmp[i][j];

    return 1;
}

/* ---------------------------- 求解 ---------------------------- */

/* 坐标是否在迷宫内 */
static int Inside(const Maze *M, int r, int c) {
    return r >= 0 && r < M->rows && c >= 0 && c < M->cols;
}

int MazeSolve(Maze *M, int sr, int sc, int er, int ec, MazePath *P) {
    P->len = 0;

    if (!Inside(M, sr, sc) || !Inside(M, er, ec)) return 0;
    if (M->cell[sr][sc] != MAZE_OPEN || M->cell[er][ec] != MAZE_OPEN) return 0;

    Step *top = NULL;
    if (!Push(&top, sr, sc, 1)) return 0;

    M->cell[sr][sc] = MAZE_PATH;
    int found = 0;

    while (top != NULL) {
        /* 到达出口 */
        if (top->r == er && top->c == ec) {
            found = 1;
            break;
        }

        /* 尝试当前格的下一个方向 */
        int moved = 0;
        while (top->di <= 4) {
            int d  = top->di;
            int nr = top->r + DR[d];
            int nc = top->c + DC[d];

            if (Inside(M, nr, nc) && M->cell[nr][nc] == MAZE_OPEN) {
                M->cell[nr][nc] = MAZE_PATH;
                if (!Push(&top, nr, nc, 1)) {   /* 内存不足，按失败处理 */
                    ClearStack(&top);
                    found = 0;
                    goto finish;
                }
                moved = 1;
                break;
            }
            top->di++;                          /* 这个方向不通，换下一个 */
        }

        if (!moved) {                           /* 四个方向都不通：死路，退回 */
            M->cell[top->r][top->c] = MAZE_TRIED;
            Pop(&top);
        }
    }

finish:
    if (!found) {
        /* 没有通路时把探索痕迹擦掉，迷宫恢复原样 */
        for (int i = 0; i < M->rows; i++)
            for (int j = 0; j < M->cols; j++)
                if (M->cell[i][j] != MAZE_WALL) M->cell[i][j] = MAZE_OPEN;
        ClearStack(&top);
        return 0;
    }

    /* 栈顶是出口、栈底是入口，倒着填进路径数组 */
    int len = 0;
    for (Step *s = top; s != NULL; s = s->next) len++;

    P->len = len;
    int i = len - 1;
    for (Step *s = top; s != NULL; s = s->next) {
        P->r[i] = s->r;
        P->c[i] = s->c;
        P->d[i] = (i == len - 1) ? 0 : s->di;   /* 最后一步没有“下一格” */
        i--;
    }

    ClearStack(&top);
    return 1;
}

/* ---------------------------- 输出 ---------------------------- */

void MazeDraw(const Maze *M, char *out, size_t cap) {
    size_t used = 0;

    for (int i = 0; i < M->rows && used + 2 < cap; i++) {
        for (int j = 0; j < M->cols && used + 2 < cap; j++) {
            char ch;
            switch (M->cell[i][j]) {
                case MAZE_WALL:  ch = '#'; break;
                case MAZE_PATH:  ch = '*'; break;
                case MAZE_TRIED: ch = 'x'; break;
                default:         ch = ' '; break;
            }
            out[used++] = ch;
        }
        out[used++] = '\n';
    }
    out[used] = '\0';
}

void MazePathText(const MazePath *P, char *out, size_t cap) {
    size_t used = 0;

    for (int k = 0; k < P->len; k++) {
        int n = snprintf(out + used, cap - used, "(%d,%d,%d)",
                         P->r[k], P->c[k], P->d[k]);
        if (n <= 0 || used + (size_t)n >= cap) break;
        used += (size_t)n;

        /* 每行 8 个三元组，便于阅读 */
        if (k != P->len - 1) {
            int brk = ((k + 1) % 8 == 0);
            if (used + 2 < cap) out[used++] = brk ? '\n' : ' ';
        }
    }
    out[used] = '\0';
}
