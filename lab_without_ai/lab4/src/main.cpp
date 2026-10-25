#include <exception>
#include <iostream>

#include "campus/CampusApp.h"
#include "campus/CampusData.h"
#include "campus/ConsoleUI.h"

int main() {
    campus::ui::initialize();
    try {
        campus::CampusApp app(campus::buildCampusGraph());
        app.run();
    } catch (const std::exception& e) {
        std::cerr << "程序异常：" << e.what() << "\n";
        return 1;
    }
    return 0;
}
