// ============================================================
// mode-wuxian.js —— 无限视角（单准星无辅助线，极慢蓄力）
// ============================================================
window.GameAPI.registerMode('wuxian', (function () {
  'use strict';


  const PLAYER_IMG_URL = './player.png';
  let playerImg = null;
  let isImgLoaded = false;
  try {
    playerImg = new Image();
    playerImg.onload = function() { isImgLoaded = true; };
    playerImg.src = PLAYER_IMG_URL;
  } catch(e) {}

  const MIN_DIST = 10;
  const MAX_DIST = 50;
  
  // 修改：蓄力速度大幅放慢，从 15 降到 4
  const CHARGE_SPEED = 10; 

  const TOLERANCE_ANGLE = 0.2;
  const TOLERANCE_DIST = 1.0;
  const WIN_COUNT = 30;

  const LANES = [
    { name: '左3号方位',  angle: -Math.PI * 0.15 },
    { name: '左2号方位',  angle: -Math.PI * 0.08 },
    { name: '1号方位 (正前)',  angle: 0 },
    { name: '右2号方位',  angle: Math.PI * 0.08 },
    { name: '右3号方位',  angle: Math.PI * 0.15 },
  ];

  const ROCK_TYPES = [
    { id: 'baiyan', name: '文白岩', color: '#e74c3c' },
    { id: 'jingang', name: '金刚岩', color: '#2980b9' }
  ];

  const BTN_W = 160;
  const BTN_H = 70;

  let state = {
    phase: 'aim',
    currentAngle: 0,
    targetAngle: 0,
    chargeDist: 0,
    targetLane: 2,
    targetDist: 20,
    resultMsg: '',
    isSuccess: false,
    jumpProgress: 0,
    jumpStartX: 0,
    jumpStartY: 0,
    jumpEndX: 0,
    jumpEndY: 0,
    score: 0,
    platforms: [],
    targetRock: 0,
    rockRemainCount: 0,
    qteTimer: 0,
    pointerX: null,
    pointerY: null
  };

  let ctx, W, H;
  let cx, cy;

  function reset() {
    state.phase = 'aim';
    state.currentAngle = 0;
    state.targetAngle = 0;
    state.chargeDist = 0;
    state.score = 0;
    state.platforms = [{ x: 0, y: 0, isTarget: false }];
    state.rockRemainCount = 0;
    state.pointerX = null;
    state.pointerY = null;
    generateTarget();
  }

  function generateTarget() {
    state.targetLane = Math.floor(Math.random() * 5);
    state.targetDist = MIN_DIST + Math.floor(Math.random() * (MAX_DIST - MIN_DIST));

    if (state.rockRemainCount <= 0) {
      state.targetRock = Math.floor(Math.random() * 2);
      state.rockRemainCount = 2 + Math.floor(Math.random() * 3);
    } else {
      state.rockRemainCount--;
    }
  }

  function getScreenPos(angle, dist) {
    const maxPixelRadius = Math.min(W, H) * 0.75;
    const pixelDist = (dist / MAX_DIST) * maxPixelRadius;
    const dx = Math.sin(angle) * pixelDist;
    const dy = -Math.cos(angle) * pixelDist;
    return { x: cx + dx, y: cy + dy };
  }

  function screenToAngle(sx, sy) {
    const dx = sx - cx;
    const dy = cy - sy;
    let angle = Math.atan2(dx, dy);
    const maxA = Math.PI * 0.2;
    return Math.max(-maxA, Math.min(maxA, angle));
  }

  function handlePointerMove(pt) {
    if (!pt) return;
    if (state.phase !== 'aim' && state.phase !== 'charging') return;

    state.pointerX = pt.x;
    state.pointerY = pt.y;
    state.targetAngle = screenToAngle(pt.x, pt.y);
  }

  function handlePointerDown(pt) {
    if (state.phase === 'result') { reset(); return; }

    if (state.phase === 'qte') {
      const btnY = H * 0.65;
      const leftX = W/2 - BTN_W - 20;
      const rightX = W/2 + 20;
      const buffer = 30;

      const clickLeft = (pt.x >= leftX - buffer && pt.x <= leftX + BTN_W + buffer && pt.y >= btnY - buffer && pt.y <= btnY + BTN_H + buffer);
      const clickRight = (pt.x >= rightX - buffer && pt.x <= rightX + BTN_W + buffer && pt.y >= btnY - buffer && pt.y <= btnY + BTN_H + buffer);

      if (clickLeft) {
        if (state.targetRock === 0) successStep();
        else { state.phase = 'result'; state.resultMsg = '你被发现了！坚持了 ' + state.score + ' 次'; }
      } else if (clickRight) {
        if (state.targetRock === 1) successStep();
        else { state.phase = 'result'; state.resultMsg = '你被发现了！坚持了 ' + state.score + ' 次'; }
      }
      return;
    }

    if (state.phase === 'aim') {
      state.phase = 'charging';
      state.chargeDist = 0;
      state.pointerX = pt.x;
      state.pointerY = pt.y;
      state.targetAngle = screenToAngle(pt.x, pt.y);
    }
  }

  function handlePointerUp() {
    if (state.phase !== 'charging') return;

    state.phase = 'jumping';
    state.jumpProgress = 0;
    state.currentAngle = state.targetAngle; 

    const targetScreenPos = getScreenPos(state.currentAngle, state.chargeDist);
    state.jumpStartX = cx;
    state.jumpStartY = cy - 50;
    state.jumpEndX = targetScreenPos.x;
    state.jumpEndY = targetScreenPos.y;

    const targetLaneAngle = LANES[state.targetLane].angle;
    const angleDiff = Math.abs(state.currentAngle - targetLaneAngle);
    const distDiff = Math.abs(state.chargeDist - state.targetDist);
    state.isSuccess = (angleDiff <= TOLERANCE_ANGLE && distDiff <= TOLERANCE_DIST);
  }

  function successStep() {
    state.score++;
    if (state.score >= WIN_COUNT) {
      state.phase = 'result';
      state.resultMsg = '任务成功，接到冬冬';
    } else {
      state.phase = 'aim';
      state.chargeDist = 0;
      state.pointerX = null;
      state.pointerY = null;
      generateTarget();
    }
  }

  function draw3DBlock(sx, sy, size, colorTop, colorSide) {
    ctx.save();
    const h = size * 0.4;
    const w = size;
    const d = size * 0.6;

    ctx.fillStyle = colorSide;
    ctx.beginPath();
    ctx.moveTo(sx - w, sy); ctx.lineTo(sx, sy + d * 0.5); ctx.lineTo(sx, sy + d * 0.5 + h); ctx.lineTo(sx - w, sy + h); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + w, sy); ctx.lineTo(sx, sy + d * 0.5); ctx.lineTo(sx, sy + d * 0.5 + h); ctx.lineTo(sx + w, sy + h); ctx.fill();

    ctx.fillStyle = colorTop;
    ctx.beginPath();
    ctx.moveTo(sx, sy - d * 0.5); ctx.lineTo(sx + w, sy); ctx.lineTo(sx, sy + d * 0.5); ctx.lineTo(sx - w, sy); ctx.closePath(); ctx.fill();

    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  function drawPlayer(sx, sy) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(sx, sy, 30, 12, 0, 0, Math.PI * 2); ctx.fill();

    if (isImgLoaded && playerImg && playerImg.width > 0) {
      const baseHeight = 120;
      const ratio = playerImg.width / playerImg.height || 1;
      const imgW = baseHeight * ratio;
      const imgH = baseHeight;
      ctx.drawImage(playerImg, sx - imgW / 2, sy - imgH, imgW, imgH);
    } else {
      ctx.fillStyle = '#4a90e2';
      ctx.beginPath();
      ctx.moveTo(sx - 20, sy); ctx.quadraticCurveTo(sx - 15, sy - 50, sx, sy - 50); ctx.quadraticCurveTo(sx + 15, sy - 50, sx + 20, sy); ctx.fill();
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath(); ctx.arc(sx, sy - 65, 18, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    cx = W / 2;
    cy = H * 0.8;

    ctx.fillStyle = '#e4e8eb';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    LANES.forEach(function(lane) {
      const farPos = getScreenPos(lane.angle, 55);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(farPos.x, farPos.y); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(lane.name, farPos.x, farPos.y);
    });
    ctx.restore();

    state.platforms.forEach(function(p) {
      draw3DBlock(cx + p.x, cy + p.y, 30, p.isTarget ? '#e74c3c' : '#888', p.isTarget ? '#c0392b' : '#555');
    });

    if (state.phase !== 'result' || state.isSuccess) {
      const tLane = LANES[state.targetLane];
      const tPos = getScreenPos(tLane.angle, state.targetDist);
      ctx.fillStyle = 'rgba(231, 76, 60, 0.4)'; ctx.beginPath(); ctx.ellipse(tPos.x, tPos.y, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(tPos.x, tPos.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(state.targetDist + 'm', tPos.x, tPos.y - 18);
    }

    if (state.phase === 'aim' || state.phase === 'charging') {
      const aimPos = getScreenPos(state.currentAngle, state.chargeDist);
      
      // 单一准星，去掉了之前的辅助虚线
      ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(aimPos.x - 10, aimPos.y); ctx.lineTo(aimPos.x + 10, aimPos.y); ctx.moveTo(aimPos.x, aimPos.y - 10); ctx.lineTo(aimPos.x, aimPos.y + 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(aimPos.x, aimPos.y, 15, 0, Math.PI * 2); ctx.stroke();
    }

    if (state.phase === 'jumping') {
      const t = state.jumpProgress;
      const curX = state.jumpStartX + (state.jumpEndX - state.jumpStartX) * t;
      const curY = state.jumpStartY + (state.jumpEndY - state.jumpStartY) * t - Math.sin(t * Math.PI) * 60;
      drawPlayer(curX, curY);

      if (t >= 1) {
        state.jumpProgress = 1;
        const offsetX = state.jumpEndX - cx;
        const offsetY = state.jumpEndY - cy;

        if (state.isSuccess) {
          state.platforms.forEach(function(p) { p.x -= offsetX; p.y -= offsetY; });
          state.platforms.push({ x: 0, y: 0, isTarget: false });
          state.phase = 'qte'; state.qteTimer = 1.5;
        } else {
          state.phase = 'result'; state.resultMsg = '任务失败，坚持了 ' + state.score + ' 次';
          state.platforms.push({ x: offsetX, y: offsetY, isTarget: true });
        }
      }
    } else if (state.phase === 'aim' || state.phase === 'charging' || state.phase === 'qte') {
      drawPlayer(cx, cy);
    }

    if (state.phase === 'qte') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(0, 0, W, H);
      const btnY = H * 0.65, leftX = W/2 - BTN_W - 20, rightX = W/2 + 20;
      const timeBarW = BTN_W * 2 + 40, timeBarX = W / 2 - timeBarW / 2, timeBarY = btnY - 35;

      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(timeBarX, timeBarY, timeBarW, 15);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(timeBarX, timeBarY, timeBarW * (state.qteTimer / 1.5), 15);

      ctx.fillStyle = '#e74c3c'; ctx.fillRect(leftX, btnY, BTN_W, BTN_H); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(leftX, btnY, BTN_W, BTN_H);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('文白岩', leftX + BTN_W/2, btnY + BTN_H/2);

      ctx.fillStyle = '#2980b9'; ctx.fillRect(rightX, btnY, BTN_W, BTN_H); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(rightX, btnY, BTN_W, BTN_H);
      ctx.fillStyle = '#fff'; ctx.fillText('金刚岩', rightX + BTN_W/2, btnY + BTN_H/2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(15, 15, 280, 70);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('目标方位:', 60, 30); ctx.fillStyle = '#ff6b6b'; ctx.fillText(LANES[state.targetLane].name, 180, 30);
    ctx.fillStyle = '#fff'; ctx.fillText('目标距离:', 60, 50); ctx.fillStyle = '#ff6b6b'; ctx.fillText(state.targetDist + ' 米', 180, 50);
    ctx.fillStyle = '#fff'; ctx.fillText('岩石属性:', 60, 70); ctx.fillStyle = ROCK_TYPES[state.targetRock].color; ctx.fillText(ROCK_TYPES[state.targetRock].name, 180, 70);

    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(W - 180, 15, 165, 50);
    ctx.fillStyle = '#4aff9b'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('进度: ' + state.score + ' / ' + WIN_COUNT, W - 97, 48); ctx.textAlign = 'left';

    if (state.phase === 'charging') {
      const barW = 300, barX = W / 2 - barW / 2, barY = H - 60, pct = Math.max(0, state.chargeDist / MAX_DIST);

      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(barX, barY, barW, 16);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(barX, barY, barW * Math.min(1, pct), 16);
      ctx.fillStyle = '#333'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(state.chargeDist.toFixed(1) + ' 米', W / 2, barY - 15); ctx.textAlign = 'left';
    }
    ctx.restore();

    if (state.phase === 'result') {
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = state.score >= WIN_COUNT ? '#4aff9b' : '#ff6b6b'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(state.resultMsg, W / 2, H / 2 - 20);
      ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText('点击屏幕重新开始', W / 2, H / 2 + 40); ctx.textAlign = 'left';
    }
  }

  return {
    init: function(env) {
      ctx = env.ctx; W = env.W; H = env.H; reset();
      env.setInput({
        onPointerDown: function(pt) { handlePointerDown(pt); },
        onPointerMove: function(pt) { handlePointerMove(pt); },
        onPointerUp: function() { handlePointerUp(); }
      });
    },
    update: function(dt) {
      if (state.phase === 'aim' || state.phase === 'charging') {
        state.currentAngle += (state.targetAngle - state.currentAngle) * 20 * dt;
      }

      if (state.phase === 'charging') {
        // 由于 CHARGE_SPEED = 4，这里米数会非常缓慢地增长
        state.chargeDist += CHARGE_SPEED * dt;
        if (state.chargeDist > MAX_DIST) state.chargeDist = MAX_DIST;
      } else if (state.phase === 'jumping') {
        state.jumpProgress += dt * 3;
      } else if (state.phase === 'qte') {
        state.qteTimer -= dt;
        if (state.qteTimer <= 0) { state.phase = 'result'; state.resultMsg = '超时未点击！坚持了 ' + state.score + ' 次'; }
      }
    },
    render: function(g2, w, h) { W = w; H = h; render(); },
    destroy: function() {}
  };
})());