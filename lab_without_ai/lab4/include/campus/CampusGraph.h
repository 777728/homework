#pragma once

#include <string>
#include <vector>

namespace campus {

inline constexpr int kInf = 1'000'000'000;

// 顶点：校园地点
struct Place {
    std::string name;
    std::string category;
    std::string intro;
    bool isGate = false;
    int mapX = 0;  // 示意图上的相对坐标（0~100）
    int mapY = 0;
};

// 带权无向图，邻接矩阵存储
class CampusGraph {
public:
    int addPlace(Place place);
    void addRoad(int a, int b, int meters);

    int size() const noexcept { return static_cast<int>(places_.size()); }
    int edgeCount() const noexcept { return edgeCount_; }
    const Place& place(int v) const;
    const std::vector<std::vector<int>>& adjacency() const noexcept { return adj_; }

    int weight(int a, int b) const noexcept { return adj_[a][b]; }
    bool adjacent(int a, int b) const noexcept { return adj_[a][b] < kInf; }
    std::vector<int> neighbors(int v) const;
    int indexOf(const std::string& name) const;
    bool connected() const;

private:
    void checkVertex(int v) const;

    std::vector<Place> places_;
    std::vector<std::vector<int>> adj_;
    int edgeCount_ = 0;
};

}  // namespace campus
