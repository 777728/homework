#ifndef MAZE_SOLVER_H
#define MAZE_SOLVER_H

#include "maze_type.h"
#include "link_stack.h"

bool Pass(const MazeType &maze, PosType pos);
void FootPrint(MazeType &maze, PosType pos);
void MarkPrint(MazeType &maze, PosType pos);
PosType NextPos(PosType pos, DirectType di);
bool MazePath(MazeType &maze, PosType start, PosType end, Stack &path);
void PrintPath(const Stack &path);

#endif