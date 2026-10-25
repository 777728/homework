#pragma once

#include <optional>
#include <vector>

#include "campus/CampusGraph.h"

namespace campus {

inline constexpr int kMaxTourStops = 12;

struct ShortestPath {
    int distance = kInf;
    std::vector<int> path;

    bool found() const noexcept { return distance < kInf; }
};

// 图的遍历：返回顶点的访问次序
std::vector<int> depthFirstTraversal(const CampusGraph& graph, int start);
std::vector<int> breadthFirstTraversal(const CampusGraph& graph, int start);

// 单源最短路（Dijkstra + 小根堆）
ShortestPath dijkstra(const CampusGraph& graph, int source, int target);

struct AllPairsResult {
    std::vector<std::vector<int>> distance;
    std::vector<std::vector<int>> next;  // next[i][j]：i 到 j 路径上的下一个顶点
};

// 全源最短路（Floyd-Warshall），同时记录路径
AllPairsResult floydWarshall(const CampusGraph& graph);
std::vector<int> reconstructPath(const AllPairsResult& all, int from, int to);

struct RouteLeg {
    int from = -1;
    int to = -1;
    int distance = 0;
    std::vector<int> path;
};

struct TourPlan {
    int start = -1;
    std::vector<int> order;  // 途经点顺序（不含起点）
    std::vector<RouteLeg> legs;
    int totalDistance = 0;
};

// 精确求解“起点固定、途经给定点、终点自由”的最短顺序（状态压缩 DP）
std::optional<TourPlan> planBestTour(const CampusGraph& graph, int start,
                                     const std::vector<int>& targets);

struct HamiltonianResult {
    bool found = false;
    bool hitLimit = false;
    std::vector<int> cycle;  // 首尾均为起点
    int totalDistance = 0;
    long long states = 0;
};

// 从 start 出发，不重复地经过所有顶点并回到 start
HamiltonianResult findHamiltonianCycle(const CampusGraph& graph, int start,
                                       long long stateLimit = 5'000'000);

}  // namespace campus
