#include "Menu.h"
#include "BiTree.h"
#include "TreeConvert.h"
#include "Huffman.h"
#include <iostream>
#include <string>
#include <map>
using namespace std;
void ShowHelp() {
    cout << "\n=================== 使 用 说 明 ===================" << endl;
    cout << "1. 二叉树建立：输入先序序列，'#' 表示空子树。" << endl;
    cout << "   例：ABC##DE#G##F###" << endl;
    cout << "2. 遍历：可分别用递归 / 非递归实现先序、中序、后序遍历。" << endl;
    cout << "3. 树与二叉树转换：树用广义表输入，如 A(B(E,F),C(G),D(H,I,J))" << endl;
    cout << "4. 哈夫曼：可 (a) 使用题目给定频度表  (b) 输入电文自动统计频度" << endl;
    cout << "5. 输入 0 返回上级菜单。" << endl;
    cout << "==================================================" << endl;
}

//==================== 模块 A：二叉树 ====================*/
void BinaryTreeMenu() {
    BiTree root = NULL;
    int choice;
    while (true) {
        cout << "\n--------- 二 叉 树 ---------" << endl;
        cout << " 1. 建立二叉树" << endl;
        cout << " 2. 递归遍历（先/中/后）" << endl;
        cout << " 3. 非递归遍历（先/中/后）" << endl;
        cout << " 4. 横向打印二叉树" << endl;
        cout << " 5. 销毁并重新建立" << endl;
        cout << " 0. 返回主菜单" << endl;
        cout << "请选择：";
        cin >> choice;
        if (choice == 0) break;

        switch (choice) {
        case 1: {
            cout << "请输入先序序列（'#' 表示空）：";
            string s; cin >> s;
            DestroyBiTree(root);
            int idx = 0;
            CreateBiTree(root, s, idx);
            cout << "建立成功！" << endl;
            break;
        }
        case 2:
            if (!root) { cout << "请先建立二叉树！" << endl; break; }
            cout << "先序遍历："; PreOrder(root);  cout << endl;
            cout << "中序遍历："; InOrder(root);   cout << endl;
            cout << "后序遍历："; PostOrder(root); cout << endl;
            break;
        case 3:
            if (!root) { cout << "请先建立二叉树！" << endl; break; }
            cout << "先序(非递归)："; PreOrderIter(root);  cout << endl;
            cout << "中序(非递归)："; InOrderIter(root);   cout << endl;
            cout << "后序(非递归)："; PostOrderIter(root); cout << endl;
            break;
        case 4:
            if (!root) { cout << "请先建立二叉树！" << endl; break; }
            cout << "\n（逆时针旋转 90 度显示）" << endl;
            PrintBiTree(root, 0);
            break;
        case 5:
            DestroyBiTree(root);
            cout << "已销毁。" << endl;
            break;
        default: cout << "输入有误！" << endl;
        }
    }
    DestroyBiTree(root);
}

//==================== 模块 B：树与二叉树转换 ====================*/
void ConvertMenu() {
    Tree   t = NULL;
    BiTree b = NULL;
    int choice;
    while (true) {
        cout << "\n------ 树 与 二 叉 树 转 换 ------" << endl;
        cout << " 1. 建立树（广义表形式）" << endl;
        cout << " 2. 树 -> 二叉树" << endl;
        cout << " 3. 二叉树 -> 树" << endl;
        cout << " 0. 返回主菜单" << endl;
        cout << "请选择：";
        cin >> choice;
        if (choice == 0) break;

        switch (choice) {
        case 1: {
            cout << "请输入广义表形式，如 A(B(E,F),C(G),D(H,I,J))：" << endl;
            string s; cin >> s;
            DestroyTree(t);
            int i = 0;
            t = CreateTree(s, i);
            cout << "树建立成功：" ; PrintTreeBracket(t); cout << endl;
            break;
        }
        case 2:
            if (!t) { cout << "请先建立树！" << endl; break; }
            DestroyBiTree(b);
            b = TreeToBiTree(t);
            cout << "转换后的二叉树（横向显示）：" << endl;
            PrintBiTree(b, 0);
            cout << "先序："; PreOrder(b);  cout << endl;
            cout << "中序："; InOrder(b);   cout << endl;
            cout << "后序："; PostOrder(b); cout << endl;
            break;
        case 3:
            if (!b) { cout << "请先执行一次『树 -> 二叉树』转换！" << endl; break; }
            if (b->rchild)
                cout << "[提示] 根结点有右子树，表示森林，只转换第一棵树。" << endl;
            {
                Tree tmp = BiTreeToTree(b);
                cout << "转换后的树（广义表）：";
                PrintTreeBracket(tmp);
                cout << endl;
                DestroyTree(tmp);
            }
            break;
        default: cout << "输入有误！" << endl;
        }
    }
    DestroyTree(t);
    DestroyBiTree(b);
}

