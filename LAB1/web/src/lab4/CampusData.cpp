#include "campus/CampusData.h"

#include <stdexcept>

namespace campus {

CampusGraph buildCampusGraph() {
    CampusGraph g;

    // 顶点数据来自示意图；mapX/mapY 为 0~100 的相对位置，仅用于说明。
    g.addPlace({"北门", "校门", "校区北侧主入口，邻近校车乘车点，正对明远楼。", true, 50, 3});
    g.addPlace({"西门", "校门", "西侧入口，靠近体育场与力行楼，适合步行入校。", true, 8, 48});
    g.addPlace({"南一门", "校门", "南侧生活区入口，靠近楠苑与余味堂。", true, 28, 92});
    g.addPlace({"南二门", "校门", "南侧次入口，连接校医院与文典广场。", true, 55, 96});
    g.addPlace({"东门", "校门", "东侧入口，靠近梓苑与文汇楼。", true, 93, 55});
    g.addPlace({"明远楼", "行政楼", "学校行政中枢，位于北门中轴线上，办理事务常到此。", false, 50, 16});
    g.addPlace({"仰止楼（图书馆）", "图书馆", "主图书馆，提供借阅、自习与研讨空间。", false, 54, 35});
    g.addPlace({"格物楼", "教学楼", "理科教学实验楼群，物理、化学等课程集中。", false, 45, 30});
    g.addPlace({"力行楼", "教学楼", "工科教学与实验楼，靠近西门。", false, 25, 33});
    g.addPlace({"文汇楼", "教学楼", "人文社科教学楼，位于东侧教学区。", false, 72, 43});
    g.addPlace({"文渊楼", "教学楼", "公共基础课教学楼，邻近东陆广场。", false, 61, 49});
    g.addPlace({"知味堂", "食堂", "学生食堂，位于中部生活区，用餐高峰期较拥挤。", false, 39, 55});
    g.addPlace({"余味堂", "食堂", "风味餐厅，靠近楠苑宿舍区。", false, 29, 72});
    g.addPlace({"东陆广场", "广场", "校园中心广场，社团活动与合影的热门地点。", false, 52, 61});
    g.addPlace({"文典广场", "广场", "东部景观广场，连接文汇楼与东门。", false, 76, 62});
    g.addPlace({"桦苑", "宿舍", "北侧学生公寓组团。", false, 37, 14});
    g.addPlace({"梓苑", "宿舍", "东北学生公寓组团，靠近东门。", false, 82, 27});
    g.addPlace({"楠苑", "宿舍", "南侧学生公寓组团，靠近南一门。", false, 25, 82});
    g.addPlace({"校医院", "服务", "提供基础诊疗与急救服务。", false, 70, 82});
    g.addPlace({"体育场", "运动场", "田径场、篮球场等，校运会举办地。", false, 13, 70});
    g.addPlace({"学生事务中心", "服务", "一站式学生服务大厅，靠近明远楼。", false, 57, 22});
    g.addPlace({"校车乘车点", "乘车点", "校车与公交接驳点，位于北门内侧。", false, 43, 7});

    // 道路长度按示意图比例尺估算，单位：米（非精确测绘）。
    auto road = [&g](const char* a, const char* b, int meters) {
        const int u = g.indexOf(a);
        const int v = g.indexOf(b);
        if (u < 0 || v < 0) {
            throw std::logic_error("道路端点不存在");
        }
        g.addRoad(u, v, meters);
    };

    // 北侧与中轴
    road("北门", "明远楼", 350);
    road("北门", "校车乘车点", 180);
    road("北门", "桦苑", 750);
    road("明远楼", "学生事务中心", 250);
    road("明远楼", "仰止楼（图书馆）", 550);
    road("明远楼", "格物楼", 450);
    road("明远楼", "桦苑", 600);
    road("校车乘车点", "明远楼", 300);
    road("校车乘车点", "桦苑", 400);
    road("校车乘车点", "梓苑", 900);
    road("桦苑", "格物楼", 350);
    road("桦苑", "梓苑", 900);

    // 西部教学区
    road("西门", "力行楼", 420);
    road("西门", "体育场", 620);
    road("力行楼", "格物楼", 450);
    road("力行楼", "知味堂", 450);
    road("体育场", "力行楼", 700);
    road("体育场", "南一门", 400);

    // 中部教学与生活区
    road("仰止楼（图书馆）", "格物楼", 350);
    road("仰止楼（图书馆）", "学生事务中心", 350);
    road("仰止楼（图书馆）", "文渊楼", 450);
    road("仰止楼（图书馆）", "东陆广场", 500);
    road("仰止楼（图书馆）", "文汇楼", 600);
    road("格物楼", "文汇楼", 500);
    road("知味堂", "余味堂", 450);
    road("知味堂", "东陆广场", 350);
    road("余味堂", "楠苑", 350);
    road("余味堂", "南一门", 500);
    road("余味堂", "东陆广场", 450);

    // 东部教学区
    road("文汇楼", "文渊楼", 300);
    road("文汇楼", "文典广场", 400);
    road("文汇楼", "梓苑", 500);
    road("文渊楼", "东陆广场", 350);
    road("文渊楼", "文典广场", 400);
    road("东陆广场", "文典广场", 500);
    road("文典广场", "东门", 450);
    road("文典广场", "南二门", 650);

    // 南部与校门
    road("南一门", "楠苑", 420);
    road("南一门", "南二门", 700);
    road("南一门", "东陆广场", 750);
    road("楠苑", "南二门", 700);
    road("楠苑", "校医院", 700);
    road("南二门", "校医院", 450);
    road("校医院", "东门", 550);
    road("东门", "梓苑", 500);
    road("东门", "南二门", 700);

    // 东门—北门的外环路

    return g;
}

std::vector<int> gateIndices(const CampusGraph& graph) {
    std::vector<int> result;
    for (int i = 0; i < graph.size(); ++i) {
        if (graph.place(i).isGate) {
            result.push_back(i);
        }
    }
    return result;
}

std::vector<int> classicStops(const CampusGraph& graph) {
    const char* names[] = {"明远楼", "仰止楼（图书馆）", "东陆广场", "文典广场", "体育场", "知味堂"};
    std::vector<int> result;
    for (const char* name : names) {
        const int v = graph.indexOf(name);
        if (v < 0) {
            throw std::logic_error("经典路线地点缺失");
        }
        result.push_back(v);
    }
    return result;
}

}  // namespace campus
