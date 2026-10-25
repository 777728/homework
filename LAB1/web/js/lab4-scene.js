/* ============================================================================
 *  lab4-scene.js —— 云南大学呈贡校区 3D 场景（three.js · 日本漫画风）
 *  ---------------------------------------------------------------------------
 *  还原依据（联网检索到的公开资料）：
 *    · 校区 4016 亩，北门—龙门道 285 级台阶—明远楼—图书馆构成礼仪轴/书香轴
 *    · 明远楼 27485.5 ㎡、地上五层，延续会泽院法式风格
 *    · 图书馆 58918 ㎡、高 23.55 m、扇形平面、古典对称，2014 年开馆
 *    · 泽湖湿地、云山（喀斯特，天文台）、钟楼与薰衣草田、百家大道、东陆碑廊
 *  图数据仍用 lab4 的 22 点 / 46 边，建筑位置按真实方位摆放。
 *  美术：MeshToonMaterial 三阶色 + 墨线描边 + 网点 + 樱花，漫画分镜感。
 * ==========================================================================*/

const CampusScene = (() => {
  const T = THREE;

  const C = {
    ink: 0x2b3242,
    grass: 0xa9cf8b,
    grassDark: 0x86b26f,
    rock: 0xb9b3a5,
    sand: 0xe8dcbd,
    water: 0x86c9dc,
    waterDeep: 0x5fa9c4,
    road: 0xf1e7d2,
    roadLine: 0xd9c9a5,
    cream: 0xf6e9cb,
    creamDark: 0xdfcba6,
    white: 0xfdfaf1,
    roofRed: 0xa84c44,
    roofBlue: 0x4f6f8c,
    glass: 0x9fd2e2,
    wood: 0xa9784f,
    pink: 0xe9a7bb,
    purple: 0x9a86c4,
    amber: 0xe0a53a,
    red: 0xd8453c,
    blue: 0x3f7fbf,
    green: 0x4b9668
  };

  /* ---------------- 三阶 toon 渐变 ---------------- */
  const gradient = (() => {
    const data = new Uint8Array([64, 142, 255]);
    const tex = new T.DataTexture(data, data.length, 1, T.RedFormat);
    tex.minFilter = T.NearestFilter;
    tex.magFilter = T.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  })();

  const toon = (color, opts = {}) => new T.MeshToonMaterial({
    color, gradientMap: gradient, ...opts
  });

  const inkLine = new T.LineBasicMaterial({
    color: C.ink, transparent: true, opacity: 0.5
  });

  const MAT = {
    cream: toon(C.cream),
    creamDark: toon(C.creamDark),
    white: toon(C.white),
    roofRed: toon(C.roofRed),
    roofBlue: toon(C.roofBlue),
    glass: toon(C.glass, { transparent: true, opacity: 0.85 }),
    wood: toon(C.wood),
    ink: toon(C.ink),
    pink: toon(C.pink),
    purple: toon(C.purple),
    stone: toon(0xe3dcc9),
    darkStone: toon(0xb8b0a0)
  };

  const CAT_COLOR = {
    '校门': C.red,
    '行政楼': 0xdfc27a,
    '图书馆': C.blue,
    '教学楼': 0x8fa8bd,
    '食堂': C.amber,
    '广场': C.green,
    '宿舍': C.pink,
    '服务': 0x8d7fc0,
    '运动场': 0x66a86f,
    '乘车点': 0x8a94a6
  };

  /* ---------------- 工具 ---------------- */
  const rand = (() => {
    let s = 20251019;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  })();

  function box(w, h, d, mat, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = false;
    return m;
  }

  function outline(mesh, opacity = 0.42) {
    const edges = new T.LineSegments(
      new T.EdgesGeometry(mesh.geometry, 24),
      new T.LineBasicMaterial({ color: C.ink, transparent: true, opacity })
    );
    mesh.add(edges);

    // 漫画式粗描边：反向渲染一个略大的壳，只留外轮廓
    const hull = new T.Mesh(
      mesh.geometry,
      new T.MeshBasicMaterial({ color: C.ink, side: T.BackSide })
    );
    hull.scale.setScalar(1.018);
    mesh.add(hull);
    return mesh;
  }

  function facadeTexture(base, win, cols = 4, rows = 4) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 128);

    const cw = 128 / cols, ch = 128 / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        g.fillStyle = win;
        g.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.26, cw * 0.5, ch * 0.38);
        g.strokeStyle = 'rgba(43,50,66,.35)';
        g.lineWidth = 1.2;
        g.strokeRect(i * cw + cw * 0.22, j * ch + ch * 0.26, cw * 0.5, ch * 0.38);
      }
    }

    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    return tex;
  }

  function patternedMat(base, win, repX, repY) {
    const tex = facadeTexture(base, win);
    tex.repeat.set(Math.max(1, Math.round(repX)), Math.max(1, Math.round(repY)));
    return toon(0xffffff, { map: tex });
  }

  /* 地形高程：中心平坦，东南云山隆起，泽湖下凹 */
  function terrainH(x, z) {
    const dHill = Math.hypot(x - 640, z - 610);
    const hill = 84 * Math.exp(-Math.pow(dHill / 250, 2));

    const dHill2 = Math.hypot(x + 720, z + 540);
    const hill2 = 26 * Math.exp(-Math.pow(dHill2 / 300, 2));

    const roll = 3.2 * Math.sin(x * 0.0042) * Math.cos(z * 0.0037)
               + 1.8 * Math.sin(z * 0.0061 + 1.1);

    const dLake = Math.hypot(x - 272, z + 600);
    const basin = -11 * Math.exp(-Math.pow(dLake / 135, 2));

    const flat = Math.min(1, Math.max(0, (Math.hypot(x * 0.9, z) - 360) / 260));
    return (hill + hill2 + roll) * flat + basin;
  }

  class CampusScene {
    constructor(host, labelsEl, opts = {}) {
      this.host = host;
      this.labelsEl = labelsEl;
      this.onPick = opts.onPick || (() => {});
      this.nodes = CAMPUS.nodes;
      this.edges = CAMPUS.edges;

      this.worldPos = new Map();     // id -> Vector3
      this.nodeState = new Map();    // id -> 'idle' | 'frontier' | 'settled' | 'current' | 'path'
      this.edgeState = new Map();    // 'a-b' -> 'active' | 'path' | 'relax'
      this.pads = new Map();
      this.markers = new Map();
      this.rings = new Map();
      this.labels = new Map();
      this.pickables = [];
      this.curves = new Map();
      this.highlightLines = new Map();

      this.autoRotate = true;
      this.dragging = false;
      this.moved = 0;
      this.sph = { theta: -0.62, phi: 1.16, radius: 620 };
      this.target = new T.Vector3(10, 18, -120);
      this.time = 0;

      this.initRenderer();
      this.initScene();
      this.buildTerrain();
      this.buildLake();
      this.buildRoads();
      this.buildCampus();
      this.buildScenery();
      this.buildTrees();
      this.buildSky();
      this.buildLabels();
      this.buildChrome();

      this.bindControls();
      this.resize();

      this.clock = new T.Clock();
      this.running = true;
      this.animate();
    }

    /* ---------------- 渲染器与场景 ---------------- */
    initRenderer() {
      this.renderer = new T.WebGLRenderer({
        antialias: true, alpha: false, powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.host.appendChild(this.renderer.domElement);

      this.camera = new T.PerspectiveCamera(46, 1, 1, 4200);

      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.host);
    }

    initScene() {
      const scene = new T.Scene();
      scene.background = new T.Color(0xdcecf6);
      scene.fog = new T.Fog(0xe8f1ec, 1100, 2400);
      this.scene = scene;

      scene.add(new T.HemisphereLight(0xeaf6ff, 0x93a878, 0.95));
      const dir = new T.DirectionalLight(0xfff3d6, 1.55);
      dir.position.set(-420, 620, 320);
      scene.add(dir);

      const fill = new T.DirectionalLight(0xcfe3ff, 0.45);
      fill.position.set(500, 320, -500);
      scene.add(fill);
    }

    /* ---------------- 地形 ---------------- */
    buildTerrain() {
      const geo = new T.PlaneGeometry(3200, 3000, 150, 140);
      geo.rotateX(-Math.PI / 2);

      const pos = geo.attributes.position;
      const colors = [];
      const cGrass = new T.Color(C.grass);
      const cDark = new T.Color(C.grassDark);
      const cRock = new T.Color(C.rock);
      const cSand = new T.Color(C.sand);

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = terrainH(x, z);
        pos.setY(i, y);

        const dLake = Math.hypot(x - 272, z + 600);
        let col = cGrass.clone().lerp(cDark, 0.35 + 0.35 * Math.sin(x * 0.01 + z * 0.013));
        if (y > 26) col = col.lerp(cRock, Math.min(1, (y - 26) / 46));
        if (dLake < 150) col = col.lerp(cSand, Math.max(0, 1 - Math.abs(dLake - 118) / 32));
        if (dLake < 104) col = col.lerp(new T.Color(0x5f8f9a), 0.85);
        colors.push(col.r, col.g, col.b);
      }

      geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      const mat = new T.MeshToonMaterial({ vertexColors: true, gradientMap: gradient });
      const mesh = new T.Mesh(geo, mat);
      this.scene.add(mesh);
      this.terrain = mesh;

      // 远山：两层剪影，挡住地形边缘，做出漫画的层叠景深
      const layer = (n, radius, color, hMin, hMax, scale) => {
        const geo = new T.ConeGeometry(150, 200, 5);
        const mat = toon(color);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rand() * 0.16;
          const r = radius + rand() * 140;
          const m = new T.Mesh(geo, mat);
          const hh = hMin + rand() * (hMax - hMin);
          m.scale.set(scale * (0.7 + rand() * 0.7), hh / 200, scale * (0.7 + rand() * 0.7));
          m.position.set(Math.cos(a) * r, -8, Math.sin(a) * r);
          this.scene.add(m);
        }
      };
      layer(22, 1180, 0x9fb9ad, 200, 340, 1.5);
      layer(18, 1420, 0xb6c9c6, 260, 420, 2.0);
    }

    /* ---------------- 泽湖 ---------------- */
    buildLake() {
      const cx = 272, cz = -600, R = 104;
      const shape = new T.Shape();
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const wob = 1 + 0.10 * Math.sin(a * 3 + 1.2) + 0.06 * Math.sin(a * 5 + 2.4);
        pts.push([cx + Math.cos(a) * R * wob, cz + Math.sin(a) * R * wob * 0.92]);
      }
      shape.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(p => shape.lineTo(p[0], p[1]));
      shape.closePath();

      const geo = new T.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const mat = toon(C.water, { transparent: true, opacity: 0.94, side: T.DoubleSide });
      const water = new T.Mesh(geo, mat);
      water.position.y = 0.9;
      this.scene.add(water);
      this.water = water;

      // 水面的漫画波纹
      this.ripples = [];
      for (let i = 0; i < 7; i++) {
        const g = new T.RingGeometry(6, 8.4, 28, 1);
        const m = new T.Mesh(g, new T.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.5, side: T.DoubleSide
        }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(cx + (rand() - 0.5) * 120, 2.2, cz + (rand() - 0.5) * 90);
        m.userData.phase = rand() * Math.PI * 2;
        this.scene.add(m);
        this.ripples.push(m);
      }

      // 芦苇
      const reedMat = toon(0x7f9d5f);
      for (let i = 0; i < 70; i++) {
        const a = rand() * Math.PI * 2;
        const r = R * (0.92 + rand() * 0.16);
        const h = 6 + rand() * 7;
        const reed = new T.Mesh(new T.CylinderGeometry(0.35, 0.5, h, 4), reedMat);
        reed.position.set(cx + Math.cos(a) * r, h / 2 + 1, cz + Math.sin(a) * r * 0.92);
        reed.rotation.z = (rand() - 0.5) * 0.4;
        this.scene.add(reed);
      }

      // 黑天鹅（两笔就能认出）
      const swanBody = toon(0x332f33);
      const swanBeak = toon(0xd8963f);
      for (let i = 0; i < 4; i++) {
        const g = new T.Group();
        const body = new T.Mesh(new T.SphereGeometry(2.6, 10, 8), swanBody);
        body.scale.set(1.5, 0.8, 1);
        const neck = new T.Mesh(new T.CylinderGeometry(0.5, 0.7, 5, 6), swanBody);
        neck.position.set(3, 2, 0);
        neck.rotation.z = -0.25;
        const head = new T.Mesh(new T.SphereGeometry(0.9, 8, 6), swanBody);
        head.position.set(3.7, 4.6, 0);
        const beak = new T.Mesh(new T.ConeGeometry(0.35, 1.2, 6), swanBeak);
        beak.position.set(4.4, 4.6, 0);
        beak.rotation.z = -Math.PI / 2;
        g.add(body, neck, head, beak);
        g.position.set(cx + (rand() - 0.5) * 120, 2.4, cz + (rand() - 0.5) * 80);
        g.rotation.y = rand() * Math.PI * 2;
        this.scene.add(g);
      }
    }

    /* ---------------- 道路（图的 46 条边） ---------------- */
    buildRoads() {
      const nodeWorld = (n) => new T.Vector3((n.x - 50) * 17, 2, (n.y - 50) * 15);

      this.nodes.forEach(n => this.worldPos.set(n.id, nodeWorld(n)));

      const ribbon = (pts, width) => {
        const vertices = [];
        const indices = [];
        const uvs = [];
        const n = pts.length;

        for (let i = 0; i < n; i++) {
          const p = pts[i];
          const q = pts[Math.min(n - 1, i + 1)];
          const r = pts[Math.max(0, i - 1)];
          const tx = q.x - r.x, tz = q.z - r.z;
          const len = Math.hypot(tx, tz) || 1;
          const nx = -tz / len * width / 2;
          const nz = tx / len * width / 2;
          vertices.push(p.x + nx, p.y, p.z + nz);
          vertices.push(p.x - nx, p.y, p.z - nz);
          uvs.push(0, i / n * 6, 1, i / n * 6);
        }
        for (let i = 0; i < n - 1; i++) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
        geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
      };

      const roadMat = toon(C.road, { side: T.DoubleSide });
      const lineMat = new T.LineDashedMaterial({
        color: 0xcdbb92, dashSize: 7, gapSize: 7, transparent: true, opacity: 0.9
      });

      this.edges.forEach((e, idx) => {
        const a = this.worldPos.get(e.a);
        const b = this.worldPos.get(e.b);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const dir = b.clone().sub(a);
        const perp = new T.Vector3(-dir.z, 0, dir.x).normalize();
        const bend = ((idx % 5) - 2) * 9;
        mid.add(perp.multiplyScalar(bend));

        const curve = new T.QuadraticBezierCurve3(
          a.clone(), mid.clone(), b.clone()
        );
        const pts = curve.getPoints(20);
        pts.forEach(p => { p.y = 2.1; });

        const key = `${e.a}-${e.b}`;
        this.curves.set(key, curve);

        const mesh = new T.Mesh(ribbon(pts, 11), roadMat);
        mesh.renderOrder = 1;
        this.scene.add(mesh);

        // 中线
        const lineGeo = new T.BufferGeometry().setFromPoints(
          curve.getPoints(24).map(p => new T.Vector3(p.x, 3.2, p.z))
        );
        const line = new T.Line(lineGeo, lineMat);
        line.computeLineDistances();
        this.scene.add(line);

        // 高亮线（默认隐藏）
        const hlMat = new T.MeshBasicMaterial({
          color: C.amber, transparent: true, opacity: 0
        });
        const hl = new T.Mesh(
          new T.TubeGeometry(curve, 24, 2.4, 5, false), hlMat
        );
        hl.position.y = 1.2;
        hl.renderOrder = 3;
        this.scene.add(hl);
        this.highlightLines.set(key, hl);
      });
    }

    /* ---------------- 建筑 ---------------- */
    buildCampus() {
      const at = (id) => this.worldPos.get(id);

      this.nodes.forEach(n => {
        const p = at(n.id);
        let g = null;
        switch (n.cat) {
          case '校门': g = this.gate(n); break;
          case '行政楼': g = this.adminBuilding(n); break;
          case '图书馆': g = this.library(n); break;
          case '教学楼': g = this.teaching(n); break;
          case '食堂': g = this.canteen(n); break;
          case '宿舍': g = this.dorm(n); break;
          case '广场': g = this.plaza(n); break;
          case '运动场': g = this.stadium(n); break;
          case '服务': g = n.name === '校医院' ? this.hospital(n) : this.service(n); break;
          default: g = new T.Group();
        }
        g.position.x = p.x;
        g.position.z = p.z;
        g.traverse(o => { if (o.isMesh) { o.userData.nodeId = n.id; this.pickables.push(o); } });
        this.scene.add(g);

        // 脚下圆形站台：算法里的“顶点”
        const pad = new T.Mesh(
          new T.CylinderGeometry(13, 14, 2.4, 24),
          toon(CAT_COLOR[n.cat] || 0x9aa3b5)
        );
        pad.position.set(p.x, 2.6, p.z);
        pad.userData.nodeId = n.id;
        this.scene.add(pad);
        this.pickables.push(pad);
        this.pads.set(n.id, pad);

        // 浮标：悬在建筑上方，避免被屋顶挡住
        const marker = new T.Mesh(
          new T.OctahedronGeometry(9, 0),
          new T.MeshBasicMaterial({ color: CAT_COLOR[n.cat] || 0x9aa3b5 })
        );
        marker.material.toneMapped = false;
        marker.position.set(p.x, 48, p.z);

        const beam = new T.Mesh(
          new T.CylinderGeometry(0.7, 0.7, 44, 4),
          new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 })
        );
        beam.position.set(p.x, 24, p.z);
        this.scene.add(beam);
        marker.userData.nodeId = n.id;
        this.scene.add(marker);
        this.pickables.push(marker);
        this.markers.set(n.id, marker);

        const ring = new T.Mesh(
          new T.TorusGeometry(11, 1.5, 8, 28),
          new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(p.x, 46, p.z);
        this.scene.add(ring);
        this.rings.set(n.id, ring);
      });
    }

    gate(n) {
      const g = new T.Group();
      const w = 46;
      const pillar = box(7, 26, 7, MAT.cream);
      const p1 = pillar.clone(); p1.position.set(-w / 2 + 3, 13, 0);
      const p2 = pillar.clone(); p2.position.set(w / 2 - 3, 13, 0);
      const beam = box(w, 5, 9, MAT.creamDark, 0, 27, 0);
      const cap = box(w + 8, 2, 13, MAT.roofRed, 0, 30.5, 0);
      const base1 = box(11, 3, 11, MAT.stone, -w / 2 + 3, 1.5, 0);
      const base2 = box(11, 3, 11, MAT.stone, w / 2 - 3, 1.5, 0);

      g.add(base1, base2, p1, p2, beam, cap);
      g.rotation.y = n.id === 0 ? 0 : n.id === 3 ? Math.PI : Math.PI / 2;
      [p1, p2, beam].forEach(m => outline(m));
      return g;
    }

    adminBuilding(n) {
      const g = new T.Group();
      const W = 168, D = 104, H = 31;

      const base = box(W + 28, 5, D + 24, MAT.stone, 0, 2.5, 0);
      outline(base);
      g.add(base);

      const bodyMat = patternedMat('#f8efdb', '#bcd8e6', 14, 3);
      const body = box(W, H, D, bodyMat, 0, 5 + H / 2, 0);
      outline(body, 0.5);
      g.add(body);

      // 层间线脚
      for (let f = 1; f < 5; f++) {
        g.add(box(W + 4, 1.2, D + 4, MAT.creamDark, 0, 5 + f * (H / 5), 0));
      }

      // 檐口 + 四坡屋顶（会泽院式的深色坡顶）
      const cornice = box(W + 12, 3, D + 12, toon(0x4d6b62), 0, 5 + H + 1.5, 0);
      outline(cornice);
      g.add(cornice);

      const hip = new T.Mesh(new T.ConeGeometry(104, 13, 4), toon(0x46625b));
      hip.rotation.y = Math.PI / 4;
      hip.scale.set(1, 1, 0.66);
      hip.position.y = 5 + H + 9;
      outline(hip, 0.5);
      g.add(hip);

      // 中央门廊：八根柱子 + 山花
      const colMat = MAT.white;
      for (let i = 0; i < 8; i++) {
        const col = new T.Mesh(new T.CylinderGeometry(2.2, 2.4, 19, 10), colMat);
        col.position.set(-31.5 + i * 9, 5 + 9.5, D / 2 + 7);
        outline(col, 0.35);
        g.add(col);
      }
      const ent = box(78, 4, 12, MAT.cream, 0, 5 + 19, D / 2 + 4);
      outline(ent);
      g.add(ent);

      // 三角形山花
      const shape = new T.Shape();
      shape.moveTo(-30, 0); shape.lineTo(30, 0); shape.lineTo(0, 12); shape.closePath();
      const ped = new T.Mesh(
        new T.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false }), MAT.cream
      );
      ped.position.set(0, 5 + 21, D / 2 + 1);
      outline(ped, 0.45);
      g.add(ped);
      // 山花上的圆窗
      const disc = new T.Mesh(new T.CircleGeometry(3.4, 16), toon(0x7fa9c4));
      disc.position.set(0, 5 + 25, D / 2 + 7.4);
      g.add(disc);

      // 大台阶
      for (let i = 0; i < 7; i++) {
        g.add(box(96 - i * 2, 1.6, 5, MAT.stone, 0, 5 - i * 1.6, D / 2 + 12 + i * 5));
      }

      // 屋顶细节与旗杆
      const mast = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 22, 6), MAT.darkStone);
      mast.position.set(0, 5 + H + 12, 0);
      g.add(mast);
      const flag = box(14, 8, 0.6, toon(0xd8453c), 7.4, 5 + H + 19, 0);
      g.add(flag);

      return g;
    }

    library(n) {
      const g = new T.Group();
      const R = 84;
      const start = Math.PI * 0.14;
      const end = Math.PI * 0.86;

      const makeSlab = (radius, h, y, mat) => {
        const s = new T.Shape();
        s.moveTo(0, 0);
        s.absarc(0, 0, radius, start, end, false);
        s.lineTo(0, 0);
        const geo = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 28 });
        geo.rotateX(-Math.PI / 2);
        const m = new T.Mesh(geo, mat);
        m.position.y = y;
        return m;
      };

      // 五层：石材与玻璃交替
      for (let f = 0; f < 5; f++) {
        const stone = f % 2 === 0;
        const slab = makeSlab(R - (stone ? 0 : 4), 4.2, f * 4.6, stone ? MAT.cream : MAT.glass);
        if (stone) outline(slab, 0.4);
        g.add(slab);
      }
      // 层间腰线：强化“五层扇形”的读图感
      for (let f = 1; f < 5; f++) {
        const band = makeSlab(R + 1.2, 0.7, f * 4.6 - 0.5, MAT.creamDark);
        g.add(band);
      }

      const roof = makeSlab(R + 3, 1.8, 23, MAT.creamDark);
      outline(roof, 0.5);
      g.add(roof);

      // 中庭玻璃圆筒
      const atrium = new T.Mesh(new T.CylinderGeometry(13, 13, 26, 20), MAT.glass);
      atrium.position.set(0, 13, -R * 0.45);
      g.add(atrium);

      // 正门雨棚（扇形平边朝南）
      const canopy = box(44, 1.6, 16, MAT.creamDark, 0, 14, 4);
      outline(canopy);
      g.add(canopy);
      for (let i = 0; i < 6; i++) {
        const col = new T.Mesh(new T.CylinderGeometry(1.3, 1.3, 14, 8), MAT.white);
        col.position.set(-18 + i * 7.2, 7, 8);
        g.add(col);
      }

      // 前方喷泉由 scenery 里的 fountain 负责
      return g;
    }

    teaching(n) {
      const g = new T.Group();
      const H = 22;
      const mat = patternedMat('#f7f2e4', '#b6d3e2', 5, 2);
      const matGlass = MAT.glass;

      const main = box(74, H, 30, mat, 0, H / 2, 0);
      outline(main);
      g.add(main);

      // 两翼 + 连廊，形成 U 形院落
      const wing1 = box(24, H - 3, 44, mat, -37, (H - 3) / 2, 10);
      const wing2 = box(24, H - 3, 44, mat, 37, (H - 3) / 2, 10);
      outline(wing1); outline(wing2);
      g.add(wing1, wing2);

      const midGlass = box(70, 12, 2, matGlass, 0, 6, 16);
      g.add(midGlass);

      g.add(box(80, 1.6, 36, MAT.creamDark, 0, H + 0.8, 2));
      g.add(box(26, 1.2, 30, MAT.creamDark, -37, H - 1, 12));
      g.add(box(26, 1.2, 30, MAT.creamDark, 37, H - 1, 12));

      // 入口门廊
      g.add(box(16, 6, 2, MAT.white, 0, 3, 16));
      g.rotation.y = (n.id % 3 - 1) * 0.12;
      return g;
    }

    canteen(n) {
      const g = new T.Group();
      const mat = patternedMat('#faf1dd', '#e8c9a0', 5, 1);
      const body = box(62, 16, 40, mat, 0, 8, 0);
      outline(body);
      g.add(body);

      // 平屋面 + 中央小坡顶 + 采光带
      const slab = box(66, 1.6, 44, MAT.creamDark, 0, 16.8, 0);
      outline(slab, 0.4);
      g.add(slab);

      const cap = new T.Mesh(new T.ConeGeometry(20, 6, 4), MAT.roofRed);
      cap.rotation.y = Math.PI / 4;
      cap.scale.set(1.2, 1, 0.8);
      cap.position.y = 20.4;
      outline(cap, 0.4);
      g.add(cap);

      const glass = box(58, 3, 1.4, MAT.glass, 0, 12, 20.6);
      g.add(glass);

      g.add(box(24, 1.4, 12, MAT.creamDark, 0, 14, 21));
      for (let i = 0; i < 4; i++) {
        const col = new T.Mesh(new T.CylinderGeometry(1, 1, 12, 8), MAT.white);
        col.position.set(-9 + i * 6, 6, 23);
        g.add(col);
      }
      g.rotation.y = n.id === 12 ? 0.5 : -0.3;
      return g;
    }

    dorm(n) {
      const g = new T.Group();
      const mat = patternedMat('#fbf3e6', '#d8b7c4', 6, 5);
      const colors = [0xf6dfd2, 0xf3e7d3, 0xefe0e6];
      for (let b = 0; b < 3; b++) {
        const blk = box(56, 30, 15, mat, 0, 15, b * 22 - 22);
        outline(blk);
        g.add(blk);
        g.add(box(58, 1.4, 17, toon(colors[b % 3]), 0, 30.6, b * 22 - 22));
        // 阳台横线
        for (let f = 1; f < 6; f++) {
          g.add(box(58, 0.8, 1.4, MAT.white, 0, f * 5, b * 22 - 22 + 8.2));
        }
      }
      g.rotation.y = 0.15;
      return g;
    }

    plaza(n) {
      const g = new T.Group();
      const ground = new T.Mesh(new T.CircleGeometry(46, 32), toon(0xe9e2cf));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0.6;
      g.add(ground);

      const ring = new T.Mesh(new T.RingGeometry(40, 45, 40), toon(0xd6cbb0));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.7;
      g.add(ring);

      // 中央雕塑
      const ped = box(10, 6, 10, MAT.stone, 0, 3, 0);
      outline(ped);
      g.add(ped);
      const statue = new T.Mesh(new T.ConeGeometry(4, 18, 7), MAT.creamDark);
      statue.position.y = 15;
      outline(statue, 0.4);
      g.add(statue);

      // 旗杆
      for (let i = 0; i < 3; i++) {
        const pole = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 24, 5), MAT.white);
        pole.position.set(-28 + i * 4, 12, -30);
        g.add(pole);
      }
      return g;
    }

    stadium(n) {
      const g = new T.Group();
      const track = new T.Mesh(new T.RingGeometry(30, 52, 48, 1), toon(0xc0785e));
      track.rotation.x = -Math.PI / 2;
      track.scale.set(1.5, 0.86, 1);
      track.position.y = 0.9;
      g.add(track);

      const field = new T.Mesh(new T.CircleGeometry(31, 40), toon(0x7fb86f));
      field.rotation.x = -Math.PI / 2;
      field.scale.set(1.5, 0.86, 1);
      field.position.y = 1.05;
      g.add(field);

      // 看台
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI * 0.85 + i * (Math.PI * 1.7 / 9);
        const stand = box(18, 8 + (i % 3) * 3, 7, MAT.stone,
          Math.cos(a) * 92, 4, Math.sin(a) * 56);
        stand.rotation.y = -a;
        outline(stand, 0.3);
        g.add(stand);
      }

      // 灯塔
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        const pole = new T.Mesh(new T.CylinderGeometry(0.8, 1, 40, 6), MAT.darkStone);
        pole.position.set(Math.cos(a) * 96, 20, Math.sin(a) * 60);
        g.add(pole);
        const lamp = box(8, 4, 2, toon(0xfff1c2), Math.cos(a) * 96, 41, Math.sin(a) * 60);
        g.add(lamp);
      }
      return g;
    }

    hospital(n) {
      const g = new T.Group();
      const mat = patternedMat('#fdfbf3', '#bcd8e6', 4, 3);
      const body = box(46, 20, 32, mat, 0, 10, 0);
      outline(body); g.add(body);
      g.add(box(48, 1.4, 34, MAT.creamDark, 0, 20.6, 0));

      const c1 = box(14, 4, 1.2, toon(0xd8453c), 0, 17, 16.5);
      const c2 = box(4, 14, 1.2, toon(0xd8453c), 0, 17, 16.5);
      g.add(c1, c2);
      return g;
    }

    service(n) {
      const g = new T.Group();
      const mat = patternedMat('#f7f4ea', '#a9cfe0', 4, 2);
      const body = box(44, 15, 30, mat, 0, 7.5, 0);
      outline(body); g.add(body);
      g.add(box(46, 1.4, 32, MAT.creamDark, 0, 15.6, 0));
      g.add(box(26, 1, 12, MAT.white, 0, 14, 16));
      return g;
    }

    /* ---------------- 景物（真实校区细节） ---------------- */
    buildScenery() {
      const W = (x, y) => new T.Vector3((x - 50) * 17, 0, (y - 50) * 15);

      CAMPUS.scenery.forEach(s => {
        if (s.type === 'lake' || s.type === 'hill') {
          // 湖面与山体由地形/水面负责，这里只补一个标签
          const p = W(s.x, s.y);
          const world = new T.Vector3(p.x, s.type === 'hill' ? terrainH(p.x, p.z) + 58 : 8, p.z);
          const item = this.addLabel(s.name, 'is-scenery', world, null);
          item.el.style.fontSize = '10px';
          item.el.style.opacity = '0.82';
          return;
        }
        const p = W(s.x, s.y);
        let g = null;

        switch (s.type) {
          case 'clock': g = this.clockTower(); p.y = terrainH(p.x, p.z); break;
          case 'hall': g = this.hall(); break;
          case 'observatory': g = this.observatory(); p.y = terrainH(p.x, p.z); break;
          case 'corridor': g = this.corridor(); break;
          case 'fountain': g = this.fountain(); break;
          case 'rose': g = this.roseGarden(); break;
          case 'lavender': g = this.lavender(); break;
          case 'avenue': g = this.avenue(); break;
          case 'steps': g = this.longmenSteps(); break;
          case 'garden': g = this.pavilion(); break;
          default: g = new T.Group();
        }

        if (g) {
          g.position.x = p.x;
          g.position.z = p.z;
          if (!g.position.y) g.position.y = terrainH(p.x, p.z);
          this.scene.add(g);
        }

        this.addSceneryLabel(s, p);
      });
    }
    clockTower() {
      const g = new T.Group();
      const pedestal = box(18, 4, 18, MAT.stone, 0, 2, 0);
      outline(pedestal); g.add(pedestal);

      const shaft = box(11, 34, 11, MAT.cream, 0, 4 + 17, 0);
      outline(shaft, 0.5); g.add(shaft);

      const belt = box(13, 2, 13, MAT.creamDark, 0, 38, 0);
      g.add(belt);

      // 四面钟
      const faceTex = (() => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        const c = cv.getContext('2d');
        c.fillStyle = '#fdfaf1'; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#2b3242'; c.lineWidth = 5; c.stroke();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2;
          c.beginPath();
          c.moveTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48);
          c.lineTo(64 + Math.cos(a) * 55, 64 + Math.sin(a) * 55);
          c.stroke();
        }
        c.lineWidth = 4;
        c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + 26, 64 - 12); c.stroke();
        c.beginPath(); c.moveTo(64, 64); c.lineTo(64 - 8, 64 - 34); c.stroke();
        return new T.CanvasTexture(cv);
      })();

      for (let i = 0; i < 4; i++) {
        const face = new T.Mesh(
          new T.CircleGeometry(5.2, 24),
          new T.MeshBasicMaterial({ map: faceTex })
        );
        const a = i * Math.PI / 2;
        face.position.set(Math.sin(a) * 5.6, 30, Math.cos(a) * 5.6);
        face.rotation.y = a;
        g.add(face);
      }

      // 方尖顶
      const roof = new T.Mesh(new T.ConeGeometry(10, 12, 4), MAT.roofRed);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 42;
      outline(roof, 0.5);
      g.add(roof);

      const spire = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 8, 5), MAT.darkStone);
      spire.position.y = 50;
      g.add(spire);
      return g;
    }

    hall() {
      const g = new T.Group();
      const base = box(86, 4, 62, MAT.stone, 0, 2, 0);
      outline(base); g.add(base);

      const body = box(78, 24, 54, patternedMat('#f8f2e2', '#b9d6e4', 6, 2), 0, 16, 0);
      outline(body); g.add(body);

      // 筒拱屋顶：圆柱横放，只露出上半
      const roof = new T.Mesh(
        new T.CylinderGeometry(30, 30, 82, 26, 1, false, 0, Math.PI),
        MAT.roofBlue
      );
      roof.rotation.z = Math.PI / 2;
      roof.position.y = 26;
      roof.scale.set(1, 1, 0.72);
      outline(roof, 0.45);
      g.add(roof);

      // 门廊
      for (let i = 0; i < 6; i++) {
        const col = new T.Mesh(new T.CylinderGeometry(1.6, 1.8, 18, 10), MAT.white);
        col.position.set(-20 + i * 8, 13, 29);
        g.add(col);
      }
      g.add(box(52, 2.4, 8, MAT.creamDark, 0, 23, 29));
      return g;
    }

    observatory() {
      const g = new T.Group();
      const base = new T.Mesh(new T.CylinderGeometry(16, 18, 12, 16), MAT.white);
      base.position.y = 6;
      outline(base, 0.4);
      g.add(base);

      const dome = new T.Mesh(
        new T.SphereGeometry(15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        toon(0xe8eef2)
      );
      dome.position.y = 12;
      outline(dome, 0.35);
      g.add(dome);

      const slit = box(4, 12, 6, toon(0x5b6a7c), 0, 20, -6);
      g.add(slit);
      return g;
    }

    corridor() {
      const g = new T.Group();
      const mat = MAT.wood;
      for (let i = 0; i < 9; i++) {
        const stele = box(6, 10, 1.6, toon(0xcfc7b6), -32 + i * 8, 5, 0);
        outline(stele, 0.3);
        g.add(stele);
      }
      for (let i = 0; i < 9; i++) {
        const col = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 12, 8), mat);
        col.position.set(-34 + i * 8, 6, -3);
        g.add(col);
      }
      const roof = box(76, 1.6, 9, MAT.roofRed, 0, 13, -1.5);
      outline(roof, 0.4);
      g.add(roof);
      return g;
    }

    fountain() {
      const g = new T.Group();
      const basin = new T.Mesh(new T.CylinderGeometry(22, 23, 4, 28), MAT.stone);
      basin.position.y = 2;
      outline(basin); g.add(basin);

      const water = new T.Mesh(new T.CircleGeometry(19, 28), toon(C.water, { transparent: true, opacity: 0.92 }));
      water.rotation.x = -Math.PI / 2;
      water.position.y = 4.2;
      g.add(water);

      const jet = new T.Mesh(new T.ConeGeometry(4, 18, 12, 1, true), new T.MeshBasicMaterial({
        color: 0xdff3fb, transparent: true, opacity: 0.65, side: T.DoubleSide
      }));
      jet.position.y = 12;
      g.add(jet);
      this.fountainJet = jet;
      return g;
    }

    roseGarden() {
      const g = new T.Group();
      const soil = new T.Mesh(new T.CircleGeometry(30, 24), toon(0x8f7d63));
      soil.rotation.x = -Math.PI / 2;
      soil.position.y = 0.5;
      g.add(soil);

      const geo = new T.SphereGeometry(1.5, 6, 5);
      const inst = new T.InstancedMesh(geo, toon(0xe07a8f), 160);
      const m = new T.Matrix4();
      for (let i = 0; i < 160; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 28;
        m.makeTranslation(Math.cos(a) * r, 2 + rand() * 2, Math.sin(a) * r);
        inst.setMatrixAt(i, m);
      }
      g.add(inst);
      return g;
    }

    lavender() {
      const g = new T.Group();
      const mat = toon(0x8f7cc0);
      for (let r = 0; r < 7; r++) {
        const row = box(64, 1.6, 3, mat, 0, 1.2, -24 + r * 8);
        g.add(row);
      }
      return g;
    }

    avenue() {
      const g = new T.Group();
      const road = box(300, 1, 26, toon(0xefe3c9), 0, 0.8, 0);
      g.add(road);
      for (let i = 0; i < 6; i++) {
        const ped = box(4, 5, 4, MAT.stone, -120 + i * 48, 3, 18);
        g.add(ped);
        const statue = new T.Mesh(new T.ConeGeometry(1.6, 7, 6), MAT.darkStone);
        statue.position.set(-120 + i * 48, 9, 18);
        g.add(statue);
      }
      return g;
    }

    longmenSteps() {
      const g = new T.Group();
      // 三段各 95 级，这里用 3 段 18 级示意，总长按 285 级标注
      const flights = 3, perFlight = 16;
      for (let f = 0; f < flights; f++) {
        for (let i = 0; i < perFlight; i++) {
          const step = box(30, 1, 2.6, i % 2 ? MAT.cream : MAT.stone,
            0, 0.5 + i * 0.55, -f * 26 + i * 2.7);
          g.add(step);
        }
        g.add(box(34, 1.6, 8, MAT.stone, 0, 9 + f * 0.2, -f * 26 + perFlight * 2.7));
      }
      return g;
    }

    pavilion() {
      const g = new T.Group();
      const base = new T.Mesh(new T.CylinderGeometry(14, 15, 2, 8), MAT.stone);
      base.position.y = 1;
      g.add(base);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        const col = new T.Mesh(new T.CylinderGeometry(1, 1, 12, 8), MAT.wood);
        col.position.set(Math.cos(a) * 9, 8, Math.sin(a) * 9);
        g.add(col);
      }
      const roof = new T.Mesh(new T.ConeGeometry(15, 8, 4), MAT.roofRed);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 17;
      outline(roof, 0.4);
      g.add(roof);
      return g;
    }

    /* ---------------- 树、云、樱花 ---------------- */
    buildTrees() {
      const trunkGeo = new T.CylinderGeometry(1.1, 1.4, 7, 5);
      const crownGeo = new T.IcosahedronGeometry(6, 0);
      const trunkMat = toon(0x8a6547);
      const crownMat = toon(0x74ad6c);
      const crownPink = toon(0xe9a9bd);

      const N = 460;
      const trunks = new T.InstancedMesh(trunkGeo, trunkMat, N);
      const greens = new T.InstancedMesh(crownGeo, crownMat, N);
      const pinks = new T.InstancedMesh(crownGeo, crownPink, 90);

      const m = new T.Matrix4();
      const q = new T.Quaternion();
      let gi = 0, pi = 0;

      for (let i = 0; i < N; i++) {
        let x, z, ok = false, tries = 0;
        while (!ok && tries++ < 40) {
          x = (rand() - 0.5) * 1500;
          z = (rand() - 0.5) * 1400;
          const dLake = Math.hypot(x - 272, z + 600);
          const nearBuilding = this.nodes.some(n => {
            const p = this.worldPos.get(n.id);
            return Math.hypot(x - p.x, z - p.z) < 52;
          });
          ok = dLake > 132 && !nearBuilding;
        }
        if (!ok) { x = 0; z = 0; }

        const y = terrainH(x, z);
        const s = 0.75 + rand() * 0.8;
        q.setFromAxisAngle(new T.Vector3(0, 1, 0), rand() * Math.PI * 2);

        m.compose(new T.Vector3(x, y + 3.5 * s, z), q, new T.Vector3(s, s, s));
        trunks.setMatrixAt(i, m);

        const isPink = pi < 90 && rand() < 0.16;
        const target = isPink ? pinks : greens;
        const idx = isPink ? pi++ : gi++;
        m.compose(
          new T.Vector3(x, y + 10 * s, z),
          q,
          new T.Vector3(s * (0.8 + rand() * 0.5), s * (0.9 + rand() * 0.4), s * (0.8 + rand() * 0.5))
        );
        target.setMatrixAt(idx, m);
      }

      trunks.instanceMatrix.needsUpdate = true;
      greens.count = gi;
      pinks.count = pi;
      this.scene.add(trunks, greens, pinks);

      // 樱花花瓣
      const petalCount = 220;
      const pGeo = new T.BufferGeometry();
      const pPos = new Float32Array(petalCount * 3);
      this.petalSpeed = new Float32Array(petalCount);
      for (let i = 0; i < petalCount; i++) {
        pPos[i * 3] = (rand() - 0.5) * 1300;
        pPos[i * 3 + 1] = 20 + rand() * 190;
        pPos[i * 3 + 2] = (rand() - 0.5) * 1200;
        this.petalSpeed[i] = 4 + rand() * 9;
      }
      pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3));

      const cvs = document.createElement('canvas');
      cvs.width = cvs.height = 16;
      const c2 = cvs.getContext('2d');
      c2.fillStyle = '#f6c3d2';
      c2.beginPath();
      c2.ellipse(8, 8, 5, 3, 0.5, 0, Math.PI * 2);
      c2.fill();
      const pTex = new T.CanvasTexture(cvs);

      this.petals = new T.Points(pGeo, new T.PointsMaterial({
        map: pTex, size: 7, transparent: true, opacity: 0.9, depthWrite: false
      }));
      this.scene.add(this.petals);
    }

    buildSky() {
      const geo = new T.SphereGeometry(2000, 24, 16);
      const mat = new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new T.Color(0x7fb9e6) },
          bottom: { value: new T.Color(0xfdf3dc) }
        },
        vertexShader: `
          varying float vY;
          void main() {
            vY = normalize(position).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 top; uniform vec3 bottom; varying float vY;
          void main() {
            float t = clamp(vY * 1.4 + 0.28, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottom, top, t), 1.0);
          }
        `
      });
      this.scene.add(new T.Mesh(geo, mat));

      // 漫画云：手绘感的圆团
      const cloudTex = (() => {
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 128;
        const c = cv.getContext('2d');
        c.fillStyle = '#ffffff';
        const blobs = [[64, 74, 44], [112, 58, 52], [166, 70, 40], [196, 82, 26], [44, 86, 26]];
        blobs.forEach(([x, y, r]) => {
          c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        });
        c.strokeStyle = 'rgba(90,105,130,.45)';
        c.lineWidth = 3;
        blobs.forEach(([x, y, r]) => {
          c.beginPath(); c.arc(x, y, r, Math.PI * 0.9, Math.PI * 2.05); c.stroke();
        });
        const tex = new T.CanvasTexture(cv);
        tex.colorSpace = T.SRGBColorSpace;
        return tex;
      })();

      // 漫画里的太阳：一圈光晕 + 实心圆
      const sunCv = document.createElement('canvas');
      sunCv.width = sunCv.height = 256;
      const sg = sunCv.getContext('2d');
      const grad = sg.createRadialGradient(128, 128, 20, 128, 128, 126);
      grad.addColorStop(0, 'rgba(255,246,214,1)');
      grad.addColorStop(0.42, 'rgba(255,226,150,.55)');
      grad.addColorStop(1, 'rgba(255,226,150,0)');
      sg.fillStyle = grad;
      sg.fillRect(0, 0, 256, 256);
      sg.fillStyle = '#fff6d6';
      sg.beginPath(); sg.arc(128, 128, 46, 0, Math.PI * 2); sg.fill();

      const sunTex = new T.CanvasTexture(sunCv);
      sunTex.colorSpace = T.SRGBColorSpace;
      const sun = new T.Sprite(new T.SpriteMaterial({
        map: sunTex, transparent: true, depthWrite: false, opacity: 0.95
      }));
      sun.scale.set(560, 560, 1);
      sun.position.set(-900, 620, -1100);
      this.scene.add(sun);

      this.clouds = [];
      for (let i = 0; i < 14; i++) {
        const sp = new T.Sprite(new T.SpriteMaterial({
          map: cloudTex, transparent: true, opacity: 0.9, depthWrite: false
        }));
        const a = rand() * Math.PI * 2;
        const r = 700 + rand() * 700;
        sp.position.set(Math.cos(a) * r, 240 + rand() * 190, Math.sin(a) * r);
        const s = 220 + rand() * 220;
        sp.scale.set(s, s * 0.5, 1);
        sp.userData.speed = 2 + rand() * 4;
        this.scene.add(sp);
        this.clouds.push(sp);
      }
    }

    /* ---------------- HTML 标签 ---------------- */
    addLabel(text, cls, world, nodeId = null) {
      const el = document.createElement('div');
      el.className = 'map-label ' + cls;
      el.textContent = text;
      this.labelsEl.appendChild(el);

      const item = { el, world: world.clone(), nodeId };
      this.labels.set(nodeId == null ? 's' + Math.random() : nodeId, item);

      if (nodeId != null) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onPick(nodeId);
        });
      }
      return item;
    }

    buildLabels() {
      this.nodes.forEach(n => {
        const p = this.worldPos.get(n.id);
        this.addLabel(n.short, n.gate ? 'is-gate' : '', new T.Vector3(p.x, 62, p.z), n.id);
      });
    }

    addSceneryLabel(s, p) {
      if (!s.name) return;
      const world = new T.Vector3(p.x, terrainH(p.x, p.z) + 34, p.z);
      const item = this.addLabel(s.name, 'is-scenery', world, null);
      item.el.style.fontSize = '10px';
      item.el.style.opacity = '0.78';
    }

    /* ---------------- 交互：自由拖拽 ---------------- */
    bindControls() {
      const el = this.renderer.domElement;
      el.style.touchAction = 'none';

      let mode = null, lastX = 0, lastY = 0;

      const rotate = (dx, dy) => {
        this.sph.theta -= dx * 0.005;
        this.sph.phi = Math.min(1.48, Math.max(0.12, this.sph.phi - dy * 0.004));
      };

      const pan = (dx, dy) => {
        const scale = this.sph.radius * 0.0016;
        const right = new T.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
        const up = new T.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
        this.target.addScaledVector(right, -dx * scale);
        this.target.addScaledVector(up, dy * scale);
      };

      el.addEventListener('pointerdown', (e) => {
        el.setPointerCapture(e.pointerId);
        mode = (e.button === 2 || e.shiftKey) ? 'pan' : 'rotate';
        lastX = e.clientX; lastY = e.clientY;
        this.lastPointer = { x: e.clientX, y: e.clientY };
        this.dragging = true;
        this.moved = 0;
        this.host.classList.add('is-dragging');
      });

      el.addEventListener('pointermove', (e) => {
        this.lastPointer = { x: e.clientX, y: e.clientY };
        if (!this.dragging) {
          this.hoverTest();
          return;
        }
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        this.moved += Math.abs(dx) + Math.abs(dy);
        if (mode === 'pan') pan(dx, dy);
        else rotate(dx, dy);
      });

      const end = () => {
        this.dragging = false;
        this.host.classList.remove('is-dragging');
        if (this.moved < 6) this.pick();
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('contextmenu', (e) => e.preventDefault());

      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.sph.radius = Math.min(1700, Math.max(170, this.sph.radius * Math.exp(e.deltaY * 0.0011)));
      }, { passive: false });

      // 触摸双指缩放
      let pinch = 0;
      el.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          pinch = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      });
      el.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && pinch) {
          const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          this.sph.radius = Math.min(1700, Math.max(170, this.sph.radius * (pinch / d)));
          pinch = d;
        }
      }, { passive: true });
    }

    pick() {
      const id = this.raycast();
      if (id != null) this.onPick(id);
    }

    /** 返回鼠标下的地点 id（没有则 null） */
    raycast() {
      if (!this.lastPointer) return null;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const nx = ((this.lastPointer.x - rect.left) / rect.width) * 2 - 1;
      const ny = -((this.lastPointer.y - rect.top) / rect.height) * 2 + 1;

      const ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2(nx, ny), this.camera);
      const hits = ray.intersectObjects(this.pickables, false);
      if (!hits.length) return null;
      const id = hits[0].object.userData.nodeId;
      return id == null ? null : id;
    }

    hoverTest() {
      if (!this.lastPointer) return;
      const id = this.raycast();
      if (id === this.hoverId) return;
      this.hoverId = id;
      this.renderer.domElement.style.cursor = id == null ? '' : 'pointer';
    }

    /* ---------------- 算法高亮接口 ---------------- */
    setNodeState(id, state) {
      this.nodeState.set(id, state);
      const pad = this.pads.get(id);
      const ring = this.rings.get(id);
      if (!pad) return;

      const color = {
        idle: CAT_COLOR[this.nodes[id].cat] || 0x9aa3b5,
        frontier: C.amber,
        settled: 0x6fb3d8,
        current: C.red,
        path: 0xffc94d
      }[state] || 0x9aa3b5;

      pad.material.color.setHex(color);
      const marker = this.markers.get(id);
      if (marker) {
        marker.material.color.setHex(color);
        marker.rotation.y += 0; // 保持朝向
        marker.scale.setScalar(state === 'current' ? 1.35 : 1);
      }
      if (ring) {
        ring.material.opacity = state === 'current' ? 0.9 : state === 'path' ? 0.55 : 0;
        ring.material.color.setHex(state === 'path' ? 0xffc94d : 0xffffff);
      }

      const label = this.labels.get(id);
      if (label) {
        label.el.classList.toggle('is-active', state === 'current' || state === 'path');
      }
    }

    resetNodes() {
      this.nodes.forEach(n => this.setNodeState(n.id, 'idle'));
      this.highlightLines.forEach(hl => { hl.material.opacity = 0; });
      this.edgeState.clear();
      this.setPath([]);
    }

    setEdgeState(a, b, state) {
      const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
      const hl = this.highlightLines.get(key);
      if (!hl) return;
      hl.material.opacity = state === 'active' ? 0.95 : state === 'relax' ? 0.35 : 0;
      hl.material.color.setHex(state === 'active' ? C.red : C.amber);
      this.edgeState.set(key, state);
    }

    clearEdges() {
      this.highlightLines.forEach(hl => { hl.material.opacity = 0; });
      this.edgeState.clear();
    }

    setPath(ids) {
      if (this.pathMesh) {
        this.scene.remove(this.pathMesh);
        this.pathMesh.geometry.dispose();
        this.pathMesh = null;
      }
      if (!ids || ids.length < 2) {
        if (this.bus) this.bus.visible = false;
        this.pathPoints = [];
        return;
      }

      const pts = [];
      for (let i = 0; i + 1 < ids.length; i++) {
        const a = ids[i], b = ids[i + 1];
        const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
        let curve = this.curves.get(key);
        if (!curve) curve = new T.LineCurve3(this.worldPos.get(a), this.worldPos.get(b));
        const seg = curve.getPoints(14);

        // 按“当前起点”决定是否反向，保证折线首尾相接
        const startPt = this.worldPos.get(a);
        if (seg[0].distanceTo(startPt) > seg[seg.length - 1].distanceTo(startPt)) seg.reverse();

        pts.push(...seg.map(p => new T.Vector3(p.x, 6, p.z)));
      }

      this.pathPoints = pts;
      const clean = pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 1);
      const curve = new T.CatmullRomCurve3(clean);
      this.pathCurve = curve;
      const geo = new T.TubeGeometry(curve, clean.length * 2, 2.6, 6, false);
      this.pathMesh = new T.Mesh(geo, new T.MeshBasicMaterial({
        color: 0xffb52e, transparent: true, opacity: 0.95
      }));
      this.pathMesh.renderOrder = 4;
      this.scene.add(this.pathMesh);

      if (!this.bus) {
        this.bus = new T.Group();
        const body = box(7, 4, 11, toon(0xffd24a));
        body.position.y = 3;
        const top = box(6, 2.4, 8, toon(0xfff6de));
        top.position.y = 6;
        this.bus.add(body, top);
        this.scene.add(this.bus);
      }
      this.bus.visible = true;
      this.busT = 0;
    }

    /* ---------------- 每帧更新 ---------------- */
    animate() {
      requestAnimationFrame(() => this.animate());
      const dt = Math.min(0.05, this.clock.getDelta());
      this.time += dt;

      if (!this.running) return;

      if (this.autoRotate && !this.dragging) this.sph.theta += dt * 0.045;

      const { theta, phi, radius } = this.sph;
      const x = this.target.x + radius * Math.sin(phi) * Math.sin(theta);
      const y = this.target.y + radius * Math.cos(phi);
      const z = this.target.z + radius * Math.sin(phi) * Math.cos(theta);
      this.camera.position.lerp(new T.Vector3(x, y, z), 0.18);
      this.camera.lookAt(this.target);

      // 水面波动与喷泉
      if (this.ripples) {
        this.ripples.forEach(r => {
          const t = (this.time * 0.35 + r.userData.phase) % 1;
          const s = 0.6 + t * 2.4;
          r.scale.set(s, s, s);
          r.material.opacity = 0.45 * (1 - t);
        });
      }
      if (this.fountainJet) {
        this.fountainJet.scale.y = 0.9 + Math.sin(this.time * 2.2) * 0.12;
      }

      // 云
      this.clouds.forEach(c => {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 1500) c.position.x = -1500;
      });

      // 樱花
      if (this.petals) {
        const pos = this.petals.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - this.petalSpeed[i] * dt;
          let x = pos.getX(i) + Math.sin(this.time + i) * dt * 4;
          if (y < 2) { y = 200; x = (rand() - 0.5) * 1300; }
          pos.setY(i, y);
          pos.setX(i, x);
        }
        pos.needsUpdate = true;
      }

      // 当前结点的脉冲
      this.rings.forEach((ring, id) => {
        if (this.nodeState.get(id) === 'current') {
          const s = 1 + Math.sin(this.time * 4) * 0.12;
          ring.scale.set(s, s, s);
        } else {
          ring.scale.set(1, 1, 1);
        }
      });

      // 路径上的校车
      if (this.bus && this.bus.visible && this.pathCurve) {
        this.busT = (this.busT + dt * 0.12) % 1;
        const p = this.pathCurve.getPointAt(this.busT);
        this.bus.position.set(p.x, 2, p.z);
        const tan = this.pathCurve.getTangentAt(this.busT);
        this.bus.rotation.y = Math.atan2(tan.x, tan.z);
      }

      this.updateLabels();
      this.renderer.render(this.scene, this.camera);
    }

    updateLabels() {
      const w = this.host.clientWidth;
      const h = this.host.clientHeight;
      const v = new T.Vector3();

      const items = [...this.labels.values()];
      const visible = [];

      items.forEach(item => {
        v.copy(item.world).project(this.camera);
        const onScreen = v.z < 1 && Math.abs(v.x) < 0.94 && Math.abs(v.y) < 0.96;
        if (!onScreen) {
          item.el.style.display = 'none';
          return;
        }

        item._sx = (v.x * 0.5 + 0.5) * w;
        item._sy = (-v.y * 0.5 + 0.5) * h;

        const id = item.nodeId;
        let prio = 40;
        if (id != null) {
          prio = 50;
          const st = this.nodeState.get(id);
          if (st === 'current') prio = 100;
          else if (st === 'path') prio = 90;
          else if (st === 'settled') prio = 70;
          else if (this.nodes[id].gate) prio = 62;
          else if (this.nodes[id].cat === '图书馆') prio = 66;
          else if (this.nodes[id].name === '明远楼') prio = 68;
        } else {
          prio = 20;
          if (this.sph.radius > 560) {
            item.el.style.display = 'none';
            return;
          }
        }
        item._prio = prio;
        visible.push(item);
      });

      visible.sort((a, b) => b._prio - a._prio);

      const placed = [];
      visible.forEach(item => {
        const wpx = item.el.offsetWidth || 58;
        const hpx = item.el.offsetHeight || 20;
        const box = {
          x1: item._sx - wpx / 2, x2: item._sx + wpx / 2,
          y1: item._sy - hpx, y2: item._sy
        };

        const hit = placed.some(p => !(box.x2 < p.x1 - 4 || box.x1 > p.x2 + 4 ||
                                       box.y2 < p.y1 - 2 || box.y1 > p.y2 + 2));
        if (hit && item._prio < 90) {
          item.el.style.display = 'none';
          return;
        }

        placed.push(box);
        item.el.style.display = '';
        item.el.style.left = item._sx + 'px';
        item.el.style.top = item._sy + 'px';

        const dist = this.camera.position.distanceTo(item.world);
        item.el.style.opacity = dist > 1500 ? '0.35' : '';
      });

      // 比例尺：按当前视距换算
      if (this.scaleEl) {
        const mpp = 2 * this.sph.radius * Math.tan((this.camera.fov * Math.PI / 180) / 2) / h;
        const meters = Math.round(120 * mpp / 10) * 10;
        this.scaleEl.textContent = `≈ ${meters} m`;
      }
    }

    /** 角落里的指北针与比例尺，让这张图“能当地图看” */
    buildChrome() {
      const chrome = document.createElement('div');
      chrome.className = 'map-chrome';
      chrome.innerHTML = `
        <div class="compass"><b>N</b><i></i></div>
        <div class="scalebar"><span></span><em>200 m</em></div>
      `;
      this.host.appendChild(chrome);
      this.scaleEl = chrome.querySelector('.scalebar em');
    }

    resize() {
      const w = this.host.clientWidth;
      const h = this.host.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    setRunning(v) {
      this.running = v;
      if (v) this.clock.getDelta();
    }

    focusOn(id) {
      const p = this.worldPos.get(id);
      if (!p) return;
      this.target.set(p.x, 8, p.z);
      this.sph.radius = 420;
    }
  }

  return CampusScene;
})();
