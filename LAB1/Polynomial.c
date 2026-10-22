/* ============================================================================
 *  Polynomial.c  —  一元稀疏多项式的运算实现
 *  ---------------------------------------------------------------------------
 *  所有操作都建立在「指数严格递减的有序单链表」这一不变式之上：
 *    - 建表时逐项有序插入，顺带合并同类项；
 *    - 加、减、乘、求导都是有序归并或有序插入，结果仍满足该不变式。
 * ==========================================================================*/

#include <ctype.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Polynomial.h"

/* 指数上界，防止乘法时指数溢出 int；超出即视为非法 */
#define POLY_MAX_EXPN 100000

/* ---------------------------------------------------------------------------
 *  内部辅助函数声明
 * -------------------------------------------------------------------------*/

/* 浮点零判定：|v| < POLY_EPS 即视为 0 */
static int IsZero(double v) { return fabs(v) < POLY_EPS; }

/* 在有序表中插入一项：指数相同则合并，旧项系数归零则删除该结点 */
static int InsertTerm(Polynomial *p, double coef, int expn);

/* 在表尾追加一项（调用者保证 expn 比表中所有指数都小） */
static int AppendTerm(Polynomial *p, double coef, int expn);

/* 有序归并的核心：pr = pa + signB * pb，signB 取 +1 或 -1 */
static int Combine(const Polynomial *pa, const Polynomial *pb,
                   Polynomial *pr, double signB);

/* 整数幂（快速幂），避免调用 pow 带来的精度损失 */
static double PowInt(double x, int e);

/* 向字符串缓冲区追加内容，返回新的写入位置，防止越界 */
static size_t AppendStr(char *buf, size_t size, size_t used, const char *s);

/* ========================= 一、单链表底层接口 ======================== */

/*
 * 生成新结点。
 * 参数 p 是「指针的指针」：函数内部 malloc 出来的地址要带回给调用者，
 * 所以必须传 Link*，只传 Link 是改不了调用者变量的（值传递）。
 */
int MakeNode(Link *p, double coef, int expn) {
    if (p == NULL) return POLY_EINVAL;

    Link s = (Link)malloc(sizeof(LNode));
    if (s == NULL) {            /* 内存不足 */
        *p = NULL;
        return POLY_ENOMEM;
    }
    s->coef = coef;
    s->expn = expn;
    s->next = NULL;
    *p = s;
    return POLY_OK;
}

/*
 * 初始化空表：申请头结点，头尾指针都指向它。
 * 头结点不存数据，作用是让“第一个位置”也有前驱，插入删除时不用特判。
 */
int InitList(LinkList *L) {
    if (L == NULL) return POLY_EINVAL;

    L->head = L->tail = NULL;
    L->len  = 0;

    Link h;
    int rc = MakeNode(&h, 0.0, 0);
    if (rc != POLY_OK) return rc;

    L->head = L->tail = h;
    return POLY_OK;
}

/* 销毁整表：逐个释放结点，最后释放头结点 */
void DestroyList(LinkList *L) {
    if (L == NULL) return;

    Link q = L->head;
    while (q != NULL) {
        Link next = q->next;    /* 先记住后继，再释放当前结点 */
        free(q);
        q = next;
    }
    L->head = L->tail = NULL;
    L->len  = 0;
}

/* 清空：保留头结点，可继续使用该多项式变量 */
void ClearList(LinkList *L) {
    if (L == NULL || L->head == NULL) return;

    Link q = L->head->next;
    while (q != NULL) {
        Link next = q->next;
        free(q);
        q = next;
    }
    L->head->next = NULL;
    L->tail       = L->head;
    L->len        = 0;
}

/* 返回项数 */
int ListLength(const LinkList *L) {
    if (L == NULL || L->head == NULL) return 0;
    return L->len;
}

/* ========================= 二、内部有序插入 ========================== */

/*
 * 有序插入（降序）：
 *   从头结点出发找到第一个「指数不大于 expn」的结点 cur，
 *   - 若 cur 指数相等 → 合并同类项；
 *   - 否则把新结点插在 cur 之前。
 * 单链表插入必须知道前驱，所以用 prev 同步后移。
 */
