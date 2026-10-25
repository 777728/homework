/* ============================================================================
 *  app.js —— 启动：挂选项卡、键盘快捷键、首个实验自动播放
 * ==========================================================================*/

(() => {
  const registry = [1, 2, 3, 4].map(id => WB.labs.get(id)).filter(Boolean);
  const activate = WB.setupTabs(registry);

  // 默认进入实验一，动画自动开始并循环
  activate(1);

  // 空格：播放 / 暂停；左右方向键：单步
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const active = [...document.querySelectorAll('.lab')].find(sec => sec.classList.contains('is-active'));
    if (!active) return;
    const lab = registry.find(l => l.section === active);
    if (!lab) return;

    if (e.code === 'Space') {
      e.preventDefault();
      lab.player.toggle();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      lab.player.next();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      lab.player.prev();
    } else if (e.code === 'KeyF') {
      const fs = active.querySelector('.fs-btn');
      if (fs) fs.click();
    }
  });

  // 切走实验四时暂停 3D 渲染，省电
  document.querySelectorAll('#tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = Number(tab.dataset.lab);
      registry.forEach(l => {
        if (l.getScene) {
          const sc = l.getScene();
          if (sc) sc.setRunning(id === 4);
        }
      });
    });
  });

  window.addEventListener('resize', () => {
    registry.forEach(l => {
      if (l.onResize) l.onResize();
      if (l.getScene) {
        const sc = l.getScene();
        if (sc) sc.resize();
      }
    });
  });
})();
