#include "campus/CampusApp.h"

#include <algorithm>
#include <chrono>
#include <iomanip>
#include <iostream>
#include <stdexcept>

#include "campus/CampusData.h"
#include "campus/ConsoleUI.h"
#include "campus/PathAlgorithms.h"

namespace campus {

CampusApp::CampusApp(CampusGraph graph)
    : graph_(std::move(graph)), gates_(gateIndices(graph_)) {}

void CampusApp::run() {
    while (true) {
        ui::clearScreen();
        ui::banner();
        printMainMenu();

        const auto choice = ui::readInt("请输入 [0-7]：", 0, 7);
        if (!choice) {
            std::cout << "\n  已退出，欢迎再次使用。\n";
            return;
        }
        if (*choice == 0) {
            std::cout << "\n  已退出，欢迎再次使用。\n";
            return;
        }

        switch (*choice) {
            case 1: showOverview(); break;
            case 2: queryShortestPath(); break;
            case 3: recommendTour(); break;
            case 4: fullTour(); break;
            case 5: graphTraversal(); break;
            case 6: compareAlgorithms(); break;
            case 7: showHelp(); break;
            default: break;
        }
        ui::pause();
    }
}

void CampusApp::printMainMenu() const {
    std::cout << "\n  " << ui::paint(ui::Color::Bold, "主菜单") << "\n";
    std::cout << "  " << std::string(54, '-') << "\n";
    std::cout << "  1. 校园概览 / 建筑信息查询\n";
    std::cout << "  2. 最短路径查询（Dijkstra）\n";
    std::cout << "  3. 最佳游览路线（多景点智能排序）\n";
    std::cout << "  4. 校园全景环游（不重复、回入口）\n";
    std::cout << "  5. 图的遍历（DFS / BFS）\n";
    std::cout << "  6. 算法效率对比（Dijkstra / Floyd）\n";
    std::cout << "  7. 使用帮助与说明\n";
    std::cout << "  0. 退出系统\n";
    std::cout << "  " << std::string(54, '-') << "\n";
    ui::hint("提示：输入 q 可取消当前操作；距离为示意图估算值。");
}

void CampusApp::showOverview() {
    ui::clearScreen();
    ui::banner();
    ui::section("校园概览");

    int gates = 0;
    for (int v = 0; v < graph_.size(); ++v) {
        gates += graph_.place(v).isGate ? 1 : 0;
    }
    std::cout << "  地点 " << graph_.size() << " 个（含 " << gates << " 个出入口）"
              << "，道路 " << graph_.edgeCount() << " 条，"
              << (graph_.connected() ? "全图连通" : "存在不连通区域") << "。\n";
    std::cout << "  距离单位：米；步行时间按约 75 米/分钟估算。\n\n";
    ui::printPlaceTable(graph_);

    const auto id = ui::readInt("输入编号查看建筑详情（0 返回）：", 0, graph_.size());
    if (!id || *id == 0) {
        return;
    }
    ui::printPlaceDetail(graph_, *id - 1);
}

void CampusApp::queryShortestPath() {
    ui::clearScreen();
    ui::banner();
    ui::section("最短路径查询");
    ui::printPlaceTable(graph_);
    ui::hint("输入建筑编号；起点和终点可以相同。");

    const auto from = ui::readInt("起点编号：", 1, graph_.size());
    if (!from) return;

    ui::clearScreen();
    ui::banner();
    ui::printPlaceTable(graph_);
    const auto to = ui::readInt("终点编号：", 1, graph_.size());
    if (!to) return;

    const ShortestPath result = dijkstra(graph_, *from - 1, *to - 1);
    ui::printShortestPath(graph_, *from - 1, *to - 1, result);
}

std::optional<int> CampusApp::chooseGate() {
    ui::printPlaceTable(graph_, true);
    while (true) {
        const auto id = ui::readInt("请选择入口编号（q 返回）：", 1, graph_.size());
        if (!id) return std::nullopt;
        if (graph_.place(*id - 1).isGate) {
            return *id - 1;
        }
        ui::error("该地点不是校门，请从标记为“入口”的地点中选择");
    }
}

void CampusApp::recommendTour() {
    ui::clearScreen();
    ui::banner();
    ui::section("最佳游览路线");
    ui::hint("先选入口，再选途经点；系统会用精确算法优化游览顺序。");
    const auto start = chooseGate();
    if (!start) return;

    ui::section("选择游览方式");
    std::cout << "  1. 经典打卡路线（明远楼、图书馆、东陆广场、文典广场、体育场、知味堂）\n";
    std::cout << "  2. 自定义途经点（最多 8 个）\n";
    std::cout << "  0. 返回主菜单\n";
    const auto mode = ui::readInt("请选择 [0-2]：", 0, 2);
    if (!mode || *mode == 0) return;

    std::vector<int> stops;
    if (*mode == 1) {
        stops = classicStops(graph_);
        std::cout << "\n  已选择 " << stops.size() << " 个经典地点。\n";
    } else {
        ui::printPlaceTable(graph_);
        const int maxStops = std::min(8, graph_.size() - 1);
        const auto count = ui::readInt("计划游览几个地点（1-" +
                                           std::to_string(maxStops) + "）：",
                                       1, maxStops);
        if (!count) return;

        while (static_cast<int>(stops.size()) < *count) {
            const auto id = ui::readInt("第 " + std::to_string(stops.size() + 1) +
                                            " 个途经点编号：",
                                        1, graph_.size());
            if (!id) return;
            const int v = *id - 1;
            if (v == *start) {
                ui::error("途经点不能与入口相同");
            } else if (std::find(stops.begin(), stops.end(), v) != stops.end()) {
                ui::error("该地点已经选过");
            } else {
                stops.push_back(v);
            }
        }
    }

    try {
        const auto plan = planBestTour(graph_, *start, stops);
        if (!plan) {
            ui::error("所选地点之间存在不可达路径，无法生成路线");
            return;
        }
        ui::printTourPlan(graph_, *plan);
        ui::hint("说明：终点自由；顺序由状态压缩 DP 精确求解，而非简单贪心。");
    } catch (const std::exception& e) {
        ui::error(std::string("路线规划失败：") + e.what());
    }
}

void CampusApp::fullTour() {
    ui::clearScreen();
    ui::banner();
    ui::section("校园全景环游");
    std::cout << "  目标：从入口出发，不重复地经过全部 " << graph_.size()
              << " 个地点，最后回到同一入口。\n";
    std::cout << "  说明：出口就在入口旁边，因此以返回同一校门表示闭环。\n";
    const auto start = chooseGate();
    if (!start) return;

    ui::section("搜索中");
    ui::hint("哈密尔顿回路属于 NP 完全问题；本程序使用回溯 + 连通性/度数剪枝。");
    std::cout << "  正在搜索..." << std::flush;

    const auto begin = std::chrono::steady_clock::now();
    const HamiltonianResult result = findHamiltonianCycle(graph_, *start);
    const auto end = std::chrono::steady_clock::now();
    const double elapsed =
        std::chrono::duration<double, std::milli>(end - begin).count();

    std::cout << "\r";
    ui::printHamiltonResult(graph_, result);
    std::cout << "  用时：" << std::fixed << std::setprecision(2) << elapsed << " ms\n";
}

void CampusApp::graphTraversal() {
    ui::clearScreen();
    ui::banner();
    ui::section("图的遍历");
    std::cout << "  选择起点后，分别给出深度优先（DFS）与广度优先（BFS）访问次序。\n\n";
    ui::printPlaceTable(graph_);

    const auto id = ui::readInt("遍历起点编号：", 1, graph_.size());
    if (!id) return;
    const int start = *id - 1;

    const auto dfs = depthFirstTraversal(graph_, start);
    const auto bfs = breadthFirstTraversal(graph_, start);

    ui::section("遍历结果");
    std::cout << "  起点：" << graph_.place(start).name << "\n";
    ui::printVisitOrder(graph_, "DFS（深度优先）", dfs);
    ui::printVisitOrder(graph_, "BFS（广度优先）", bfs);
    ui::hint("箭头仅表示访问先后；DFS 会回溯，并不代表实际步行路段。");
}

void CampusApp::compareAlgorithms() {
    ui::clearScreen();
    ui::banner();
    ui::section("Dijkstra 与 Floyd 对比");

    std::cout << "  当前图：V = " << graph_.size() << "，E = " << graph_.edgeCount() << "\n\n";
    std::cout << "  Dijkstra：单源最短路，适合“查询一个起点到其他点”。\n";
    std::cout << "    邻接矩阵 + 小根堆，时间复杂度 O(V^2 + E log V)。\n";
    std::cout << "  Floyd：全源最短路，适合“需要所有点对距离”。\n";
    std::cout << "    三重循环，时间复杂度 O(V^3)，实现简单。\n\n";

    constexpr int kRounds = 300;
    volatile long long sink = 0;
    const int source = 0;
    const int target = graph_.size() - 1;

    const auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < kRounds; ++i) {
        const ShortestPath one = dijkstra(graph_, source, target);
        sink += one.distance;
    }
    const auto t1 = std::chrono::steady_clock::now();
    for (int i = 0; i < kRounds; ++i) {
        const AllPairsResult all = floydWarshall(graph_);
        sink += all.distance[source][target];
    }
    const auto t2 = std::chrono::steady_clock::now();

