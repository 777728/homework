#include "Polynominal.h"
#include <iostream>
#include <string>
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
void ParsePolyn(poly& p){ //除了CreatePolyn的另一种输入形式
    InitList(p);
    std::string line;
    std::getline(std::cin,line); 
    while(line.empty() && !std::cin.eof()){ // eof() 返回一个 bool，表示输入流是否已经到达文件结束符
        std::getline(std::cin,line);
    }
    int n = line.size(),i = 0;
    bool isFirst = true;
    bool wrong = false;
    while(i < n){
        // ------------------- 跳过空格 -------------------
        while(i < n && isspace(line[i])){
            i++;
        }
        if(i >= n){
            break;
        }
        double coef;
        int expn;
        int sign = 1; // 首项默认为正号
        //--------------------- 解析系数 ---------------------
        if(line[i] == '+' || line[i] == '-'){
            sign = (line[i] == '-') ? -1 : 1;
            i++;
        }
        else if(!isFirst){
            wrong = true;
            break;
        }
        bool hasCoef = false;
        double CoefTmp = 0.0;
        while(i < n && isdigit((unsigned char)line[i])){
            hasCoef = true;
            CoefTmp = CoefTmp * 10 + (line[i] - '0');
            i++;    
        }
        if(i < n && line[i] == '.'){
            i++;
            double base = 0.1;
            while(i < n && isdigit((unsigned char)line[i])){
                hasCoef = true;
                CoefTmp += base * (line[i] - '0');
                base *= 0.1;
                i++;    
            }
        }   
        coef = sign * (hasCoef ? CoefTmp : 1.0);
        //--------------------- 解析指数 ---------------------
        //bool hasExpn = false;
        //int ExpnTmp = 0;
        //bool hasX = false; 
        expn = 0;
        if(i < n && line[i] == 'x'){
            //hasX = true;
            i++;
            expn = 1;
            if(i < n && line[i] == '^'){
                i++;
                bool hasExpn = false;
                int ExpnTmp = 0;
                while(i < n && isdigit((unsigned char)line[i])){
                    hasExpn = true;
                    ExpnTmp = ExpnTmp * 10 + (line[i] - '0');
                    i++;    
                }
                if(!hasExpn){ // ^ 后面没有数字 // expn 双重意义  1. 指数是否为0  2. 输入是否错误 //我的小巧思 还是不行
                    wrong = true;
                    break;
                }
                expn = ExpnTmp;
            }
        }
        InsertInOrder(p,coef,expn);
        isFirst = false;
    }
    if(wrong){
        std::cout << "输入错误" << std::endl;
        DestroyList(p);
        InitList(p);
        return;
    }
}
void InsertInOrder(poly& L,double coef,int expn){
    if(coef == 0) return;
    node* pre = L.head;
    while(pre->next != NULL && pre->next->expn > expn){ // 找到第一个大于expn的节点的位置 pre指向插入位置的前一个节点 会小于等于expn的节点
        pre = pre->next;
    }
    if(pre->next != NULL && pre->next->expn == expn){ // 合并系数
        pre->next->coef += coef;
        if(pre->next->coef == 0){ // 合并后系数为0 则删除该节点 之后乘法可以直接用
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
        InsertInOrder(p,coef[i],expn[i]);
    }
}
void DestroyPolyn(poly& p){
    DestroyList(p);
}
void PrintPolyn(const poly& p){
    if(p.head == NULL || p.head->next == NULL){  
        std::cout << "0";
        return;
    }
    bool first = true;
    node* temp = p.head->next;                    
    while(temp != NULL){
        if(temp->coef == 0){                       
            temp = temp->next;
            continue;
        }
        bool positive = (temp->coef > 0);
        double absCoef = positive ? temp->coef : -temp->coef; // 符号和系数分开处理
        if(!first || !positive){ // 不是第一个 或者 第一个项为负号 可以写的更好看一点
            std::cout << (positive ? "+" : "-");
        }
        first = false;
        // 系数部分（±1 且非常数项时省略）
        bool isOne = (absCoef == 1.0);
        bool isConst = (temp->expn == 0);

        if(!(isOne && !isConst)){ // 不是1 且非常数项 才打印系数
            std::cout << absCoef;
        }
        // 指数部分
        if(temp->expn == 1){
            std::cout << "x";
        } else if(temp->expn != 0){
            std::cout << "x^" << temp->expn;
        }
        temp = temp->next;
    }
}
void AddPolyn(const poly& pa, const poly& pb, poly& psum){  
    InitList(psum);
    node* tempa = pa.head->next;
    node* tempb = pb.head->next;
    //int cnt = 0;
    while(tempa != NULL && tempb != NULL){
        if(tempa -> expn < tempb -> expn){
            InsertInOrder(psum,tempa->coef,tempa->expn);
            tempa = tempa->next;
            //cnt++;
        } else if(tempa -> expn > tempb -> expn){
            InsertInOrder(psum,tempb->coef,tempb->expn);
            tempb = tempb->next;
            //cnt++;  
        }
        else{
            double c = tempa -> coef + tempb -> coef;
            if(c != 0){
                InsertInOrder(psum,c,tempa -> expn);
                //cnt++;
            }   
            tempa = tempa->next;
            tempb = tempb->next;
        }
    }
    while(tempa != NULL){
        InsertInOrder(psum,tempa->coef,tempa->expn);
        tempa = tempa->next;
        //cnt++;
    }
    while(tempb != NULL){
        InsertInOrder(psum,tempb->coef,tempb->expn);
        tempb = tempb->next;
        //cnt++;
    }
    //psum.len = cnt;
    //PrintPolyn(psum);
    return;
}
void SubPolyn(const poly& pa, const poly& pb, poly& psub){
    InitList(psub); 
    node* tempa = pa.head->next;
    node* tempb = pb.head->next;
    //int cnt = 0;
    while(tempa != NULL && tempb != NULL){
        if(tempa -> expn < tempb -> expn){
            InsertInOrder(psub,tempa->coef,tempa->expn);
            tempa = tempa->next;
            //cnt++;
        } else if(tempa -> expn > tempb -> expn){
            InsertInOrder(psub,-tempb->coef,tempb->expn);
            tempb = tempb->next;
            //cnt++;  
        }
        else{
            double c = tempa -> coef - tempb -> coef;
            if(c != 0){
                InsertInOrder(psub,c,tempa -> expn); // 可以直接用insert 不过这样效率更高
                //cnt++;
            }   
            tempa = tempa->next;
            tempb = tempb->next;
        }
    }
    while(tempa != NULL){
        InsertInOrder(psub,tempa->coef,tempa->expn);
        tempa = tempa->next;
        //cnt++;
    }
    while(tempb != NULL){
        InsertInOrder(psub,-tempb->coef,tempb->expn);
        tempb = tempb->next;
        //cnt++;
    }
    //psub.len = cnt;   
    //PrintPolyn(psub);
    return;
}
void MultiplyPolyn(const poly& pa, const poly& pb, poly& pmul){
    InitList(pmul);
    for (node* a = pa.head->next; a != NULL; a = a->next) {
        for (node* b = pb.head->next; b != NULL; b = b->next) {
            double c = a->coef * b->coef;
            if (c == 0) continue;              // InsertInOrder 也会挡，但省一次调用
            InsertInOrder(pmul, c, a->expn + b->expn);
        }
    }
    //PrintPolyn(pmul);
}
void DiffPolyn(const poly& p, poly& pdiff){
    InitList(pdiff);
    for (node* a = p.head->next; a != NULL; a = a->next) {
        if(a->expn == 0){
            continue;
        }
        InsertInOrder(pdiff, a->coef * a->expn, a->expn - 1);
    }
    //PrintPolyn(pdiff); // haha 细节已经被print处理了 比如常数项
}
/*------------第一次写完的错误
InsertInOrder 未声明就被 ParsePolyn 调用 → 编译不过。.h 加声明、.cpp 去 static。

AddPolyn/SubPolyn 里 int c → 改 double c（小数系数会截断）。

cnt 和 InsertInOrder 维护的 len 冲突 → 删 cnt 和 psum.len = cnt，信 InsertInOrder。

ParsePolyn 常数项指数 bug：3 被解析成 3x（expn 默认 1）。拆 hasX 和 hasExpn，常数项 expn = 0。


MakeNode 里 p == NULL 检查：C++ new 失败抛异常不返回 NULL，这个检查无意义，可删可留。
*/