static int InsertTerm(Polynomial *p, double coef, int expn) {
    if (IsZero(coef)) return POLY_OK;      /* 零项不存 */

    Link prev = p->head;
    Link cur  = p->head->next;

    while (cur != NULL && cur->expn > expn) {
        prev = cur;
        cur  = cur->next;
    }

    /* 情况一：找到同类项，系数相加 */
    if (cur != NULL && cur->expn == expn) {
        cur->coef += coef;
        if (IsZero(cur->coef)) {           /* 相加抵消，删除该结点 */
            prev->next = cur->next;
            if (p->tail == cur) p->tail = prev;
            free(cur);
            p->len--;
        }
        return POLY_OK;
    }

    /* 情况二：新指数，插入到 prev 与 cur 之间 */
    Link s;
    int rc = MakeNode(&s, coef, expn);
    if (rc != POLY_OK) return rc;

    s->next    = cur;
    prev->next = s;
    if (cur == NULL) p->tail = s;          /* 插在表尾，更新尾指针 */
    p->len++;
    return POLY_OK;
}

/* 尾插：配合 tail 指针，时间复杂度 O(1) */
static int AppendTerm(Polynomial *p, double coef, int expn) {
    if (IsZero(coef)) return POLY_OK;

    Link s;
    int rc = MakeNode(&s, coef, expn);
    if (rc != POLY_OK) return rc;

    p->tail->next = s;
    p->tail       = s;
    p->len++;
    return POLY_OK;
}

/* ========================= 三、多项式接口 ============================ */

/*
 * 由两个数组建立多项式。
 * 输入顺序可以任意，甚至可以有同类项，InsertTerm 会统一整理成
 * 「指数递减、无同类项、无零项」的标准形式。
 */
int CreatPolyn(Polynomial *p, const double *coef, const int *expn, int n) {
    if (p == NULL) return POLY_EINVAL;
    if (n < 0) return POLY_EINVAL;
    if (n > 0 && (coef == NULL || expn == NULL)) return POLY_EINVAL;

    int rc = InitList(p);
    if (rc != POLY_OK) return rc;

    for (int i = 0; i < n; i++) {
        rc = InsertTerm(p, coef[i], expn[i]);
        if (rc != POLY_OK) {
            DestroyList(p);               /* 失败则回滚，避免半成品 */
            return rc;
        }
    }
    return POLY_OK;
}

/*
 * 解析形如 "3x^2-2x+1" 的表达式建表。
 * 语法： term { ('+'|'-') term }
 *        term  := [number] ['*'] ['x'|'X' ['^' int]]
 * 支持： 3x^2、-x^3、2*x、x、5、-1.5x^10，项之间可带空格。
 */
int CreatPolynFromString(Polynomial *p, const char *expr) {
    if (p == NULL || expr == NULL) return POLY_EINVAL;

    int rc = InitList(p);
    if (rc != POLY_OK) return rc;

    const char *s = expr;

    while (*s != '\0') {
        /* ---- ① 跳过空白，读取符号 ---- */
        while (isspace((unsigned char)*s)) s++;
        if (*s == '\0') break;

        int sign = 1;
        if (*s == '+' || *s == '-') {
            if (*s == '-') sign = -1;
            s++;
            while (isspace((unsigned char)*s)) s++;
        }

        /* ---- ② 读取系数（可省略，默认为 1）---- */
        double coef  = 1.0;
        int    hasNum = 0;

        if (isdigit((unsigned char)*s) || *s == '.') {
            char *end = NULL;
            coef = strtod(s, &end);
            if (end == s) { DestroyList(p); return POLY_EPARSE; }
            s = end;
            hasNum = 1;
        }

        while (isspace((unsigned char)*s)) s++;

        /* ---- ③ 读取可选的乘号与变量部分 ---- */
        if (*s == '*') {
            s++;
            while (isspace((unsigned char)*s)) s++;
        }

        int expn   = 0;
        int hasVar = 0;

        if (*s == 'x' || *s == 'X') {
            hasVar = 1;
            s++;
            expn = 1;                       /* 未写指数即为一次项 */

            if (*s == '^') {
                s++;
                while (isspace((unsigned char)*s)) s++;
                if (!isdigit((unsigned char)*s)) {   /* 如 "x^" 非法 */
                    DestroyList(p);
                    return POLY_EPARSE;
                }
                char *end = NULL;
                long e = strtol(s, &end, 10);
                if (e < 0 || e > POLY_MAX_EXPN) { DestroyList(p); return POLY_EPARSE; }
                expn = (int)e;
                s = end;
            }
        }

        /* 既没有数字也没有变量，说明是非法字符（如单独一个 "+"） */
        if (!hasNum && !hasVar) {
            DestroyList(p);
            return POLY_EPARSE;
        }

        /* ---- ④ 插入该项 ---- */
        rc = InsertTerm(p, sign * coef, expn);
        if (rc != POLY_OK) {
            DestroyList(p);
            return rc;
        }
    }
    return POLY_OK;      /* 空串表示零多项式，属合法输入 */
}

