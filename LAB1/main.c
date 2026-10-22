/* ============================================================================
 *  main.c  —  程序入口与交互菜单
 *  ---------------------------------------------------------------------------
 *  模块划分：
 *      Polynomial.c / .h   一元稀疏多项式（带头结点单链表）的存储与运算
 *      LinearSolver.c / .h 线性方程组求解（难度 C）
 *      ui.c / .h           控制台界面：分隔线、颜色、安全输入
 *      main.c              菜单流程与业务逻辑
 * ==========================================================================*/

#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "LinearSolver.h"
#include "Polynomial.h"
#include "ui.h"

/* 两个全局多项式，整个程序共享 */
static Polynomial A, B;
static int hasA = 0, hasB = 0;

/* ==========================================================================
 *  一、多项式模块的辅助函数
 * ==========================================================================*/

/* 读取一个多项式表达式；成功返回 1，取消或出错返回 0 */
static int ReadPoly(Polynomial *p, const char *name) {
    char buf[512];

    printf("   输入 %s（例：3x^2-2x+1，直接回车取消）：", name);
    fflush(stdout);
    if (!uiReadLine(buf, sizeof buf)) return 0;
    if (buf[0] == '\0') return 0;

    Polynomial tmp;
    int rc = CreatPolynFromString(&tmp, buf);
    if (rc == POLY_EPARSE) {
        uiErr("表达式格式有误。合法写法：3x^2-2x+1、-x^3+5、2*x、x、7");
        return 0;
    }
    if (rc != POLY_OK) {
        uiErr("创建失败（内存不足）");
        return 0;
    }

    DestroyPolyn(p);          /* 释放旧内容，接管新链表 */
    *p = tmp;

    printf("   %s = ", name);
    PrintPolyn(p);
    printf("\n");
    return 1;
}

/* 打印一个多项式的详细信息：项数、次数、逐项列表 */
static void ShowDetail(const Polynomial *p, const char *name) {
    if (PolyIsZero(p)) {
        uiPlain("%s = 0   （零多项式，项数 0）", name);
        return;
    }

    printf("   %s = ", name);
    PrintPolyn(p);
    printf("\n");
    uiPlain("项数 = %d，次数 = %d", ListLength(p), p->head->next->expn);

    printf("        项号   系数          指数\n");
    int i = 1;
    for (Link q = p->head->next; q != NULL; q = q->next, i++) {
        printf("        %-4d  %-12.6g  %d\n", i, q->coef, q->expn);
    }
}

/* 输出运算结果，并询问是否存回 A */
static void ShowResultAndAsk(const char *label, Polynomial *r) {
    printf("\n   %s = ", label);
    PrintPolyn(r);
    printf("\n");

    if (uiConfirm("   是否把结果保存为 A？(y/N) ")) {
        DestroyPolyn(&A);
        A    = *r;              /* 所有权转移给 A */
        hasA = 1;
        uiOK("结果已保存为 A");
    } else {
        DestroyPolyn(r);
    }
    printf("\n");
}

/* 二元运算的统一入口：op 取 0=加、1=减、2=乘 */
static void BinaryOp(int op) {
    if (!hasA || !hasB) {
        uiErr("请先输入 A 和 B");
        return;
    }

    Polynomial r;
    int rc;

    if (op == 0) {
        rc = AddPolyn(&A, &B, &r);
        if (rc == POLY_OK) { ShowResultAndAsk("A + B", &r); return; }
    } else if (op == 1) {
        rc = SubPolyn(&A, &B, &r);
        if (rc == POLY_OK) { ShowResultAndAsk("A - B", &r); return; }
    } else {
        rc = MultiplyPolyn(&A, &B, &r);
        if (rc == POLY_OK) { ShowResultAndAsk("A * B", &r); return; }
    }

    if (rc == POLY_ENOMEM) uiErr("运算失败：内存不足");
    else                   uiErr("运算失败：结果指数超出允许范围");
}

/* ==========================================================================
 *  二、多项式菜单
 * ==========================================================================*/
