#ifndef BITREE_H
#define BITREE_H
#include <string>
#include "common.h"
//二叉链表存储
typedef struct BiTNode {
    TElemType data;
    struct BiTNode *lchild, *rchild;
} BiTNode, *BiTree;
//建立与销毁
void CreateBiTree(BiTree &T, const std::string &s, int &idx);
void DestroyBiTree(BiTree &T);
//递归遍历
void PreOrder(BiTree T);
void InOrder(BiTree T);
void PostOrder(BiTree T);
//非递归遍历
void PreOrderIter(BiTree T);
void InOrderIter(BiTree T);
void PostOrderIter(BiTree T);
//横向打印（逆时针旋转 90°）
void PrintBiTree(BiTree T, int depth = 0);
#endif