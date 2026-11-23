/* ============================================================================
 *  lab4-scene.js —— 云南大学呈贡校区 3D 校园（three.js · 日本漫画风）
 *  ---------------------------------------------------------------------------
 *  建造依据：校区航拍总览图 + 公开地图/官网资料 + 校园导航数据。
 *  坐标 1 : 1 米，x 向东、z 向南（北在上），地形、道路、建筑全部按真实方位。
 *
 *    北门 ── 明远楼 ── 云山西麓 ── 仰止楼（图书馆）── 楠苑
 *    泽湖（西北）· 云山（中部）· 钟楼花田（西北）· 体育运动公园（东）
 *    文科/理科/工科组团 · 桦苑/梓苑/楠苑/楸苑生活区 · 六个校门 + 环路
 *
 *  美术：MeshToonMaterial 三阶色 + 墨线描边 + 网点 + 樱花 + 分镜画框。
 *  图数据：CAMPUS.nodes / edges（22 点 46 边，与 CampusData.cpp 一致）。
 * ==========================================================================*/

const CampusScene = (() => {
  const T = THREE;

  const C = {
    ink: 0x2b3242,
    grass: 0x93c56c,
    grassDark: 0x6da452,
    forest: 0x3f6d3d,
    forestDark: 0x2f5734,
    rock: 0xb3ae9d,
    sand: 0xd5c79f,
    water: 0x5cb2c8,
    waterDeep: 0x357f97,
    road: 0xe7dfcc,
    roadLine: 0xd0bd97,
    plaza: 0xe4dcc8,
    track: 0xb1564a,
    cream: 0xf7ebce,
    creamDark: 0xe2cfa8,
    white: 0xfdfaf1,
    roofRed: 0xc0664d,
    roofRedDark: 0xa85445,
    roofGreen: 0x51707a,
    roofBlue: 0x4d7089,
    glass: 0x9fd2e2,
    wood: 0xa9784f,
    pink: 0xefa9bd,
    purple: 0x9a86c4,
    amber: 0xe0a53a,
    red: 0xd8453c,
    blue: 0x3f7fbf,
    green: 0x4b9668
  };

  /* ---------------- 三阶 toon 渐变 ---------------- */
  const gradient = (() => {
    const data = new Uint8Array([58, 140, 255]);
    const tex = new T.DataTexture(data, data.length, 1, T.RedFormat);
    tex.minFilter = T.NearestFilter;
    tex.magFilter = T.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  })();

  const toon = (color, opts = {}) => new T.MeshToonMaterial({
    color, gradientMap: gradient, ...opts
  });

  /* 瓦面：横向瓦垄 + 交错竖缝，远看是一层层红瓦 */
  const tileTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 8; r++) {
      const y = r * 16;
      g.fillStyle = 'rgba(60,28,20,.16)';
      g.fillRect(0, y + 13, 128, 3);
      for (let c = 0; c < 8; c++) {
        const x = c * 16 + (r % 2 ? 8 : 0);
        g.fillStyle = 'rgba(60,28,20,.09)';
        g.fillRect(x, y, 1.6, 13);
      }
    }
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(4, 2);
    return tex;
  })();

  const tileMat = (color) => toon(color, { map: tileTex });

  const MAT = {
    cream: toon(C.cream),
    creamDark: toon(C.creamDark),
    white: toon(C.white),
    roofRed: tileMat(C.roofRed),
    roofRedDark: tileMat(C.roofRedDark),
    roofGreen: toon(C.roofGreen),
    roofBlue: tileMat(C.roofBlue),
    glass: toon(C.glass, { transparent: true, opacity: 0.72 }),
    wood: toon(C.wood),
    ink: toon(C.ink),
    pink: toon(C.pink),
    stone: toon(0xded6c1),
    darkStone: toon(0xb6ad99),
    steel: toon(0xc8cdd4),
    track: toon(C.track),
    plaza: toon(C.plaza)
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
    let s = 20261123;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  })();

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function box(w, h, d, mat, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }

  function outline(mesh, opacity = 0.4) {
    const edges = new T.LineSegments(
      new T.EdgesGeometry(mesh.geometry, 28),
      new T.LineBasicMaterial({ color: C.ink, transparent: true, opacity })
    );
    mesh.add(edges);

    // 漫画式粗描边：反向渲染一个略大的壳
    const hull = new T.Mesh(
      mesh.geometry,
      new T.MeshBasicMaterial({ color: C.ink, side: T.BackSide })
    );
    hull.scale.setScalar(1.014);
    mesh.add(hull);
    return mesh;
  }

  /** 四坡顶（棱锥），w×d 为檐口尺寸 */
  function hipRoof(w, d, h, mat) {
    const m = new T.Mesh(new T.ConeGeometry(1, 1, 4), mat);
    m.scale.set(w / 1.4142, h, d / 1.4142);
    m.rotation.y = Math.PI / 4;
    m.position.y = h / 2;
    return m;
  }

  /** 双坡顶：屋脊沿 x 轴 */
  function gableRoof(w, d, h, mat) {
    const hw = w / 2, hd = d / 2;
    const pos = [
      -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd,
      -hw, h, 0, hw, h, 0
    ];
    const idx = [0, 5, 1, 0, 4, 5, 3, 5, 4, 3, 2, 5, 0, 3, 4, 1, 5, 2,
                 0, 1, 2, 0, 2, 3];
    const uv = [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1];
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, mat);
    return m;
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
        g.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.24, cw * 0.52, ch * 0.4);
        g.strokeStyle = 'rgba(43,50,66,.32)';
        g.lineWidth = 1.2;
        g.strokeRect(i * cw + cw * 0.22, j * ch + ch * 0.24, cw * 0.52, ch * 0.4);
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

  /* ==========================================================================
   *  地形：基准台地 + 云山 + 泽湖盆地 + 外围山脊
   * ========================================================================*/
  const CX = 150, CZ = -150;

  function smoothstep(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function terrainH(x, z) {
    const sx = x - CX, sz = z - CZ;

    // 校园基准面：西北（泽湖一侧）略低，向东南缓慢抬升
    let y = 10 - 0.0030 * sx - 0.0015 * sz;

    // 云山：中部偏东北的喀斯特残丘
    const hx = (x - 150) / 300;
    const hz = (z + 290) / 238;
    y += 78 * Math.exp(-(hx * hx + hz * hz) * 1.55);

    // 泽湖盆地
    const dl = Math.hypot((x + 430) / 1.0, (z + 430) / 0.93);
    y -= 22 * Math.exp(-Math.pow(dl / 230, 2));

    // 轻微起伏，避免完全平板的塑料感
    y += 1.4 * Math.sin(x * 0.0055) * Math.cos(z * 0.0047)
       + 0.7 * Math.sin(z * 0.0091 + 1.3);

    // 外围山脊：把地图边缘藏进山林里
    const r = Math.hypot(sx / 1180, sz / 1040);
    const t = smoothstep(1.04, 1.62, r);
    y += 62 * t;

    return y;
  }

  const LAKE = { x: -430, z: -430, y: 4.2, rx: 186, rz: 140 };

  /* 湖岸线：椭圆 + 低频扰动，避免正圆的塑料感 */
  function lakeRadius(angle, scale = 1) {
    return (1 + 0.10 * Math.sin(angle * 3 + 0.7) + 0.06 * Math.cos(angle * 5 - 1.2)) * scale;
  }

  /* ==========================================================================*/

  class CampusScene {
    constructor(host, labelsEl, opts = {}) {
      this.host = host;
      this.labelsEl = labelsEl;
      this.onPick = opts.onPick || (() => {});
      this.onPickLandmark = opts.onPickLandmark || (() => {});
      this.nodes = CAMPUS.nodes;
      this.edges = CAMPUS.edges;

      this.worldPos = new Map();
      this.nodeState = new Map();
      this.edgeState = new Map();
      this.pads = new Map();
      this.markers = new Map();
      this.rings = new Map();
      this.labels = new Map();
      this.pickables = [];
      this.curves = new Map();
      this.highlightLines = new Map();
      this.buildings = new Map();

      this.autoRotate = false;
      this.dragging = false;
      this.moved = 0;
      this.sph = { theta: -0.56, phi: 1.0, radius: 1520 };
      this.target = new T.Vector3(140, 26, -140);
      this.time = 0;

      this.initRenderer();
      this.initScene();
      this.buildTerrain();
      this.buildLake();
      this.buildRingRoad();
      this.buildRoads();
      this.buildCampus();
      this.buildLandmarks();
      this.buildBlocks();
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

      this.camera = new T.PerspectiveCamera(44, 1, 1, 9000);

      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.host);
    }

    initScene() {
      const scene = new T.Scene();
      scene.background = new T.Color(0xd9ebf6);
      scene.fog = new T.Fog(0xdfece4, 1750, 3150);
      this.scene = scene;

      scene.add(new T.HemisphereLight(0xeaf6ff, 0x8fa878, 1.0));
      const dir = new T.DirectionalLight(0xfff1cf, 1.65);
      dir.position.set(-760, 1100, 620);
      scene.add(dir);

      const fill = new T.DirectionalLight(0xcfe3ff, 0.42);
      fill.position.set(900, 520, -800);
      scene.add(fill);
    }

    /* ---------------- 地形 ---------------- */
    buildTerrain() {
      const geo = new T.PlaneGeometry(3800, 3500, 220, 200);
      geo.rotateX(-Math.PI / 2);

      const pos = geo.attributes.position;
      const colors = [];
      const cGrass = new T.Color(C.grass);
      const cDark = new T.Color(C.grassDark);
      const cForest = new T.Color(C.forest);
      const cRock = new T.Color(C.rock);
      const cSand = new T.Color(C.sand);

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + CX;
        const z = pos.getZ(i) + CZ;
        const y = terrainH(x, z);
        pos.setX(i, x);
        pos.setZ(i, z);
        pos.setY(i, y);

        const r = Math.hypot((x - CX) / 1180, (z - CZ) / 1040);
        const dl = Math.hypot((x + 430) / 1.0, (z + 430) / 0.93);

        // 草地底色：低频斑块 + 高频杂色，避免一整块塑料绿
        const patch = 0.5 + 0.5 * Math.sin(x * 0.0041 + 1.2) * Math.cos(z * 0.0034 - 0.6);
        let col = cGrass.clone().lerp(cDark, 0.3 + patch * 0.45);

        // 山林：云山与外圈山脊
        const hill = Math.exp(-(((x - 150) / 300) ** 2 + ((z + 290) / 238) ** 2) * 1.55);
        const wood = clamp(Math.max(hill * 1.45, smoothstep(1.02, 1.2, r)), 0, 1);
        col.lerp(cForest, wood * 0.9);
        if (y > 58) col.lerp(cRock, Math.min(1, (y - 58) / 55) * 0.6);

        // 湖岸沙滩（收窄，只留一圈浅滩）
        if (y < 5.2) col.lerp(cSand, clamp((5.2 - y) / 0.8, 0, 1) * 0.9);
        if (y < LAKE.y - 0.1) col.lerp(new T.Color(0x4f8f96), 0.6);

        colors.push(col.r, col.g, col.b);
      }

      geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      const mat = new T.MeshToonMaterial({ vertexColors: true, gradientMap: gradient });
      const mesh = new T.Mesh(geo, mat);
      this.scene.add(mesh);
      this.terrain = mesh;

      // 远山：两层剪影，藏住地形边缘
      const layer = (n, radius, color, hMin, hMax, scale) => {
        const g = new T.ConeGeometry(150, 220, 5);
        const m = toon(color);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rand() * 0.14;
          const rr = radius + rand() * 160;
          const cone = new T.Mesh(g, m);
          const hh = hMin + rand() * (hMax - hMin);
          cone.scale.set(scale * (0.7 + rand() * 0.6), hh / 220, scale * (0.7 + rand() * 0.6));
          cone.position.set(CX + Math.cos(a) * rr, -10, CZ + Math.sin(a) * rr);
          this.scene.add(cone);
        }
      };
      layer(18, 1720, 0x7f9c88, 220, 340, 1.7);
      layer(14, 1980, 0xa3bbb0, 280, 430, 2.3);
    }

    /* ---------------- 泽湖 ---------------- */
    buildLake() {
      const shape = new T.Shape();
      const N = 72;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const k = lakeRadius(a);
        const x = Math.cos(a) * LAKE.rx * k;
        const z = Math.sin(a) * LAKE.rz * k;
        if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
      }

      const geo = new T.ShapeGeometry(shape, 24);
      geo.rotateX(Math.PI / 2);

      const water = new T.Mesh(geo, toon(C.water, {
        transparent: true, opacity: 0.97, side: T.DoubleSide
      }));
      water.position.set(LAKE.x, LAKE.y, LAKE.z);
      water.rotation.y = 0.22;
      water.scale.setScalar(0.95);
      this.scene.add(water);
      this.water = water;

      // 石砌驳岸：沿水线铺一圈窄石带
      const bank = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const k = lakeRadius(a, 0.99);
        bank.push(new T.Vector3(
          LAKE.x + Math.cos(a) * LAKE.rx * k,
          LAKE.y + 0.25,
          LAKE.z + Math.sin(a) * LAKE.rz * k
        ));
      }
      this.scene.add(new T.Line(
        new T.BufferGeometry().setFromPoints(bank),
        new T.LineBasicMaterial({ color: 0xd6c8a9, transparent: true, opacity: 0.7 })
      ));

      // 波纹（动画缩放）
      this.ripples = [];
      for (let i = 0; i < 9; i++) {
        const r = new T.Mesh(
          new T.RingGeometry(3.4, 4.2, 28),
          new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
        );
        r.rotation.x = -Math.PI / 2;
        r.position.set(
          LAKE.x + (rand() - 0.5) * LAKE.rx * 1.1,
          LAKE.y + 0.25,
          LAKE.z + (rand() - 0.5) * LAKE.rz * 1.1
        );
        r.userData.phase = rand();
        this.scene.add(r);
        this.ripples.push(r);
      }

      // 湖南岸的九曲桥与湖心亭
      const board = new T.Group();
      for (let i = 0; i < 9; i++) {
        const seg = box(9, 0.8, 3.4, MAT.wood, i * 8 - 32, 1, Math.sin(i * 0.7) * 5);
        seg.rotation.y = Math.sin(i * 0.7) * 0.25;
        board.add(seg);
        const post = box(0.7, 4, 0.7, MAT.wood, i * 8 - 32, -1, Math.sin(i * 0.7) * 5 + 2);
        board.add(post);
      }
      board.position.set(LAKE.x + 30, LAKE.y + 0.6, LAKE.z + 92);
      this.scene.add(board);

      // 黑天鹅
      this.swans = [];
      for (let i = 0; i < 3; i++) {
        const s = new T.Group();
        const body = new T.Mesh(new T.SphereGeometry(3.2, 10, 8), toon(0x2c3038));
        body.scale.set(1.4, 0.85, 1);
        s.add(body);
        const neck = new T.Mesh(new T.CylinderGeometry(0.55, 0.8, 5.2, 6), toon(0x2c3038));
        neck.position.set(2.6, 2.6, 0);
        neck.rotation.z = -0.5;
        s.add(neck);
        const head = new T.Mesh(new T.SphereGeometry(1.15, 8, 6), toon(0x2c3038));
        head.position.set(4.1, 4.6, 0);
        s.add(head);
        s.position.set(
          LAKE.x - 40 + i * 36,
          LAKE.y + 0.6,
          LAKE.z + 30 - i * 26
        );
        s.rotation.y = rand() * 6.28;
        this.scene.add(s);
        this.swans.push(s);
      }

      // 芦苇：贴着水线长
      const reedMat = toon(0x9aa860);
      const reedGeo = new T.ConeGeometry(0.5, 7, 4);
      for (let i = 0; i < 110; i++) {
        const a = rand() * Math.PI * 2;
        const k = lakeRadius(a, 0.97);
        const x = LAKE.x + Math.cos(a) * LAKE.rx * k;
        const z = LAKE.z + Math.sin(a) * LAKE.rz * k;
        const reed = new T.Mesh(reedGeo, reedMat);
        reed.position.set(x, LAKE.y + 1.8, z);
        reed.scale.setScalar(0.7 + rand() * 0.8);
        reed.rotation.z = (rand() - 0.5) * 0.2;
        this.scene.add(reed);
      }

      // 荷叶
      const padMat = toon(0x5f9a5e);
      const padGeo = new T.CircleGeometry(2.6, 8);
      for (let i = 0; i < 46; i++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.sqrt(rand()) * 0.75;
        const x = LAKE.x + Math.cos(a) * LAKE.rx * rr;
        const z = LAKE.z + Math.sin(a) * LAKE.rz * rr;
        const pad = new T.Mesh(padGeo, padMat);
        pad.rotation.x = -Math.PI / 2;
        pad.rotation.z = rand() * 6.28;
        pad.position.set(x, LAKE.y + 0.14, z);
        this.scene.add(pad);
      }
    }

    /* ---------------- 校区环路（六个校门串成的一圈） ---------------- */
    buildRingRoad() {
      const pts = CAMPUS.ring.map(p => new T.Vector3(p.x, terrainH(p.x, p.z) + 1.5, p.z));
      const curve = new T.CatmullRomCurve3(pts, true, 'catmullrom', 0.35);
      const samples = curve.getPoints(220);

      this._ringPts = samples;
      const mesh = new T.Mesh(this.ribbon(samples, 12), toon(0xded4bd, { side: T.DoubleSide }));
      mesh.renderOrder = 1;
      this.scene.add(mesh);

      const line = new T.Line(
        new T.BufferGeometry().setFromPoints(samples.map(p => new T.Vector3(p.x, p.y + 0.25, p.z))),
        new T.LineDashedMaterial({ color: 0xc9b68f, dashSize: 9, gapSize: 9, transparent: true, opacity: 0.85 })
      );
      line.computeLineDistances();
      this.scene.add(line);

      this.ringCurve = curve;
    }

    /** 沿折线生成贴地带宽路面 */
    ribbon(pts, width) {
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
        uvs.push(0, i / n * 8, 1, i / n * 8);
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
    }

    /* ---------------- 道路（图的 46 条边） ---------------- */
    buildRoads() {
      this._roadPts = [];
      this.nodes.forEach(n => {
        this.worldPos.set(n.id, new T.Vector3(n.x, terrainH(n.x, n.z), n.z));
      });

      const roadMat = toon(0xded4bd, { side: T.DoubleSide });
      const edgeMat = new T.LineBasicMaterial({ color: 0xcbb994, transparent: true, opacity: 0.35 });

      this.edges.forEach((e, idx) => {
        const pa = this.worldPos.get(e.a);
        const pb = this.worldPos.get(e.b);

        // 道路基本取直，只给一点点弧度，符合校园路网
        const mid = pa.clone().add(pb).multiplyScalar(0.5);
        const dir = pb.clone().sub(pa);
        const perp = new T.Vector3(-dir.z, 0, dir.x).normalize();
        mid.addScaledVector(perp, ((idx % 3) - 1) * 10);

        const curve = new T.QuadraticBezierCurve3(pa.clone(), mid, pb.clone());
        const raw = curve.getPoints(18);
        const pts = raw.map(p => new T.Vector3(p.x, terrainH(p.x, p.z) + 1.4, p.z));

        const key = `${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}`;
        this.curves.set(key, new T.CatmullRomCurve3(pts));
        this._roadPts.push(...pts);

        const mesh = new T.Mesh(this.ribbon(pts, 7), roadMat);
        mesh.renderOrder = 1;
        this.scene.add(mesh);

        // 两侧路缘
        [-3.9, 3.9].forEach(off => {
          const edgePts = pts.map((p, i) => {
            const q = pts[Math.min(pts.length - 1, i + 1)];
            const r = pts[Math.max(0, i - 1)];
            const tx = q.x - r.x, tz = q.z - r.z;
            const len = Math.hypot(tx, tz) || 1;
            return new T.Vector3(p.x - tz / len * off, p.y + 0.1, p.z + tx / len * off);
          });
          this.scene.add(new T.Line(new T.BufferGeometry().setFromPoints(edgePts), edgeMat));
        });

        // 高亮线（算法用）
        const hl = new T.Mesh(
          new T.TubeGeometry(this.curves.get(key), 26, 2.2, 5, false),
          new T.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0 })
        );
        hl.renderOrder = 3;
        this.scene.add(hl);
        this.highlightLines.set(key, hl);
      });
    }

    /* ---------------- 22 个算法顶点对应的建筑 ---------------- */
    buildCampus() {
      this.nodes.forEach(n => {
        const p = this.worldPos.get(n.id);
        const base = terrainH(p.x, p.z);
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
          case '乘车点': g = this.busStop(n); break;
          default: g = new T.Group();
        }

        g.position.set(p.x, base, p.z);
        g.traverse(o => { if (o.isMesh) { o.userData.nodeId = n.id; this.pickables.push(o); } });
        this.scene.add(g);
        this.buildings.set(n.id, g);

        // 顶点站台：一块很薄的色环，既能读出算法状态，又不抢建筑
        const pad = new T.Mesh(
          new T.CylinderGeometry(11, 12, 0.6, 28),
          toon(CAT_COLOR[n.cat] || 0x9aa3b5, { transparent: true, opacity: 0.85 })
        );
        pad.position.set(p.x, base + 0.35, p.z);
        pad.userData.nodeId = n.id;
        this.scene.add(pad);
        this.pickables.push(pad);
        this.pads.set(n.id, pad);

        // 浮标
        const marker = new T.Mesh(
          new T.OctahedronGeometry(9.5, 0),
          new T.MeshBasicMaterial({ color: CAT_COLOR[n.cat] || 0x9aa3b5 })
        );
        marker.material.toneMapped = false;
        marker.position.set(p.x, base + n.h + 30, p.z);
        marker.userData.nodeId = n.id;
        this.scene.add(marker);
        this.pickables.push(marker);
        this.markers.set(n.id, marker);

        const beam = new T.Mesh(
          new T.CylinderGeometry(0.7, 0.7, 28, 4),
          new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
        );
        beam.position.set(p.x, base + n.h + 15, p.z);
        this.scene.add(beam);

        const ring = new T.Mesh(
          new T.TorusGeometry(13, 1.6, 8, 30),
          new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(p.x, base + n.h + 28, p.z);
        this.scene.add(ring);
        this.rings.set(n.id, ring);
      });
    }

    /* ---- 校门 ---- */
    gate(n) {
      const g = new T.Group();
      const w = 44;
      const pillarMat = MAT.stone;

      const p1 = box(5.5, 24, 5.5, pillarMat, -w / 2, 12, 0);
      const p2 = box(5.5, 24, 5.5, pillarMat, w / 2, 12, 0);
      const p3 = box(4.5, 19, 4.5, pillarMat, -w / 2 + 9, 9.5, 0);
      const p4 = box(4.5, 19, 4.5, pillarMat, w / 2 - 9, 9.5, 0);

      const beam = box(w + 6, 4.6, 8, MAT.creamDark, 0, 24.5, 0);
      const cap = box(w + 12, 1.8, 12, MAT.roofRed, 0, 27.6, 0);
      const plaque = box(15, 3.4, 1.2, MAT.roofGreen, 0, 21.4, -4.6);

      const base1 = box(9, 2.4, 9, MAT.creamDark, -w / 2, 1.2, 0);
      const base2 = box(9, 2.4, 9, MAT.creamDark, w / 2, 1.2, 0);

      // 门卫亭
      const booth = box(7, 6, 6, MAT.cream, w / 2 + 9, 3, 8);
      const boothRoof = box(8.4, 0.9, 7.4, MAT.roofRed, w / 2 + 9, 6.4, 8);

      g.add(base1, base2, p1, p2, p3, p4, beam, cap, plaque, booth, boothRoof);
      [p1, p2, p3, p4, beam, cap, plaque].forEach(m => outline(m));

      // 朝外：从校区中心指向校门
      g.rotation.y = Math.atan2(n.x - CX, n.z - CZ);
      return g;
    }

    /* ---- 明远楼：法式石基 + 五层 + 深色四坡顶 ---- */
    adminBuilding(n) {
      const g = new T.Group();
      const W = 152, D = 92, H = 27;

      const plinth = box(W + 26, 5, D + 22, MAT.stone, 0, 2.5, 0);
      outline(plinth);
      g.add(plinth);

      // 大台阶（北面，迎着北门）
      for (let i = 0; i < 6; i++) {
        g.add(box(52 - i * 3, 1.1, 6, MAT.stone, 0, 1.2 + i * 1.05, -(D + 22) / 2 - 8 - i * 2.4));
      }

      const bodyMat = patternedMat('#f8efdb', '#b7d6e4', 16, 4);
      const body = box(W, H, D, bodyMat, 0, 5 + H / 2, 0);
      outline(body, 0.48);
      g.add(body);

      // 两翼
      [-1, 1].forEach(s => {
        const wing = box(30, 21, D + 26, MAT.cream, s * (W / 2 + 14), 5 + 10.5, 0);
        outline(wing, 0.4);
        g.add(wing);
        const wr = gableRoof(30, D + 30, 7, MAT.roofGreen);
        wr.position.set(s * (W / 2 + 14), 26, 0);
        wr.rotation.y = Math.PI / 2;
        outline(wr, 0.35);
        g.add(wr);
      });

      // 层间线脚
      for (let f = 1; f < 5; f++) {
        g.add(box(W + 3, 0.9, D + 3, MAT.creamDark, 0, 5 + f * (H / 5), 0));
      }

      // 檐口 + 四坡顶
      const cornice = box(W + 10, 3, D + 10, MAT.creamDark, 0, 5 + H + 1.5, 0);
      outline(cornice, 0.4);
      g.add(cornice);

      // 下段陡坡
      const roofA = new T.Mesh(
        new T.CylinderGeometry(58, 104, 14, 4, 1),
        MAT.roofGreen
      );
      roofA.rotation.y = Math.PI / 4;
      roofA.position.y = 5 + H + 10;
      outline(roofA, 0.45);
      g.add(roofA);

      // 上段缓坡
      const roofB = new T.Mesh(
        new T.CylinderGeometry(30, 58, 4.2, 4, 1),
        MAT.roofGreen
      );
      roofB.rotation.y = Math.PI / 4;
      roofB.position.y = 5 + H + 19;
      outline(roofB, 0.35);
      g.add(roofB);

      // 顶部小四坡
      const cap = hipRoof(42, 26, 3.2, MAT.roofGreen);
      cap.position.y = 5 + H + 23.6;
      outline(cap, 0.3);
      g.add(cap);

      const ridge = box(42, 0.9, 1.8, MAT.roofRedDark, 0, 5 + H + 26.4, 0);
      g.add(ridge);

      for (let i = -2; i <= 2; i++) {
        const dormer = box(10, 6.8, 8, MAT.cream, i * 26, 5 + H + 9.4, -(D / 2 - 2));
        outline(dormer, 0.35);
        g.add(dormer);
        const dr = gableRoof(11.6, 9, 3, MAT.roofGreen);
        dr.position.set(i * 26, 5 + H + 12.9, -(D / 2 - 2));
        g.add(dr);
      }

      // 中央山花与柱廊
      const ped = box(44, 5, 3, MAT.cream, 0, 5 + H + 1, -(D / 2 + 5));
      outline(ped);
      g.add(ped);
      for (let i = -3; i <= 3; i++) {
        const col = new T.Mesh(new T.CylinderGeometry(1.7, 1.9, 17, 8), MAT.cream);
        col.position.set(i * 6.4, 5 + 8.5, -(D / 2 + 7));
        g.add(col);
      }
      const portico = box(48, 2.4, 9, MAT.cream, 0, 5 + 17.4, -(D / 2 + 6));
      outline(portico);
      g.add(portico);

      // 顶部旗杆
      const pole = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 16, 6), MAT.steel);
      pole.position.set(0, 5 + H + 22, 0);
      g.add(pole);

      return g;
    }

    /* ---- 仰止楼：五层扇形图书馆 ---- */
    library(n) {
      const g = new T.Group();
      const R = 88;
      const start = -Math.PI / 3;
      const span = (Math.PI * 2) / 3;

      // 基座平台
      const base = new T.Mesh(new T.CylinderGeometry(R + 3, R + 5, 3, 40, 1, false, start - 0.05, span + 0.1), MAT.stone);
      base.position.y = 1.5;
      g.add(base);

      // 五层台阶式扇形
      for (let i = 0; i < 5; i++) {
        const r = R - i * 7.4;
        const h = 4.6;
        const y = 3 + i * h;

        const wall = new T.Mesh(
          new T.CylinderGeometry(r, r, h, 40, 1, false, start, span),
          patternedMat('#f8efdb', '#a9cfe0', 14, 1)
        );
        wall.position.y = y + h / 2;
        outline(wall, 0.32);
        g.add(wall);

        // 每层退台的檐口
        const eave = new T.Mesh(
          new T.CylinderGeometry(r + 1.6, r + 1.6, 0.8, 40, 1, false, start - 0.03, span + 0.06),
          MAT.creamDark
        );
        eave.position.y = y + h - 0.4;
        g.add(eave);

        // 竖向遮阳肋
        for (let k = 0; k <= 12; k++) {
          const a = start + (span * k) / 12;
          const rib = box(0.9, h, 2.2, MAT.cream, Math.sin(a) * (r + 0.6), y + h / 2, Math.cos(a) * (r + 0.6));
          rib.rotation.y = a;
          g.add(rib);
        }
      }

      // 背墙与两侧墙，封住扇形
      const back = new T.Mesh(new T.BoxGeometry(2.4, 26, 120), MAT.cream);
      back.position.set(0, 16, -54);
      outline(back, 0.3);
      g.add(back);

      [-1, 1].forEach(sgn => {
        const a = sgn * Math.PI / 3;
        const side = new T.Mesh(new T.BoxGeometry(2.2, 26, 86), MAT.cream);
        side.position.set(Math.sin(a) * 43, 16, Math.cos(a) * 43);
        side.rotation.y = a;
        outline(side, 0.3);
        g.add(side);
      });

      // 扇形屋顶：略微出檐的浅色屋面
      const roof = new T.Mesh(
        new T.CylinderGeometry(R + 4, R + 4, 2.2, 40, 1, false, start - 0.04, span + 0.08),
        MAT.roofBlue
      );
      roof.position.y = 3 + 5 * 4.6 + 1.1;
      roof.scale.set(0.93, 1, 0.93);
      outline(roof, 0.4);
      g.add(roof);

      // 屋脊上的弧形采光带
      const sky = new T.Mesh(
        new T.CylinderGeometry(R * 0.84, R * 0.84, 1.4, 40, 1, false, start + 0.16, span - 0.32),
        MAT.glass
      );
      sky.position.y = 3 + 5 * 4.6 + 2.4;
      g.add(sky);

      // 扇形中心的采光穹顶
      const dome = new T.Mesh(
        new T.SphereGeometry(15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        MAT.glass
      );
      dome.position.y = 3 + 5 * 4.6 + 1.4;
      g.add(dome);

      // 中庭玻璃幕墙
      const atrium = new T.Mesh(new T.CylinderGeometry(17, 17, 26, 20, 1, false, start - 0.4, span + 0.8), MAT.glass);
      atrium.position.y = 3 + 13;
      g.add(atrium);

      // 正面雨棚
      const canopy = box(52, 1.2, 14, MAT.creamDark, 0, 7.4, R * 0.86);
      outline(canopy, 0.3);
      g.add(canopy);
      [-1, 1].forEach(s => {
        const col = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 7, 8), MAT.cream);
        col.position.set(s * 22, 3.5, R * 0.86 + 4);
        g.add(col);
      });

      return g;
    }

    /* ---- 教学楼：院落式组团 ---- */
    teaching(n) {
      const g = new T.Group();
      const layout = n.id % 3;
      const wallMat = patternedMat('#f6ead0', '#a9c6d6', 10, 3);
      const H = n.id === 10 ? 17 : 20;

      const block = (w, d, x, z, h = H, ry = 0) => {
        const b = new T.Group();
        const body = box(w, h, d, wallMat, 0, h / 2, 0);
        outline(body, 0.4);
        b.add(body);

        const roof = gableRoof(w + 2.4, d + 2.4, Math.max(4, w * 0.075), MAT.roofRed);
        roof.position.y = h;
        outline(roof, 0.35);
        b.add(roof);

        // 入口
        const door = box(9, 5.4, 1.4, MAT.roofGreen, 0, 2.7, d / 2 + 0.6);
        b.add(door);
        const step = box(14, 0.8, 4, MAT.stone, 0, 0.4, d / 2 + 2.6);
        b.add(step);

        b.position.set(x, 0, z);
        b.rotation.y = ry;
        g.add(b);
        return b;
      };

      if (layout === 0) {
        block(66, 19, 0, -16);
        block(22, 44, -34, 18);
        block(22, 30, 30, 24);
      } else if (layout === 1) {
        block(58, 18, -18, -18);
        block(18, 40, 24, 12);
        block(34, 16, -12, 26);
      } else {
        block(70, 18, 0, -14);
        block(46, 16, 6, 22);
      }

      // 院落里的树与旗杆
      const flag = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 14, 6), MAT.steel);
      flag.position.set(0, 7, 8);
      g.add(flag);

      return g;
    }

    /* ---- 食堂 ---- */
    canteen(n) {
      const g = new T.Group();
      const W = 62, D = 38, H = 15;

      const body = box(W, H, D, patternedMat('#f7ecd4', '#a9cfe0', 12, 3), 0, H / 2, 0);
      outline(body);
      g.add(body);

      // 玻璃幕墙入口
      const front = box(W - 12, H - 5, 1.6, MAT.glass, 0, (H - 5) / 2 + 1, D / 2 + 0.8);
      g.add(front);

      const roof = box(W + 4, 1.6, D + 4, MAT.creamDark, 0, H + 0.8, 0);
      outline(roof, 0.35);
      g.add(roof);

      // 采光顶
      for (let i = -1; i <= 1; i++) {
        const sky = box(14, 1.2, 8, MAT.glass, i * 18, H + 2, -4);
        g.add(sky);
      }

      // 室外台阶与雨棚
      const canopy = box(W - 16, 1, 8, MAT.roofRed, 0, 6.6, D / 2 + 4);
      outline(canopy, 0.3);
      g.add(canopy);
      const step = box(W - 10, 0.9, 9, MAT.stone, 0, 0.45, D / 2 + 6);
      g.add(step);

      // 屋顶设备
      g.add(box(10, 3, 7, MAT.steel, -18, H + 2.8, 6));
      return g;
    }

    /* ---- 宿舍组团：四栋板楼 ---- */
    dorm(n) {
      const g = new T.Group();
      const wallMat = patternedMat('#f7ead2', '#b9cfe0', 12, 6);
      const positions = [[-34, -18], [34, -18], [-34, 20], [34, 20]];

      positions.forEach(([x, z], i) => {
        const b = new T.Group();
        const w = 58, d = 15, h = 23;

        const body = box(w, h, d, wallMat, 0, h / 2, 0);
        outline(body, 0.4);
        b.add(body);

        const roof = gableRoof(w + 2.5, d + 2.5, 5.2, i % 2 ? MAT.roofRed : MAT.roofRedDark);
        roof.position.y = h;
        outline(roof, 0.32);
        b.add(roof);

        // 阳台
        for (let k = 0; k < 5; k++) {
          b.add(box(7.4, 0.8, 2.4, MAT.creamDark, -20 + k * 10, 4.6, d / 2 + 1.2));
          b.add(box(7.4, 0.8, 2.4, MAT.creamDark, -20 + k * 10, 11.2, d / 2 + 1.2));
        }

        // 入口
        b.add(box(8, 5, 1.2, MAT.roofGreen, 0, 2.5, d / 2 + 0.7));
        b.add(box(12, 0.7, 4, MAT.stone, 0, 0.35, d / 2 + 2.6));

        b.position.set(x, 0, z);
        b.rotation.y = i % 2 ? 0.06 : -0.04;
        g.add(b);
      });

      // 组团内的小广场
      const yard = new T.Mesh(new T.CircleGeometry(17, 28), MAT.plaza);
      yard.rotation.x = -Math.PI / 2;
      yard.position.set(0, 0.12, 0);
      g.add(yard);

      return g;
    }

    /* ---- 广场 ---- */
    plaza(n) {
      const g = new T.Group();
      const big = n.id === 14;
      const R = big ? 62 : 48;

      const floor = new T.Mesh(new T.CircleGeometry(R, 44), MAT.plaza);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.14;
      g.add(floor);

      // 环形铺装花纹
      for (let i = 1; i <= 3; i++) {
        const ring = new T.Mesh(
          new T.RingGeometry(R * i / 3 - 1.2, R * i / 3, 48),
          toon(i % 2 ? 0xd8cdb2 : 0xefe7d2)
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.2;
        g.add(ring);
      }

      // 放射线
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const line = box(R * 0.94, 0.2, 1.1, toon(0xd6c9ad), Math.cos(a) * R * 0.5, 0.24, Math.sin(a) * R * 0.5);
        line.rotation.y = -a;
        g.add(line);
      }

      // 中央水池 + 旗杆
      const pool = new T.Mesh(new T.CylinderGeometry(11, 11, 1.2, 28), MAT.stone);
      pool.position.y = 0.8;
      g.add(pool);
      const waterDisc = new T.Mesh(new T.CircleGeometry(9.6, 28), toon(C.water, { transparent: true, opacity: 0.9 }));
      waterDisc.rotation.x = -Math.PI / 2;
      waterDisc.position.y = 1.42;
      g.add(waterDisc);

      const pole = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 22, 8), MAT.steel);
      pole.position.set(0, 11, 0);
      g.add(pole);

      // 四角灯柱
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const x = Math.cos(a) * (R - 12), z = Math.sin(a) * (R - 12);
        const lamp = new T.Mesh(new T.CylinderGeometry(0.4, 0.5, 9, 6), MAT.ink);
        lamp.position.set(x, 4.5, z);
        g.add(lamp);
        const head = new T.Mesh(new T.SphereGeometry(1.4, 8, 6), toon(0xfff0c0));
        head.position.set(x, 9.4, z);
        g.add(head);
      }

      return g;
    }

    /* ---- 体育场：400 m 田径场 ---- */
    stadium(n) {
      const g = new T.Group();
      const rx = 92, rz = 58;

      const track = new T.Mesh(new T.RingGeometry(0.66, 1, 72), MAT.track);
      track.rotation.x = -Math.PI / 2;
      track.scale.set(rx, rz, 1);
      track.position.y = 0.3;
      g.add(track);

      const field = new T.Mesh(new T.CircleGeometry(0.655, 56), toon(0x7fbf72));
      field.rotation.x = -Math.PI / 2;
      field.scale.set(rx, rz, 1);
      field.position.y = 0.34;
      g.add(field);

      // 跑道分道线
      for (let k = 1; k <= 6; k++) {
        const rr = 0.66 + (0.34 * k) / 6;
        const pts = [];
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          pts.push(new T.Vector3(Math.cos(a) * rx * rr, 0.42, Math.sin(a) * rz * rr));
        }
        g.add(new T.Line(
          new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({ color: 0xfdf6e8, transparent: true, opacity: 0.75 })
        ));
      }

      // 足球门
      [-1, 1].forEach(s => {
        const goal = box(1.2, 5, 12, MAT.white, s * rx * 0.6, 2.5, 0);
        g.add(goal);
      });

      // 西侧看台
      for (let i = 0; i < 6; i++) {
        const stand = box(20, 1.6, 96 - i * 3, toon(0xd8cdb4), -rx - 18 - i * 3.2, 1 + i * 1.55, 0);
        g.add(stand);
      }

      // 灯塔
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const mast = new T.Mesh(new T.CylinderGeometry(0.7, 1, 34, 8), MAT.steel);
        mast.position.set(sx * (rx + 26), 17, sz * (rz + 22));
        g.add(mast);
        const lamp = box(9, 2.4, 2.4, MAT.white, sx * (rx + 26), 34, sz * (rz + 22));
        g.add(lamp);
      });

      return g;
    }

    /* ---- 校医院 ---- */
    hospital(n) {
      const g = new T.Group();
      const body = box(52, 17, 30, patternedMat('#fbf4e4', '#b6d4e2', 10, 3), 0, 8.5, 0);
      outline(body);
      g.add(body);
      const roof = box(55, 1.4, 33, MAT.creamDark, 0, 17.7, 0);
      outline(roof, 0.3);
      g.add(roof);

      // 红十字
      const crossMat = toon(0xd8453c);
      g.add(box(9, 2.4, 0.6, crossMat, 0, 12, 15.4));
      g.add(box(2.4, 9, 0.6, crossMat, 0, 12, 15.4));

      const canopy = box(24, 0.9, 8, MAT.white, 0, 4.6, 19);
      g.add(canopy);
      return g;
    }

    /* ---- 学生事务中心 ---- */
    service(n) {
      const g = new T.Group();
      const body = box(52, 13, 30, patternedMat('#f8efdb', '#b7d6e4', 10, 2), 0, 6.5, 0);
      outline(body);
      g.add(body);
      const roof = box(56, 1.2, 34, MAT.creamDark, 0, 13.6, 0);
      outline(roof, 0.3);
      g.add(roof);

      // 通透门厅
      const hall = box(26, 9, 12, MAT.glass, 0, 4.5, 20);
      g.add(hall);
      const canopy = box(34, 1, 14, MAT.creamDark, 0, 10, 22);
      outline(canopy, 0.3);
      g.add(canopy);

      // 标识柱
      const sign = box(1.4, 9, 1.4, MAT.roofGreen, 18, 4.5, 22);
      g.add(sign);
      return g;
    }

    /* ---- 校车乘车点 ---- */
    busStop(n) {
      const g = new T.Group();
      const roof = box(26, 0.7, 8, MAT.roofRed, 0, 4.8, 0);
      outline(roof, 0.3);
      g.add(roof);
      [-10, 10].forEach(x => {
        const post = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 4.8, 6), MAT.steel);
        post.position.set(x, 2.4, 0);
        g.add(post);
      });
      g.add(box(22, 0.5, 1.2, MAT.wood, 0, 1.2, -1.4));

      const sign = box(0.5, 6, 3.2, toon(0x3f7fbf), 14, 3, 0);
      g.add(sign);

      // 校车
      const bus = new T.Group();
      const b1 = box(8, 4.2, 16, toon(0xffd24a), 0, 3.4, 0);
      outline(b1, 0.3);
      bus.add(b1);
      const b2 = box(7.4, 1.8, 12, MAT.glass, 0, 6.4, 0);
      bus.add(b2);
      bus.position.set(0, 0, 14);
      g.add(bus);
      return g;
    }

    /* ======================================================================
     *  真实景物
     * ====================================================================*/
    buildLandmarks() {
      CAMPUS.landmarks.forEach(m => {
        const g = new T.Group();
        const base = terrainH(m.x, m.z);

        switch (m.kind) {
          case 'lake':
          case 'hill':
            // 地形与水面已单独构建，只补山顶/湖岸设施
            if (m.kind === 'hill') this.hillTop(m);
            break;
          case 'clock': g.add(this.clockTower()); break;
          case 'hall': g.add(this.hall()); break;
          case 'observatory': g.add(this.observatory()); break;
          case 'track': g.add(this.sportsPark(m)); break;
          case 'garden': g.add(this.garden()); break;
          case 'greenhouse': g.add(this.greenhouse()); break;
          case 'lavender': g.add(this.flowerField(m, 0x8f7fc0, 18)); break;
          case 'rose': g.add(this.flowerField(m, 0xd8556b, 14, true)); break;
          case 'sakura': g.add(this.flowerField(m, 0xefa9bd, 10, true)); break;
          case 'avenue': g.add(this.avenue(m)); break;
          case 'wall': g.add(this.wall(m)); break;
          case 'fountain': g.add(this.fountain(m)); break;
          case 'metro': g.add(this.metro()); break;
          case 'market': g.add(this.market()); break;
          case 'archive': g.add(this.archive()); break;
          case 'pavilion': g.add(this.pavilion()); break;
          case 'gate': g.add(this.landmarkGate()); break;
        }

        g.position.x = m.x;
        g.position.z = m.z;
        if (m.kind !== 'lake' && m.kind !== 'hill') g.position.y = base;
        g.traverse(o => {
          if (o.isMesh) { o.userData.landmark = m; this.pickables.push(o); }
        });
        this.scene.add(g);

        // 景物标签高度
        this.labelY = this.labelY || new Map();
        const top = {
          clock: 78, hall: 34, observatory: 34, track: 6, garden: 12,
          greenhouse: 14, lavender: 8, rose: 8, sakura: 8, avenue: 12,
          wall: 9, fountain: 6, metro: 14, market: 12, archive: 16,
          pavilion: 20, gate: 26, hill: 0, lake: 0
        }[m.kind] || 10;
        this.labelY.set(m.name, base + top);
      });
    }

    /* ---- 山顶：观景亭、天文台、步道 ---- */
    hillTop(m) {
      // 石阶步道：从图书馆北侧绕上山
      const path = [
        { x: 10, z: -140 }, { x: 60, z: -190 }, { x: 110, z: -235 },
        { x: 140, z: -258 }, { x: 96, z: -258 }, { x: 150, z: -290 }
      ].map(p => new T.Vector3(p.x, terrainH(p.x, p.z) + 1.2, p.z));
      const curve = new T.CatmullRomCurve3(path);
      const mesh = new T.Mesh(this.ribbon(curve.getPoints(40), 5), toon(0xd9cdb4, { side: T.DoubleSide }));
      this.scene.add(mesh);

      // 山顶露出的喀斯特岩块
      for (let i = 0; i < 4; i++) {
        const a = i * 1.9;
        const rock = new T.Mesh(
          new T.IcosahedronGeometry(9 + i * 2.4, 0),
          toon(i % 2 ? 0xa9a496 : 0xbcb7a8)
        );
        rock.scale.set(1.3, 0.8, 1.1);
        const rx = m.x + Math.cos(a) * (14 + i * 5);
        const rz = m.z + Math.sin(a) * (12 + i * 4);
        rock.position.set(rx, terrainH(rx, rz) + 4, rz);
        this.scene.add(rock);
      }

      // 山顶树冠浓密，用一圈深色树补足
      for (let i = 0; i < 40; i++) {
        const a = rand() * Math.PI * 2;
        const r = 40 + rand() * 150;
        const x = m.x + Math.cos(a) * r;
        const z = m.z + Math.sin(a) * r * 0.9;
        if (Math.hypot(x - 232, z + 352) < 26) continue;
        this.addTree(x, z, 0.9 + rand() * 0.5, true);
      }
    }

    clockTower() {
      const g = new T.Group();

      g.add(box(18, 3, 18, MAT.stone, 0, 1.5, 0));

      const shaft = box(11, 40, 11, patternedMat('#f6ead0', '#b7d0dc', 3, 10), 0, 3 + 20, 0);
      outline(shaft, 0.45);
      g.add(shaft);

      // 四面钟
      const face = this.clockFace();
      const head = box(14, 14, 14, MAT.cream, 0, 47, 0);
      outline(head, 0.4);
      g.add(head);

      [[0, 7.1, 0, 0], [0, -7.1, 0, Math.PI], [7.1, 0, 0, Math.PI / 2], [-7.1, 0, 0, -Math.PI / 2]].forEach(([x, z, , ry]) => {
        const dial = new T.Mesh(new T.CircleGeometry(4.8, 24), face);
        dial.position.set(x, 47, z);
        dial.rotation.y = ry;
        if (z !== 0) dial.position.z = z > 0 ? 0.4 : -0.4;
        if (x !== 0) dial.position.x = x > 0 ? 0.4 : -0.4;
        g.add(dial);
      });

      const roof = hipRoof(18, 18, 10, MAT.roofGreen);
      roof.position.y = 54;
      outline(roof, 0.45);
      g.add(roof);

      const tip = new T.Mesh(new T.ConeGeometry(1.2, 6, 6), toon(0xd9b45a));
      tip.position.y = 61;
      g.add(tip);

      return g;
    }

    clockFace() {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const g = cv.getContext('2d');
      g.fillStyle = '#fdfaf1';
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#2b3242';
      g.lineWidth = 10;
      g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.stroke();

      for (let i = 0; i < 9; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.lineWidth = i % 3 === 0 ? 9 : 5;
        g.beginPath();
        g.moveTo(128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96);
        g.lineTo(128 + Math.sin(a) * 110, 128 - Math.cos(a) * 110);
        g.stroke();
      }
      g.lineWidth = 9;
      g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(-0.9) * 66, 128 - Math.cos(-0.9) * 66); g.stroke();
      g.lineWidth = 7;
      g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(1.9) * 88, 128 - Math.cos(1.9) * 88); g.stroke();

      const tex = new T.CanvasTexture(cv);
      tex.colorSpace = T.SRGBColorSpace;
      return new T.MeshBasicMaterial({ map: tex });
    }

    hall() {
      const g = new T.Group();
      const W = 78, D = 54, H = 19;

      const base = box(W + 10, 2.4, D + 10, MAT.stone, 0, 1.2, 0);
      g.add(base);

      const body = box(W, H, D, patternedMat('#f8efdb', '#b7d6e4', 12, 3), 0, 2.4 + H / 2, 0);
      outline(body, 0.45);
      g.add(body);

      // 筒拱屋顶
      const roof = new T.Mesh(
        new T.CylinderGeometry(15, 15, W - 4, 26, 1, false, 0, Math.PI),
        toon(0x6d8a7e)
      );
      roof.rotation.z = Math.PI / 2;
      roof.position.y = 2.4 + H;
      roof.scale.set(1, 1, 0.95);
      outline(roof, 0.4);
      g.add(roof);

      // 门廊柱列
      for (let i = -3; i <= 3; i++) {
        const col = new T.Mesh(new T.CylinderGeometry(1.6, 1.8, 15, 8), MAT.cream);
        col.position.set(i * 9.4, 2.4 + 7.5, D / 2 + 6);
        g.add(col);
      }
      const portico = box(W - 6, 2, 12, MAT.cream, 0, 2.4 + 16, D / 2 + 6);
      outline(portico, 0.3);
      g.add(portico);

      // 玻璃前厅
      const glass = box(W - 26, 13, 2, MAT.glass, 0, 2.4 + 6.5, D / 2 + 0.6);
      g.add(glass);

      return g;
    }

    observatory() {
      const g = new T.Group();
      const base = new T.Mesh(new T.CylinderGeometry(13, 14, 4, 20), MAT.stone);
      base.position.y = 2;
      g.add(base);

      const shaft = new T.Mesh(new T.CylinderGeometry(9, 10, 12, 18), MAT.cream);
      shaft.position.y = 10;
      outline(shaft, 0.35);
      g.add(shaft);

      const dome = new T.Mesh(new T.SphereGeometry(9.4, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.white);
      dome.position.y = 16;
      outline(dome, 0.3);
      g.add(dome);

      // 望远镜缝
      const slit = box(2.4, 9, 1.2, MAT.ink, 0, 19, 7.6);
      g.add(slit);

      const tube = new T.Mesh(new T.CylinderGeometry(1.1, 1.4, 12, 8), MAT.steel);
      tube.position.set(0, 20, 4.4);
      tube.rotation.x = -0.9;
      g.add(tube);

      return g;
    }

    /* ---- 体育运动公园：田径场 + 球场 ---- */
    sportsPark(m) {
      const g = new T.Group();
      const rx = m.rx || 110, rz = m.rz || 74;

      const track = new T.Mesh(new T.RingGeometry(0.68, 1, 72), MAT.track);
      track.rotation.x = -Math.PI / 2;
      track.scale.set(rx, rz, 1);
      track.position.y = 0.3;
      g.add(track);

      const field = new T.Mesh(new T.CircleGeometry(0.675, 56), toon(0x79bb6e));
      field.rotation.x = -Math.PI / 2;
      field.scale.set(rx, rz, 1);
      field.position.y = 0.36;
      g.add(field);

      for (let k = 1; k <= 8; k++) {
        const rr = 0.68 + (0.32 * k) / 8;
        const pts = [];
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          pts.push(new T.Vector3(Math.cos(a) * rx * rr, 0.44, Math.sin(a) * rz * rr));
        }
        g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({ color: 0xfdf6e8, transparent: true, opacity: 0.8 })));
      }

      // 看台
      for (let i = 0; i < 7; i++) {
        g.add(box(18, 1.5, rz * 1.5 - i * 4, toon(0xd8cdb4), -rx - 16 - i * 3.4, 1 + i * 1.5, 0));
      }

      // 球类场地：蓝绿相间的 3 片
      const courts = [[rx + 52, -34, 34, 46], [rx + 52, 30, 34, 40], [rx + 92, -2, 28, 40]];
      courts.forEach(([x, z, w, d], i) => {
        const mat = toon(i % 2 ? 0x5d9f8e : 0x5d86b0);
        const c = box(w, 0.5, d, mat, x, 0.3, z);
        g.add(c);
        const lineMat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        const y = 0.6;
        const pts = [
          new T.Vector3(x - w / 2 + 2, y, z - d / 2 + 2),
          new T.Vector3(x + w / 2 - 2, y, z - d / 2 + 2),
          new T.Vector3(x + w / 2 - 2, y, z + d / 2 - 2),
          new T.Vector3(x - w / 2 + 2, y, z + d / 2 - 2),
          new T.Vector3(x - w / 2 + 2, y, z - d / 2 + 2)
        ];
        g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), lineMat));
      });

      return g;
    }

    garden() {
      const g = new T.Group();
      // 苗床
      for (let i = 0; i < 6; i++) {
        g.add(box(40, 0.4, 7, toon(0x8b7a5c), -20 + (i % 2) * 46, 0.2, -18 + Math.floor(i / 2) * 14));
      }
      return g;
    }

    greenhouse() {
      const g = new T.Group();
      for (let i = 0; i < 3; i++) {
        const vault = new T.Mesh(
          new T.CylinderGeometry(9, 9, 34, 16, 1, false, 0, Math.PI),
          MAT.glass
        );
        vault.rotation.z = Math.PI / 2;
        vault.position.set(-24 + i * 22, 9, 0);
        g.add(vault);
        g.add(box(34, 0.6, 18, MAT.stone, -24 + i * 22, 0.3, 0));
      }
      return g;
    }

    /* ---- 花田（薰衣草 / 玫瑰 / 樱花） ---- */
    flowerField(m, color, rows, bushes = false) {
      const g = new T.Group();
      const r = m.r || 40;

      if (bushes) {
        for (let i = 0; i < rows; i++) {
          const ring = 12 + i * 5;
          const n = 8 + i * 4;
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2 + i * 0.4;
            const b = new T.Mesh(new T.IcosahedronGeometry(2.6, 0), toon(color));
            b.position.set(Math.cos(a) * ring, 2.2, Math.sin(a) * ring * 0.8);
            g.add(b);
          }
        }
        return g;
      }

      // 条状花垄
      for (let i = 0; i < rows; i++) {
        const z = -r + (i / (rows - 1)) * r * 2;
        const strip = box(r * 1.8, 1.2, 2.6, toon(color), 0, 0.6, z);
        g.add(strip);
      }
      return g;
    }

    avenue(m) {
      const g = new T.Group();
      const len = m.len || 400;
      const floor = box(24, 0.3, len, toon(0xe8dfc8), 0, 0.2, 0);
      floor.rotation.y = m.rot || 0;
      g.add(floor);
      return g;
    }

    wall(m) {
      const g = new T.Group();
      const cv = document.createElement('canvas');
      cv.width = 1024; cv.height = 160;
      const c = cv.getContext('2d');
      c.fillStyle = '#d9cdb4';
      c.fillRect(0, 0, 1024, 160);
      c.fillStyle = '#3a2f26';
      c.font = 'bold 78px "Songti SC", "SimSun", serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('自 尊   致 知   正 义   力 行', 512, 84);

      const tex = new T.CanvasTexture(cv);
      tex.colorSpace = T.SRGBColorSpace;
      const mat = toon(0xffffff, { map: tex });

      const w = 60, h = 6;
      const body = box(w, h, 1.6, mat, 0, h / 2, 0);
      outline(body, 0.35);
      g.add(body);
      g.add(box(w + 4, 1, 3, MAT.stone, 0, 0.5, 0));
      g.add(box(w + 2, 0.8, 3.4, MAT.roofGreen, 0, h + 0.2, 0));
      g.rotation.y = m.rot || 0;
      return g;
    }

    fountain(m) {
      const g = new T.Group();
      const r = m.r || 22;

      const basin = new T.Mesh(new T.CylinderGeometry(r, r + 1, 2.2, 32), MAT.stone);
      basin.position.y = 1.1;
      g.add(basin);

      const water = new T.Mesh(new T.CircleGeometry(r - 1.6, 32), toon(C.water, { transparent: true, opacity: 0.9 }));
      water.rotation.x = -Math.PI / 2;
      water.position.y = 2.1;
      g.add(water);

      const stem = new T.Mesh(new T.CylinderGeometry(1.4, 2.4, 6, 12), MAT.cream);
      stem.position.y = 4;
      g.add(stem);

      const bowl = new T.Mesh(new T.CylinderGeometry(6, 3, 1.4, 20), MAT.cream);
      bowl.position.y = 7.2;
      g.add(bowl);

      const jet = new T.Mesh(
        new T.ConeGeometry(2.2, 12, 10, 1, true),
        new T.MeshBasicMaterial({ color: 0xbfe6f2, transparent: true, opacity: 0.6 })
      );
      jet.position.y = 13;
      g.add(jet);
      this.fountainJet = jet;

      return g;
    }

    metro() {
      const g = new T.Group();
      const body = box(44, 11, 24, MAT.glass, 0, 5.5, 0);
      outline(body, 0.35);
      g.add(body);
      g.add(box(46, 1.4, 26, MAT.steel, 0, 11.6, 0));

      // 入口雨棚
      g.add(box(18, 0.8, 9, MAT.roofBlue, -26, 4.6, 12));
      g.add(box(4, 4.6, 0.6, MAT.steel, -32, 2.3, 12));
      g.add(box(4, 4.6, 0.6, MAT.steel, -20, 2.3, 12));

      // M 标识
      const cv = document.createElement('canvas');
      cv.width = cv.height = 128;
      const c = cv.getContext('2d');
      c.fillStyle = '#d8453c';
      c.fillRect(0, 0, 128, 128);
      c.fillStyle = '#fff';
      c.font = 'bold 92px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('M', 64, 70);
      const tex = new T.CanvasTexture(cv);
      tex.colorSpace = T.SRGBColorSpace;
      const sign = new T.Mesh(new T.BoxGeometry(8, 8, 0.7), new T.MeshBasicMaterial({ map: tex }));
      sign.position.set(0, 17, 13);
      g.add(sign);
      g.add(box(0.8, 13, 0.8, MAT.steel, 0, 7, 13));

      return g;
    }

    market() {
      const g = new T.Group();
      for (let i = 0; i < 5; i++) {
        const b = box(26, 9, 16, patternedMat('#f7ead2', '#b7d0dc', 6, 2), -56 + i * 28, 4.5, (i % 2) * 10);
        outline(b, 0.3);
        g.add(b);
        g.add(box(28, 0.8, 18, i % 2 ? MAT.roofRed : MAT.roofBlue, -56 + i * 28, 9.4, (i % 2) * 10));
      }
      return g;
    }

    archive() {
      const g = new T.Group();
      const body = box(46, 14, 26, patternedMat('#f6ead0', '#b7d0dc', 8, 3), 0, 7, 0);
      outline(body, 0.4);
      g.add(body);
      const roof = hipRoof(50, 30, 7, MAT.roofRed);
      roof.position.y = 14;
      outline(roof, 0.35);
      g.add(roof);
      // 门廊
      for (let i = -2; i <= 2; i++) {
        const col = new T.Mesh(new T.CylinderGeometry(0.9, 1, 6, 8), MAT.cream);
        col.position.set(i * 5, 3, 14);
        g.add(col);
      }
      return g;
    }

    pavilion() {
      const g = new T.Group();
      const floor = new T.Mesh(new T.CylinderGeometry(9, 9, 1.2, 6), MAT.stone);
      floor.position.y = 0.6;
      g.add(floor);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const col = new T.Mesh(new T.CylinderGeometry(0.6, 0.7, 9, 6), MAT.wood);
        col.position.set(Math.cos(a) * 7, 4.5, Math.sin(a) * 7);
        g.add(col);
      }
      const roof = new T.Mesh(new T.ConeGeometry(12, 6, 6), MAT.roofGreen);
      roof.position.y = 12;
      outline(roof, 0.4);
      g.add(roof);
      return g;
    }

    landmarkGate() {
      const g = new T.Group();
      const w = 38;
      [-1, 1].forEach(s => {
        const p = box(5, 20, 5, MAT.stone, s * w / 2, 10, 0);
        outline(p);
        g.add(p);
      });
      g.add(box(w + 4, 3.4, 7, MAT.creamDark, 0, 21, 0));
      g.add(box(w + 8, 1.4, 10, MAT.roofGreen, 0, 23.4, 0));
      return g;
    }

    /* ======================================================================
     *  补充楼群：把航拍图里的组团密度补上（不参与图计算）
     * ====================================================================*/
    buildBlocks() {
      (CAMPUS.blocks || []).forEach(b => {
        const g = new T.Group();
        const base = terrainH(b.x, b.z);
        const h = (b.floors || 4) * 4.2;

        if (b.kind === 'dorm') this.blockDorm(g, b, h);
        else if (b.kind === 'arena') this.blockArena(g, b, h);
        else if (b.kind === 'school') this.blockSchool(g, b, h);
        else if (b.kind === 'court') this.blockCourt(g, b);
        else if (b.kind === 'parking') this.blockParking(g, b);
        else this.blockTeach(g, b, h);

        g.position.set(b.x, base, b.z);
        g.rotation.y = b.rot || 0;
        g.traverse(o => { if (o.isMesh) o.castShadow = false; });
        this.scene.add(g);
      });
    }

    blockTeach(g, b, h) {
      const wallMat = patternedMat('#f7ebd2', '#8fb9cf', Math.max(6, Math.round(b.w / 5)), Math.max(2, b.floors));
      const mainW = b.w, mainD = b.d;

      const body = box(mainW, h, mainD, wallMat, 0, h / 2, 0);
      outline(body, 0.34);
      g.add(body);

      const roof = gableRoof(mainW + 3, mainD + 3, Math.max(5, mainW * 0.07), MAT.roofRed);
      roof.position.y = h;
      outline(roof, 0.3);
      g.add(roof);

      // 两翼
      [-1, 1].forEach(s => {
        const wingW = mainW * 0.26;
        const wing = box(wingW, h - 4, mainD * 0.7, wallMat, s * (mainW / 2 + wingW / 2), (h - 4) / 2, 0);
        outline(wing, 0.3);
        g.add(wing);
        const wr = gableRoof(wingW + 2, mainD * 0.7 + 2, 4.6, MAT.roofRed);
        wr.position.set(s * (mainW / 2 + wingW / 2), h - 4, 0);
        wr.rotation.y = Math.PI / 2;
        g.add(wr);
      });

      // 入口门厅与台阶
      g.add(box(14, 6, 4, MAT.roofGreen, 0, 3, mainD / 2 + 1.4));
      g.add(box(20, 0.8, 6, MAT.stone, 0, 0.4, mainD / 2 + 4));
      g.add(box(mainW * 0.5, 0.7, 3, MAT.creamDark, 0, h - 0.4, mainD / 2 + 1));
    }

    blockDorm(g, b, h) {
      const wallMat = patternedMat('#f8eed6', '#a9c6d8', 10, 6);
      const rows = 3;
      const each = b.d / rows;

      for (let i = 0; i < rows; i++) {
        const z = -b.d / 2 + each * (i + 0.5);
        const body = box(b.w * 0.86, h, each * 0.56, wallMat, 0, h / 2, z);
        outline(body, 0.3);
        g.add(body);

        const roof = gableRoof(b.w * 0.86 + 2, each * 0.56 + 2, 4.4, i % 2 ? MAT.roofRed : MAT.roofRedDark);
        roof.position.set(0, h, z);
        g.add(roof);

        // 阳台
        for (let k = 0; k < 4; k++) {
          g.add(box(b.w * 0.15, 0.7, 1.8, MAT.creamDark, -b.w * 0.3 + k * b.w * 0.2, h * 0.55, z + each * 0.3));
        }
      }
    }

    blockArena(g, b, h) {
      const body = box(b.w, h, b.d, patternedMat('#f6ead0', '#9fc6d8', 10, 3), 0, h / 2, 0);
      outline(body, 0.4);
      g.add(body);

      // 弧形屋面
      const roof = new T.Mesh(
        new T.CylinderGeometry(b.d * 0.52, b.d * 0.52, b.w * 0.94, 24, 1, false, 0, Math.PI),
        MAT.roofBlue
      );
      roof.rotation.z = Math.PI / 2;
      roof.scale.set(1, 1, 0.62);
      roof.position.y = h;
      outline(roof, 0.4);
      g.add(roof);

      // 入口
      g.add(box(b.w * 0.4, h * 0.7, 3, MAT.glass, 0, h * 0.35, b.d / 2 + 1));
      g.add(box(b.w * 0.5, 0.9, 8, MAT.stone, 0, 0.45, b.d / 2 + 5));
    }

    blockCourt(g, b) {
      const ground = box(b.w, 0.4, b.d, toon(0x5d8fa8), 0, 0.2, 0);
      g.add(ground);
      const line = new T.LineBasicMaterial({ color: 0xfdfaf1, transparent: true, opacity: 0.85 });

      // 两片场地
      [-1, 1].forEach(sgn => {
        const cx = sgn * b.w * 0.24;
        const pts = [
          new T.Vector3(cx - b.w * 0.2, 0.5, -b.d * 0.36),
          new T.Vector3(cx + b.w * 0.2, 0.5, -b.d * 0.36),
          new T.Vector3(cx + b.w * 0.2, 0.5, b.d * 0.36),
          new T.Vector3(cx - b.w * 0.2, 0.5, b.d * 0.36),
          new T.Vector3(cx - b.w * 0.2, 0.5, -b.d * 0.36)
        ];
        g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), line));
        g.add(new T.Line(
          new T.BufferGeometry().setFromPoints([
            new T.Vector3(cx, 0.5, -b.d * 0.36), new T.Vector3(cx, 0.5, b.d * 0.36)
          ]), line));
      });

      // 灯柱
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const post = new T.Mesh(new T.CylinderGeometry(0.3, 0.4, 8, 5), MAT.steel);
        post.position.set(sx * (b.w / 2 - 2), 4, sz * (b.d / 2 - 2));
        g.add(post);
      });
    }

    blockParking(g, b) {
      const ground = box(b.w, 0.3, b.d, toon(0x8f8d86), 0, 0.15, 0);
      g.add(ground);
      const lineMat = new T.LineBasicMaterial({ color: 0xf2efe4, transparent: true, opacity: 0.8 });
      const cols = Math.round(b.w / 6);
      for (let i = 0; i <= cols; i++) {
        const x = -b.w / 2 + (b.w / cols) * i;
        g.add(new T.Line(
          new T.BufferGeometry().setFromPoints([
            new T.Vector3(x, 0.34, -b.d / 2 + 3),
            new T.Vector3(x, 0.34, 0)
          ]), lineMat));
      }
      // 几辆小车
      for (let i = 0; i < 8; i++) {
        const car = box(4.2, 2.6, 8.4, [toon(0xe6e2d6), toon(0x6f8aa8), toon(0xc06a58), toon(0x9aa89a)][i % 4],
          -b.w / 2 + 5 + i * (b.w - 10) / 8, 1.4, -b.d / 2 + 7);
        g.add(car);
      }
    }

    blockSchool(g, b, h) {
      const wallMat = patternedMat('#f7ebd2', '#a9c6d8', 12, 3);
      [-1, 0, 1].forEach(i => {
        const w = b.w * 0.3;
        const body = box(w, h, b.d * 0.7, wallMat, i * b.w * 0.33, h / 2, 0);
        outline(body, 0.3);
        g.add(body);
        const roof = gableRoof(w + 2, b.d * 0.7 + 2, 4.8, MAT.roofRed);
        roof.position.set(i * b.w * 0.33, h, 0);
        g.add(roof);
      });
      // 连廊
      g.add(box(b.w * 0.9, 4, 6, MAT.cream, 0, 5, b.d * 0.28));
    }

    /* ======================================================================
     *  树木（InstancedMesh）
     * ====================================================================*/
    buildTrees() {
      const spots = [];
      const cherry = [];
      const blocks = CAMPUS.blocks || [];

      const blocked = (x, z) => {
        if (Math.hypot((x + 430) / 1.0, (z + 430) / 0.93) < 200) return true;   // 湖
        if (Math.hypot(x - 1010, z + 290) < 195) return true;                    // 体育公园
        if (Math.hypot(x - 150, z + 290) < 40) return true;                      // 云山山顶
        if (Math.hypot(x - 232, z + 352) < 30) return true;                      // 天文台
        for (const n of this.nodes) {
          const clear = n.cat === '行政楼' ? 104
            : n.cat === '图书馆' ? 100
            : n.cat === '广场' ? 48
            : n.cat === '宿舍' ? 52
            : n.cat === '运动场' ? 110
            : 46;
          if (Math.hypot(x - n.x, z - n.z) < clear) return true;
        }
        for (const b of blocks) {
          if (Math.abs(x - b.x) < b.w / 2 + 8 && Math.abs(z - b.z) < b.d / 2 + 8) return true;
        }
        // 路面净空，树不要长在路中间
        for (const p of (this._roadPts || [])) {
          if (Math.abs(x - p.x) < 10 && Math.abs(z - p.z) < 10) return true;
        }
        for (const p of (this._ringPts || [])) {
          if (Math.abs(x - p.x) < 13 && Math.abs(z - p.z) < 13) return true;
        }
        return false;
      };

      // 1) 全域散点：靠近云山与外圈更密，形成山林
      for (let i = 0; i < 5600; i++) {
        const x = CX + (rand() - 0.5) * 2500;
        const z = CZ + (rand() - 0.5) * 2250;
        if (blocked(x, z)) continue;
        const r = Math.hypot((x - CX) / 1180, (z - CZ) / 1040);
        const hill = Math.exp(-(((x - 150) / 325) ** 2 + ((z + 290) / 262) ** 2) * 1.5);
        const forest = clamp(Math.max(hill * 1.25, smoothstep(0.9, 1.15, r)), 0, 1);
        if (rand() > 0.48 + forest * 0.42) continue;
        (rand() < 0.045 ? cherry : spots).push([x, z]);
      }

      // 2) 环路两侧的行道树
      if (this.ringCurve) {
        const n = 300;
        for (let i = 0; i < n; i++) {
          const p = this.ringCurve.getPointAt(i / n);
          const tan = this.ringCurve.getTangentAt(i / n);
          const nx = -tan.z, nz = tan.x;
          [-19, 19].forEach(off => {
            if (rand() < 0.24) return;
            const x = p.x + nx * off, z = p.z + nz * off;
            if (!blocked(x, z)) spots.push([x, z]);
          });
        }
      }

      // 3) 百家大道与图书馆前广场的行道树
      for (let i = 0; i < 44; i++) {
        const z = -170 + i * 10;
        [-14, 14].forEach(off => {
          const x = -330 + off;
          if (!blocked(x, z)) spots.push([x, z]);
        });
      }

      // 4) 泽湖岸线一圈垂柳与樱花
      for (let i = 0; i < 70; i++) {
        const a = rand() * Math.PI * 2;
        const k = lakeRadius(a, 1.14 + rand() * 0.16);
        const x = LAKE.x + Math.cos(a) * LAKE.rx * k;
        const z = LAKE.z + Math.sin(a) * LAKE.rz * k;
        if (blocked(x, z)) continue;
        (rand() < 0.5 ? cherry : spots).push([x, z]);
      }

      // 5) 外围林带：山脊与校园边界都种满，挡住地形边缘
      for (let i = 0; i < 1500; i++) {
        const a = rand() * Math.PI * 2;
        const rr = 1.0 + Math.pow(rand(), 0.7) * 0.55;
        const x = CX + Math.cos(a) * 1180 * rr;
        const z = CZ + Math.sin(a) * 1040 * rr;
        if (blocked(x, z)) continue;
        spots.push([x, z, 1.1 + Math.pow(rand(), 1.6) * 1.15, 1]);
      }

      // 6) 校园内部的几片林子
      const groves = [
        [40, 380], [-260, 420], [520, -320], [-560, 40], [860, 300], [180, -520],
        [30, -20], [330, 300], [-140, 260], [420, -180], [-40, 120], [720, 240]
      ];
      groves.forEach(([gx, gz]) => {
        for (let i = 0; i < 34; i++) {
          const a = rand() * Math.PI * 2;
          const r = Math.sqrt(rand()) * 62;
          const x = gx + Math.cos(a) * r;
          const z = gz + Math.sin(a) * r;
          if (!blocked(x, z)) spots.push([x, z, 0.95 + rand() * 0.5]);
        }
      });

      // 7) 樱花坪
      for (let i = 0; i < 70; i++) {
        const a = rand() * Math.PI * 2;
        const r = 20 + rand() * 86;
        cherry.push([-455 + Math.cos(a) * r, -585 + Math.sin(a) * r * 0.8]);
      }

      const trunkGeo = new T.CylinderGeometry(1.1, 1.5, 1, 5);
      const crownGeo = new T.IcosahedronGeometry(1, 0);

      const trunkMesh = new T.InstancedMesh(trunkGeo, toon(0x8a6a4a), spots.length + cherry.length);
      const crownMesh = new T.InstancedMesh(crownGeo, toon(0xffffff), spots.length);
      const cherryMesh = new T.InstancedMesh(crownGeo, toon(0xffffff), cherry.length);

      const dummy = new T.Object3D();
      const col = new T.Color();

      spots.forEach(([x, z, bs = 1, dark = 0], i) => {
        const s = (0.9 + rand() * 0.7) * bs;
        const y = terrainH(x, z);
        dummy.position.set(x, y + 4.4 * s, z);
        dummy.scale.set(s, s * 2.4, s);
        dummy.rotation.set(0, rand() * 6.28, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(x, y + 12.5 * s, z);
        dummy.scale.set(6.6 * s, 9.2 * s, 6.6 * s);
        dummy.updateMatrix();
        crownMesh.setMatrixAt(i, dummy.matrix);
        const g = 0.8 + rand() * 0.3;
        col.setRGB(0.19 * g * (dark ? 0.82 : 1), 0.37 * g * (dark ? 0.86 : 1), 0.19 * g * (dark ? 0.9 : 1));
        crownMesh.setColorAt(i, col);
      });

      cherry.forEach(([x, z], i) => {
        const s = 0.85 + rand() * 0.45;
        const y = terrainH(x, z);
        dummy.position.set(x, y + 4 * s, z);
        dummy.scale.set(s, s * 2, s);
        dummy.rotation.set(0, rand() * 6.28, 0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(spots.length + i, dummy.matrix);

        dummy.position.set(x, y + 10.5 * s, z);
        dummy.scale.set(6.4 * s, 7.0 * s, 6.4 * s);
        dummy.updateMatrix();
        cherryMesh.setMatrixAt(i, dummy.matrix);
        col.setHSL(0.94, 0.46, 0.79 + rand() * 0.07);
        cherryMesh.setColorAt(i, col);
      });

      [trunkMesh, crownMesh, cherryMesh].forEach(m => {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        this.scene.add(m);
      });

      // 樱花花瓣
      const petalCount = 260;
      const pgeo = new T.BufferGeometry();
      const pp = new Float32Array(petalCount * 3);
      for (let i = 0; i < petalCount; i++) {
        pp[i * 3] = -455 + (rand() - 0.5) * 340;
        pp[i * 3 + 1] = 10 + rand() * 120;
        pp[i * 3 + 2] = -585 + (rand() - 0.5) * 280;
      }
      pgeo.setAttribute('position', new T.BufferAttribute(pp, 3));
      const petals = new T.Points(pgeo, new T.PointsMaterial({
        color: 0xf6b8cb, size: 3.4, transparent: true, opacity: 0.85, sizeAttenuation: true
      }));
      this.scene.add(petals);
      this.petals = petals;
      this.petalSpeed = Array.from({ length: petalCount }, () => 4 + rand() * 6);
    }

    addTree(x, z, scale = 1, dark = false) {
      const g = new T.Group();
      const y = terrainH(x, z);
      const trunk = new T.Mesh(new T.CylinderGeometry(1, 1.4, 8 * scale, 5), toon(0x8a6a4a));
      trunk.position.y = 4 * scale;
      g.add(trunk);
      const crown = new T.Mesh(
        new T.IcosahedronGeometry(5.4 * scale, 0),
        toon(dark ? 0x3f6b3f : 0x4f8a4f)
      );
      crown.scale.y = 1.35;
      crown.position.y = 11 * scale;
      g.add(crown);
      g.position.set(x, y, z);
      this.scene.add(g);
      return g;
    }

    /* ======================================================================
     *  天空：渐变、太阳、云
     * ====================================================================*/
    buildSky() {
      const skyGeo = new T.SphereGeometry(4200, 32, 18);
      const skyMat = new T.ShaderMaterial({
        side: T.BackSide,
        uniforms: {
          top: { value: new T.Color(0x7db6e3) },
          bottom: { value: new T.Color(0xf3f0df) }
        },
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 top;
          uniform vec3 bottom;
          varying vec3 vPos;
          void main() {
            float h = clamp(normalize(vPos).y * 1.35 + 0.25, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottom, top, pow(h, 0.9)), 1.0);
          }`
      });
      this.scene.add(new T.Mesh(skyGeo, skyMat));

      // 太阳
      const sunCv = document.createElement('canvas');
      sunCv.width = sunCv.height = 256;
      const sg = sunCv.getContext('2d');
      const grad = sg.createRadialGradient(128, 128, 20, 128, 128, 126);
      grad.addColorStop(0, 'rgba(255,246,214,1)');
      grad.addColorStop(0.42, 'rgba(255,226,150,.5)');
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
      sun.scale.set(720, 720, 1);
      sun.position.set(-1200, 820, -1500);
      this.scene.add(sun);

      // 云
      const cloudTex = (() => {
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 128;
        const g = cv.getContext('2d');
        g.fillStyle = 'rgba(255,255,255,.95)';
        [[70, 78, 42], [118, 62, 52], [168, 80, 38], [206, 86, 28]].forEach(([x, y, r]) => {
          g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        });
        const tex = new T.CanvasTexture(cv);
        tex.colorSpace = T.SRGBColorSpace;
        return tex;
      })();

      this.clouds = [];
      for (let i = 0; i < 12; i++) {
        const sp = new T.Sprite(new T.SpriteMaterial({
          map: cloudTex, transparent: true, opacity: 0.9, depthWrite: false
        }));
        const a = rand() * Math.PI * 2;
        const r = 2100 + rand() * 1100;
        sp.position.set(CX + Math.cos(a) * r, 520 + rand() * 320, CZ + Math.sin(a) * r);
        const s = 300 + rand() * 260;
        sp.scale.set(s, s * 0.48, 1);
        sp.userData.speed = 1.5 + rand() * 4;
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
        const base = terrainH(p.x, p.z);
        this.addLabel(n.short, n.gate ? 'is-gate' : '', new T.Vector3(p.x, base + n.h + 40, p.z), n.id);
      });

      CAMPUS.landmarks.forEach(m => {
        if (!m.name || m.kind === 'lake' || m.kind === 'hill') return;
        const y = (this.labelY && this.labelY.get(m.name)) || terrainH(m.x, m.z) + 12;
        const item = this.addLabel(m.name, 'is-scenery', new T.Vector3(m.x, y, m.z));
        item.el.style.fontSize = '10px';
        item.el.style.opacity = '0.8';
      });

      // 湖与山单独放，位置更自然，优先级高于普通景物
      const wLabel = this.addLabel('泽 湖', 'is-scenery is-water', new T.Vector3(LAKE.x, LAKE.y + 6, LAKE.z));
      wLabel.el.style.fontSize = '15px';
      wLabel.forcePrio = 60;

      const hLabel = this.addLabel('云 山', 'is-scenery', new T.Vector3(150, terrainH(150, -290) + 22, -290));
      hLabel.el.style.fontSize = '14px';
      hLabel.forcePrio = 60;

      // 补充楼群：只在拉近时显示，避免全图拥挤
      (CAMPUS.blocks || []).forEach(b => {
        const y = terrainH(b.x, b.z) + (b.floors || 4) * 4.2 + 9;
        const item = this.addLabel(b.name, 'is-scenery is-minor', new T.Vector3(b.x, y, b.z));
        item.minor = true;
      });
    }

    /* ---------------- 交互：自由拖拽 ---------------- */
    bindControls() {
      const el = this.renderer.domElement;
      el.style.touchAction = 'none';

      let mode = null, lastX = 0, lastY = 0;

      const rotate = (dx, dy) => {
        this.sph.theta -= dx * 0.0045;
        this.sph.phi = clamp(this.sph.phi - dy * 0.0038, 0.1, 1.45);
      };

      const pan = (dx, dy) => {
        const scale = this.sph.radius * 0.0015;
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
        this.sph.radius = clamp(this.sph.radius * Math.exp(e.deltaY * 0.0011), 120, 3400);
      }, { passive: false });

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
          this.sph.radius = clamp(this.sph.radius * (pinch / d), 120, 3400);
          pinch = d;
        }
      }, { passive: true });
    }

    pick() {
      const hit = this.raycast();
      if (!hit) return;
      if (hit.id != null) this.onPick(hit.id);
      else if (hit.landmark) this.onPickLandmark(hit.landmark);
    }

    raycast() {
      if (!this.lastPointer) return null;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const nx = ((this.lastPointer.x - rect.left) / rect.width) * 2 - 1;
      const ny = -((this.lastPointer.y - rect.top) / rect.height) * 2 + 1;

      const ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2(nx, ny), this.camera);
      const hits = ray.intersectObjects(this.pickables, false);
      if (!hits.length) return null;
      const u = hits[0].object.userData;
      if (u.nodeId != null) return { id: u.nodeId, landmark: null };
      if (u.landmark) return { id: null, landmark: u.landmark };
      return null;
    }

    hoverTest() {
      if (!this.lastPointer) return;
      const hit = this.raycast();
      const key = hit ? (hit.id != null ? 'n' + hit.id : hit.landmark.name) : null;
      if (key === this.hoverId) return;
      this.hoverId = key;
      this.renderer.domElement.style.cursor = hit ? 'pointer' : '';
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
      if (this.pathGlow) {
        this.scene.remove(this.pathGlow);
        this.pathGlow.geometry.dispose();
        this.pathGlow = null;
      }
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
        if (!curve) {
          const va = this.worldPos.get(a), vb = this.worldPos.get(b);
          curve = new T.LineCurve3(va, vb);
        }
        const seg = curve.getPoints(16);
        const startPt = this.worldPos.get(a);
        if (seg[0].distanceTo(startPt) > seg[seg.length - 1].distanceTo(startPt)) seg.reverse();

        pts.push(...seg.map(p => new T.Vector3(p.x, p.y + 1.4, p.z)));
      }

      this.pathPoints = pts;
      const clean = pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 1.5);
      const curve = new T.CatmullRomCurve3(clean);
      this.pathCurve = curve;
      const glow = new T.Mesh(
        new T.TubeGeometry(curve, clean.length * 2, 6.4, 6, false),
        new T.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.28 })
      );
      glow.renderOrder = 3;
      this.scene.add(glow);
      this.pathGlow = glow;

      const geo = new T.TubeGeometry(curve, clean.length * 2, 3.6, 6, false);
      this.pathMesh = new T.Mesh(geo, new T.MeshBasicMaterial({
        color: 0xffb52e, transparent: true, opacity: 0.98
      }));
      this.pathMesh.renderOrder = 4;
      this.scene.add(this.pathMesh);

      if (!this.bus) {
        this.bus = new T.Group();
        const body = box(8, 4.4, 15, toon(0xffd24a));
        body.position.y = 3.4;
        outline(body, 0.3);
        const top = box(7.2, 2.2, 11, MAT.glass);
        top.position.y = 6.6;
        const wheelGeo = new T.CylinderGeometry(1.4, 1.4, 1, 8);
        const wheelMat = MAT.ink;
        [[-4, -5], [4, -5], [-4, 5], [4, 5]].forEach(([x, z]) => {
          const w = new T.Mesh(wheelGeo, wheelMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(x, 1.4, z);
          this.bus.add(w);
        });
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

      if (this.autoRotate && !this.dragging) this.sph.theta += dt * 0.032;

      const { theta, phi, radius } = this.sph;
      const x = this.target.x + radius * Math.sin(phi) * Math.sin(theta);
      const y = this.target.y + radius * Math.cos(phi);
      const z = this.target.z + radius * Math.sin(phi) * Math.cos(theta);
      this.camera.position.lerp(new T.Vector3(x, y, z), 0.16);
      this.camera.lookAt(this.target);

      if (this.ripples) {
        this.ripples.forEach(r => {
          const t = (this.time * 0.32 + r.userData.phase) % 1;
          const s = 0.6 + t * 2.6;
          r.scale.set(s, s, s);
          r.material.opacity = 0.4 * (1 - t);
        });
      }
      if (this.fountainJet) {
        this.fountainJet.scale.y = 0.9 + Math.sin(this.time * 2.2) * 0.12;
      }
      if (this.swans) {
        this.swans.forEach((s, i) => {
          s.position.x += Math.sin(this.time * 0.3 + i) * dt * 1.6;
          s.rotation.y = Math.sin(this.time * 0.25 + i) * 0.6;
        });
      }

      this.clouds.forEach(c => {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > CX + 1800) c.position.x = CX - 1800;
      });

      if (this.petals) {
        const pos = this.petals.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let yy = pos.getY(i) - this.petalSpeed[i] * dt;
          let xx = pos.getX(i) + Math.sin(this.time + i) * dt * 5;
          if (yy < 2) { yy = 90 + rand() * 60; xx = -455 + (rand() - 0.5) * 320; }
          pos.setY(i, yy);
          pos.setX(i, xx);
        }
        pos.needsUpdate = true;
      }

      this.rings.forEach((ring, id) => {
        if (this.nodeState.get(id) === 'current') {
          const s = 1 + Math.sin(this.time * 4) * 0.12;
          ring.scale.set(s, s, s);
        } else {
          ring.scale.set(1, 1, 1);
        }
      });

      if (this.bus && this.bus.visible && this.pathCurve) {
        this.busT = (this.busT + dt * 0.1) % 1;
        const p = this.pathCurve.getPointAt(this.busT);
        this.bus.position.set(p.x, p.y + 0.6, p.z);
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
        const onScreen = v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.97;
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
          prio = item.forcePrio || (item.minor ? 8 : 20);
          if (item.minor && this.sph.radius > 900) {
            item.el.style.display = 'none';
            return;
          }
          // 远景只保留主要地标
          if (this.sph.radius > 1350 && !/湖|山|钟楼|会堂|体育|图书馆/.test(item.el.textContent)) {
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
        item.el.style.opacity = dist > 2600 ? '0.35' : '';
      });

      if (this.scaleEl) {
        const mpp = 2 * this.sph.radius * Math.tan((this.camera.fov * Math.PI / 180) / 2) / h;
        const meters = Math.round(120 * mpp / 10) * 10;
        this.scaleEl.textContent = `≈ ${meters} m`;
      }
    }

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
      this.target.set(p.x, p.y + 20, p.z);
      this.sph.radius = 460;
    }
  }

  return CampusScene;
})();
