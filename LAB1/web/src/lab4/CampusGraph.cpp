#include "campus/CampusGraph.h"

#include <algorithm>
#include <queue>
#include <stdexcept>

namespace campus {

void CampusGraph::checkVertex(int v) const {
    if (v < 0 || v >= size()) {
        throw std::out_of_range("顶点下标越界: " + std::to_string(v));
    }
}

int CampusGraph::addPlace(Place place) {
    places_.push_back(std::move(place));
    const int n = size();
    adj_.assign(n, std::vector<int>(n, kInf));
    for (int i = 0; i < n; ++i) {
        adj_[i][i] = 0;
    }
    return n - 1;
}

void CampusGraph::addRoad(int a, int b, int meters) {
    checkVertex(a);
    checkVertex(b);
    if (a == b) {
        throw std::invalid_argument("不允许自环");
    }
    if (meters <= 0) {
        throw std::invalid_argument("道路长度必须为正数");
    }
    if (adj_[a][b] < kInf) {
        throw std::invalid_argument("重复添加道路");
    }
    adj_[a][b] = adj_[b][a] = meters;
    ++edgeCount_;
}

const Place& CampusGraph::place(int v) const {
    checkVertex(v);
    return places_[v];
}

std::vector<int> CampusGraph::neighbors(int v) const {
    checkVertex(v);
    std::vector<int> result;
    for (int i = 0; i < size(); ++i) {
        if (i != v && adj_[v][i] < kInf) {
            result.push_back(i);
        }
    }
    return result;
}

int CampusGraph::indexOf(const std::string& name) const {
    for (int i = 0; i < size(); ++i) {
        if (places_[i].name == name) {
            return i;
        }
    }
    return -1;
}

bool CampusGraph::connected() const {
    if (size() == 0) {
        return true;
    }
    std::vector<char> seen(size(), 0);
    std::queue<int> q;
    q.push(0);
    seen[0] = 1;
    int count = 0;
    while (!q.empty()) {
        const int u = q.front();
        q.pop();
        ++count;
        for (int v = 0; v < size(); ++v) {
            if (!seen[v] && adj_[u][v] < kInf) {
                seen[v] = 1;
                q.push(v);
            }
        }
    }
    return count == size();
}

}  // namespace campus