static void PolyMenu(void) {
    int choice;

    while (1) {
        uiTitle("一元稀疏多项式计算器");

        printf("   A = ");
        if (hasA) PrintPolyn(&A); else printf("（未输入）");
        printf("\n   B = ");
        if (hasB) PrintPolyn(&B); else printf("（未输入）");
        printf("\n");

        uiRule('-');
        uiItem(1, "输入 / 修改多项式 A");
        uiItem(2, "输入 / 修改多项式 B");
        uiItem(3, "查看 A、B 的详细信息");
        uiItem(4, "计算 A + B");
        uiItem(5, "计算 A - B");
        uiItem(6, "计算 A * B");
        uiItem(7, "求 A 的导数 A'");
        uiItem(8, "给定 x，计算 A(x) 与 B(x)");
        uiItem(9, "交换 A 与 B");
        uiItem(0, "返回主菜单");
        uiRule('-');

        int rc = uiReadInt("   请选择 > ", &choice);
        if (rc == 0) continue;
        if (rc < 0) { uiErr("请输入数字"); continue; }

        switch (choice) {
        case 1:
            if (ReadPoly(&A, "A")) hasA = 1;
            break;

        case 2:
            if (ReadPoly(&B, "B")) hasB = 1;
            break;

        case 3:
            printf("\n");
            if (!hasA && !hasB) { uiErr("A、B 都还没有输入"); break; }
            if (hasA) ShowDetail(&A, "A");
            printf("\n");
            if (hasB) ShowDetail(&B, "B");
            printf("\n");
            break;

        case 4: BinaryOp(0); break;
        case 5: BinaryOp(1); break;
        case 6: BinaryOp(2); break;

        case 7: {
            if (!hasA) { uiErr("请先输入 A"); break; }
            Polynomial d;
            if (DerivPolyn(&A, &d) == POLY_OK) ShowResultAndAsk("A'", &d);
            else uiErr("求导失败");
            break;
        }

        case 8: {
            double x;
            if (!hasA && !hasB) { uiErr("请先输入 A 或 B"); break; }
            int r = uiReadDouble("   x = ", &x);
            if (r == 0) break;
            if (r < 0) { uiErr("请输入合法的实数"); break; }

            printf("\n");
            if (hasA) uiPlain("A(%.6g) = %.10g", x, EvalPolyn(&A, x));
            if (hasB) uiPlain("B(%.6g) = %.10g", x, EvalPolyn(&B, x));
            printf("\n");
            break;
        }

        case 9: {
            Polynomial t = A; A = B; B = t;
            int f = hasA; hasA = hasB; hasB = f;
            uiOK("A 与 B 已交换");
            break;
        }

        case 0:
            return;

        default:
            uiErr("无效的选择，请输入 0-9");
            break;
        }
    }
}

/* ==========================================================================
 *  三、线性方程组模块
 * ==========================================================================*/

/* 把一行文本中的实数解析出来，返回解析到的个数 */
static int ParseDoubles(const char *s, double *out, int max) {
    int    cnt = 0;
    char  *end = NULL;

    while (cnt < max) {
        while (isspace((unsigned char)*s)) s++;
        if (*s == '\0') break;

        double v = strtod(s, &end);
        if (end == s) return -1;              /* 遇到非法字符 */
        out[cnt++] = v;
        s = end;
    }
    return cnt;
}

/* 录入增广矩阵；成功返回 1。（先读到临时矩阵，全部完成才提交，避免半途失败破坏原数据） */
static int ReadMatrix(Matrix *M) {
    int m = 0, n = 0;

    if (uiReadInt("   方程个数 m = ", &m) != 1 || m <= 0 || m > MAT_MAX_ROWS) {
        uiErr("m 必须是 1 ~ %d 之间的整数", MAT_MAX_ROWS);
        return 0;
    }
    if (uiReadInt("   未知数个数 n = ", &n) != 1 || n <= 0 || n > MAT_MAX_VARS) {
        uiErr("n 必须是 1 ~ %d 之间的整数", MAT_MAX_VARS);
        return 0;
    }

    Matrix tmp;
    MatSetSize(&tmp, m, n);
    uiTip("每行输入 %d 个数：前 %d 个是系数，最后一个是常数项", n + 1, n);

    char buf[1024];
    for (int i = 0; i < m; i++) {
        printf("   第 %d 行 > ", i + 1);
        fflush(stdout);
        if (!uiReadLine(buf, sizeof buf)) return 0;

        double row[MAT_MAX_VARS + 1];
        int got = ParseDoubles(buf, row, n + 1);
        if (got != n + 1) {
            uiErr("需要 %d 个数，实际读到 %d 个，本次录入已取消", n + 1, got);
            return 0;
        }
        for (int j = 0; j <= n; j++) tmp.a[i][j] = row[j];
    }

    *M = tmp;                    /* 全部成功才覆盖原矩阵 */
    uiOK("增广矩阵录入完成（%d 行 × %d 列）", m, n + 1);
    return 1;
}

