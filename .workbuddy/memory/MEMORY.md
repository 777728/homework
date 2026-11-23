
## 可视化站点（2026-10-25 起）
- `LAB1/web/` 是算法可视化前端：`core.js`（Player/CodePanel/CanvasView/mountLab）+ `lab1..lab4.js` + `vendor/three.min.js`。
- 源码展示统一走 `web/src/labN/`（从 `lab_without_ai` 原样拷贝），标注在 `js/annotations.js`（core/helper/data + 行号区间）。
- `webui.c` 已改为 `web/` 静态托管 + 保留 `POST /api`；启动 `./build.sh web`，端口 8765（`PORT=` 可改）。
- 动画是源码语句顺序的逐步重放，步骤 = `{file, line, desc, state, hold}`，必须与真实行号对齐。

## 实验四 3D（2026-11-23 起）
- `campus-data.js` 的 22 点仍是 CampusData.cpp 的图，但坐标是真实米制（x 东、z 南）；`landmarks`/`blocks`/`ring` 只用于造景，不参与算法。
- `lab4-scene.js` 是 1:1 米制场景；改屋顶几何要补底面并检查法线，否则被 outline 的 BackSide 壳盖黑。
- 远处用雾 + 外圈山脊 + 林带藏地形边缘；树用 InstancedMesh，种树要避开路面（_roadPts/_ringPts）。
