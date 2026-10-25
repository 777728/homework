#include "link_stack.h"
#include "pos_type.h"

void InitStack(Stack &S) {
    S.top = nullptr;   
    S.size = 0;
}
bool StackEmpty(const Stack &S) {
    return S.top == nullptr;
}
void DestroyStack(Stack &S) {
    while (!StackEmpty(S)) {
        LinkType temp = S.top;
        S.top = S.top->next;
        delete temp;
    }
    S.size = 0;
    S.top = nullptr;
}
int StackLength(const Stack &S) {
    return S.size;
}
void Push(Stack &S, ElemType e) {
    LinkType temp = new NodeType;
    temp->data = e;
    temp->next = S.top;
    S.top = temp; // 栈指针永远指向栈顶
    S.size++;
}
bool Pop(Stack &S, ElemType &e) {
    if (StackEmpty(S)) {
        return false;
    }
    e = S.top->data;
    LinkType temp = S.top;
    S.top = S.top->next;
    delete temp;
    S.size--;
    return true;
}
bool GetTop(const Stack &S, ElemType &e) {
    if (StackEmpty(S)) {
        return false;
    }
    e = S.top->data;
    return true;
}
