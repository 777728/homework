#ifndef TREECONVERT_H
#define TREECONVERT_H
#include <string>
#include "BiTree.h"
//孩子—兄弟链表存储的树
typedef struct TreeNode {
    TElemType data;
    struct TreeNode *firstChild;   // 第一个孩子
    struct TreeNode *nextSibling;  // 下一个兄弟
} TreeNode, *Tree;
//树的建立 / 销毁 / 打印
Tree CreateTree(const std::string &s, int &i);
void DestroyTree(Tree &T);
void PrintTreeBracket(Tree T);
//转换
BiTree TreeToBiTree(Tree T);
Tree   BiTreeToTree(BiTree B);
#endif