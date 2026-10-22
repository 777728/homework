/* ============================================================================
 *  ui.h  —  控制台界面小工具
 *  ---------------------------------------------------------------------------
 *  把「画菜单、报错、读输入」这些与算法无关的杂活集中到一处，
 *  让 main.c 只关心业务逻辑，Polynomial.c 只关心数据结构。
 * ==========================================================================*/

#ifndef UI_H
#define UI_H

#include <stddef.h>

/* 界面宽度（字符数），所有分隔线都用它，保证排版整齐 */
#define UI_WIDTH 62

/* 初始化：检测终端是否支持颜色，并（在 Windows 下）开启 ANSI 转义 */
void uiInit(void);

/* 当前终端是否支持颜色（供需要自定义排版的地方判断） */
int  uiColorEnabled(void);

/* 常用颜色串，不支持颜色时返回空串 */
const char *uiGreen(void);
const char *uiRed(void);
const char *uiReset(void);

/* 分隔线，ch 一般取 '-' 或 '=' */
void uiRule(char ch);

/* 标题：上下各一条 '=' 线 */
void uiTitle(const char *text);

/* 二级标题：左侧带 '>' 的一行 */
void uiSection(const char *text);

/* 菜单项：[key] 描述 */
void uiItem(int key, const char *text);

/* 状态提示 */
void uiOK(const char *fmt, ...);       /* 成功，绿色 */
void uiErr(const char *fmt, ...);      /* 错误，红色 */
void uiTip(const char *fmt, ...);      /* 提示，青色 */
void uiPlain(const char *fmt, ...);    /* 普通输出 */

/* 读入一行（自动去掉换行符），返回 1 成功，0 表示读到文件尾 */
int uiReadLine(char *buf, size_t size);

/* 读整数：1 成功；0 空输入（取消）；-1 格式错误 */
int uiReadInt(const char *prompt, int *out);

/* 读实数：返回值含义同上 */
int uiReadDouble(const char *prompt, double *out);

/* 是否继续（输入 y/Y 返回 1，其余返回 0） */
int uiConfirm(const char *prompt);

/* 暂停，等待用户按回车 */
void uiPause(void);

#endif /* UI_H */
