#pragma once

#include <optional>
#include <string>
#include <vector>

#include "campus/CampusGraph.h"
#include "campus/PathAlgorithms.h"

namespace campus::ui {

enum class Color { Red, Green, Yellow, Cyan, Magenta, Bold, Dim };

void initialize();
void clearScreen();
std::string paint(Color color, const std::string& text);
int textWidth(const std::string& text);
std::string fit(const std::string& text, int width);
std::string meters(int value);
std::string minutes(int distance);

void banner();
void section(const std::string& title);
void success(const std::string& message);
void warning(const std::string& message);
void error(const std::string& message);
void hint(const std::string& message);
void pause();

// 输入 q 或遇到 EOF 时返回 nullopt
std::optional<int> readInt(const std::string& prompt, int minValue, int maxValue);

void printPlaceTable(const CampusGraph& graph, bool onlyGates = false);
void printPlaceDetail(const CampusGraph& graph, int v);
void printPathChain(const CampusGraph& graph, const std::vector<int>& path);
void printVisitOrder(const CampusGraph& graph, const std::string& label,
                     const std::vector<int>& order);
void printShortestPath(const CampusGraph& graph, int from, int to,
                       const ShortestPath& result);
void printTourPlan(const CampusGraph& graph, const TourPlan& plan);
void printHamiltonResult(const CampusGraph& graph, const HamiltonianResult& result);

}  // namespace campus::ui
