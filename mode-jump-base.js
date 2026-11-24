// ============================================================
// mode-jump-base.js —— 跳一跳逻辑工厂
// ============================================================
function createJumpMode(opt) {
  const cfg = Object.assign({
    playerColor: '#ff6b6b',
    bgTop: '#1a1a2e',
    bgBottom: '#16213e',
    platformColor: '#3d5a99',
    currentPlatformColor: '#4a7cc9',
    chargeSpeed: 0.02,
    minJump: 80,
    maxJump: 320,
    gapMin: 80,
    gapMax: 160,
    infinite: false,
    hasObstacles: false,
    obstacles: [],
  }, opt);

  let ctx, W, H;
  const state = { phase: 'idle', charge: 0, score: 0, best: 0 };
  const player = { x: 120, y: 0, w: 40, h: 40, jumpStartX: 0, jumpStartY: 0, jumpTargetX: 0, jumpTargetY: 0, jumpProgress: 0, jumpDuration: 30 };
  let platforms = [];
  let currentPlatformIndex = 0;
  let cameraX = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function createPlatform(x, y, w) { return { x, y, w, h: 16, obstacles: [] }; }
  function makeNextPlatform(last) {
    const w = rand(70, 130);
    const gap = rand(cfg.gapMin, cfg.gapMax);
    const nx = last.x + gap + last.w / 2;
    const ny = Math.max(H * 0.3, Math.min(H - 80, last.y + (Math.random() - 0.5) * 80));
    return createPlatform(nx, ny, w);
  }
  function generateObstaclesFor(p) {
    p.obstacles = [];
    if (!cfg.hasObstacles) return;
    cfg.obstacles.forEach(o => {
      if (Math.random() < (o.chance ?? 0.5)) {
        const ow = o.w ?? 20, oh = o.h ?? 20;
        const ox = p.x + rand(8, Math.max(8, p.w - ow - 8));
        p.obstacles.push({ x: ox, y: p.y - oh, w: ow, h: oh, color: o.color ?? '#e74c3c' });
      }
    });
  }
  function initPlatforms() {
    platforms = []; currentPlatformIndex = 0;
    const firstY = H - 120;
    platforms.push(createPlatform(60, firstY, 120));
    platforms.push(createPlatform(260, firstY - 40, 100));
    for (let i = 0; i < 8; i++) platforms.push(makeNextPlatform(platforms[platforms.length - 1]));
    platforms.forEach(generateObstaclesFor);
    const p0 = platforms[0];
    player.x = p0.x + p0.w / 2 - player.w / 2;
    player.y = p0.y - player.h;
    cameraX = 0;
  }
  function ensurePlatforms() {
    while (platforms.length < currentPlatformIndex + 10) {
      const p = makeNextPlatform(platforms[platforms.length - 1]);
      generateObstaclesFor(p);
      platforms.push(p);
    }
  }
  function startCharge() {
    if (state.phase === 'over') { reset(); return; }
    if (state.phase === 'idle') { state.phase = 'charging'; state.charge = 0; }
  }
  function releaseCharge() {
    if (state.phase !== 'charging') return;
    const p = platforms[currentPlatformIndex];
    const next = platforms[currentPlatformIndex + 1];
    if (!next) return;
    const jumpDist = cfg.minJump + (cfg.maxJump - cfg.minJump) * state.charge;
    player.jumpStartX = player.x; player.jumpStartY = player.y;
    const dir = next.x > p.x ? 1 : -1;
    const targetX = player.x + dir * jumpDist;
    let landY = H + 100;
    if (targetX + player.w > next.x && targetX < next.x + next.w) landY = next.y - player.h;
    player.jumpTargetX = targetX; player.jumpTargetY = landY;
    player.jumpProgress = 0; state.phase = 'jumping';
  }
  function reset() {
    state.phase = 'idle'; state.charge = 0; state.score = 0; cameraX = 0;
    initPlatforms();
  }

  return {
    init(env) {
      ctx = env.ctx; W = env.W; H = env.H;
      env.setInput({ press: startCharge, release: releaseCharge });
      initPlatforms();
    },
    update(dt) {
      if (state.phase === 'charging') state.charge = Math.min(1, state.charge + cfg.chargeSpeed);
      if (state.phase === 'jumping') {
        player.jumpProgress += 1 / player.jumpDuration;
        const t = Math.min(1, player.jumpProgress);
        player.x = player.jumpStartX + (player.jumpTargetX - player.jumpStartX) * t;
        const arc = Math.sin(Math.PI * t) * 80;
        player.y = player.jumpStartY + (player.jumpTargetY - player.jumpStartY) * t - arc;
        if (t >= 1) {
          const next = platforms[currentPlatformIndex + 1];
          const landed = next && player.x + player.w > next.x && player.x < next.x + next.w && player.jumpTargetY < H;
          let fail = !landed;
          if (landed && next.obstacles) {
            for (const ob of next.obstacles) {
              if (player.x + player.w > ob.x && player.x < ob.x + ob.w && player.y + player.h > ob.y && player.y < ob.y + ob.h) { fail = true; break; }
            }
          }
          if (!fail) {
            currentPlatformIndex++;
            player.x = next.x + next.w / 2 - player.w / 2;
            player.y = next.y - player.h;
            state.score++; if (state.score > state.best) state.best = state.score;
            cameraX = player.x - 120; ensurePlatforms(); state.phase = 'idle';
          } else {
            if (cfg.infinite) {
              const cur = platforms[currentPlatformIndex];
              player.x = cur.x + cur.w / 2 - player.w / 2;
              player.y = cur.y - player.h;
              state.phase = 'idle';
            } else state.phase = 'over';
          }
        }
      }
    },
    render(g, w, h) {
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, cfg.bgTop); bg.addColorStop(1, cfg.bgBottom);
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.save(); g.translate(-cameraX, 0);
      platforms.forEach((p, i) => {
        if (p.x + p.w < cameraX - 100 || p.x > cameraX + w + 100) return;
        const depth = 30;
        g.fillStyle = '#2c3e6b';
        g.beginPath();
        g.moveTo(p.x, p.y + p.h); g.lineTo(p.x + p.w, p.y + p.h);
        g.lineTo(p.x + p.w, p.y + p.h + depth); g.lineTo(p.x, p.y + p.h + depth);
        g.closePath(); g.fill();
        g.fillStyle = i === currentPlatformIndex ? cfg.currentPlatformColor : cfg.platformColor;
        g.fillRect(p.x, p.y, p.w, p.h);
        g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(p.x, p.y, p.w, 4);
        p.obstacles.forEach(ob => {
          g.fillStyle = ob.color; g.fillRect(ob.x, ob.y, ob.w, ob.h);
          g.beginPath(); g.moveTo(ob.x, ob.y); g.lineTo(ob.x + ob.w / 2, ob.y - 8); g.lineTo(ob.x + ob.w, ob.y); g.closePath(); g.fill();
        });
      });
      g.fillStyle = cfg.playerColor;
      g.fillRect(player.x, player.y, player.w, player.h);
      g.fillStyle = '#fff';
      g.fillRect(player.x + 8, player.y + 10, 6, 6);
      g.fillRect(player.x + player.w - 14, player.y + 10, 6, 6);
      g.restore();
      g.fillStyle = '#fff'; g.font = 'bold 24px sans-serif'; g.textAlign = 'left';
      g.fillText(`分数: ${state.score}`, 20, 40);
      g.font = '16px sans-serif'; g.fillStyle = '#aabbcc';
      g.fillText(`最高: ${state.best}`, 20, 66);
      if (state.phase === 'charging') {
        const bw = 200, bh = 12, bx = w / 2 - bw / 2, by = h - 50;
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(bx, by, bw, bh);
        g.fillStyle = '#ffb347'; g.fillRect(bx, by, bw * state.charge, bh);
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(bx, by, bw, bh);
      }
      if (state.phase === 'over') {
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 36px sans-serif';
        g.fillText('游戏结束', w / 2, h / 2 - 40);
        g.font = '24px sans-serif'; g.fillText(`得分: ${state.score}`, w / 2, h / 2 + 10);
        g.font = '16px sans-serif'; g.fillStyle = '#aabbcc';
        g.fillText('按空格或点击重新开始', w / 2, h / 2 + 60);
        g.textAlign = 'left';
      }
    },
    destroy() {},
  };
}