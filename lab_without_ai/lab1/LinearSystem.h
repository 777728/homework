#ifndef LINEARSYSTEM_H
#define LINEARSYSTEM_H

#include <vector>
#include <string>

struct Solution {
    int type;                                  // 0 无解，1 唯一解，2 无穷多解
    std::vector<double> x;                     // 唯一解
    std::vector<double> particular;            // 无穷多解时的特解
    std::vector<std::vector<double>> basis;    // 基础解系
    std::vector<int> freeVars;                 // 自由变量下标（0 起）
};

// 解线性方程组 A x = b
// A: m 行 n 列；b: m 维
Solution SolveLinearSystem(std::vector<std::vector<double>> A,
                           std::vector<double> b);

// 打印解（基础解系 + 通解）
void PrintSolution(const Solution& s, int n);

#endif