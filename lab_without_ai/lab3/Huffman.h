#ifndef HUFFMAN_H
#define HUFFMAN_H
#include <string>
typedef struct {
    char          ch;
    unsigned int  weight;
    unsigned int  parent, lchild, rchild;
} HTNode, *HuffmanTree;
typedef char **HuffmanCode;
//建树 / 编码表
void CreateHuffmanTree(HuffmanTree &HT, const char *ch, const int *w, int n);
void HuffmanCoding(HuffmanTree HT, HuffmanCode &HC, int n);
//释放
void DestroyHuffman(HuffmanTree &HT, HuffmanCode &HC, int n);
//打印编码表
void PrintHuffmanCode(HuffmanTree HT, HuffmanCode HC, int n);
//编码 / 译码
std::string Encode(HuffmanTree HT, HuffmanCode HC, int n, const std::string &text);
std::string Decode(HuffmanTree HT, int n, const std::string &code);
#endif