/* ============================================================================
 *  LinearSolver.h  —  线性方程组求解（难度 C 模块）
 *  ---------------------------------------------------------------------------
 *  做法：对增广矩阵做「列主元高斯-约当消元」，化为行最简形，
 *        再由系数矩阵的秩 r(A) 与增广矩阵的秩 r(A|b) 判定解的情况：
 *          r(A) <  r(A|b)  → 无解
 *          r(A) == r(A|b) == n → 唯一解
 *          r(A) == r(A|b) <  n → 无穷多解（n - r 个自由变量）
 * ==========================================================================*/

#ifndef LINEARSOLVER_H
#define LINEARSOLVER_H

#include <stdio.h>

#define MAT_MAX_ROWS 20                    /* 最多方程个数 */
#define MAT_MAX_VARS 20                    /* 最多未知数个数 */
#define MAT_EPS      1e-9                  /* 浮点零阈值 */

/* 增广矩阵：m 行、n 个未知数，共 n+1 列（最后一列为常数项） */
typedef struct {
    int    m;                              /* 方程个数 */
    int    n;                              /* 未知数个数 */
    double a[MAT_MAX_ROWS][MAT_MAX_VARS + 1];
} Matrix;

/* 解的三种情况 */
typedef enum {
    NO_SOLUTION,                           /* 无解 */
    UNIQUE_SOLUTION,                       /* 唯一解 */
    INFINITE_SOLUTION                      /* 无穷多解 */
} SolutionType;

/* 求解结果 */
typedef struct {
    SolutionType type;                     /* 解的类型 */
    int rankA;                             /* 系数矩阵的秩 */
    int rankAug;                           /* 增广矩阵的秩 */
    int pivotCol[MAT_MAX_VARS];            /* 各主元所在的列号 */
    int pivotCnt;                          /* 主元个数，即 r(A) */
    int freeVar[MAT_MAX_VARS];             /* 自由变量的列号 */
    int freeCnt;                           /* 自由变量个数 */
} Solution;

/* ---------------------------- 接口 ---------------------------- */

/* 设置矩阵规模，并把所有元素清零 */
void MatSetSize(Matrix *M, int m, int n);

/* 按行优先一次性填入 m*(n+1) 个数，主要用于测试 */
int  MatSetValues(Matrix *M, int m, int n, const double *vals);

/* 打印增广矩阵（系数 | 常数），各列按宽度对齐 */
void MatPrint(const Matrix *M);

/* 把增广矩阵写入字符串（图形界面用），col 对齐格式同 MatPrint */
void MatFormat(const Matrix *M, char *buf, size_t size);

/* 列主元高斯-约当消元，原地化为行最简形，并记录主元信息；返回 r(A) */
int  MatGaussJordan(Matrix *M, Solution *S);

/* 判定解的情况，并找出自由变量 */
void MatClassify(const Matrix *M, Solution *S);

/* 输出解：无解提示 / 唯一解 / 特解 + 基础解系 + 通解 */
void MatPrintSolution(const Matrix *M, const Solution *S);

/* 把解的说明写入字符串（图形界面用） */
void MatSolutionText(const Matrix *M, const Solution *S, char *buf, size_t size);

/* 解的类型对应的中文说明 */
const char *MatTypeName(SolutionType t);

#endif /* LINEARSOLVER_H */
