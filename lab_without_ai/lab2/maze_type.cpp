#include "maze_type.h"
#include <iostream>
#include <cstdlib>
#include <ctime>
using namespace std;
void InitMaze(MazeType &maze, int a[][RANGE], const int row, const int col) {
    maze.m = row;
    maze.n = col;
    for (int i = 0; i <= row + 1; i++) {
        for (int j = 0; j <= col + 1; j++) {
            if (i == 0 || i == row + 1 || j == 0 || j == col + 1) {
                maze.arr[i][j] = '1'; // 边缘一圈设为障碍
            } else {
                maze.arr[i][j] = a[i - 1][j - 1] == 1 ? '1' : '0'; 
            }
        }
    }
}
void PrintMaze(const MazeType &maze) {
    for (int i = 0; i <= maze.m + 1; i++) {
        for (int j = 0; j <= maze.n + 1; j++) {
            if (maze.arr[i][j] == '1') {
                cout << "█ "; // 墙
            } else if (maze.arr[i][j] == '0') {
                cout << "  "; // 通路
            } else {
                cout << maze.arr[i][j] << " "; // 足迹 '*' 或 死胡同 'x'
            }
        }
        cout << endl;
    }
}
void GenerateMaze(MazeType &maze, const int row, const int col) {
    maze.m = row;
    maze.n = col;
    static bool seeded = false;
    if (!seeded) {
        srand((unsigned)time(NULL));
        seeded = true;
    }
    for (int i = 1; i <= row; i++) {
        for (int j = 1; j <= col; j++) {
            int isWall = (rand() % 10 < 3) ? 1 : 0; 
            maze.arr[i][j] = isWall == 1 ? '1' : '0';
        }
    }
    for (int i = 0; i <= row + 1; i++) {
        for (int j = 0; j <= col + 1; j++) {
            if (i == 0 || i == row + 1 || j == 0 || j == col + 1) {
                maze.arr[i][j] = '1';
            }
        }
    }
    maze.arr[1][1] = '0';
    maze.arr[row][col] = '0';
}

bool InMaze(const MazeType &maze, const PosType pos) {
    return (pos.r >= 1 && pos.r <= maze.m && pos.c >= 1 && pos.c <= maze.n);
}
void FootPrint(MazeType &maze, PosType pos) {
    maze.arr[pos.r][pos.c] = '*';
}

void MarkPrint(MazeType &maze, PosType pos) {
    maze.arr[pos.r][pos.c] = 'x';
}