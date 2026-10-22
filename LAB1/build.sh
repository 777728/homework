#!/bin/bash
# ============================================================================
#  build.sh —— 一键编译脚本
#  用法：  ./build.sh            编译控制台版 app 和界面版 app-web
#          ./build.sh run        编译并运行控制台版（实验一）
#          ./build.sh web        编译并启动界面服务（实验一/四/五/六）
#          ./build.sh test       运行自检测试（四个实验的核心算法）
#          ./build.sh clean      清理中间文件
# ============================================================================

set -e
cd "$(dirname "$0")"

CC=${CC:-cc}
CFLAGS="-std=c11 -Wall -Wextra -O2 -g"
COMMON="Polynomial.c LinearSolver.c maze.c tree.c graph.c"
OUT="app"
OUT_WEB="app-web"
OUT_TEST="selftest"

case "$1" in
    clean)
        rm -f "$OUT" "$OUT_WEB" "$OUT_TEST" *.o
        rm -rf "$OUT.dSYM" "$OUT_WEB.dSYM" "$OUT_TEST.dSYM"
        echo ">> 已清理"
        exit 0
        ;;
esac

echo ">> 正在编译：$CC $CFLAGS"

# 控制台版本（实验一；始终编译，验收时最稳妥）
$CC $CFLAGS main.c Polynomial.c LinearSolver.c ui.c -o "$OUT" -lm
echo ">> 控制台版编译完成：./$OUT"

# 界面版本：四个实验共用一个本地服务，算法模块全部用 C 实现
$CC $CFLAGS webui.c $COMMON -o "$OUT_WEB"
echo ">> 界面版编译完成：./$OUT_WEB"

# 自检测试：实验四 / 五 / 六的固定用例
$CC $CFLAGS selftest.c maze.c tree.c graph.c -o "$OUT_TEST"
echo ">> 自检程序编译完成：./$OUT_TEST"

case "$1" in
    run)
        echo ">> 运行控制台版 ./$OUT"
        ./"$OUT"
        ;;
    web)
        echo ">> 启动界面服务，浏览器将自动打开 http://127.0.0.1:8765"
        ./"$OUT_WEB"
        ;;
    test)
        echo ">> 运行自检测试"
        ./"$OUT_TEST"
        ;;
esac
