/* ============================================================================
 *  tree.c  —  实验五：二叉树遍历、树与二叉树转换、哈夫曼编码/译码
 * ==========================================================================*/
#include "tree.h"

#include <ctype.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ==========================================================================
 *  一、小工具
 * ==========================================================================*/

/* 追加字符串，返回新的写入位置（不会越界） */
static size_t Put(char *out, size_t cap, size_t used, const char *fmt, ...) {
    if (used + 1 >= cap) return used;

    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(out + used, cap - used, fmt, ap);
    va_end(ap);

    if (n < 0) return used;
    used += (size_t)n;
    return (used < cap) ? used : cap - 1;
}

/* 追加一个字符（遍历结果用空格分隔） */
static void PutChar(char *out, size_t cap, size_t *used, char ch, int *first) {
    if (*used + 4 >= cap) return;
    if (!*first) out[(*used)++] = ' ';
    out[(*used)++] = ch;
    out[*used] = '\0';
    *first = 0;
}

/* 统计 UTF-8 字符串的显示宽度：汉字算 2 列，ASCII 算 1 列 */
static int DisplayWidth(const char *s) {
    int w = 0;
    for (const unsigned char *p = (const unsigned char *)s; *p != '\0'; p++) {
        if ((*p & 0xC0) == 0x80) continue;      /* 多字节字符的后续字节 */
        w += (*p >= 0xE0) ? 2 : 1;              /* 3 字节汉字按 2 列算 */
    }
    return w;
}

/* 左对齐补空格，让中文表格也能对齐 */
static void PadTo(char *out, size_t cap, const char *text, int width) {
    snprintf(out, cap, "%s", text);
    int pad = width - DisplayWidth(text);
    size_t len = strlen(out);
    while (pad-- > 0 && len + 1 < cap) out[len++] = ' ';
    out[len] = '\0';
}

/* ==========================================================================
 *  二、二叉树的建立与释放
 * ==========================================================================*/

static Tree NewNode(char ch) {
    Tree t = (Tree)malloc(sizeof(TNode));
    if (t == NULL) return NULL;
    t->data = ch;
    t->left = t->right = NULL;
    return t;
}

/* 递归读取先序序列，p 指向当前待读字符 */
static Tree BuildRec(const char **p) {
    char ch = **p;

    if (ch == '\0') return NULL;          /* 序列提前结束 */
    (*p)++;
    if (ch == '#') return NULL;           /* '#' 表示空子树 */

    Tree t = NewNode(ch);
    if (t == NULL) return NULL;
    t->left  = BuildRec(p);
    t->right = BuildRec(p);
    return t;
}

Tree TreeBuild(const char *pre) {
    if (pre == NULL) return NULL;
    return BuildRec(&pre);
}

void TreeFree(Tree *t) {
    if (t == NULL || *t == NULL) return;
    TreeFree(&(*t)->left);
    TreeFree(&(*t)->right);
    free(*t);
    *t = NULL;
}

/* ==========================================================================
 *  三、遍历
 * ==========================================================================*/

static void PreRec(Tree t, char *out, size_t cap, size_t *used, int *first) {
    if (t == NULL) return;
    PutChar(out, cap, used, t->data, first);
    PreRec(t->left, out, cap, used, first);
    PreRec(t->right, out, cap, used, first);
}

static void InRec(Tree t, char *out, size_t cap, size_t *used, int *first) {
    if (t == NULL) return;
    InRec(t->left, out, cap, used, first);
    PutChar(out, cap, used, t->data, first);
    InRec(t->right, out, cap, used, first);
}

static void PostRec(Tree t, char *out, size_t cap, size_t *used, int *first) {
    if (t == NULL) return;
    PostRec(t->left, out, cap, used, first);
    PostRec(t->right, out, cap, used, first);
    PutChar(out, cap, used, t->data, first);
}

void TreePreRec(Tree t, char *out, size_t cap) {
    size_t used = 0; int first = 1;
    out[0] = '\0';
    PreRec(t, out, cap, &used, &first);
}

void TreeInRec(Tree t, char *out, size_t cap) {
    size_t used = 0; int first = 1;
    out[0] = '\0';
    InRec(t, out, cap, &used, &first);
}

void TreePostRec(Tree t, char *out, size_t cap) {
    size_t used = 0; int first = 1;
    out[0] = '\0';
    PostRec(t, out, cap, &used, &first);
}

/* ---- 非递归：用数组当栈 ---- */

#define STACK_MAX 256

