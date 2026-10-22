/* ============================================================================
 *  Polynomial.h  —  一元稀疏多项式（带头结点的单链表实现）
 *  ---------------------------------------------------------------------------
 *  存储结构：每个结点存放一项的「系数 coef」和「指数 expn」，
 *            链表按指数严格递减排列，且不存在系数为 0 的结点。
 *            头结点不存放有效数据，只起“哨兵”作用，可省去对首项的判空。
 *
 *  设计要点：
 *    1) 有序表：任何时刻链表都保持 expn 从大到小，输出时无需再排序；
 *    2) 同类项合并：插入时若指数相同则系数相加，和为 0 则删除该结点；
 *    3) 尾指针 tail：支持 O(1) 尾插，多用于有序归并（加、减、乘）。
 * ==========================================================================*/

#ifndef POLYNOMIAL_H
#define POLYNOMIAL_H

#include <stddef.h>

/* ---------------------------- 状态码 ---------------------------- */
#define POLY_OK       0    /* 成功 */
#define POLY_ENOMEM  (-1)  /* 内存分配失败 */
#define POLY_EINVAL  (-2)  /* 参数非法 */
#define POLY_EPARSE  (-3)  /* 表达式语法错误 */

/* ----------------------- 浮点零判定阈值 ------------------------- */
/* 浮点数不能用 == 0 判断，小于该值即认为系数为 0 */
#define POLY_EPS      1e-12

/* ------------------------- 单项（结点） ------------------------- */
typedef struct LNode {
    double        coef;   /* 系数 */
    int           expn;   /* 指数（非负整数） */
    struct LNode *next;   /* 指向下一项的指针 */
} LNode, *Link;

/* --------------------- 多项式链表（带头结点） ------------------- */
typedef struct {
    Link head;   /* 指向头结点（哨兵），head->next 才是第一项 */
    Link tail;   /* 指向最后一项，空表时 tail == head */
    int  len;    /* 项数，不含头结点 */
} LinkList;

typedef LinkList Polynomial;   /* 一元稀疏多项式类型 */

/* ========================= 接口 ======================== */
/* 生成一个结点 */
int  MakeNode(Link *p, double coef, int expn);
/* 初始化空表 */
int  InitList(LinkList *L);
/* 销毁整表（含头结点） */
void DestroyList(LinkList *L);
/* 清空表但保留头结点，便于重复使用同一变量 */
void ClearList(LinkList *L);
/* 多项式项数 */
int  ListLength(const LinkList *L);
/* ========================= 接口 ======================== */
/* 多项式处理 */
int  CreatPolyn(Polynomial *p, const double *coef, const int *expn, int n);
/* 建立多项式 */
int  CreatPolynFromString(Polynomial *p, const char *expr);
/* 销毁多项式 */
void DestroyPolyn(Polynomial *p);
/* 多项式格式化 */
int  PolyFormat(const Polynomial *p, char *buf, size_t size);
/* 指数降序输出 */
void PrintPolyn(const Polynomial *p);
/* 判0 */
int  PolyIsZero(const Polynomial *p);
/* 加 */
int  AddPolyn(const Polynomial *pa, const Polynomial *pb, Polynomial *psum);
/* 减*/
int  SubPolyn(const Polynomial *pa, const Polynomial *pb, Polynomial *psub);
/* 乘 */
int  MultiplyPolyn(const Polynomial *pa, const Polynomial *pb, Polynomial *pmul);
/* 导 */
int  DerivPolyn(const Polynomial *p, Polynomial *pd);
/* 代入求值 */
double EvalPolyn(const Polynomial *p, double x);
#endif /* POLYNOMIAL_H */