/* 销毁多项式（对未初始化的变量也安全） */
void DestroyPolyn(Polynomial *p) { DestroyList(p); }

/* 判断是否为零多项式 */
int PolyIsZero(const Polynomial *p) {
    return (p == NULL || p->head == NULL || p->head->next == NULL);
}

/* 字符串追加小工具，used 为已写入长度，返回新的长度 */
static size_t AppendStr(char *buf, size_t size, size_t used, const char *s) {
    while (*s != '\0' && used + 1 < size) {
        buf[used++] = *s++;
    }
    buf[used] = '\0';
    return used;
}

/*
 * 格式化为数学表达式：
 *   - 系数为 1 或 -1 的非零次项省略系数（1x^2 → x^2）；
 *   - 指数 1 省略指数（x^1 → x）；指数 0 只输出常数；
 *   - 负系数用减号连接，正系数用加号连接；
 *   - 系数用 %.10g 输出，兼顾整数与小数（3.2 不会写成 3.200000）。
 */
int PolyFormat(const Polynomial *p, char *buf, size_t size) {
    if (buf == NULL || size < 2) return POLY_EINVAL;
    buf[0] = '\0';

    if (PolyIsZero(p)) {
        snprintf(buf, size, "0");
        return POLY_OK;
    }

    size_t used = 0;

    for (Link q = p->head->next; q != NULL; q = q->next) {
        char num[64];
        double absCoef = fabs(q->coef);

        /* 符号：首项只在为负时输出 '-'，其余项都输出 '+' 或 '-' */
        if (used > 0) {
            used = AppendStr(buf, size, used, (q->coef < 0) ? "-" : "+");
        } else if (q->coef < 0) {
            used = AppendStr(buf, size, used, "-");
        }

        if (q->expn == 0) {                     /* 常数项 */
            snprintf(num, sizeof num, "%.10g", absCoef);
            used = AppendStr(buf, size, used, num);
        } else {
            if (fabs(absCoef - 1.0) > POLY_EPS) {   /* 系数为 ±1 时省略 */
                snprintf(num, sizeof num, "%.10g", absCoef);
                used = AppendStr(buf, size, used, num);
            }
            used = AppendStr(buf, size, used, "X");
            if (q->expn != 1) {
                snprintf(num, sizeof num, "^%d", q->expn);
                used = AppendStr(buf, size, used, num);
            }
        }
    }
    return POLY_OK;
}

/* 直接打印到标准输出 */
void PrintPolyn(const Polynomial *p) {
    char   stackBuf[1024];
    char  *buf  = stackBuf;
    size_t size = sizeof stackBuf;

    /* 项数很多时，估算所需长度并临时申请堆内存，避免输出被截断 */
    int len = ListLength(p);
    if (len > 20) {
        size_t need = (size_t)len * 48 + 8;
        char  *heap = (char *)malloc(need);
        if (heap != NULL) { buf = heap; size = need; }
    }

    if (PolyFormat(p, buf, size) != POLY_OK) {
        printf("<多项式过长或参数错误>");
    } else {
        printf("%s", buf);
    }

    if (buf != stackBuf) free(buf);
}

/*
 * 有序归并：pa、pb 都已按指数降序，用两个游标同步扫描，
 * 谁指数大就先把谁接到结果表尾（AppendTerm 保证 O(1)），
 * 指数相等时系数相加（signB 为 -1 时相当于相减）。
 * 时间复杂度 O(m + n)。
 */
