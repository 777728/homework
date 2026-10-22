/* ============================================================================
 *  LinearSolver.c  —  线性方程组求解实现
 *  ---------------------------------------------------------------------------
 *  核心只有两步：
 *    1) 高斯-约当消元（带列主元）把增广矩阵化成「行最简形」；
 *    2) 在行最简形上直接读出秩、自由变量、特解与基础解系。
 *
 *  输出部分同时提供「写入字符串」与「打印到屏幕」两个版本：
 *  控制台程序用后者，图形界面用前者，避免两套排版代码。
 * ==========================================================================*/

#include <math.h>
#include <stdarg.h>
#include <string.h>

#include "LinearSolver.h"

/* ---------------------------------------------------------------------------
 *  内部：一个极简的字符串缓冲，负责拼接与防越界
 * -------------------------------------------------------------------------*/
typedef struct {
    char  *p;
    size_t size;
    size_t used;
} TextBuf;

/* 初始化缓冲区（buf 由调用者提供） */
static void TbInit(TextBuf *b, char *buf, size_t size) {
    b->p    = buf;
    b->size = size;
    b->used = 0;
    if (size > 0) buf[0] = '\0';
}

/* 按 printf 格式追加内容，超出容量自动截断 */
static void TbAdd(TextBuf *b, const char *fmt, ...) {
    if (b->used + 1 >= b->size) return;

    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(b->p + b->used, b->size - b->used, fmt, ap);
    va_end(ap);

    if (n > 0) {
        b->used += (size_t)n;
        if (b->used >= b->size) b->used = b->size - 1;   /* 已截断 */
    }
}

/* 把 double 格式化成“好看”的字符串：整数不带小数点，小数去掉末尾多余的 0 */
static void NumToStr(double v, char *buf, size_t size) {
    if (fabs(v) < MAT_EPS) v = 0.0;

    if (fabs(v - (double)(long long)llround(v)) < 1e-9 && fabs(v) < 1e15) {
        snprintf(buf, size, "%.0f", v);
        return;
    }
    snprintf(buf, size, "%.4f", v);

    /* 去掉小数点后无意义的 0，如 0.5000 → 0.5 */
    char *dot = strchr(buf, '.');
    if (dot != NULL) {
        char *end = buf + strlen(buf) - 1;
        while (end > dot && *end == '0') *end-- = '\0';
        if (end == dot) *end = '\0';
    }
}

/* ---------------------------------------------------------------------------
 *  矩阵的文本化
 * -------------------------------------------------------------------------*/

/* 把增广矩阵写入字符串，各列按宽度对齐 */
void MatFormat(const Matrix *M, char *buf, size_t size) {
    char cell[MAT_MAX_ROWS][MAT_MAX_VARS + 1][32];
    int  width[MAT_MAX_VARS + 1];
    int  i, j;

    if (buf == NULL || size == 0) return;
    if (M == NULL) { snprintf(buf, size, ""); return; }

    for (j = 0; j <= M->n; j++) width[j] = 1;

    for (i = 0; i < M->m; i++) {
        for (j = 0; j <= M->n; j++) {
            NumToStr(M->a[i][j], cell[i][j], sizeof cell[i][j]);
            int len = (int)strlen(cell[i][j]);
            if (len > width[j]) width[j] = len;
        }
    }

    TextBuf b;
    TbInit(&b, buf, size);

    for (i = 0; i < M->m; i++) {
        TbAdd(&b, "  [ ");
        for (j = 0; j <= M->n; j++) {
            if (j == M->n) TbAdd(&b, "| ");          /* 分隔系数与常数项 */
            TbAdd(&b, "%*s ", width[j], cell[i][j]);
        }
        TbAdd(&b, "]\n");
    }
}

/* 打印矩阵到屏幕（控制台版本） */
void MatPrint(const Matrix *M) {
    char buf[8192];
    MatFormat(M, buf, sizeof buf);
    printf("%s", buf);
}

/* 设置规模并清零 */
void MatSetSize(Matrix *M, int m, int n) {
    if (M == NULL) return;
    M->m = m;
    M->n = n;
    memset(M->a, 0, sizeof M->a);
}