static void LinearMenu(void) {
    Matrix   mat;
    Solution sol;
    int      hasMat = 0, hasElim = 0;
    int      choice;

    MatSetSize(&mat, 0, 0);
    memset(&sol, 0, sizeof sol);     /* 防止未初始化数据被显示出来 */

    while (1) {
        uiTitle("线性方程组求解器");
        if (hasMat) {
            printf("   当前方程组：%d 个方程，%d 个未知数", mat.m, mat.n);
            if (hasElim) printf("（已消元，r(A) = %d）", sol.rankA);
            printf("\n");
        } else {
            printf("   （尚未输入方程组）\n");
        }

        uiRule('-');
        uiItem(1, "输入增广矩阵");
        uiItem(2, "显示当前增广矩阵");
        uiItem(3, "高斯-约当消元（显示行最简形）");
        uiItem(4, "判定解的情况");
        uiItem(5, "输出基础解系与通解");
        uiItem(0, "返回主菜单");
        uiRule('-');

        int rc = uiReadInt("   请选择 > ", &choice);
        if (rc == 0) continue;
        if (rc < 0) { uiErr("请输入数字"); continue; }

        switch (choice) {
        case 1:
            if (ReadMatrix(&mat)) { hasMat = 1; hasElim = 0; }
            break;

        case 2:
            if (!hasMat) { uiErr("请先输入增广矩阵"); break; }
            printf("\n");
            MatPrint(&mat);
            printf("\n");
            break;

        case 3:
            if (!hasMat) { uiErr("请先输入增广矩阵"); break; }
            MatGaussJordan(&mat, &sol);
            hasElim = 1;
            printf("\n   行最简形（r(A) = %d）：\n", sol.pivotCnt);
            MatPrint(&mat);
            printf("\n");
            break;

        case 4: {
            if (!hasElim) { uiErr("请先做高斯消元"); break; }
            MatClassify(&mat, &sol);
            printf("\n");
            uiPlain("r(A) = %d，r(A|b) = %d，n = %d", sol.rankA, sol.rankAug, mat.n);
            if (sol.type == INFINITE_SOLUTION) {
                uiOK("结论：%s（自由变量 %d 个）", MatTypeName(sol.type), sol.freeCnt);
            } else {
                uiOK("结论：%s", MatTypeName(sol.type));
            }
            printf("\n");
            break;
        }

        case 5:
            if (!hasElim) { uiErr("请先做高斯消元"); break; }
            MatClassify(&mat, &sol);
            MatPrintSolution(&mat, &sol);
            printf("\n");
            break;

        case 0:
            return;

        default:
            uiErr("无效的选择，请输入 0-5");
            break;
        }
    }
}

/* ==========================================================================
 *  四、帮助与自检测试
 * ==========================================================================*/
static void ShowHelp(void) {
    uiTitle("使用说明");

    uiSection("1. 输入多项式");
    uiPlain("直接按数学写法输入，例如：");
    uiPlain("    3x^2-2x+1        3 倍 x 平方减 2x 加 1");
    uiPlain("    -x^3+5           负 x 立方加 5");
    uiPlain("    2*x^4+x          乘号可写可不写");
    uiPlain("    9X^8+3X+7        指数用 ^ 表示，大小写 X 都行");
    uiPlain("    7                常数多项式");
    uiPlain("说明：同类项会自动合并，系数为 0 的项会被自动删除。");

    uiSection("2. 输出格式");
    uiPlain("按指数降序排列，形如：34X^100+45X^60-4X^2+3");
    uiPlain("系数为 ±1 的非零次项省略系数：1x^2 输出为 X^2，-x 输出为 -X。");
    uiPlain("指数为 1 时省略指数：x^1 输出为 X。");

    uiSection("3. 运算");
    uiPlain("A+B、A-B 采用有序归并，时间复杂度 O(m+n)；");
    uiPlain("A*B 采用逐项相乘再合并，时间复杂度 O(m*n*|结果|)；");
    uiPlain("A' 按 (c*x^e)' = c*e*x^(e-1) 逐项求导，常数项丢弃。");

    uiSection("4. 线性方程组");
    uiPlain("按行输入增广矩阵，例如方程组");
    uiPlain("    x + y = 3");
    uiPlain("    x - y = 1");
    uiPlain("m=2, n=2，两行分别输入：1 1 3  和  1 -1 1");
    uiPlain("消元后由 r(A) 与 r(A|b) 判定：唯一解 / 无穷多解 / 无解。");

    uiSection("5. 小技巧");
    uiPlain("任何需要输入数字的地方，直接回车即表示取消当前操作。");
    uiPlain("运算结果可以选择保存为 A，便于连续计算。");
    printf("\n");
}