void TreePreIter(Tree t, char *out, size_t cap) {
    Tree stack[STACK_MAX];
    int  top = 0;
    size_t used = 0;
    int first = 1;

    out[0] = '\0';
    if (t != NULL) stack[top++] = t;

    while (top > 0) {
        Tree p = stack[--top];
        PutChar(out, cap, &used, p->data, &first);

        /* 栈是后进先出，所以先压右孩子 */
        if (p->right != NULL && top < STACK_MAX) stack[top++] = p->right;
        if (p->left  != NULL && top < STACK_MAX) stack[top++] = p->left;
    }
}

void TreeInIter(Tree t, char *out, size_t cap) {
    Tree stack[STACK_MAX];
    int  top = 0;
    size_t used = 0;
    int first = 1;
    Tree p = t;

    out[0] = '\0';
    while (p != NULL || top > 0) {
        while (p != NULL) {                    /* 一路向左，沿路进栈 */
            if (top >= STACK_MAX) return;
            stack[top++] = p;
            p = p->left;
        }
        p = stack[--top];                      /* 弹出并访问，再转向右子树 */
        PutChar(out, cap, &used, p->data, &first);
        p = p->right;
    }
}

void TreePostIter(Tree t, char *out, size_t cap) {
    /* 思路：按「根—右—左」遍历，最后把结果反过来，就是后序 */
    char  tmp[STACK_MAX];
    int   cnt = 0;
    Tree  stack[STACK_MAX];
    int   top = 0;
    size_t used = 0;
    int   first = 1;

    out[0] = '\0';
    if (t != NULL) stack[top++] = t;

    while (top > 0 && cnt < STACK_MAX) {
        Tree p = stack[--top];
        tmp[cnt++] = p->data;

        if (p->left  != NULL && top < STACK_MAX) stack[top++] = p->left;
        if (p->right != NULL && top < STACK_MAX) stack[top++] = p->right;
    }

    for (int i = cnt - 1; i >= 0; i--) {
        PutChar(out, cap, &used, tmp[i], &first);
    }
}

void TreeLevel(Tree t, char *out, size_t cap) {
    Tree queue[STACK_MAX];
    int  head = 0, tail = 0;
    size_t used = 0;
    int first = 1;

    out[0] = '\0';
    if (t == NULL) return;

    queue[tail++] = t;
    while (head < tail) {
        Tree p = queue[head++];
        PutChar(out, cap, &used, p->data, &first);

        if (p->left  != NULL && tail < STACK_MAX) queue[tail++] = p->left;
        if (p->right != NULL && tail < STACK_MAX) queue[tail++] = p->right;
    }
}

/* ==========================================================================
 *  四、统计与画树
 * ==========================================================================*/

int TreeHeight(Tree t) {
    if (t == NULL) return 0;
    int lh = TreeHeight(t->left);
    int rh = TreeHeight(t->right);
    return (lh > rh ? lh : rh) + 1;
}

int TreeNodes(Tree t) {
    if (t == NULL) return 0;
    return 1 + TreeNodes(t->left) + TreeNodes(t->right);
}

int TreeLeaves(Tree t) {
    if (t == NULL) return 0;
    if (t->left == NULL && t->right == NULL) return 1;
    return TreeLeaves(t->left) + TreeLeaves(t->right);
}

/* 递归画树：prefix 是本层之前的前缀，last 表示是否为最后一个孩子 */
static void DrawRec(Tree t, const char *prefix, int last, int root,
                    char *out, size_t cap, size_t *used) {
    if (t == NULL) return;

    if (!root) {
        *used = Put(out, cap, *used, "%s%s", prefix, last ? "└─ " : "├─ ");
    }
    *used = Put(out, cap, *used, "%c\n", t->data);

    /* 子结点的新前缀：最后一个孩子下面留空，其余画竖线 */
    char next[512];
    snprintf(next, sizeof next, "%s%s", prefix, root ? "" : (last ? "   " : "│  "));

    int hasRight = (t->right != NULL);
    DrawRec(t->left,  next, !hasRight, 0, out, cap, used);
    DrawRec(t->right, next, 1, 0, out, cap, used);
}

void TreeDraw(Tree t, char *out, size_t cap) {
    size_t used = 0;
    out[0] = '\0';
    if (t == NULL) {
        snprintf(out, cap, "（空树）\n");
        return;
    }
    DrawRec(t, "", 1, 1, out, cap, &used);
}

/* ==========================================================================
 *  五、树与二叉树的相互转换（左孩子—右兄弟表示法）
 * ==========================================================================*/

/* 括号表示：一个名字（单个字符），后面可以跟 (孩子,孩子,...) */
static Tree ParseGeneral(const char **p) {
    while (isspace((unsigned char)**p)) (*p)++;

    if (**p == '\0' || **p == ')' || **p == ',') return NULL;

    Tree node = NewNode(**p);
    if (node == NULL) return NULL;
    (*p)++;

    if (**p == '(') {
        (*p)++;
        Tree first = ParseGeneral(p);        /* 第一个孩子 */
        node->left = first;

        Tree cur = first;
        while (**p == ',') {
            (*p)++;
            Tree sib = ParseGeneral(p);
            if (cur != NULL) cur->right = sib;   /* 右链串起兄弟 */
            cur = sib;
        }
        if (**p == ')') (*p)++;
    }
    return node;
}

