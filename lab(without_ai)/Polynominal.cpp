#include "Polynominal.h"
bool MakeNode(node*& p, double coef, int expn){ // 用c++ & 和 vector 会更方便 并且要求里用到vector 默认用c++的
    p = new node;//p = (node*)malloc(sizeof(node)); // 
    if(p == NULL){
        return false;
    }
    p->coef = coef;
    p->expn = expn;
    p->next = NULL;
    return true;
}
void InitList(poly& L){
    L.head = new node;
    L.head->next = NULL;
    L.head->coef = 0;
    L.head->expn = 0;
    L.tail = L.head;
    L.len = 0;
}
void DestroyList(poly& L){
    node* p = L.head;
    while(p != NULL){
        node* temp = p;
        p = p -> next;
        delete(temp);// free(temp);
    }
    L.head = NULL;
    L.tail = NULL;
    L.len = 0;
}
static void InsertInOrder(poly& L,double coef,int expn){
    if(coef == 0) return;
    node* pre = L.head;
    while(pre->next != NULL && pre->next->expn > expn){ // 找到第一个大于expn的节点的位置 pre指向插入位置的前一个节点 会小于等于expn的节点
        pre = pre->next;
    }
    if(pre->next != NULL && pre->next->expn == expn){ // 合并系数
        pre->next->coef += coef;
        if(pre->next->coef == 0){
            node* temp = pre->next;
            pre->next = pre->next->next;
            if(temp == L.tail){
                L.tail = pre;
            }
            delete(temp);
            L.len--;
        }
        return;
    }
    node *s = new node;
    s->coef = coef;
    s->expn = expn;
    s->next = pre->next; // 先让s指向pre的下一个节点  pre s pre->next 不能交换顺序
    pre->next = s; // 让pre指向s    
    if(s->next == NULL){
        L.tail = s;
    }
    L.len++;
}
void CreatePolyn(poly& p,const std::vector<double>& coef,const std::vector<int>& expn){
    InitList(p);
    int maxnsize = coef.size() < expn.size() ? coef.size() : expn.size();
    for(int i = 0;i < maxnsize;i++){
        node* p = NULL;
        if(MakeNode(p,coef[i],expn[i])){
            InsertInOrder(p,coef[i],expn[i]);
        }
    }
}