/* ---- 自检测试：用固定用例验证核心算法 ---- */
static int g_total = 0, g_pass = 0;

/* 按「显示宽度」补空格（一个汉字占 2 列），保证测试结果列对齐 */
static void PrintPadded(const char *s, int width) {
    int w = 0;
    for (const unsigned char *p = (const unsigned char *)s; *p != '\0'; p++) {
        if ((*p & 0xC0) != 0x80) {          /* 跳过 UTF-8 续字节 */
            w += (*p >= 0xE0) ? 2 : 1;      /* 三字节汉字按 2 列计 */
        }
    }
    fputs(s, stdout);
    for (int i = w; i < width; i++) putchar(' ');
}

/* 比较多项式格式化结果与期望字符串 */
static void CheckPoly(const char *title, const Polynomial *p, const char *want) {
    char buf[1024];
    PolyFormat(p, buf, sizeof buf);
    g_total++;

    if (strcmp(buf, want) == 0) {
        g_pass++;
        printf("   %s[PASS]%s ", uiGreen(), uiReset());
        PrintPadded(title, 24);
        printf(" %s\n", buf);
    } else {
        printf("   %s[FAIL]%s ", uiRed(), uiReset());
        PrintPadded(title, 24);
        printf(" 实际 = %s ，期望 = %s\n", buf, want);
    }
}

/* 比较实数 */
static void CheckNum(const char *title, double got, double want) {
    g_total++;
    if (fabs(got - want) < 1e-6) {
        g_pass++;
        printf("   %s[PASS]%s ", uiGreen(), uiReset());
        PrintPadded(title, 24);
        printf(" %g\n", got);
    } else {
        printf("   %s[FAIL]%s ", uiRed(), uiReset());
        PrintPadded(title, 24);
        printf(" 实际 = %g ，期望 = %g\n", got, want);
    }
}

/* 比较方程组解的类型 */
static void CheckSolve(const char *title, const Matrix *M, SolutionType want) {
    Solution s = {0};
    Matrix   work = *M;      /* 消元会破坏矩阵，先复制一份 */

    MatGaussJordan(&work, &s);
    MatClassify(&work, &s);
    g_total++;

    if (s.type == want) {
        g_pass++;
        printf("   %s[PASS]%s ", uiGreen(), uiReset());
        PrintPadded(title, 24);
        printf(" %s\n", MatTypeName(s.type));
    } else {
        printf("   %s[FAIL]%s ", uiRed(), uiReset());
        PrintPadded(title, 24);
        printf(" 实际 = %s ，期望 = %s\n", MatTypeName(s.type), MatTypeName(want));
    }
}

