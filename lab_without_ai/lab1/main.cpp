#include "Polynominal.h"
#include "LinearSystem.h"
#include <iostream>
#include <string>
#include <vector>
#include <sstream>

// 从一行字符串读矩阵（每行 n+1 个数：n 个系数 + 1 个常数）
static bool ReadMatrix(int m, int n,
                       std::vector<std::vector<double>>& A,
                       std::vector<double>& b) {
    A.assign(m, std::vector<double>(n, 0.0));
    b.assign(m, 0.0);
    std::cout << "请依次输入 " << m << " 行，每行 " << n
              << " 个系数和 1 个常数（共 " << n + 1 << " 个数）：\n";
    for (int i = 0; i < m; ++i) {
        for (int j = 0; j < n; ++j) {
            if (!(std::cin >> A[i][j])) return false;
        }
        if (!(std::cin >> b[i])) return false;
    }
    return true;
}

static void MenuPoly() {
    std::cout << "输入第一个多项式（如 3x^2+2x+1，请勿加空格）：";
    poly pa; ParsePolyn(pa);
    std::cout << "输入第二个多项式（求导可随便输入 0）：";
    poly pb; ParsePolyn(pb);

    std::cout << "操作：1 加 2 减 3 乘 4 求导（对第一个）\n";
    std::cout << "请选择操作：";
    int op; 
    if (!(std::cin >> op)) return;
    
    poly pr;
    if (op == 1)      { AddPolyn(pa, pb, pr);      std::cout << "和 = "; }
    else if (op == 2) { SubPolyn(pa, pb, pr);      std::cout << "差 = "; }
    else if (op == 3) { MultiplyPolyn(pa, pb, pr); std::cout << "积 = "; }
    else if (op == 4) { DiffPolyn(pa, pr);         std::cout << "导数 = "; }
    else { std::cout << "无效操作\n"; return; }

    PrintPolyn(pr);
    std::cout << "\n";
    DestroyList(pa); DestroyList(pb); DestroyList(pr);
}

static void MenuLinear() {
    int m, n;
    std::cout << "方程个数 m："; std::cin >> m;
    std::cout << "未知数个数 n："; std::cin >> n;
    std::vector<std::vector<double>> A;
    std::vector<double> b;
    if (!ReadMatrix(m, n, A, b)) { std::cout << "输入错误\n"; return; }
    Solution s = SolveLinearSystem(A, b);
    PrintSolution(s, n);
}

int main() {
    while (true) {
        std::cout << "\n===== 多项式与线性方程组 =====\n";
        std::cout << "1 多项式计算\n2 线性方程组求解\n0 退出\n选择：";
        int choice;
        if (!(std::cin >> choice)) break;
        if (choice == 0) break;
        
        std::cin.clear(); 
        std::cin.ignore(10000, '\n');

        if (choice == 1) MenuPoly();
        else if (choice == 2) MenuLinear();
        else std::cout << "无效选择\n";
    }
    return 0;
}