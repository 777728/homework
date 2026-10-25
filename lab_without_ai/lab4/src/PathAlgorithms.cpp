#include "campus/PathAlgorithms.h"

#include <algorithm>
#include <functional>
#include <numeric>
#include <queue>
#include <stdexcept>
#include <utility>

namespace campus {
namespace {

void checkVertex(const CampusGraph& graph, int v) {
    if (v < 0 || v >= graph.size()) {
        throw std::out_of_range("顶点下标越界: " + std::to_string(v));
    }
}

}  // namespace

std::vector<int> depthFirstTraversal(const CampusGraph& graph, int start) {
    checkVertex(graph, start);
    std::vector<int> order;
    std::vector<char> visited(graph.size(), 0);
    std::vector<int> stack{start};
    while (!stack.empty()) {
        const int u = stack.back();
        stack.pop_back();
        if (visited[u]) {
            continue;
        }
        visited[u] = 1;
        order.push_back(u);
        const auto next = graph.neighbors(u);
        for (auto it = next.rbegin(); it != next.rend(); ++it) {
            if (!visited[*it]) {
                stack.push_back(*it);
            }
        }
    }
    return order;
}

std::vector<int> breadthFirstTraversal(const CampusGraph& graph, int start) {
    checkVertex(graph, start);
    std::vector<int> order;
    std::vector<char> visited(graph.size(), 0);
    std::queue<int> q;
    visited[start] = 1;
    q.push(start);
    while (!q.empty()) {
        const int u = q.front();
        q.pop();
        order.push_back(u);
        for (int v : graph.neighbors(u)) {
            if (!visited[v]) {
                visited[v] = 1;
                q.push(v);
            }
        }
    }
    return order;
}

ShortestPath dijkstra(const CampusGraph& graph, int source, int target) {
    checkVertex(graph, source);
    checkVertex(graph, target);

    const int n = graph.size();
    std::vector<int> dist(n, kInf);
    std::vector<int> prev(n, -1);
    using Item = std::pair<int, int>;  // (距离, 顶点)
    std::priority_queue<Item, std::vector<Item>, std::greater<Item>> pq;

    dist[source] = 0;
    pq.push({0, source});
    while (!pq.empty()) {
        const auto [du, u] = pq.top();
        pq.pop();
        if (du != dist[u]) {
            continue;
        }
        if (u == target) {
            break;
        }
        for (int v = 0; v < n; ++v) {
            const int w = graph.weight(u, v);
            if (w >= kInf || dist[u] + w >= dist[v]) {
                continue;
            }
            dist[v] = dist[u] + w;
            prev[v] = u;
            pq.push({dist[v], v});
        }
    }

    ShortestPath result;
    if (dist[target] >= kInf) {
        return result;
    }
    result.distance = dist[target];
    for (int v = target; v != -1; v = prev[v]) {
        result.path.push_back(v);
        if (v == source) {
            break;
        }
    }
    std::reverse(result.path.begin(), result.path.end());
    return result;
}

AllPairsResult floydWarshall(const CampusGraph& graph) {
    const int n = graph.size();
    AllPairsResult result;
    result.distance = graph.adjacency();
    result.next.assign(n, std::vector<int>(n, -1));

    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            if (i != j && result.distance[i][j] < kInf) {
                result.next[i][j] = j;
            }
        }
    }

    for (int k = 0; k < n; ++k) {
        for (int i = 0; i < n; ++i) {
            if (result.distance[i][k] >= kInf) {
                continue;
            }
            for (int j = 0; j < n; ++j) {
                if (result.distance[k][j] >= kInf) {
                    continue;
                }
                const int through = result.distance[i][k] + result.distance[k][j];
                if (through < result.distance[i][j]) {
                    result.distance[i][j] = through;
                    result.next[i][j] = result.next[i][k];
                }
            }
        }
    }
    return result;
}

std::vector<int> reconstructPath(const AllPairsResult& all, int from, int to) {
    const int n = static_cast<int>(all.next.size());
    if (from < 0 || from >= n || to < 0 || to >= n) {
        return {};
    }
    if (from == to) {
        return {from};
    }
    if (all.next[from][to] < 0) {
        return {};
    }

    std::vector<int> path{from};
    int cur = from;
    while (cur != to && path.size() <= static_cast<size_t>(n)) {
        cur = all.next[cur][to];
        if (cur < 0) {
            return {};
        }
        path.push_back(cur);
    }
    return cur == to ? path : std::vector<int>{};
}