static int Combine(const Polynomial *pa, const Polynomial *pb,
                   Polynomial *pr, double signB) {
    if (pa == NULL || pb == NULL || pr == NULL) return POLY_EINVAL;

    int rc = InitList(pr);
    if (rc != POLY_OK) return rc;

    Link a = (pa->head != NULL) ? pa->head->next : NULL;
    Link b = (pb->head != NULL) ? pb->head->next : NULL;

    while (a != NULL && b != NULL) {
        if (a->expn > b->expn) {
            rc = AppendTerm(pr, a->coef, a->expn);
            a = a->next;
        } else if (a->expn < b->expn) {
            rc = AppendTerm(pr, signB * b->coef, b->expn);
            b = b->next;
        } else {
            rc = AppendTerm(pr, a->coef + signB * b->coef, a->expn);
            a = a->next;
            b = b->next;
        }
        if (rc != POLY_OK) { DestroyList(pr); return rc; }
    }

    /* 把剩下的那一段整体接上 */
    for (; a != NULL; a = a->next) {
        if ((rc = AppendTerm(pr, a->coef, a->expn)) != POLY_OK) { DestroyList(pr); return rc; }
    }
    for (; b != NULL; b = b->next) {
        if ((rc = AppendTerm(pr, signB * b->coef, b->expn)) != POLY_OK) { DestroyList(pr); return rc; }
    }
    return POLY_OK;
}

/* 相加 */
int AddPolyn(const Polynomial *pa, const Polynomial *pb, Polynomial *psum) {
    return Combine(pa, pb, psum, 1.0);
}

/* 相减：相当于把 pb 的每项系数取反后相加 */
int SubPolyn(const Polynomial *pa, const Polynomial *pb, Polynomial *psub) {
    return Combine(pa, pb, psub, -1.0);
}

/*
 * 相乘：
 *   对 pa 的每一项 a_i，与 pb 的全部项相乘，得到一个有序临时多项式
 *   （固定 a_i 时，乘积指数 = a_i.expn + b_j.expn，仍随 b 递减），
 *   再与累加器做一次 O(n) 的有序归并。
 *   总共作了 m 次归并，时间 O(m * (n + |结果|))。
 */
int MultiplyPolyn(const Polynomial *pa, const Polynomial *pb, Polynomial *pmul) {
    if (pa == NULL || pb == NULL || pmul == NULL) return POLY_EINVAL;

    int rc = InitList(pmul);
    if (rc != POLY_OK) return rc;

    for (Link a = pa->head->next; a != NULL; a = a->next) {
        Polynomial part, sum;

        rc = InitList(&part);
        if (rc != POLY_OK) { DestroyList(pmul); return rc; }

        for (Link b = pb->head->next; b != NULL; b = b->next) {
            long e = (long)a->expn + (long)b->expn;   /* 用 long 防止中间溢出 */
            if (e > POLY_MAX_EXPN) {
                DestroyList(&part);
                DestroyList(pmul);
                return POLY_EINVAL;
            }
            rc = AppendTerm(&part, a->coef * b->coef, (int)e);
            if (rc != POLY_OK) {
                DestroyList(&part);
                DestroyList(pmul);
                return rc;
            }
        }

        /* 累加：旧结果与本次乘积合并，然后把所有权转移到 pmul 上 */
        rc = AddPolyn(pmul, &part, &sum);
        DestroyList(pmul);
        DestroyList(&part);
        if (rc != POLY_OK) { DestroyList(&sum); return rc; }

        *pmul = sum;      /* 结构体赋值：头/尾指针与项数一起转移 */
    }
    return POLY_OK;
}

/*
 * 求导： (c·x^e)' = c·e·x^(e-1)，常数项导数为 0 直接跳过。
 * 结果指数减 1，仍保持降序，用 InsertTerm 统一处理。
 */
int DerivPolyn(const Polynomial *p, Polynomial *pd) {
    if (p == NULL || pd == NULL) return POLY_EINVAL;

    int rc = InitList(pd);
    if (rc != POLY_OK) return rc;

    for (Link q = p->head->next; q != NULL; q = q->next) {
        if (q->expn == 0) continue;             /* 常数项求导为 0 */
        rc = InsertTerm(pd, q->coef * q->expn, q->expn - 1);
        if (rc != POLY_OK) { DestroyList(pd); return rc; }
    }
    return POLY_OK;
}

/* 快速幂：x^n 用二进制拆分，O(log n) 次乘法 */
static double PowInt(double x, int e) {
    double result = 1.0;
    int    n = (e < 0) ? -e : e;

    while (n > 0) {
        if (n & 1) result *= x;
        x *= x;
        n >>= 1;
    }
    return (e < 0) ? 1.0 / result : result;
}

/* 求值：逐项累加 coef * x^expn */
double EvalPolyn(const Polynomial *p, double x) {
    if (PolyIsZero(p)) return 0.0;

    double sum = 0.0;
    for (Link q = p->head->next; q != NULL; q = q->next) {
        sum += q->coef * PowInt(x, q->expn);
    }
    return sum;
}