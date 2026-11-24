// ============================================================
// mode-baiyou.js —— 白游视角：开局安全起步，跳跃躲避
// ============================================================
window.GameAPI.registerMode('baiyou', (function () {
  'use strict';

  const STEP_M = 50;                 
  const VIEW_RANGE_M = 180;          
  const START_Y = 3000;              
  const TARGET_Y = 0;                
  
  const SPHERE_PERIOD = 6.0;         
  const WAVE_SPEED = 55;            
  const WAVE_THICKNESS_M = 3;        

  const SOURCE_SEED = [
    { x: -400, y: 600 },    
    { x: 400, y: 600 },     
    { x: -300, y: 300 },  
    { x: 300, y: 300 },   
    { x: 0, y: 0 }        
  ];

  const MINI_WORLD = {
    minX: -800, maxX: 800,
    minY: -100, maxY: 2600
  };

  let ctx, W, H;
  let miniX = 10, miniY = 0, miniW = 0, miniH = 0;

  let playerX, playerY;
  let sources = [];
  let trail = [];
  let message = '';
  let camX, camY;

  let visualX, visualY;
  let isJumping = false;
  let jumpTimer = 0;
  
  let moveTarget = { x: 0, y: 0 };
  let clickMarker = { x: 0, y: 0, time: 0, success: false };

  const PLAYER_SCREEN_Y_RATIO = 0.75;

  let isDraggingMini = false;
  let dragOffset = { x: 0, y: 0 };

  function reset() {
    playerX = 0;
    playerY = START_Y;
    camX = playerX;
    camY = playerY;
    visualX = playerX;
    visualY = playerY;
    isJumping = false;
    jumpTimer = 0;
    trail = [{ wx: playerX, wy: playerY }];
    message = '';
    clickMarker.time = 0;
    
    sources = SOURCE_SEED.map(function (s, i) {
      // 【修改点】：开局只有一圈刚扩散了 50 米的波，玩家绝对安全
      return { x: s.x, y: s.y, waves: [{ r: 50 }], timer: 0 };
    });

    if (miniW > 0) {
      miniX = 10;
      miniY = H - miniH - 10;
    }
  }

  function win() { message = '任务成功，接到冬冬'; }
  function fail() { message = '任务失败，被波击中'; }

  function isSafe(wx, wy) {
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      for (let j = 0; j < s.waves.length; j++) {
        const wv = s.waves[j];
        const d = Math.hypot(wx - s.x, wy - s.y);
        if (Math.abs(d - wv.r) < WAVE_THICKNESS_M) return false;
      }
    }
    return true;
  }

  function worldToScreen(wx, wy) {
    const scale = Math.min(W / (VIEW_RANGE_M * 2), H / (VIEW_RANGE_M * 2));
    const screenX = W * 0.5 + (wx - camX) * scale;
    const screenY = H * PLAYER_SCREEN_Y_RATIO + (wy - camY) * scale;
    return { sx: screenX, sy: screenY, scale: scale };
  }

  function worldToMini(wx, wy) {
    const drawW = miniW - 20;
    const drawH = miniH - 20;
    const worldRangeX = MINI_WORLD.maxX - MINI_WORLD.minX;
    const worldRangeY = MINI_WORLD.maxY - MINI_WORLD.minY;
    const scale = Math.min(drawW / worldRangeX, drawH / worldRangeY);

    const centerX = miniX + miniW * 0.5;
    const centerY = miniY + miniH * 0.5;
    const cWx = (MINI_WORLD.minX + MINI_WORLD.maxX) / 2;
    const cWy = (MINI_WORLD.minY + MINI_WORLD.maxY) / 2;

    const screenX = centerX + (wx - cWx) * scale;
    const screenY = centerY + (wy - cWy) * scale;

    return { sx: screenX, sy: screenY, scale: scale };
  }

  function handlePointerDown(pt) {
    if (!pt) return;
    if (message) { reset(); return; }

    if (pt.x >= miniX && pt.x <= miniX + miniW && pt.y >= miniY && pt.y <= miniY + miniH) {
      isDraggingMini = true;
      dragOffset.x = pt.x - miniX;
      dragOffset.y = pt.y - miniY;
      return;
    }

    if (isJumping) return;

    let jumpDirX = 0;
    let jumpDirY = -1;

    if (pt.y < H * PLAYER_SCREEN_Y_RATIO - 50) {
      jumpDirX = (pt.x - W * 0.5) / (W * 0.5); 
      jumpDirY = -1;
      const len = Math.hypot(jumpDirX, jumpDirY);
      jumpDirX /= len;
      jumpDirY /= len;
    }

    let endX = playerX + jumpDirX * STEP_M;
    let endY = playerY + jumpDirY * STEP_M;

    let foundSafe = false;
    let finalX = endX;
    let finalY = endY;

    if (isSafe(endX, endY)) {
      foundSafe = true;
    } else {
      for (let angleOffset = 0.1; angleOffset <= 1.0; angleOffset += 0.1) {
        let tx1 = playerX + (jumpDirX * Math.cos(angleOffset) - jumpDirY * Math.sin(angleOffset)) * STEP_M;
        let ty1 = playerY + (jumpDirY * Math.cos(angleOffset) + jumpDirX * Math.sin(angleOffset)) * STEP_M;
        if (isSafe(tx1, ty1)) { finalX = tx1; finalY = ty1; foundSafe = true; break; }
        
        let tx2 = playerX + (jumpDirX * Math.cos(-angleOffset) - jumpDirY * Math.sin(-angleOffset)) * STEP_M;
        let ty2 = playerY + (jumpDirY * Math.cos(-angleOffset) + jumpDirX * Math.sin(-angleOffset)) * STEP_M;
        if (isSafe(tx2, ty2)) { finalX = tx2; finalY = ty2; foundSafe = true; break; }
      }
    }

    if (foundSafe) {
      playerX = finalX;
      playerY = finalY;
      trail.push({ wx: playerX, wy: playerY });
      camX = playerX;
      camY = playerY;
      
      moveTarget = { x: finalX, y: finalY };
      clickMarker = { x: finalX, y: finalY, time: 0.4, success: true };
      
      isJumping = true;
      jumpTimer = 0.15;

      if (playerY <= TARGET_Y + 1) win();
    } else {
      fail();
    }
  }

  function handlePointerMove(pt) {
    if (!pt) return;
    
    if (isDraggingMini) {
      miniX = pt.x - dragOffset.x;
      miniY = pt.y - dragOffset.y;
      miniX = Math.max(0, Math.min(W - miniW, miniX));
      miniY = Math.max(0, Math.min(H - miniH, miniY));
    }
  }

  function handlePointerUp() {
    isDraggingMini = false;
  }

  function drawMainPanel() {
    ctx.save();
    ctx.fillStyle = '#0e1525';
    ctx.fillRect(0, 0, W, H);

    const scale = Math.min(W / (VIEW_RANGE_M * 2), H / (VIEW_RANGE_M * 2));

    const gridStep = 50;
    const topLeft = { x: camX + (0 - W * 0.5) / scale, y: camY + (0 - H * PLAYER_SCREEN_Y_RATIO) / scale };
    const botRight = { x: camX + (W - W * 0.5) / scale, y: camY + (H - H * PLAYER_SCREEN_Y_RATIO) / scale };

    const startWx = Math.floor(topLeft.x / gridStep) * gridStep;
    const endWx = Math.ceil(botRight.x / gridStep) * gridStep;
    const startWy = Math.floor(topLeft.y / gridStep) * gridStep;
    const endWy = Math.ceil(botRight.y / gridStep) * gridStep;

    ctx.strokeStyle = 'rgba(80, 140, 200, 0.15)';
    ctx.lineWidth = 1;

    for (let wy = startWy; wy <= endWy; wy += gridStep) {
      const p1 = worldToScreen(startWx, wy);
      const p2 = worldToScreen(endWx, wy);
      ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.stroke();
    }
    for (let wx = startWx; wx <= endWx; wx += gridStep) {
      const p1 = worldToScreen(wx, startWy);
      const p2 = worldToScreen(wx, endWy);
      ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(74, 255, 155, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const p = worldToScreen(trail[i].wx, trail[i].wy);
      if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
    }
    ctx.stroke();

    for (let si = 0; si < sources.length; si++) {
      const s = sources[si];
      const pS = worldToScreen(s.x, s.y);
      
      ctx.fillStyle = '#ff3030';
      ctx.beginPath(); ctx.arc(pS.sx, pS.sy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();

      for (let wi = 0; wi < s.waves.length; wi++) {
        const wv = s.waves[wi];
        const radiusPx = wv.r * scale;
        if (radiusPx > 0 && Math.hypot(pS.sx - W/2, pS.sy - H/2) - radiusPx < Math.max(W, H)) {
          ctx.beginPath();
          ctx.arc(pS.sx, pS.sy, radiusPx, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 230, 255, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    const pTarget = worldToScreen(0, TARGET_Y);
    ctx.fillStyle = 'rgba(212, 22, 19, 0.8)';
    ctx.beginPath(); ctx.arc(pTarget.sx, pTarget.sy, 6, 0, Math.PI * 2); ctx.fill();

    if (clickMarker.time > 0) {
      const cp = worldToScreen(clickMarker.x, clickMarker.y);
      const pp = worldToScreen(visualX, visualY);
      ctx.beginPath(); ctx.moveTo(pp.sx, pp.sy); ctx.lineTo(cp.sx, cp.sy);
      ctx.strokeStyle = clickMarker.success ? 'rgba(155, 202, 230, 0.78)' : 'rgba(255,32,32,0.5)';
      ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    }

    const pp = worldToScreen(visualX, visualY);
    ctx.fillStyle = '#4aff9b'; 
    ctx.beginPath(); ctx.arc(pp.sx, pp.sy, 5, 0, Math.PI * 2); ctx.fill();
    
    ctx.strokeStyle = 'rgba(74,255,155,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pp.sx, pp.sy, 50 * scale, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
  }

  function drawMiniPanel() {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 16, 28, 0.92)'; 
    ctx.fillRect(miniX, miniY, miniW, miniH);
    
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.6)'; 
    ctx.lineWidth = 2; 
    ctx.strokeRect(miniX, miniY, miniW, miniH);
    
    ctx.beginPath(); ctx.rect(miniX, miniY, miniW, miniH); ctx.clip();

    if (trail.length >= 2) {
      ctx.strokeStyle = 'rgba(74, 255, 155, 0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < trail.length; i++) {
        const p = worldToMini(trail[i].wx, trail[i].wy);
        if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy);
      }
      ctx.stroke();
    }

    for (let si = 0; si < sources.length; si++) {
      const s = sources[si];
      const sp = worldToMini(s.x, s.y);
      ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(sp.sx, sp.sy, 4, 0, Math.PI * 2); ctx.fill();
      for (let wi = 0; wi < s.waves.length; wi++) {
        const wv = s.waves[wi];
        ctx.strokeStyle = 'rgba(100, 190, 255, 0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sp.sx, sp.sy, wv.r * sp.scale, 0, Math.PI * 2); ctx.stroke();
      }
    }

    const pc = worldToMini(0, TARGET_Y);
    ctx.fillStyle = 'rgba(74, 255, 155, 0.8)'; ctx.beginPath(); ctx.arc(pc.sx, pc.sy, 5, 0, Math.PI * 2); ctx.fill();

    const pp = worldToMini(visualX, visualY);
    ctx.fillStyle = '#4aff9b'; ctx.beginPath(); ctx.arc(pp.sx, pp.sy, 4, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(180, 210, 240, 0.8)'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('全局 (可拖动)', miniX + 6, miniY + 14);
    ctx.restore();
  }

  function layout() {
    miniW = W * 0.28;
    miniH = H * 0.28;
    if (miniX === 0 && miniY === 0) {
      miniX = 10;
      miniY = H - miniH - 10;
    }
  }

  return {
    init: function (env) {
      ctx = env.ctx; W = env.W; H = env.H;
      miniW = W * 0.28;
      miniH = H * 0.28;
      miniX = 10;
      miniY = H - miniH - 10;
      
      reset();
      env.setInput({
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp
      });
    },
    update: function (dt) {
      if (clickMarker.time > 0) clickMarker.time -= dt;
      if (message) return;

      if (isJumping) {
        jumpTimer -= dt;
        if (jumpTimer <= 0 || Math.hypot(moveTarget.x - visualX, moveTarget.y - visualY) < 5) {
          visualX = playerX;
          visualY = playerY;
          isJumping = false;
        } else {
          visualX += (playerX - visualX) * 20 * dt;
          visualY += (playerY - visualY) * 20 * dt;
        }
      } else {
        visualX = playerX;
        visualY = playerY;
      }

      camX = visualX;
      camY = visualY;

      if (!isJumping) {
        for (let i = 0; i < sources.length; i++) {
          const s = sources[i];
          s.timer += dt;
          if (s.timer >= SPHERE_PERIOD) {
            s.timer -= SPHERE_PERIOD;
            s.waves.push({ r: 0 });
          }
          for (let j = 0; j < s.waves.length; j++) {
            const wv = s.waves[j];
            wv.r += WAVE_SPEED * dt;
            const d = Math.hypot(playerX - s.x, playerY - s.y);
            if (Math.abs(d - wv.r) < WAVE_THICKNESS_M) {
              fail();
              return;
            }
          }
          s.waves = s.waves.filter(function (wv) { return wv.r <= 4000; });
        }
      } else {
        for (let i = 0; i < sources.length; i++) {
          const s = sources[i];
          s.timer += dt;
          if (s.timer >= SPHERE_PERIOD) {
            s.timer -= SPHERE_PERIOD;
            s.waves.push({ r: 0 });
          }
          for (let j = 0; j < s.waves.length; j++) {
            s.waves[j].r += WAVE_SPEED * dt;
          }
          s.waves = s.waves.filter(function (wv) { return wv.r <= 4000; });
        }
      }
    },
    render: function (g2, w, h) {
      if (w !== W || h !== H) { W = w; H = h; }
      drawMainPanel();
      drawMiniPanel();
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('距离终点: ' + Math.round(playerY) + ' 米', 20, 35);

      if (message) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = message === '任务成功，接到冬冬' ? '#4aff9b' : '#ff6b6b';
        ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(message, W / 2, H / 2);
        ctx.font = '16px sans-serif'; ctx.fillStyle = '#aabbcc';
        ctx.fillText('点击屏幕重新开始', W / 2, H / 2 + 50);
        ctx.textAlign = 'left';
      }
    },
    destroy: function () {}
  };
})());