/* ============================================================================
 *  tree.h  —  实验五：树及其应用
 *  ---------------------------------------------------------------------------
 *  两部分内容：
 *    1) 二叉树：先序建树、先/中/后/层序遍历（递归 + 非递归）、树形打印、
 *               树与二叉树的相互转换（左孩子—右兄弟表示法）。
 *    2) 哈夫曼：由频度表或一段电文建树，生成编码表，编码与译码。
 * ==========================================================================*/
#ifndef TREE_H
#define TREE_H

#include <stddef.h>

/* ---------------- 二叉树（二叉链表） ---------------- */

typedef struct TNode {
    char data;
    struct TNode *left, *right;
} TNode, *Tree;

/* 由先序序列建树，"#" 表示空子树，例如 ABC##DE#G##F### */
Tree TreeBuild(const char *pre);

/* 释放整棵树 */
void TreeFree(Tree *t);

/* 三种遍历（递归），结果用空格分隔写入 out */
void TreePreRec(Tree t, char *out, size_t cap);
void TreeInRec(Tree t, char *out, size_t cap);
void TreePostRec(Tree t, char *out, size_t cap);

/* 三种遍历（非递归，用显式栈） */
void TreePreIter(Tree t, char *out, size_t cap);
void TreeInIter(Tree t, char *out, size_t cap);
void TreePostIter(Tree t, char *out, size_t cap);

/* 层次遍历（用队列） */
void TreeLevel(Tree t, char *out, size_t cap);

/* 树的几个统计量 */
int TreeHeight(Tree t);
int TreeNodes(Tree t);
int TreeLeaves(Tree t);

/* 把二叉树画成缩进树形，例如
 *     A
 *     ├─ B
 *     │  └─ C
 *     └─ D
 */
void TreeDraw(Tree t, char *out, size_t cap);

/* 由树的括号表示建二叉树（左孩子—右兄弟），例如 A(B(E,F),C(G),D) */
Tree TreeFromGeneral(const char *text);

/* 把二叉树还原成括号表示；若根有右子树则按森林输出 */
void TreeToGeneral(Tree t, char *out, size_t cap);

/* ---------------- 哈夫曼编码 ---------------- */

#define HUFF_MAX 128                 /* 最多 128 种字符 */
#define HUFF_CODE_MAX 64             /* 单个编码的最大长度 */

typedef struct {
    int  n;                          /* 叶子个数 */
    int  weight[2 * HUFF_MAX + 1];   /* 权值（频度） */
    int  parent[2 * HUFF_MAX + 1];
    int  left[2 * HUFF_MAX + 1];
    int  right[2 * HUFF_MAX + 1];
    char ch[2 * HUFF_MAX + 1];
    char code[256][HUFF_CODE_MAX];   /* 字符 -> 编码串 */
} Huffman;

/* 由 "A 186" 这样的频度表建树（每行一个字符和它的频度，_ 表示空格）
 * 成功返回 1；失败返回 0 并写 err */
int HuffmanBuildTable(Huffman *H, const char *table, char *err, size_t errcap);

/* 由一段电文统计频度建树（只支持 ASCII 可见字符） */
int HuffmanBuildText(Huffman *H, const char *text, char *err, size_t errcap);

/* 输出编码表；另附平均码长等统计 */
void HuffmanTableText(const Huffman *H, char *out, size_t cap);

/* 编码：把 text 变成 0/1 串 */
void HuffmanEncode(const Huffman *H, const char *text, char *out, size_t cap);

/* 译码：把 0/1 串还原成电文，成功返回 1 */
int HuffmanDecode(const Huffman *H, const char *bits, char *out, size_t cap);

#endif /* TREE_H */