//==================== 模块 C：哈夫曼 ====================*/
void HuffmanMenu() {
    HuffmanTree HT = NULL;
    HuffmanCode HC = NULL;
    int n = 0;
    char *chars   = NULL;
    int  *weights = NULL;

    int choice;
    while (true) {
        cout << "\n--------- 哈 夫 曼 编 码 / 译 码 ---------" << endl;
        cout << " 1. 使用题目给定的字符集与频度建树" << endl;
        cout << " 2. 输入一段电文，自动统计频度建树" << endl;
        cout << " 3. 显示编码表" << endl;
        cout << " 4. 对电文编码" << endl;
        cout << " 5. 对 0/1 代码译码" << endl;
        cout << " 0. 返回主菜单" << endl;
        cout << "请选择：";
        cin >> choice;
        if (choice == 0) break;

        switch (choice) {
        case 1: {
            const char cs[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
            const int  ws[] = {186, 64, 13, 22, 32,103, 21, 15, 47, 57,  1,  5,
                                32, 20, 57, 63, 15,  1, 48, 51, 80, 23,  8, 18,
                                 1, 16,100};
            n = sizeof(cs) - 1;
            delete[] chars;   delete[] weights;
            chars   = new char[n];
            weights = new int[n];
            for (int i = 0; i < n; i++) { chars[i] = cs[i]; weights[i] = ws[i]; }

            DestroyHuffman(HT, HC, n);
            CreateHuffmanTree(HT, chars, weights, n);
            HuffmanCoding(HT, HC, n);
            cout << "哈夫曼树建立完成，共 " << n << " 个叶子结点。" << endl;
            break;
        }
        case 2: {
            cout << "请输入一段电文（可含空格，回车结束）：" << endl;
            cin.ignore();
            string text;
            getline(cin, text);
            if (text.empty()) { cout << "电文为空！" << endl; break; }

            map<char, int> freq;
            for (size_t i = 0; i < text.size(); i++) freq[text[i]]++;

            int newN = (int)freq.size();
            if (newN <= 1) { cout << "字符种类太少，无法建立哈夫曼树！" << endl; break; }

            DestroyHuffman(HT, HC, n);
            n = newN;
            delete[] chars;   delete[] weights;
            chars   = new char[n];
            weights = new int[n];
            int k = 0;
            for (map<char, int>::iterator it = freq.begin(); it != freq.end(); ++it) {
                chars[k] = it->first;
                weights[k] = it->second;
                k++;
            }
            CreateHuffmanTree(HT, chars, weights, n);
            HuffmanCoding(HT, HC, n);
            cout << "统计完成，共 " << n << " 种字符。" << endl;
            break;
        }
        case 3:
            if (!HT) { cout << "请先建立哈夫曼树！" << endl; break; }
            PrintHuffmanCode(HT, HC, n);
            break;
        case 4: {
            if (!HT) { cout << "请先建立哈夫曼树！" << endl; break; }
            cout << "请输入要编码的电文：";
            cin.ignore();
            string text;
            getline(cin, text);
            cout << "编码结果：" << endl << Encode(HT, HC, n, text) << endl;
            break;
        }
        case 5: {
            if (!HT) { cout << "请先建立哈夫曼树！" << endl; break; }
            cout << "请输入 0/1 代码串：";
            string code; cin >> code;
            cout << "译码结果：" << endl << Decode(HT, n, code) << endl;
            break;
        }
        default: cout << "输入有误！" << endl;
        }
    }
    DestroyHuffman(HT, HC, n);
    delete[] chars;
    delete[] weights;
}