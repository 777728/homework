#include "campus/ConsoleUI.h"

#include <algorithm>
#include <cctype>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <sstream>

#if defined(_WIN32)
#include <io.h>
#include <windows.h>
#else
#include <unistd.h>
#endif

namespace campus::ui {
namespace {

bool g_color = false;
bool g_interactive = false;

const char* code(Color color) {
    switch (color) {
        case Color::Red: return "\x1b[31m";
        case Color::Green: return "\x1b[32m";
        case Color::Yellow: return "\x1b[33m";
        case Color::Cyan: return "\x1b[36m";
        case Color::Magenta: return "\x1b[35m";
        case Color::Bold: return "\x1b[1m";
        case Color::Dim: return "\x1b[2m";
    }
    return "";
}

std::string trim(const std::string& text) {
    const auto begin = std::find_if_not(text.begin(), text.end(), [](unsigned char c) {
        return std::isspace(c) != 0;
    });
    const auto end = std::find_if_not(text.rbegin(), text.rend(), [](unsigned char c) {
        return std::isspace(c) != 0;
    }).base();
    return begin < end ? std::string(begin, end) : std::string{};
}

int utf8CharWidth(unsigned int cp) {
    if (cp == 0) return 0;
    if (cp < 32 || (cp >= 0x7F && cp < 0xA0)) return 0;
    if ((cp >= 0x1100 && cp <= 0x115F) || (cp >= 0x2E80 && cp <= 0xA4CF) ||
        (cp >= 0xAC00 && cp <= 0xD7A3) || (cp >= 0xF900 && cp <= 0xFAFF) ||
        (cp >= 0xFE30 && cp <= 0xFE4F) || (cp >= 0xFF00 && cp <= 0xFF60) ||
        (cp >= 0xFFE0 && cp <= 0xFFE6) || (cp >= 0x1F300 && cp <= 0x1FAFF) ||
        (cp >= 0x20000 && cp <= 0x3FFFD)) {
        return 2;
    }
    return 1;
}

std::string padLeft(const std::string& text, int width) {
    const int gap = width - textWidth(text);
    return gap > 0 ? std::string(gap, ' ') + text : text;
}

}  // namespace

void initialize() {
#if defined(_WIN32)
    SetConsoleOutputCP(CP_UTF8);
    HANDLE out = GetStdHandle(STD_OUTPUT_HANDLE);
    DWORD mode = 0;
    if (GetConsoleMode(out, &mode)) {
        SetConsoleMode(out, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
    }
    g_interactive = _isatty(_fileno(stdout)) != 0;
#else
    g_interactive = isatty(fileno(stdout)) != 0;
#endif
    g_color = g_interactive && std::getenv("NO_COLOR") == nullptr;
}

void clearScreen() {
    if (g_interactive) {
        std::cout << "\x1b[2J\x1b[H";
    }
}

std::string paint(Color color, const std::string& text) {
    return g_color ? std::string(code(color)) + text + "\x1b[0m" : text;
}

int textWidth(const std::string& text) {
    int width = 0;
    for (size_t i = 0; i < text.size();) {
        const unsigned char c = static_cast<unsigned char>(text[i]);
        unsigned int cp = c;
        size_t len = 1;
        if ((c & 0xE0) == 0xC0) {
            cp = c & 0x1F;
            len = 2;
        } else if ((c & 0xF0) == 0xE0) {
            cp = c & 0x0F;
            len = 3;
        } else if ((c & 0xF8) == 0xF0) {
            cp = c & 0x07;
            len = 4;
        }
        if (i + len > text.size()) {
            len = 1;
            cp = c;
        } else {
            for (size_t j = 1; j < len; ++j) {
                cp = (cp << 6) | (static_cast<unsigned char>(text[i + j]) & 0x3F);
            }
        }
        width += utf8CharWidth(cp);
        i += len;
    }
    return width;
}

std::string fit(const std::string& text, int width) {
    const int gap = width - textWidth(text);
    return gap > 0 ? text + std::string(gap, ' ') : text;
}

std::string meters(int value) {
    return std::to_string(value) + " 米";
}

std::string minutes(int distance) {
    if (distance <= 0) return "0 分钟";
    const int min = (distance + 74) / 75;  // 约 75 米/分钟
    return std::to_string(min) + " 分钟";
}

void banner() {
    const std::string title = "云南大学呈贡校区 · 校园导游系统";
    std::cout << "\n" << paint(Color::Cyan, "  ╔══════════════════════════════════════════════╗") << "\n";
    std::cout << paint(Color::Cyan, "  ║") << "  " << paint(Color::Bold, fit(title, 42)) << "  "
              << paint(Color::Cyan, "║") << "\n";
    std::cout << paint(Color::Cyan, "  ║") << "  " << fit("Campus Tour  ·  数据结构实验六", 42) << "  "
              << paint(Color::Cyan, "║") << "\n";
    std::cout << paint(Color::Cyan, "  ╚══════════════════════════════════════════════╝") << "\n";
}

void section(const std::string& title) {
    std::cout << "\n" << paint(Color::Cyan, "  ── " + title + " ──") << "\n";
}

void success(const std::string& message) {
    std::cout << "  " << paint(Color::Green, "✓ ") << message << "\n";
}

void warning(const std::string& message) {
    std::cout << "  " << paint(Color::Yellow, "! ") << message << "\n";
}

void error(const std::string& message) {
    std::cout << "  " << paint(Color::Red, "✗ ") << message << "\n";
}

void hint(const std::string& message) {
    std::cout << "  " << paint(Color::Dim, message) << "\n";
}

void pause() {
    std::cout << "\n  " << paint(Color::Dim, "按 Enter 继续...");
    std::string line;
    std::getline(std::cin, line);
}

std::optional<int> readInt(const std::string& prompt, int minValue, int maxValue) {
    while (true) {
        std::cout << "  " << prompt;
        std::string line;
        if (!std::getline(std::cin, line)) {
            return std::nullopt;
        }
        const std::string value = trim(line);
        if (value == "q" || value == "Q") {
            return std::nullopt;
        }
        if (value.empty()) {
            continue;
        }
        try {
            size_t used = 0;
            const long long parsed = std::stoll(value, &used);
            if (used == value.size() && parsed >= minValue && parsed <= maxValue) {
                return static_cast<int>(parsed);
            }
        } catch (const std::exception&) {
            // 落入统一的错误提示
        }
        error("请输入 " + std::to_string(minValue) + "~" + std::to_string(maxValue) +
              " 之间的数字（q 取消）");
    }
}

void printPlaceTable(const CampusGraph& graph, bool onlyGates) {
    std::cout << "  " << fit("编号", 6) << "  " << fit("名称", 24) << fit("类别", 10)
              << fit("相邻道路", 10) << "性质\n";
    std::cout << "  " << std::string(60, '-') << "\n";
    for (int i = 0; i < graph.size(); ++i) {
        const Place& p = graph.place(i);
        if (onlyGates && !p.isGate) {
            continue;
        }
        std::cout << "  " << padLeft(std::to_string(i + 1), 6) << "  " << fit(p.name, 24)
                  << fit(p.category, 10) << fit(std::to_string(graph.neighbors(i).size()), 10)
                  << (p.isGate ? "入口" : "景点") << "\n";
    }
}

void printPlaceDetail(const CampusGraph& graph, int v) {
    const Place& p = graph.place(v);
    section("建筑信息");
    std::cout << "  " << paint(Color::Bold, p.name) << "  "
              << paint(Color::Dim, "编号 " + std::to_string(v + 1)) << "\n";
    std::cout << "  类别：" << p.category << "\n";
    std::cout << "  简介：" << p.intro << "\n";
    std::cout << "  位置：示意图坐标 (" << p.mapX << ", " << p.mapY << ")\n";

    auto edges = graph.neighbors(v);
    std::sort(edges.begin(), edges.end(), [&](int a, int b) {
        return graph.weight(v, a) < graph.weight(v, b);
    });
    std::cout << "  相邻：";
    if (edges.empty()) {
        std::cout << "无\n";
        return;
    }
    for (size_t i = 0; i < edges.size(); ++i) {
        if (i != 0) std::cout << "、";
        std::cout << graph.place(edges[i]).name << " " << meters(graph.weight(v, edges[i]));
    }
    std::cout << "\n";
}

void printPathChain(const CampusGraph& graph, const std::vector<int>& path) {
    if (path.empty()) {
        std::cout << "  （无可达路径）\n";
        return;
    }
    std::string line = "  ";
    for (size_t i = 0; i < path.size(); ++i) {
        const std::string token = (i == 0 ? "" : " → ") + graph.place(path[i]).name;
        if (i > 0 && textWidth(line) + textWidth(token) > 78) {
            std::cout << line << "\n";
            line = "    " + graph.place(path[i]).name;
        } else {
            line += token;
        }
    }
    std::cout << line << "\n";
}

void printVisitOrder(const CampusGraph& graph, const std::string& label,
                     const std::vector<int>& order) {
    std::cout << "  " << label << "：\n";
    std::string line = "    ";
    for (size_t i = 0; i < order.size(); ++i) {
        const std::string token = (i == 0 ? "" : " → ") + graph.place(order[i]).name;
        if (i > 0 && textWidth(line) + textWidth(token) > 78) {
            std::cout << line << "\n";
            line = "    " + graph.place(order[i]).name;
        } else {
            line += token;
        }
    }
    std::cout << line << "\n";
}

void printShortestPath(const CampusGraph& graph, int from, int to,
                       const ShortestPath& result) {
    section("最短路径结果");
    if (!result.found()) {
        error(graph.place(from).name + " 与 " + graph.place(to).name + " 之间不连通");
        return;
    }
    std::cout << "  " << paint(Color::Bold, graph.place(from).name) << " → "
              << paint(Color::Bold, graph.place(to).name) << "\n";
    printPathChain(graph, result.path);
    std::cout << "\n  分段里程：\n";
    for (size_t i = 0; i + 1 < result.path.size(); ++i) {
        std::cout << "    " << graph.place(result.path[i]).name << " → "
                  << graph.place(result.path[i + 1]).name << "  "
                  << meters(graph.weight(result.path[i], result.path[i + 1])) << "\n";
    }
    success("总路程 " + meters(result.distance) + "，步行约 " + minutes(result.distance));
}

void printTourPlan(const CampusGraph& graph, const TourPlan& plan) {
    section("推荐游览顺序");
    if (plan.order.empty()) {
        warning("没有选择途经点");
        return;
    }
    std::cout << "  起点：" << paint(Color::Bold, graph.place(plan.start).name) << "\n";
    std::cout << "  顺序：";
    for (size_t i = 0; i < plan.order.size(); ++i) {
        if (i != 0) std::cout << " → ";
        std::cout << graph.place(plan.order[i]).name;
    }
    std::cout << "\n";

    std::cout << "\n  行程明细：\n";
    for (size_t i = 0; i < plan.legs.size(); ++i) {
        const RouteLeg& leg = plan.legs[i];
        std::cout << "  " << i + 1 << ". " << graph.place(leg.from).name << " → "
                  << graph.place(leg.to).name << "  " << meters(leg.distance) << "\n";
        if (leg.path.size() > 2) {
            std::cout << "     途经：";
            for (size_t j = 1; j + 1 < leg.path.size(); ++j) {
                if (j != 1) std::cout << "、";
                std::cout << graph.place(leg.path[j]).name;
            }
            std::cout << "\n";
        }
    }
    success("总路程 " + meters(plan.totalDistance) + "，步行约 " +
            minutes(plan.totalDistance));
}

void printHamiltonResult(const CampusGraph& graph, const HamiltonianResult& result) {
    section("全景环游结果");
    if (!result.found) {
        if (result.hitLimit) {
            warning("搜索达到状态上限，未能在限定时间内判定");
        } else {
            error("不存在经过所有地点并返回起点的简单回路");
        }
        std::cout << "  搜索状态数：" << result.states << "\n";
        return;
    }
    std::cout << "  路线（不重复经过每个地点，最后回到入口）：\n";
    printPathChain(graph, result.cycle);
    std::cout << "\n";
    success("环游总路程 " + meters(result.totalDistance) + "，步行约 " +
            minutes(result.totalDistance));
    std::cout << "  覆盖地点：" << graph.size() << " 个；搜索状态数：" << result.states << "\n";
}

}  // namespace campus::ui
