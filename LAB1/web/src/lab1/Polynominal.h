/*
* 2026.10.20 made by caihaoran 20251910042
* tools: ai coding completion & find some mistakes 
* THANKYOU FOR WATCHING
*/
#ifndef POLYNOMIAL_H
#define POLYNOMIAL_H
#include<vector>
// ============================================================
// .h 与 .c 的分工
// ============================================================
// 编译器单文件编译，.c 之间互相看不到对方内容，
// 需要 .h 把“类型 + 函数声明”集中暴露给所有 .c 使用。
//
// .h（接口/菜单）：
//   - 类型定义：typedef struct Node {...}; typedef struct Poly {...};
//   - 函数声明：void CreatPolyn(...);（只写签名，不写函数体）
//   - 宏、extern 全局变量声明
//   - 头文件保护：#ifndef XXX_H / #define XXX_H / #endif
//
// .c（实现/厨房）：
//   - 函数定义（函数体只写一次）
//   - 全局变量定义：int count = 0; .h中只能声明 不分配内存
//   - static 内部辅助函数（只在本文件用）
//
// 规则：
//   声明可重复，定义不可重复 → .h 放声明，.c 放定义。
//   函数体写进 .h 且被多个 .c include → 链接时报重复定义。
//   全局变量在 .h 里定义 → 重复定义；应 .h 用 extern，.c 里定义。
//
// 本项目：
//   polynomial.h  → 结点/多项式类型 + 所有接口声明 + 头文件保护
//   polynomial.cpp→ 所有函数实现，第一行 #include "polynomial.h"
//   main.cpp      → 测试代码，只 #include "polynomial.h"
//   编译：g++ main.cpp polynomial.cpp -o poly
// ============================================================
typedef struct Node{
    double coef; // 系数英文coefficient
    int expn;    // 指数英文exponent
    struct Node *next;  // C的typedef 在结构体定义内部还没生效  但c++可以直接使用 Node *next
}node; // 链表结点类型
typedef struct Poly{
    node *head;
    node *tail;
    int len;
}poly; // 多项式类型
bool MakeNode(node*& p, double coef, int expn); //node& p为啥不行？node& 是结点对象的引用。调用方必须传一个已经存在的 node 对象
// ============================================================
// 函数传参：传值 vs 传址
// ============================================================
// 参数写法     调用 f(x) 传什么           函数内 p 是什么        改 p 影响调用方吗
// node p       x 的值（拷贝整个结点）     结点副本              不影响
// node& p      x 的地址                   x 本身（结点对象）    影响 x
// node* p      x 的值（指针里存的地址）   指针副本              不影响 x
// node*& p     x 的地址（&x）             x 本身（指针变量）    影响 x
// 记忆：
//   node p   ：整个结点拷进去
//   node& p  ：结点本身，改结点有效
//   node* p  ：指针拷进去，改指针无效
//   node*& p ：指针本身，改指针有效
// MakeNode 要让调用方指针指向新结点 → 必须 node*& p
// ============================================================
void InitList(poly& L);
void DestroyList(poly& L);
void ParsePolyn(poly& p);
void InsertInOrder(poly& L,double coef,int expn);
void CreatePolyn(poly& p,const std::vector<double>& coef,const std::vector<int>& expn);
void DestroyPolyn(poly& p);
void PrintPolyn(const poly& p); // 细节
void AddPolyn(const poly& pa, const poly& pb, poly& psum);
void SubPolyn(const poly& pa, const poly& pb, poly& psub);
void MultiplyPolyn(const poly& pa, const poly& pb, poly& pmul);
void DiffPolyn(const poly& p, poly& pdiff); // 对p求导，结果存在pdiff 为了风格统一 不然可以poly DiffPolyn(poly& p)

#endif