static void RunSelfTest(void) {
    uiTitle("自检测试");
    g_total = g_pass = 0;

    /* ---------- 1. 表达式解析与格式化 ---------- */
    uiSection("1) 表达式解析与输出格式");
    Polynomial a, b, t, d;

    CreatPolynFromString(&a, "9X^8+3X+7");
    CreatPolynFromString(&b, "X^7-3.2X");
    CheckPoly("A = 9x^8+3x+7", &a, "9X^8+3X+7");
    CheckPoly("B = x^7-3.2x", &b, "X^7-3.2X");

    CreatPolynFromString(&t, "2x^2+3x^2-x");
    CheckPoly("合并同类项", &t, "5X^2-X");
    DestroyPolyn(&t);

    CreatPolynFromString(&t, "x-x");
    CheckPoly("系数抵消为零", &t, "0");
    DestroyPolyn(&t);

    CreatPolynFromString(&t, "1x^2+1x+1");
    CheckPoly("省略系数 1", &t, "X^2+X+1");
    DestroyPolyn(&t);

    CreatPolynFromString(&t, "2*x+5");
    CheckPoly("带乘号与常数项", &t, "2X+5");
    DestroyPolyn(&t);

    /* ---------- 2. 四则运算 ---------- */
    uiSection("2) 多项式运算");
    AddPolyn(&a, &b, &t);
    CheckPoly("A + B", &t, "9X^8+X^7-0.2X+7");
    DestroyPolyn(&t);

    SubPolyn(&a, &b, &t);
    CheckPoly("A - B", &t, "9X^8-X^7+6.2X+7");
    DestroyPolyn(&t);

    MultiplyPolyn(&a, &b, &t);
    CheckPoly("A * B", &t, "9X^15-28.8X^9+3X^8+7X^7-9.6X^2-22.4X");
    DestroyPolyn(&t);

    CreatPolynFromString(&t, "3x^3-2x+5");
    DerivPolyn(&t, &d);
    CheckPoly("(3x^3-2x+5)'", &d, "9X^2-2");
    DestroyPolyn(&t);
    DestroyPolyn(&d);

    /* ---------- 3. 求值 ---------- */
    uiSection("3) 代入求值");
    CheckNum("A(1) = 19", EvalPolyn(&a, 1.0), 19.0);
    CheckNum("B(1) = -2.2", EvalPolyn(&b, 1.0), -2.2);
    CheckNum("A(1)*B(1) = -41.8", EvalPolyn(&a, 1.0) * EvalPolyn(&b, 1.0), -41.8);
    CheckNum("A(-2) = 2305", EvalPolyn(&a, -2.0), 2305.0);   /* 9*256 - 6 + 7 */

    DestroyPolyn(&a);
    DestroyPolyn(&b);

    /* ---------- 4. 线性方程组 ---------- */
    uiSection("4) 线性方程组");

    Matrix M;
    double unique[6] = {1, 1, 3,  1, -1, 1};        /* x+y=3, x-y=1 */
    double none[6]   = {1, 1, 1,  1, 1, 2};         /* 矛盾方程 */
    double inf[8]    = {1, 1, 1, 3,  1, -1, 0, 0};  /* 2 个方程 3 个未知数 */

    MatSetValues(&M, 2, 2, unique);
    CheckSolve("唯一解 x+y=3, x-y=1", &M, UNIQUE_SOLUTION);

    MatSetValues(&M, 2, 2, none);
    CheckSolve("无解 x+y=1, x+y=2", &M, NO_SOLUTION);

    MatSetValues(&M, 2, 3, inf);
    CheckSolve("无穷多解（3 个未知数）", &M, INFINITE_SOLUTION);

    /* ---------- 汇总 ---------- */
    printf("\n");
    uiRule('=');
    if (g_pass == g_total) {
        printf("   %s全部通过：%d / %d%s\n", uiGreen(), g_pass, g_total, uiReset());
    } else {
        printf("   %s通过 %d / %d，存在失败用例%s\n", uiRed(), g_pass, g_total, uiReset());
    }
    uiRule('=');
    printf("\n");
}

/* ==========================================================================
 *  五、主函数
 * ==========================================================================*/
int main(void) {
    uiInit();

    /* A、B 先建立空表，后续输入的表达式会替换其内容 */
    if (InitList(&A) != POLY_OK || InitList(&B) != POLY_OK) {
        fprintf(stderr, "内存不足，程序无法启动。\n");
        return 1;
    }

    int choice;

    while (1) {
        uiTitle("数据结构实验 · 一元稀疏多项式计算器");
        printf("   A = ");
        if (hasA) PrintPolyn(&A); else printf("（未输入）");
        printf("\n   B = ");
        if (hasB) PrintPolyn(&B); else printf("（未输入）");
        printf("\n");

        uiRule('-');
        uiItem(1, "多项式计算器（加 / 减 / 乘 / 求导 / 求值）");
        uiItem(2, "线性方程组求解器（难度 C）");
        uiItem(3, "帮助 / 使用说明");
        uiItem(4, "运行自检测试");
        uiItem(0, "退出");
        uiRule('-');

        int rc = uiReadInt("   请选择 > ", &choice);
        if (rc == 0) continue;
        if (rc < 0) { uiErr("请输入数字"); continue; }

        switch (choice) {
        case 1: PolyMenu();   break;
        case 2: LinearMenu(); break;
        case 3: ShowHelp();   uiPause(); break;
        case 4: RunSelfTest(); uiPause(); break;
        case 0:
            DestroyPolyn(&A);
            DestroyPolyn(&B);
            printf("\n   感谢使用，再见！\n\n");
            return 0;
        default:
            uiErr("无效的选择，请输入 0-4");
            break;
        }
    }
}
