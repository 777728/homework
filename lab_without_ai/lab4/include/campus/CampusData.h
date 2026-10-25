#pragma once

#include <vector>

#include "campus/CampusGraph.h"

namespace campus {

// 构建呈贡校区示意图的简化带权图（距离单位：米）
CampusGraph buildCampusGraph();

// 校门、经典打卡点（返回顶点下标）
std::vector<int> gateIndices(const CampusGraph& graph);
std::vector<int> classicStops(const CampusGraph& graph);

}  // namespace campus