    const double dijkstraUs =
        std::chrono::duration<double, std::micro>(t1 - t0).count() / kRounds;
    const double floydUs =
        std::chrono::duration<double, std::micro>(t2 - t1).count() / kRounds;

    std::cout << "  实测（" << kRounds << " 次平均，单位 μs）：\n";
    std::cout << "    Dijkstra 单点对查询： " << std::fixed << std::setprecision(2)
              << dijkstraUs << " μs\n";
    std::cout << "    Floyd 全源计算：      " << floydUs << " μs\n\n";
    std::cout << "  结论：单次查询优先用 Dijkstra；若之后要反复查询任意两点，\n";
    std::cout << "        先跑一次 Floyd 更划算。本程序“最短路径”菜单用 Dijkstra，\n";
    std::cout << "        “最佳游览路线”用 Floyd 预计算全源距离。\n";
    (void)sink;
}

void CampusApp::showHelp() const {
    ui::clearScreen();
    ui::banner();
    ui::section("使用帮助");

    std::cout << "  1. 所有编号均以表格中的编号为准；输入 q 取消当前操作。\n";
    std::cout << "  2. “校园概览”可查看建筑简介及相邻道路。\n";
    std::cout << "  3. “最短路径”可查询任意两个地点之间的最短路线和里程。\n";
    std::cout << "  4. “最佳游览路线”先选入口，再选经典或自定义途经点；\n";
    std::cout << "     系统用状态压缩 DP 求出精确的最短游览顺序。\n";
    std::cout << "  5. “全景环游”要求一次经过所有地点且不重复，最后回到入口；\n";
    std::cout << "     若不存在这样的简单回路，程序会明确提示。\n";
    std::cout << "  6. “图的遍历”展示从指定地点出发的 DFS/BFS 访问次序。\n\n";

    ui::section("图模型与数据");
    std::cout << "  · 无向带权图：顶点 = 建筑/校门，边 = 道路，权值 = 距离（米）。\n";
    std::cout << "  · 邻接矩阵存储；22 个地点、46 条道路，全图连通。\n";
    std::cout << "  · 距离依据示意图比例尺与道路走向估算，用于教学演示，非测绘数据。\n";
    std::cout << "  · 示意图见 assets/campus_map.jpg。\n\n";

    ui::section("算法说明");
    std::cout << "  · Dijkstra：非负权单源最短路；本程序用其回答两点最短路径。\n";
    std::cout << "  · Floyd：三重循环求全源最短路，并保存 next 矩阵以还原路径。\n";
    std::cout << "  · 状态压缩 DP：固定起点、访问给定途经点集合的最短顺序，\n";
    std::cout << "    复杂度 O(2^k · k^2)，k 为途经点个数。\n";
    std::cout << "  · 哈密尔顿回路：回溯搜索，辅以连通性和剩余点度数剪枝。\n\n";

    ui::section("思考题：Dijkstra 与 Floyd");
    std::cout << "  Dijkstra 适合单源/单点查询；邻接表堆优化为 O((V+E) log V)，\n";
    std::cout << "  本程序用邻接矩阵，扫描为 O(V^2)，故为 O(V^2 + E log V)。\n";
    std::cout << "  Floyd 适合全源查询，O(V^3) 且常数小、可处理负权（无负环）。\n";
    std::cout << "  本题 V 很小、又要为多景点排序预计算所有点对距离，\n";
    std::cout << "  因此单次查询用 Dijkstra，路线规划时用一次 Floyd 更合适。\n";
}

}  // namespace campus
