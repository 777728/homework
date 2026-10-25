#include "maze_solver.h"
#include "maze_type.h"
#include "link_stack.h"
#include <iostream>
#include <vector>
using namespace std;
bool Pass(const MazeType &maze, PosType pos) {
    return maze.arr[pos.r][pos.c] == '0'; 
}
PosType NextPos(PosType pos, const DirectType di) {
    PosType nextPos = pos;
    switch (di) {
        case 1: nextPos.c++; break; 
        case 2: nextPos.r++; break; 
        case 3: nextPos.c--; break; 
        case 4: nextPos.r--; break;
    }
    return nextPos;
}
bool MazePath(MazeType &maze, PosType start, PosType end, Stack &path) {
    PosType curpos = start;
    int curstep = 1;
    bool found = false;
    ElemType e;
    do {
        if (Pass(maze, curpos)) {
            FootPrint(maze, curpos);
            e.step = curstep;
            e.seat = curpos;
            e.di = 1; // 1代表东
            Push(path, e);

            // 3. 判断是否到达终点
            if (SamePos(curpos, end)) {
                found = true;
            } else {
                // 4. 未到终点，继续向东探索下一步
                curpos = NextPos(curpos, 1);
                curstep++;
            }
        } else {
            // 撞墙了
            if (!StackEmpty(path)) {
                // 弹出栈顶元素
                Pop(path, e);
                // 如果这个位置四个方向都试过了，依然是死
                while (e.di == 4 && !StackEmpty(path)) {
                    MarkPrint(maze, e.seat); // 在迷宫中标记为 'x'
                    Pop(path, e);           
                    curstep--;
                }
                
                // 如果在这个位置还有没试过
                if (e.di < 4) {
                    e.di++;             
                    Push(path, e);       // 重新压入栈中，更新方向
                    curpos = NextPos(e.seat, e.di); 
                }
            }
        }
    } while (!StackEmpty(path) && !found);

    return found;
}
void PrintPath(const Stack &path) {
    if (StackEmpty(path)) {
        cout << "没有找到有效路径！" << endl;
        return;
    }
    // 为了正序打印（从入口到出口），我们可以用一个 vector 暂存
    vector<ElemType> pathArray;
    LinkType p = path.top;
    while (p != nullptr) {
        pathArray.push_back(p->data);
        p = p->next;
    }
    cout << "找到通路，路径如下：" << endl;
    for (int i = pathArray.size() - 1; i >= 0; i--) {
        cout << "(" << pathArray[i].seat.r << "," 
             << pathArray[i].seat.c << "," 
             << pathArray[i].di << ")";
        if (i > 0) cout << " -> ";
    }
    cout << endl;
    cout << "总步数: " << pathArray.size() << " 步" << endl;
}