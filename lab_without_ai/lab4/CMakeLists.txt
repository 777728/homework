cmake_minimum_required(VERSION 3.16)
project(CampusTour LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(campus_core
    src/CampusGraph.cpp
    src/CampusData.cpp
    src/PathAlgorithms.cpp
)
target_include_directories(campus_core PUBLIC include)

add_executable(campus_tour
    src/main.cpp
    src/CampusApp.cpp
    src/ConsoleUI.cpp
)
target_link_libraries(campus_tour PRIVATE campus_core)

if(MSVC)
    target_compile_options(campus_core PRIVATE /W4)
    target_compile_options(campus_tour PRIVATE /W4)
else()
    target_compile_options(campus_core PRIVATE -Wall -Wextra -Wpedantic)
    target_compile_options(campus_tour PRIVATE -Wall -Wextra -Wpedantic)
endif()

include(CTest)
if(BUILD_TESTING)
    add_executable(campus_tests tests/test_algorithms.cpp)
    target_link_libraries(campus_tests PRIVATE campus_core)
    if(MSVC)
        target_compile_options(campus_tests PRIVATE /W4)
    else()
        target_compile_options(campus_tests PRIVATE -Wall -Wextra -Wpedantic)
    endif()
    add_test(NAME campus_tests COMMAND campus_tests)
endif()
