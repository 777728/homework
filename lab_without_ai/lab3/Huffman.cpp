#include "Huffman.h"
#include <iostream>
#include <cstring>
using namespace std;
//内部辅助：在 1..n 中找两个 parent==0 且权值最小的结点
static void Select(HuffmanTree HT, int n, int &s1, int &s2) {
    s1 = s2 = 0;
    for (int i = 1; i <= n; i++) {
        if (HT[i].parent != 0) continue;
        if (s1 == 0 || HT[i].weight < HT[s1].weight) { s2 = s1; s1 = i; }
        else if (s2 == 0 || HT[i].weight < HT[s2].weight) { s2 = i; }
    }
}
void CreateHuffmanTree(HuffmanTree &HT, const char *ch, const int *w, int n) {
    if (n <= 1) { HT = NULL; return; }
    int m = 2 * n - 1;
    HT = new HTNode[m + 1];
    for (int i = 1; i <= m; i++) {
        HT[i].parent = HT[i].lchild = HT[i].rchild = 0;
        HT[i].weight = 0; HT[i].ch = '\0';
    }
    for (int i = 1; i <= n; i++) { HT[i].weight = w[i - 1]; HT[i].ch = ch[i - 1]; }

    for (int i = n + 1; i <= m; i++) {
        int s1, s2;
        Select(HT, i - 1, s1, s2);
        HT[s1].parent = HT[s2].parent = i;
        HT[i].lchild = s1;
        HT[i].rchild = s2;
        HT[i].weight = HT[s1].weight + HT[s2].weight;
    }
}
void HuffmanCoding(HuffmanTree HT, HuffmanCode &HC, int n) {
    HC = new char*[n + 1];
    char *cd = new char[n];
    cd[n - 1] = '\0';
    for (int i = 1; i <= n; i++) {
        int start = n - 1;
        int c = i, f = HT[i].parent;
        while (f != 0) {
            if (HT[f].lchild == c) cd[--start] = '0';
            else                   cd[--start] = '1';
            c = f; f = HT[f].parent;
        }
        HC[i] = new char[n - start];
        strcpy(HC[i], &cd[start]);
    }
    delete[] cd;
}
void DestroyHuffman(HuffmanTree &HT, HuffmanCode &HC, int n) {
    if (HC) {
        for (int i = 1; i <= n; i++) delete[] HC[i];
        delete[] HC; HC = NULL;
    }
    if (HT) { delete[] HT; HT = NULL; }
}
void PrintHuffmanCode(HuffmanTree HT, HuffmanCode HC, int n) {
    cout << "------------------------------" << endl;
    cout << " 字符\t权值\t编码" << endl;
    cout << "------------------------------" << endl;
    for (int i = 1; i <= n; i++) {
        if (HT[i].ch == ' ') cout << " 空格";
        else                 cout << "  " << HT[i].ch << "  ";
        cout << "\t" << HT[i].weight << "\t" << HC[i] << endl;
    }
    cout << "------------------------------" << endl;
}
string Encode(HuffmanTree HT, HuffmanCode HC, int n, const string &text) {
    string res;
    for (size_t k = 0; k < text.size(); k++) {
        int pos = -1;
        for (int i = 1; i <= n; i++)
            if (HT[i].ch == text[k]) { pos = i; break; }
        if (pos == -1) {
            cout << "[警告] 字符 '" << text[k] << "' 不在字符集中，已忽略！" << endl;
            continue;
        }
        res += HC[pos];
    }
    return res;
}
string Decode(HuffmanTree HT, int n, const string &code) {
    int m = 2 * n - 1;   // 根结点下标
    int p = m;
    string res;
    for (size_t k = 0; k < code.size(); k++) {
        if (code[k] == '0') p = HT[p].lchild;
        else if (code[k] == '1') p = HT[p].rchild;
        else { res += "[非法字符]"; return res; }
        if (p == 0) { res += "[编码错误]"; return res; }
        if (HT[p].lchild == 0 && HT[p].rchild == 0) {
            res += HT[p].ch;
            p = m;
        }
    }
    if (p != m) res += "[编码不完整]";
    return res;
}