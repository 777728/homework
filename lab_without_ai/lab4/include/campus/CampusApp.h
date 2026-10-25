#pragma once

#include <optional>
#include <vector>

#include "campus/CampusGraph.h"

namespace campus {

class CampusApp {
public:
    explicit CampusApp(CampusGraph graph);

    void run();

private:
    void printMainMenu() const;
    void showOverview();
    void queryShortestPath();
    void recommendTour();
    void fullTour();
    void graphTraversal();
    void compareAlgorithms();
    void showHelp() const;

    std::optional<int> chooseGate();
    std::optional<int> choosePlace(const std::string& prompt);

    CampusGraph graph_;
    std::vector<int> gates_;
};

}  // namespace campus