/* 按行优先填入数据，长度须为 m*(n+1) */
int MatSetValues(Matrix *M, int m, int n, const double *vals) {
    if (M == NULL || vals == NULL) return -1;
    if (m <= 0 || n <= 0 || m > MAT_MAX_ROWS || n > MAT_MAX_VARS) return -1;

    MatSetSize(M, m, n);
    for (int i = 0; i < m; i++)
        for (int j = 0; j <= n; j++)
            M->a[i][j] = vals[i * (n + 1) + j];
    return 0;
}

/*
 * 列主元高斯-约当消元
 *   row 记录当前正在处理的主元行；col 从左到右扫描。
 *   每一步：选出该列绝对值最大的行做交换（抑制舍入误差），
 *           主元行归一化，再把该列其余各行全部消成 0。
 *   若整列为 0，说明该列对应自由变量，跳过但 row 不前进。
 */
int MatGaussJordan(Matrix *M, Solution *S) {
    int row = 0;

    S->pivotCnt = 0;

    for (int col = 0; col < M->n && row < M->m; col++) {
        /* ① 选主元：该列绝对值最大的行 */
        int maxRow = row;
        for (int i = row + 1; i < M->m; i++) {
            if (fabs(M->a[i][col]) > fabs(M->a[maxRow][col])) maxRow = i;
        }

        /* ② 该列全为 0 → 自由变量列，跳过 */
        if (fabs(M->a[maxRow][col]) < MAT_EPS) continue;

        /* ③ 交换行，把主元换到第 row 行 */
        if (maxRow != row) {
            for (int j = col; j <= M->n; j++) {
                double t        = M->a[row][j];
                M->a[row][j]    = M->a[maxRow][j];
                M->a[maxRow][j] = t;
            }
        }

        /* ④ 归一化，使主元为 1 */
        double pivot = M->a[row][col];
        for (int j = col; j <= M->n; j++) M->a[row][j] /= pivot;

        /* ⑤ 消去其他各行的这一列（约当消元：上下都消） */
        for (int i = 0; i < M->m; i++) {
            if (i == row) continue;
            double factor = M->a[i][col];
            if (fabs(factor) < MAT_EPS) continue;
            for (int j = col; j <= M->n; j++) {
                M->a[i][j] -= factor * M->a[row][j];
            }
        }

        S->pivotCol[S->pivotCnt++] = col;
        row++;
    }

    S->rankA = S->pivotCnt;      /* 消元后即可得到 r(A) */
    return S->pivotCnt;
}

/* 判定解的情况：比较 r(A) 与 r(A|b) */
void MatClassify(const Matrix *M, Solution *S) {
    int rankA = 0, rankAug = 0, contradiction = 0;

    for (int i = 0; i < M->m; i++) {
        int nzA = 0, nzB = 0;

        for (int j = 0; j < M->n; j++) {
            if (fabs(M->a[i][j]) > MAT_EPS) { nzA = 1; break; }
        }
        if (fabs(M->a[i][M->n]) > MAT_EPS) nzB = 1;

        if (nzA) rankA++;
        if (nzA || nzB) rankAug++;
        if (!nzA && nzB) contradiction = 1;      /* 0 = 非零，矛盾方程 */
    }

    S->rankA   = rankA;
    S->rankAug = rankAug;

    if (contradiction)      S->type = NO_SOLUTION;
    else if (rankA == M->n) S->type = UNIQUE_SOLUTION;
    else                    S->type = INFINITE_SOLUTION;

    /* 找自由变量：没有成为主元的列 */
    S->freeCnt = 0;
    for (int col = 0; col < M->n; col++) {
        int isPivot = 0;
        for (int k = 0; k < S->pivotCnt; k++) {
            if (S->pivotCol[k] == col) { isPivot = 1; break; }
        }
        if (!isPivot) S->freeVar[S->freeCnt++] = col;
    }
}

