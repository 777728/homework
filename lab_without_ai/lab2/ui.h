#ifndef UI_H
#define UI_H

#include "maze_type.h"
#include "link_stack.h"
#include "maze_solver.h"

void ShowMenu();
void ShowHelp();
int GetChoice();
void RunUI(MazeType &maze);
void InputMazeSize(int &row, int &col);
void InputStartEnd(PosType &start, PosType &end);

#endif