#ifndef POS_TYPE_H
#define POS_TYPE_H

typedef struct {
    int r; 
    int c; 
} PosType;

bool SamePos(const PosType p1, const PosType p2);   
#endif
/*==============================================================================
 * 文件划分与函数归属原则（简要说明）
 *------------------------------------------------------------------------------
 * 一、按“操作的数据结构”归属
 *   - 操作 PosType        → pos_type.h（短小函数可 inline）
 *   - 操作 MazeType       → maze_type.h / maze_type.cpp
 *   - 操作 Stack/NodeType → link_stack.h / link_stack.cpp
 *   - 操作求解流程        → maze_solver.h / maze_solver.cpp
 *   - 操作菜单/输入输出   → ui.h / ui.cpp
 *
 * 二、按“被谁调用”决定是否公开
 *   - 只被一个模块调用的辅助函数 → 放该模块 .cpp，用 static 隐藏，不写进头文件
 *   - 被多个模块调用的函数       → 放公共 .h 声明
 *   - 实验要求明确列出的接口     → 保留独立函数名，便于验收
 *
 * 三、可以合并的情况
 *   - 短小且只服务一个函数的辅助函数 → static 或 inline
 *   - 同一数据结构的同类操作         → 合并到该数据结构模块
 *   - 仅内部使用的边界处理/随机填充  → 合并进 InitMaze/GenerateMaze 所在 .cpp
 *
 * 四、不建议合并的情况
 *   - 被多个模块调用
 *   - 实验要求明确列出的函数（InitMaze、PrintMaze、MazePath、栈操作等）
 *   - 函数较长或逻辑独立
 *   - 涉及不同数据结构（如 MazePath 同时用迷宫和栈）
 *
 * 五、本项目函数归属速查
 *   pos_type.h        : PosType, inline Same
 *   maze_type.h/.cpp  : InitMaze, PrintMaze, GenerateMaze, InMaze,
 *                       FootPrint, MarkPrint, static AddBorder/RandomFill
 *   link_stack.h/.cpp : ElemType, NodeType, Stack,
 *                       InitStack, DestroyStack, StackEmpty, StackLength,
 *                       Push, Pop, GetTop
 *   maze_solver.h/.cpp: directiveType, Pass, NextPos, MazePath
 *   ui.h/.cpp         : ShowMenu, ShowHelp, GetChoice, RunUI,
 *                       InputMazeSize, InputStartEnd, PrintPath,
 *                       static Pause/PrintResult
 *   main.cpp          : main
 *
 * 六、一句话原则
 *   操作谁就归谁；只被一个函数用就 static/inline 合并；
 *   被多模块用或实验明确要求的接口，保留独立声明。
 *============================================================================*/