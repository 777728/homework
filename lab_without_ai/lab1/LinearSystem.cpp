#include "LinearSystem.h"
#include <iostream>
#include <cmath>
#include <iomanip>

static const double EPS = 1e-9;

// 判断 double 是否为 0
static bool IsZero(double v) { return std::fabs(v) < EPS; }

Solution SolveLinearSystem(std::vector<std::vector<double>> A,
                           std::vector<double> b) {
    Solution sol;
    sol.type = 0;

    int m = (int)A.size();
    int n = m > 0 ? (int)A[0].size() : 0;
    if (m == 0 || n == 0) { sol.type = 0; return sol; }

    // 构造增广矩阵 [A | b]
    std::vector<std::vector<double>> M(m, std::vector<double>(n + 1, 0.0));
    for (int i = 0; i < m; ++i) {
        for (int j = 0; j < n; ++j) M[i][j] = A[i][j];
        M[i][n] = b[i];
    }

    int row = 0;                       // 当前主元行
    std::vector<int> pivotCol(n, -1);  // 每行主元列
    for (int col = 0; col < n && row < m; ++col) {
        // 选列主元：第 col 列从 row 往下绝对值最大
        int pivot = -1;
        double best = EPS;
        for (int i = row; i < m; ++i) {
            if (std::fabs(M[i][col]) > best) {
                best = std::fabs(M[i][col]);
                pivot = i;
            }
        }
        if (pivot == -1) continue;     // 该列无主元，col 是自由变量

        std::swap(M[row], M[pivot]);   // 交换行

        // 归一化主元行
        double pv = M[row][col];
        for (int j = col; j <= n; ++j) M[row][j] /= pv;

        // 消去其他行的第 col 列
        for (int i = 0; i < m; ++i) {
            if (i == row) continue;
            double factor = M[i][col];
            if (IsZero(factor)) continue;
            for (int j = col; j <= n; ++j)
                M[i][j] -= factor * M[row][j];
        }

        pivotCol[row] = col;
        ++row;
    }

    // 判无解：存在 0 = 非零 的行
    for (int i = 0; i < m; ++i) {
        bool allZero = true;
        for (int j = 0; j < n; ++j)
            if (!IsZero(M[i][j])) { allZero = false; break; }
        if (allZero && !IsZero(M[i][n])) { sol.type = 0; return sol; }
    }

    int rank = row;
    if (rank == n) {
        // 唯一解
        sol.type = 1;
        sol.x.assign(n, 0.0);
        for (int i = 0; i < rank; ++i)
            sol.x[pivotCol[i]] = M[i][n];
        return sol;
    }

    // 无穷多解：找自由变量（无主元的列）
    sol.type = 2;
    std::vector<bool> isPivot(n, false);
    for (int i = 0; i < rank; ++i) isPivot[pivotCol[i]] = true;
    for (int j = 0; j < n; ++j)
        if (!isPivot[j]) sol.freeVars.push_back(j);

    // 特解：自由变量全取 0
    sol.particular.assign(n, 0.0);
    for (int i = 0; i < rank; ++i)
        sol.particular[pivotCol[i]] = M[i][n];

    // 基础解系：每个自由变量取 1，其余自由变量取 0，回代求主元变量
    for (int f : sol.freeVars) {
        std::vector<double> vec(n, 0.0);
        vec[f] = 1.0;
        for (int i = 0; i < rank; ++i) {
            int pc = pivotCol[i];
            // 主元变量 = -sum(M[i][j] * vec[j])，j 为自由变量
            double sum = 0.0;
            for (int j = 0; j < n; ++j) {
                if (j == pc) continue;
                sum += M[i][j] * vec[j];
            }
            vec[pc] = -sum;   // 主元行已归一化，M[i][pc] = 1
        }
        sol.basis.push_back(vec);
    }
    return sol;
}

void PrintSolution(const Solution& s, int n) {
    if (s.type == 0) {
        std::cout << "无解（方程组矛盾）\n";
        return;
    }
    std::cout << std::fixed << std::setprecision(4);
    if (s.type == 1) {
        std::cout << "有唯一解：\n";
        for (int i = 0; i < n; ++i)
            std::cout << "x" << i + 1 << " = " << s.x[i] << "\n";
        return;
    }
    // 无穷多解
    std::cout << "有无穷多解，自由变量：";
    for (size_t i = 0; i < s.freeVars.size(); ++i) {
        if (i) std::cout << ", ";
        std::cout << "x" << s.freeVars[i] + 1;
    }
    std::cout << "\n";

    std::cout << "特解 η = (";
    for (int i = 0; i < n; ++i) {
        if (i) std::cout << ", ";
        std::cout << s.particular[i];
    }
    std::cout << ")\n";

    std::cout << "基础解系：\n";
    for (size_t k = 0; k < s.basis.size(); ++k) {
        std::cout << "ξ" << k + 1 << " = (";
        for (int i = 0; i < n; ++i) {
            if (i) std::cout << ", ";
            std::cout << s.basis[k][i];
        }
        std::cout << ")\n";
    }

    std::cout << "通解：x = η";
    for (size_t k = 0; k < s.basis.size(); ++k)
        std::cout << " + c" << k + 1 << "·ξ" << k + 1;
    std::cout << "（c1,c2,... 为任意常数）\n";
}