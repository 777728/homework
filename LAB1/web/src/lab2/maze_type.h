#ifndef MAZE_TYPE_H
#define MAZE_TYPE_H

#include "pos_type.h"

const int RANGE = 100;

struct MazeType {
    int m, n;
    char arr[RANGE][RANGE];
};

void InitMaze(MazeType &maze, int a[][RANGE], const int row, const int col);//用 row 行 col 列的二维数组 a 初始化迷宫 maze，包括在四周加一圈障碍
void PrintMaze(const MazeType &maze);
void GenerateMaze(MazeType &maze, const int row, const int col);
bool InMaze(const MazeType &maze, const PosType pos);
void MarkPrint(MazeType &maze, PosType pos);
void FootPrint(MazeType &maze, PosType pos);

#endif