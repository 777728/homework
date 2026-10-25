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
    S.top = temp;
    S.size++;
}
