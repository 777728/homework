# ============================================================================
#  Makefile —— 数据结构实验（实验一 / 四 / 五 / 六）
#  make          编译控制台版 app、界面版 app-web 与自检程序 selftest
#  make run      编译并运行控制台版（实验一）
#  make web      编译并启动界面服务（实验一/四/五/六，浏览器自动打开）
#  make test     运行控制台版自检测试（实验一）
#  make test-all 运行实验四/五/六的自检测试
#  make clean    清理
# ============================================================================

CC       ?= cc
CFLAGS   ?= -std=c11 -Wall -Wextra -O2 -g
LDLIBS   ?= -lm
TARGET    = app
TARGET_W  = app-web
TARGET_T  = selftest
COMMON    = Polynomial.o LinearSolver.o maze.o tree.o graph.o

all: $(TARGET) $(TARGET_W) $(TARGET_T)

$(TARGET): main.o Polynomial.o LinearSolver.o ui.o
	$(CC) $(CFLAGS) -o $@ main.o Polynomial.o LinearSolver.o ui.o $(LDLIBS)

$(TARGET_W): webui.o $(COMMON)
	$(CC) $(CFLAGS) -o $@ webui.o $(COMMON)

$(TARGET_T): selftest.o maze.o tree.o graph.o
	$(CC) $(CFLAGS) -o $@ selftest.o maze.o tree.o graph.o

# 头文件依赖
main.o:         main.c Polynomial.h LinearSolver.h ui.h
Polynomial.o:   Polynomial.c Polynomial.h
LinearSolver.o: LinearSolver.c LinearSolver.h
ui.o:           ui.c ui.h
maze.o:         maze.c maze.h
tree.o:         tree.c tree.h
graph.o:        graph.c graph.h
webui.o:        webui.c Polynomial.h LinearSolver.h maze.h tree.h graph.h
selftest.o:     selftest.c maze.h tree.h graph.h

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

run: $(TARGET)
	./$(TARGET)

web: $(TARGET_W)
	./$(TARGET_W)

test: $(TARGET)
	printf '4\n\n0\n' | ./$(TARGET)

test-all: $(TARGET_T)
	./$(TARGET_T)

clean:
	rm -f *.o $(TARGET) $(TARGET_W) $(TARGET_T)
	rm -rf $(TARGET).dSYM $(TARGET_W).dSYM $(TARGET_T).dSYM

.PHONY: all run web test test-all clean