std::optional<TourPlan> planBestTour(const CampusGraph& graph, int start,
                                     const std::vector<int>& targets) {
    checkVertex(graph, start);
    if (targets.size() > kMaxTourStops) {
        throw std::invalid_argument("途经点过多，最多支持 12 个");
    }

    std::vector<char> seen(graph.size(), 0);
    seen[start] = 1;
    for (int v : targets) {
        checkVertex(graph, v);
        if (seen[v]) {
            throw std::invalid_argument("途经点不能重复，也不能与起点相同");
        }
        seen[v] = 1;
    }

    TourPlan plan;
    plan.start = start;
    if (targets.empty()) {
        return plan;
    }

    const AllPairsResult all = floydWarshall(graph);
    for (int v : targets) {
        if (all.distance[start][v] >= kInf) {
            return std::nullopt;
        }
    }

    const int k = static_cast<int>(targets.size());
    const int full = (1 << k) - 1;
    std::vector<std::vector<int>> dp(1 << k, std::vector<int>(k, kInf));
    std::vector<std::vector<int>> parent(1 << k, std::vector<int>(k, -1));

    for (int j = 0; j < k; ++j) {
        dp[1 << j][j] = all.distance[start][targets[j]];
    }

    // dp[mask][j]：从起点出发，访问 mask 集合且最后停在 j 的最短距离
    for (int mask = 1; mask <= full; ++mask) {
        for (int j = 0; j < k; ++j) {
            if ((mask & (1 << j)) == 0 || dp[mask][j] >= kInf) {
                continue;
            }
            for (int nxt = 0; nxt < k; ++nxt) {
                if (mask & (1 << nxt)) {
                    continue;
                }
                const int nextMask = mask | (1 << nxt);
                const int candidate = dp[mask][j] + all.distance[targets[j]][targets[nxt]];
                if (candidate < dp[nextMask][nxt]) {
                    dp[nextMask][nxt] = candidate;
                    parent[nextMask][nxt] = j;
                }
            }
        }
    }

    int bestLast = -1;
    for (int j = 0; j < k; ++j) {
        if (bestLast < 0 || dp[full][j] < dp[full][bestLast]) {
            bestLast = j;
        }
    }
    if (bestLast < 0 || dp[full][bestLast] >= kInf) {
        return std::nullopt;
    }

    std::vector<int> reversed;
    int mask = full;
    int cur = bestLast;
    while (cur >= 0) {
        reversed.push_back(targets[cur]);
        const int prev = parent[mask][cur];
        mask ^= (1 << cur);
        cur = prev;
    }
    std::reverse(reversed.begin(), reversed.end());
    plan.order = reversed;
    plan.totalDistance = dp[full][bestLast];

    int from = start;
    for (int to : plan.order) {
        RouteLeg leg;
        leg.from = from;
        leg.to = to;
        leg.distance = all.distance[from][to];
        leg.path = reconstructPath(all, from, to);
        if (leg.path.empty()) {
            return std::nullopt;
        }
        plan.legs.push_back(std::move(leg));
        from = to;
    }
    return plan;
}

HamiltonianResult findHamiltonianCycle(const CampusGraph& graph, int start,
                                       long long stateLimit) {
    checkVertex(graph, start);
    HamiltonianResult result;
    const int n = graph.size();
    if (n == 1) {
        result.found = true;
        result.cycle = {start, start};
        return result;
    }

    std::vector<int> path{start};
    std::vector<char> used(n, 0);
    used[start] = 1;

    // 剪枝：剩余点必须与当前点连通，且每个剩余点至少有两条可用边
    auto feasible = [&](int u) {
        int remaining = 0;
        bool canReturn = false;
        for (int v = 0; v < n; ++v) {
            if (!used[v]) {
                ++remaining;
                canReturn = canReturn || graph.adjacent(v, start);
            }
        }
        if (!canReturn) {
            return false;
        }

        std::vector<char> seen(n, 0);
        std::queue<int> q;
        q.push(u);
        seen[u] = 1;
        int reached = 0;
        while (!q.empty()) {
            const int x = q.front();
            q.pop();
            for (int v = 0; v < n; ++v) {
                if (!used[v] && !seen[v] && graph.adjacent(x, v)) {
                    seen[v] = 1;
                    ++reached;
                    q.push(v);
                }
            }
        }
        if (reached != remaining) {
            return false;
        }

        for (int v = 0; v < n; ++v) {
            if (used[v]) {
                continue;
            }
            int degree = (graph.adjacent(v, u) ? 1 : 0) + (graph.adjacent(v, start) ? 1 : 0);
            for (int w = 0; w < n; ++w) {
                if (w != v && !used[w] && graph.adjacent(v, w)) {
                    ++degree;
                }
            }
            if (degree < 2) {
                return false;
            }
        }
        return true;
    };

    std::function<bool(int)> dfs = [&](int u) {
        if (++result.states > stateLimit) {
            result.hitLimit = true;
            return false;
        }
        if (static_cast<int>(path.size()) == n) {
            return graph.adjacent(u, start);
        }
        if (!feasible(u)) {
            return false;
        }

        std::vector<int> candidates;
        for (int v = 0; v < n; ++v) {
            if (!used[v] && graph.adjacent(u, v)) {
                candidates.push_back(v);
            }
        }
        std::sort(candidates.begin(), candidates.end(), [&](int a, int b) {
            const auto degree = [&](int x) {
                int d = 0;
                for (int v = 0; v < n; ++v) {
                    d += (!used[v] && v != x && graph.adjacent(x, v)) ? 1 : 0;
                }
                return d;
            };
            const int da = degree(a);
            const int db = degree(b);
            return da != db ? da < db : a < b;
        });

        for (int v : candidates) {
            used[v] = 1;
            path.push_back(v);
            if (dfs(v)) {
                return true;
            }
            path.pop_back();
            used[v] = 0;
            if (result.hitLimit) {
                return false;
            }
        }
        return false;
    };

    if (dfs(start)) {
        result.found = true;
        result.cycle = path;
        result.cycle.push_back(start);
        for (size_t i = 0; i + 1 < result.cycle.size(); ++i) {
            result.totalDistance += graph.weight(result.cycle[i], result.cycle[i + 1]);
        }
    }
    return result;
}

}  // namespace campus
