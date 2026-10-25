#include "maze_type.h"
#include "maze_solver.h"
#include "link_stack.h"
#include <iostream>
#include <cstdlib>
using namespace std;
const int testRow = 6;
const int testCol = 6;
int testMaze[testRow][RANGE] = {
    {0, 1, 0, 0, 0, 0},
    {0, 0, 0, 1, 0, 0},
    {1, 1, 0, 1, 0, 1},
    {0, 0, 0, 0, 0, 1},
    {0, 1, 1, 1, 0, 0},
    {0, 0, 0, 0, 0, 0}
};
void ShowMenu() {
    cout << "\n=====================================" << endl;
    cout << "        迷宫求解演示程序 (非递归)" << endl;
    cout << "=====================================" << endl;
    cout << "  1. 使用内置测试迷宫运行" << endl;
    cout << "  2. 随机生成迷宫运行 (用户指定大小)" << endl;
    cout << "  0. 退出程序" << endl;
    cout << "=====================================" << endl;
    cout << "请输入您的选择 (0-2): ";
}

int main() {
    int choice;
    while (true) {
        ShowMenu();
        if (!(cin >> choice)) {
            // 防止用户输入非数字导致死循环
            cin.clear();
            cin.ignore(10000, '\n');
            continue;
        }
        if (choice == 0) {
            cout << "感谢使用，程序退出。" << endl;
            break;
        }
        MazeType maze;
        Stack path;
        InitStack(path);
        PosType start = {1, 1};
        PosType end;
        if (choice == 1) {
            //运行内置测试数据
            InitMaze(maze, testMaze, testRow, testCol);
            end = {testRow, testCol}; // 终点为 (row, col)
            cout << "\n[内置测试迷宫] 起点: (" << start.r << "," << start.c 
                 << ")  终点: (" << end.r << "," << end.c << ")" << endl;
        } 
        else if (choice == 2) {
            //随机生成迷宫
            int r, c;
            cout << "请输入迷宫的行数 (建议 5-20): ";
            cin >> r;
            cout << "请输入迷宫的列数 (建议 5-20): ";
            cin >> c;
            if (r <= 0 || r >= RANGE || c <= 0 || c >= RANGE) {
                cout << "输入的维数不合法！" << endl;
                DestroyStack(path);
                continue;
            }

            GenerateMaze(maze, r, c);
            end = {r, c};
            cout << "\n[随机生成迷宫] 起点: (" << start.r << "," << start.c 
                 << ")  终点: (" << end.r << "," << end.c << ")" << endl;
        } 
        else {
            cout << "无效的选择，请重新输入。" << endl;
            DestroyStack(path);
            continue;
        }
        cout << "\n--- 初始迷宫状态 ('█'为墙, 空白为通路) ---" << endl;
        PrintMaze(maze);
        cout << "\n>>> 正在求解路径..." << endl;
        bool found = MazePath(maze, start, end, path);
        if (found) {
            cout << "\n[成功] 找到了一条从起点到终点的通路！" << endl;
            PrintPath(path);
            cout << "\n--- 求解后的迷宫状态 ('*'为路径, 'x'为死胡同) ---" << endl;
            PrintMaze(maze);
        } else {
            cout << "\n[失败] 该迷宫没有从起点到终点的通路！" << endl;
            cout << "\n--- 求解后的迷宫状态 ---" << endl;
            PrintMaze(maze);
        }

        // 释放栈内存
        DestroyStack(path);
        cout << "\n按回车键继续...";
        cin.get();
        cin.get();
    }
    return 0;
}