Tree TreeFromGeneral(const char *text) {
    if (text == NULL) return NULL;
    return ParseGeneral(&text);
}

/* 递归写出一棵树（不含兄弟） */
static void GenRec(Tree t, char *out, size_t cap, size_t *used) {
    *used = Put(out, cap, *used, "%c", t->data);

    if (t->left != NULL) {
        *used = Put(out, cap, *used, "(");
        for (Tree c = t->left; c != NULL; c = c->right) {
            GenRec(c, out, cap, used);
            if (c->right != NULL) *used = Put(out, cap, *used, ",");
        }
        *used = Put(out, cap, *used, ")");
    }
}

void TreeToGeneral(Tree t, char *out, size_t cap) {
    size_t used = 0;
    out[0] = '\0';

    if (t == NULL) {
        snprintf(out, cap, "（空树）");
        return;
    }

    /* 根的右子树表示“森林中的下一棵树”，一并输出 */
    for (Tree r = t; r != NULL; r = r->right) {
        GenRec(r, out, cap, &used);
        if (r->right != NULL) used = Put(out, cap, used, "  ");
    }
}

/* ==========================================================================
 *  六、哈夫曼树
 * ==========================================================================*/

/* 在 1..upto 中找出两个权值最小且还没被合并的结点 */
static void SelectTwo(const Huffman *H, int upto, int *a, int *b) {
    int m1 = -1, m2 = -1;

    for (int i = 1; i <= upto; i++) {
        if (H->parent[i] != 0) continue;
        if (m1 < 0 || H->weight[i] < H->weight[m1]) {
            m2 = m1;
            m1 = i;
        } else if (m2 < 0 || H->weight[i] < H->weight[m2]) {
            m2 = i;
        }
    }
    *a = m1;
    *b = m2;
}

/* 由 n 个叶子建树并生成编码 */
static int HuffmanBuild(Huffman *H, const char *chs, const int *w, int n,
                        char *err, size_t errcap) {
    if (n < 2) {
        snprintf(err, errcap, "至少需要 2 种不同字符");
        return 0;
    }
    if (n > HUFF_MAX) {
        snprintf(err, errcap, "字符种类太多（最多 %d 种）", HUFF_MAX);
        return 0;
    }

    memset(H, 0, sizeof *H);
    H->n = n;

    for (int i = 1; i <= n; i++) {
        H->weight[i] = w[i - 1];
        H->ch[i]     = chs[i - 1];
        H->parent[i] = H->left[i] = H->right[i] = 0;
    }

    /* 每次合并两个最小的结点，共合并 n-1 次 */
    for (int i = n + 1; i <= 2 * n - 1; i++) {
        int a, b;
        SelectTwo(H, i - 1, &a, &b);
        if (a < 0 || b < 0) {
            snprintf(err, errcap, "建树失败");
            return 0;
        }
        H->left[i]   = a;
        H->right[i]  = b;
        H->weight[i] = H->weight[a] + H->weight[b];
        H->parent[a] = H->parent[b] = i;
    }

    /* 从每个叶子往根走，记下路径上的 0/1，再反过来就是编码 */
    for (int i = 1; i <= n; i++) {
        char tmp[HUFF_CODE_MAX];
        int  len = 0;
        int  cur = i;

        while (H->parent[cur] != 0 && len < HUFF_CODE_MAX - 1) {
            int p = H->parent[cur];
            tmp[len++] = (H->left[p] == cur) ? '0' : '1';
            cur = p;
        }
        if (len == 0) tmp[len++] = '0';         /* 只有一个叶子时的退化情况 */

        unsigned char c = (unsigned char)H->ch[i];
        for (int k = 0; k < len; k++) {
            H->code[c][k] = tmp[len - 1 - k];
        }
        H->code[c][len] = '\0';
    }
    return 1;
}

