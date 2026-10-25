#include <algorithm>
#include <iostream>
#include <numeric>
#include <stdexcept>
#include <vector>

#include "campus/CampusData.h"
#include "campus/PathAlgorithms.h"

using namespace campus;

namespace {

int g_checks = 0;

void check(bool condition, const char* message) {
    ++g_checks;
    if (!condition) {
        throw std::runtime_error(message);
    }
}

bool validPath(const CampusGraph& g, const std::vector<int>& path, int expectedDistance) {
    if (path.empty()) return false;
    int sum = 0;
    for (size_t i = 0; i + 1 < path.size(); ++i) {
        if (!g.adjacent(path[i], path[i + 1])) return false;
        sum += g.weight(path[i], path[i + 1]);
    }
    return sum == expectedDistance;
}

void testGraph() {
    const CampusGraph g = buildCampusGraph();
    check(g.size() == 22, "顶点数应为 22");
    check(g.edgeCount() == 46, "道路数应为 46");
    check(g.connected(), "校园图应连通");
    check(gateIndices(g).size() == 5, "应有 5 个校门");

    for (int i = 0; i < g.size(); ++i) {
        check(g.weight(i, i) == 0, "对角线应为 0");
        for (int j = 0; j < g.size(); ++j) {
            check(g.weight(i, j) == g.weight(j, i), "邻接矩阵应对称");
        }
    }
}

void testTraversal() {
    const CampusGraph g = buildCampusGraph();
    for (const auto& order : {depthFirstTraversal(g, 0), breadthFirstTraversal(g, 0)}) {
        check(static_cast<int>(order.size()) == g.size(), "遍历应覆盖全部顶点");
        check(order.front() == 0, "遍历应从指定起点开始");
        std::vector<char> seen(g.size(), 0);
        for (int v : order) {
            check(!seen[v], "遍历不应重复访问顶点");
            seen[v] = 1;
        }
    }
    check(depthFirstTraversal(g, 0) != breadthFirstTraversal(g, 0),
          "DFS 与 BFS 次序应不同");
}

void testDijkstra() {
    const CampusGraph g = buildCampusGraph();
    const ShortestPath p = dijkstra(g, g.indexOf("北门"), g.indexOf("仰止楼（图书馆）"));
    check(p.found(), "北门到图书馆应可达");
    check(p.distance == 900, "北门到图书馆最短距离应为 900 米");
    check(p.path.front() == g.indexOf("北门"), "路径起点错误");
    check(p.path.back() == g.indexOf("仰止楼（图书馆）"), "路径终点错误");
    check(validPath(g, p.path, p.distance), "Dijkstra 路径权值不合法");

    const ShortestPath same = dijkstra(g, 3, 3);
    check(same.found() && same.distance == 0 && same.path.size() == 1, "同点路径错误");
}

void testFloyd() {
    const CampusGraph g = buildCampusGraph();
    const AllPairsResult all = floydWarshall(g);
    for (int i = 0; i < g.size(); ++i) {
        for (int j = 0; j < g.size(); ++j) {
            const ShortestPath p = dijkstra(g, i, j);
            check(all.distance[i][j] == p.distance, "Floyd 与 Dijkstra 距离不一致");
            if (p.found()) {
                const auto path = reconstructPath(all, i, j);
                check(validPath(g, path, p.distance), "Floyd 还原路径不合法");
            }
        }
    }
}

void testBestTour() {
    const CampusGraph g = buildCampusGraph();
    const std::vector<int> stops = classicStops(g);
    const auto plan = planBestTour(g, g.indexOf("北门"), stops);
    check(plan.has_value(), "经典路线应可规划");
    check(plan->order.size() == stops.size(), "应访问全部途经点");
    check(plan->legs.size() == stops.size(), "每一程都应有路径");
    check(plan->order.front() != g.indexOf("北门"), "途经点不应包含起点");

    std::vector<int> sorted = plan->order;
    std::sort(sorted.begin(), sorted.end());
    std::vector<int> expected = stops;
    std::sort(expected.begin(), expected.end());
    check(sorted == expected, "途经点应恰好访问一次");

    int sum = 0;
    for (const RouteLeg& leg : plan->legs) {
        check(validPath(g, leg.path, leg.distance), "游览路线分段不合法");
        sum += leg.distance;
    }
    check(sum == plan->totalDistance, "游览总距离应等于各段之和");

    // 用全排列验证状态压缩 DP 的精确性
    std::vector<int> permutation = stops;
    std::sort(permutation.begin(), permutation.end());
    int best = kInf;
    do {
        int total = 0;
        int cur = g.indexOf("北门");
        for (int v : permutation) {
            total += dijkstra(g, cur, v).distance;
            cur = v;
        }
        best = std::min(best, total);
    } while (std::next_permutation(permutation.begin(), permutation.end()));
    check(best == plan->totalDistance, "游览顺序不是最优解");
}

void testHamilton() {
    const CampusGraph g = buildCampusGraph();
    for (int gate : gateIndices(g)) {
        const HamiltonianResult r = findHamiltonianCycle(g, gate);
        check(r.found, "每个校门都应存在哈密尔顿回路");
        check(static_cast<int>(r.cycle.size()) == g.size() + 1, "环游长度错误");
        check(r.cycle.front() == gate && r.cycle.back() == gate, "环游未回到入口");

        std::vector<char> seen(g.size(), 0);
        int sum = 0;
        for (size_t i = 0; i + 1 < r.cycle.size(); ++i) {
            check(g.adjacent(r.cycle[i], r.cycle[i + 1]), "环游经过不存在的道路");
            sum += g.weight(r.cycle[i], r.cycle[i + 1]);
            if (i < r.cycle.size() - 1) {
                check(!seen[r.cycle[i]], "环游重复经过地点");
                seen[r.cycle[i]] = 1;
            }
        }
        check(sum == r.totalDistance, "环游总距离错误");
        check(std::all_of(seen.begin(), seen.end(), [](char x) { return x != 0; }),
              "环游未覆盖全部地点");
    }
}

void testUnreachable() {
    CampusGraph g;
    g.addPlace({"A", "测试", "", false, 0, 0});
    g.addPlace({"B", "测试", "", false, 1, 1});
    check(!g.connected(), "孤立图不应连通");
    check(!dijkstra(g, 0, 1).found(), "不可达时应返回无路径");

    const auto all = floydWarshall(g);
    check(all.distance[0][1] == kInf, "Floyd 不可达距离应为 INF");
    check(reconstructPath(all, 0, 1).empty(), "不可达时不应还原路径");
    check(!planBestTour(g, 0, {1}).has_value(), "不可达时不应生成游览路线");
    check(!findHamiltonianCycle(g, 0).found, "两点无边图不应有哈密尔顿回路");
}

}  // namespace

int main() {
    try {
        testGraph();
        testTraversal();
        testDijkstra();
        testFloyd();
        testBestTour();
        testHamilton();
        testUnreachable();
    } catch (const std::exception& e) {
        std::cerr << "测试失败：" << e.what() << "\n";
        return 1;
    }
    std::cout << "全部测试通过（" << g_checks << " 项断言）\n";
    return 0;
}
