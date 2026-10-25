#include "BiTree.h"
#include <iostream>
#include <stack>
using namespace std;
void CreateBiTree(BiTree &T, const string &s, int &idx) {
    if (idx >= (int)s.size()) { T = NULL; return; }
    TElemType ch = s[idx++];
    if (ch == '#') { T = NULL; return; }
    T = new BiTNode;
    T->data   = ch;
    T->lchild = T->rchild = NULL;
    CreateBiTree(T->lchild, s, idx);
    CreateBiTree(T->rchild, s, idx);
}
void DestroyBiTree(BiTree &T) {
    if (!T) return;
    DestroyBiTree(T->lchild);
    DestroyBiTree(T->rchild);
    delete T;
    T = NULL;
}
void PreOrder(BiTree T) {
    if (!T) return;
    cout << T->data << ' ';
    PreOrder(T->lchild);
    PreOrder(T->rchild);
}
void InOrder(BiTree T) {
    if (!T) return;
    InOrder(T->lchild);
    cout << T->data << ' ';
    InOrder(T->rchild);
}
void PostOrder(BiTree T) {
    if (!T) return;
    PostOrder(T->lchild);
    PostOrder(T->rchild);
    cout << T->data << ' ';
}
void PreOrderIter(BiTree T) {
    stack<BiTree> S;
    if (T) S.push(T);
    while (!S.empty()) {
        BiTree p = S.top(); S.pop();
        cout << p->data << ' ';
        if (p->rchild) S.push(p->rchild);
        if (p->lchild) S.push(p->lchild);
    }
}
void InOrderIter(BiTree T) {
    stack<BiTree> S;
    BiTree p = T;
    while (p || !S.empty()) {
        while (p) { S.push(p); p = p->lchild; }
        p = S.top(); S.pop();
        cout << p->data << ' ';
        p = p->rchild;
    }
}
void PostOrderIter(BiTree T) {
    stack<BiTree> S;
    BiTree p = T, lastVisited = NULL;
    while (p || !S.empty()) {
        while (p) { S.push(p); p = p->lchild; }
        BiTree top = S.top();
        if (top->rchild && top->rchild != lastVisited) p = top->rchild;
        else { cout << top->data << ' '; lastVisited = top; S.pop(); }
    }
}
void PrintBiTree(BiTree T, int depth) {
    if (!T) return;
    PrintBiTree(T->rchild, depth + 1);
    for (int i = 0; i < depth; i++) cout << "    ";
    cout << T->data << endl;
    PrintBiTree(T->lchild, depth + 1);
}