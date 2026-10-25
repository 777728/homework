#include "TreeConvert.h"
#include <iostream>
using namespace std;
Tree CreateTree(const string &s, int &i) {
    while (i < (int)s.size() && s[i] == ' ') i++;
    if (i >= (int)s.size()) return NULL;
    TElemType ch = s[i];    
    if (ch == ')' || ch == ',' || ch == '(') return NULL;
    i++;
    Tree node = new TreeNode;
    node->data = ch;
    node->firstChild = node->nextSibling = NULL;
    while (i < (int)s.size() && s[i] == ' ') i++;
    if (i < (int)s.size() && s[i] == '(') {
        i++;
        Tree prev = NULL;
        while (i < (int)s.size() && s[i] != ')') {
            Tree c = CreateTree(s, i);
            if (!c) break;
            if (!node->firstChild) node->firstChild = c;
            else prev->nextSibling = c;
            prev = c;
            while (i < (int)s.size() && s[i] == ' ') i++;
            if (i < (int)s.size() && s[i] == ',') i++;
            else break;
        }
        if (i < (int)s.size() && s[i] == ')') i++;
    }
    return node;
}

void DestroyTree(Tree &T) {
    if (!T) return;
    DestroyTree(T->firstChild);
    DestroyTree(T->nextSibling);
    delete T;
    T = NULL;
}

void PrintTreeBracket(Tree T) {
    if (!T) return;
    cout << T->data;
    if (T->firstChild) {
        cout << "(";
        Tree c = T->firstChild;
        while (c) {
            PrintTreeBracket(c);
            c = c->nextSibling;
            if (c) cout << ",";
        }
        cout << ")";
    }
}

//左孩子 = 第一个孩子，右孩子 = 下一个兄弟
BiTree TreeToBiTree(Tree T) {
    if (!T) return NULL;
    BiTree B = new BiTNode;
    B->data   = T->data;
    B->lchild = TreeToBiTree(T->firstChild);
    B->rchild = TreeToBiTree(T->nextSibling);
    return B;
}

Tree BiTreeToTree(BiTree B) {
    if (!B) return NULL;
    Tree T = new TreeNode;
    T->data        = B->data;
    T->firstChild  = BiTreeToTree(B->lchild);
    T->nextSibling = BiTreeToTree(B->rchild);
    return T;
}