int HuffmanBuildTable(Huffman *H, const char *table, char *err, size_t errcap) {
    char chs[HUFF_MAX];
    int  w[HUFF_MAX];
    int  n = 0;

    const char *p = table;
    while (*p != '\0' && n < HUFF_MAX) {
        while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n') p++;
        if (*p == '\0' || *p == '#') {           /* 空行或注释行 */
            while (*p != '\0' && *p != '\n') p++;
            continue;
        }

        char ch = *p;
        if (ch == '_') ch = ' ';
        p++;

        while (*p == ' ' || *p == '\t') p++;
        if (!isdigit((unsigned char)*p)) {
            snprintf(err, errcap, "第 %d 行缺少频度数字", n + 1);
            return 0;
        }

        long v = strtol(p, (char **)&p, 10);
        if (v <= 0 || v > 1000000) {
            snprintf(err, errcap, "第 %d 行的频度必须是正整数", n + 1);
            return 0;
        }

        /* 检查字符是否重复 */
        for (int i = 0; i < n; i++) {
            if (chs[i] == ch) {
                snprintf(err, errcap, "字符 '%c' 重复出现", ch == ' ' ? '_' : ch);
                return 0;
            }
        }

        chs[n] = ch;
        w[n]   = (int)v;
        n++;

        while (*p != '\0' && *p != '\n') p++;
    }

    if (n == 0) {
        snprintf(err, errcap, "频度表为空");
        return 0;
    }
    return HuffmanBuild(H, chs, w, n, err, errcap);
}

int HuffmanBuildText(Huffman *H, const char *text, char *err, size_t errcap) {
    int count[256] = {0};
    char chs[HUFF_MAX];
    int  w[HUFF_MAX];
    int  n = 0;

    if (text == NULL || *text == '\0') {
        snprintf(err, errcap, "电文为空");
        return 0;
    }

    for (const unsigned char *p = (const unsigned char *)text; *p != '\0'; p++) {
        if (*p < 32 || *p > 126) {
            snprintf(err, errcap, "电文含非 ASCII 字符，暂不支持");
            return 0;
        }
        count[*p]++;
    }

    for (int c = 0; c < 256; c++) {
        if (count[c] > 0) {
            chs[n] = (char)c;
            w[n]   = count[c];
            n++;
        }
    }
    return HuffmanBuild(H, chs, w, n, err, errcap);
}

void HuffmanTableText(const Huffman *H, char *out, size_t cap) {
    size_t used = 0;
    char   cell[16];
    long   totalWeight = 0;
    long   totalBits   = 0;

    char head1[16], head2[16];

    PadTo(head1, sizeof head1, "字符", 6);
    PadTo(head2, sizeof head2, "频度", 6);

    used = Put(out, cap, used, "%s %s %s\n", head1, head2, "编码");
    used = Put(out, cap, used, "--------------------------------\n");

    for (int i = 1; i <= H->n; i++) {
        unsigned char c = (unsigned char)H->ch[i];

        if (c == ' ') snprintf(cell, sizeof cell, "空格");
        else          snprintf(cell, sizeof cell, "%c", c);
        cell[15] = '\0';

        char name[24];
        PadTo(name, sizeof name, cell, 6);

        int len = (int)strlen(H->code[c]);
        used = Put(out, cap, used, "%s %-6d %s\n", name, H->weight[i], H->code[c]);

        totalWeight += H->weight[i];
        totalBits   += (long)H->weight[i] * len;
    }

    used = Put(out, cap, used, "--------------------------------\n");
    double avg = (totalWeight > 0) ? (double)totalBits / (double)totalWeight : 0.0;
    Put(out, cap, used, "共 %d 种字符，平均码长 %.2f 位/字符\n", H->n, avg);
}

void HuffmanEncode(const Huffman *H, const char *text, char *out, size_t cap) {
    size_t used = 0;
    out[0] = '\0';

    for (const unsigned char *p = (const unsigned char *)text; *p != '\0'; p++) {
        const char *code = H->code[*p];

        if (code[0] == '\0') {
            used = Put(out, cap, used, "<字符 '%c' 不在编码表中>", *p);
            break;
        }
        used = Put(out, cap, used, "%s", code);
        if (used + 1 >= cap) break;
    }
}

int HuffmanDecode(const Huffman *H, const char *bits, char *out, size_t cap) {
    size_t used = 0;
    int    root = 2 * H->n - 1;
    int    cur  = root;

    out[0] = '\0';

    for (const char *p = bits; *p != '\0'; p++) {
        if (*p == ' ' || *p == '\n' || *p == '\r' || *p == '\t') continue;
        if (*p != '0' && *p != '1') return 0;

        /* 0 走左孩子，1 走右孩子 */
        if (*p == '0') cur = H->left[cur];
        else           cur = H->right[cur];

        if (cur == 0) return 0;                 /* 走到了空分支，编码有误 */

        if (cur <= H->n) {                      /* 到达叶子，输出一个字符 */
            if (used + 2 >= cap) return 1;      /* 缓冲区满，先返回已有结果 */
            out[used++] = H->ch[cur];
            out[used]   = '\0';
            cur = root;
        }
    }

    /* 最后必须正好停在一个字符的边界上 */
    return (cur == root);
}