/* 类型的中文名 */
const char *MatTypeName(SolutionType t) {
    switch (t) {
    case NO_SOLUTION:       return "无解";
    case UNIQUE_SOLUTION:   return "唯一解";
    case INFINITE_SOLUTION: return "无穷多解";
    default:                return "未知";
    }
}

/*
 * 把解的说明写入字符串。
 * 行最简形下，第 i 个主元所在列为 pivotCol[i]，该行含义：
 *     x_p + Σ(自由变量项) = 常数
 * 因此：特解 = 自由变量全取 0 时的主元值；
 *       基础解系 = 依次让某个自由变量取 1、其余取 0，再反解主元变量。
 */
void MatSolutionText(const Matrix *M, const Solution *S, char *buf, size_t size) {
    char num[32];
    int  n = M->n;

    if (buf == NULL || size == 0) return;

    TextBuf b;
    TbInit(&b, buf, size);

    if (S->type == NO_SOLUTION) {
        TbAdd(&b, "  方程组无解。\n");
        TbAdd(&b, "  因为 r(A) = %d < r(A|b) = %d，出现矛盾方程 0 = 非零。\n",
              S->rankA, S->rankAug);
        return;
    }

    if (S->type == UNIQUE_SOLUTION) {
        TbAdd(&b, "  方程组有唯一解（r(A) = r(A|b) = n = %d）：\n\n", n);

        double x[MAT_MAX_VARS] = {0};
        for (int i = 0; i < S->pivotCnt; i++) {
            x[S->pivotCol[i]] = M->a[i][n];
        }
        for (int j = 0; j < n; j++) {
            NumToStr(x[j], num, sizeof num);
            TbAdd(&b, "      x%-2d = %s\n", j + 1, num);
        }
        return;
    }

    /* ---------------- 无穷多解 ---------------- */
    TbAdd(&b, "  有无穷多解（r(A) = r(A|b) = %d < n = %d，自由变量 %d 个）：\n\n",
          S->rankA, n, S->freeCnt);

    /* 特解：自由变量全取 0 */
    double x0[MAT_MAX_VARS] = {0};
    for (int i = 0; i < S->pivotCnt; i++) {
        x0[S->pivotCol[i]] = M->a[i][n];
    }

    TbAdd(&b, "  特解 x0（自由变量取 0）= (");
    for (int j = 0; j < n; j++) {
        NumToStr(x0[j], num, sizeof num);
        TbAdd(&b, "%s%s", num, (j < n - 1) ? ", " : "");
    }
    TbAdd(&b, ")^T\n\n");

    /* 基础解系 */
    TbAdd(&b, "  基础解系（共 %d 个向量）：\n", S->freeCnt);
    for (int f = 0; f < S->freeCnt; f++) {
        double xi[MAT_MAX_VARS] = {0};
        xi[S->freeVar[f]] = 1.0;

        /* 把该自由变量代入每一行反解主元变量 */
        for (int i = 0; i < S->pivotCnt; i++) {
            int pc = S->pivotCol[i];
            double val = 0.0;
            for (int j = 0; j < n; j++) {
                if (j != pc) val -= M->a[i][j] * xi[j];
            }
            xi[pc] = val;
        }

        TbAdd(&b, "      ξ%d = (", f + 1);
        for (int j = 0; j < n; j++) {
            NumToStr(xi[j], num, sizeof num);
            TbAdd(&b, "%s%s", num, (j < n - 1) ? ", " : "");
        }
        TbAdd(&b, ")^T\n");
    }

    /* 通解 */
    TbAdd(&b, "\n  通解：x = x0");
    for (int f = 0; f < S->freeCnt; f++) {
        TbAdd(&b, " + c%d*ξ%d", f + 1, f + 1);
    }
    if (S->freeCnt == 1) TbAdd(&b, "   （c1 为任意常数）\n");
    else                 TbAdd(&b, "   （c1..c%d 为任意常数）\n", S->freeCnt);
}

/* 打印解到屏幕（控制台版本） */
void MatPrintSolution(const Matrix *M, const Solution *S) {
    char buf[8192];
    MatSolutionText(M, S, buf, sizeof buf);
    printf("\n%s", buf);
}
