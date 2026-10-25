#ifndef LINK_STACK_H
#define LINK_STACK_H

#include "pos_type.h"

typedef int DirectType;   // 方向类型：1东 2南 3西 4北

struct ElemType {
    int step;            // 当前位置在路径上的序号
    PosType seat;        // 当前坐标
    DirectType di;    // 往下一坐标的方向
};

struct NodeType {
    ElemType data;
    NodeType *next;
};

typedef NodeType* LinkType;

struct Stack {
    LinkType top;
    int size;
};

void InitStack(Stack &S);
void DestroyStack(Stack &S);
bool StackEmpty(const Stack &S);
int StackLength(const Stack &S);
void Push(Stack &S, ElemType e);
bool Pop(Stack &S, ElemType &e);
bool GetTop(const Stack &S, ElemType &e);

#endif