/* ============================================================================
 *  ui.c  —  控制台界面小工具实现
 *  ---------------------------------------------------------------------------
 *  只用标准 C + 少量平台接口（判断是否为终端 / Windows 开启 VT），
 *  没有引入任何第三方库，方便直接交给老师编译运行。
 * ==========================================================================*/

#include <ctype.h>
#include <limits.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "ui.h"

#if defined(_WIN32)
#  include <io.h>
#  include <windows.h>
#  define IS_TTY(f) _isatty(_fileno(f))
#else
#  include <unistd.h>
#  define IS_TTY(f) isatty(fileno(f))
#endif

/* ---------------------------- 颜色控制 ---------------------------- */
/* 只用深色系（0;3x），保证在浅色和深色终端下都能看清 */
#define C_RESET "\033[0m"
#define C_BOLD  "\033[1m"
#define C_DIM   "\033[2m"
#define C_RED   "\033[0;31m"
#define C_GREEN "\033[0;32m"
#define C_CYAN  "\033[0;36m"

static int g_color = 0;    /* 1 表示可以输出 ANSI 颜色 */

/* 根据 g_color 决定是返回颜色串还是空串 */
#define COL(c) (g_color ? (c) : "")

/* 初始化：非终端（如重定向到文件）或设置了 NO_COLOR 时不输出颜色 */
void uiInit(void) {
#if defined(_WIN32)
    /* Windows 10 以上需要显式开启虚拟终端序列 */
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    DWORD  mode = 0;
    if (hOut != INVALID_HANDLE_VALUE && GetConsoleMode(hOut, &mode)) {
        SetConsoleMode(hOut, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
    }
    g_color = IS_TTY(stdout);
#else
    g_color = IS_TTY(stdout) && (getenv("NO_COLOR") == NULL);
#endif
}

/* 分隔线 */
void uiRule(char ch) {
    printf("%s", COL(C_DIM));
    for (int i = 0; i < UI_WIDTH; i++) putchar(ch);
    printf("%s\n", COL(C_RESET));
}

/* 颜色是否可用 */
int uiColorEnabled(void) { return g_color; }

/* 供调用者直接取用的颜色串 */
const char *uiGreen(void) { return COL(C_GREEN); }
const char *uiRed(void)   { return COL(C_RED); }
const char *uiReset(void) { return COL(C_RESET); }

/* 一级标题 */
void uiTitle(const char *text) {
    printf("\n");
    uiRule('=');
    printf("%s  %s%s\n", COL(C_BOLD), text, COL(C_RESET));
    uiRule('=');
}

/* 二级标题 */
void uiSection(const char *text) {
    printf("\n%s> %s%s\n", COL(C_BOLD), text, COL(C_RESET));
}

/* 菜单项 */
void uiItem(int key, const char *text) {
    printf("   %s[%d]%s %s\n", COL(C_BOLD), key, COL(C_RESET), text);
}

/* 成功提示 */
void uiOK(const char *fmt, ...) {
    va_list ap;
    printf("   %s[OK]%s ", COL(C_GREEN), COL(C_RESET));
    va_start(ap, fmt);
    vprintf(fmt, ap);
    va_end(ap);
    printf("\n");
}

/* 错误提示 */
void uiErr(const char *fmt, ...) {
    va_list ap;
    printf("   %s[!] %s", COL(C_RED), COL(C_RESET));
    va_start(ap, fmt);
    vprintf(fmt, ap);
    va_end(ap);
    printf("\n");
}

/* 提示信息 */
void uiTip(const char *fmt, ...) {
    va_list ap;
    printf("   %s[>] %s", COL(C_CYAN), COL(C_RESET));
    va_start(ap, fmt);
    vprintf(fmt, ap);
    va_end(ap);
    printf("\n");
}

/* 普通输出（带统一缩进） */
void uiPlain(const char *fmt, ...) {
    va_list ap;
    printf("   ");
    va_start(ap, fmt);
    vprintf(fmt, ap);
    va_end(ap);
    printf("\n");
}

/*
 * 读一行。
 * 用 fgets 而不是 scanf，避免「上一次输入留下的换行符」导致跳过输入，
 * 这是控制台程序最常见的坑。
 */
int uiReadLine(char *buf, size_t size) {
    if (buf == NULL || size == 0) return 0;
    if (fgets(buf, (int)size, stdin) == NULL) return 0;

    size_t len = strlen(buf);
    if (len > 0 && buf[len - 1] == '\n') {
        buf[len - 1] = '\0';               /* 去掉换行 */
    } else {
        /* 输入超长：丢弃本行剩余字符，防止影响下一次读取 */
        int c;
        while ((c = getchar()) != '\n' && c != EOF) { /* 空循环 */ }
    }
    return 1;
}

/* 读整数：允许前后空格，整行必须是合法整数 */
int uiReadInt(const char *prompt, int *out) {
    char buf[64];

    printf("%s", prompt);
    fflush(stdout);
    if (!uiReadLine(buf, sizeof buf)) return 0;

    char *p = buf;
    while (isspace((unsigned char)*p)) p++;
    if (*p == '\0') return 0;              /* 直接回车 = 取消 */

    char *end = NULL;
    long v = strtol(p, &end, 10);
    while (isspace((unsigned char)*end)) end++;
    if (end == p || *end != '\0') return -1;
    if (v > INT_MAX || v < INT_MIN) return -1;   /* 超出 int 范围 */

    if (out != NULL) *out = (int)v;
    return 1;
}

/* 读实数 */
int uiReadDouble(const char *prompt, double *out) {
    char buf[64];

    printf("%s", prompt);
    fflush(stdout);
    if (!uiReadLine(buf, sizeof buf)) return 0;

    char *p = buf;
    while (isspace((unsigned char)*p)) p++;
    if (*p == '\0') return 0;

    char *end = NULL;
    double v = strtod(p, &end);
    while (isspace((unsigned char)*end)) end++;
    if (end == p || *end != '\0') return -1;

    if (out != NULL) *out = v;
    return 1;
}

/* 确认 */
int uiConfirm(const char *prompt) {
    char buf[16];

    printf("%s", prompt);
    fflush(stdout);
    if (!uiReadLine(buf, sizeof buf)) return 0;
    return (buf[0] == 'y' || buf[0] == 'Y');
}

/* 暂停 */
void uiPause(void) {
    char buf[16];
    printf("\n   %s按回车继续...%s", COL(C_DIM), COL(C_RESET));
    fflush(stdout);
    (void)uiReadLine(buf, sizeof buf);
}
