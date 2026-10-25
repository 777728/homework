#include "Menu.h"
#include <iostream>
using namespace std;
int main() {
    int choice;
    while (true) {
        cout << "\n==========================================" << endl;
        cout << "        实验五  树 及 其 应 用" << endl;
        cout << "==========================================" << endl;
        cout << "  1. 二叉树（建立 / 遍历 / 显示）" << endl;
        cout << "  2. 树 与 二叉树 的相互转换" << endl;
        cout << "  3. 哈夫曼 编码 / 译码 器" << endl;
        cout << "  4. 使用说明" << endl;
        cout << "  0. 退出" << endl;
        cout << "==========================================" << endl;
        cout << "请选择：";
        if (!(cin >> choice)) { cin.clear(); cin.ignore(1024, '\n'); continue; }

        switch (choice) {
        case 1: BinaryTreeMenu(); break;
        case 2: ConvertMenu();    break;
        case 3: HuffmanMenu();    break;
        case 4: ShowHelp();       break;
        case 0: cout << "谢谢使用，再见！" << endl; return 0;
        default: cout << "输入有误，请重新选择！" << endl;
        }
    }
    return 0;
}