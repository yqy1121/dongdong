// ============================================================
// mode-xiaohei.js —— 小黑视角（小红书沙箱兼容版，带图片防崩）
// ============================================================
window.GameAPI.registerMode('xiaohei', (function () {
  'use strict';

  // ==========================================
  // 图片加载保护
  // ==========================================
 
  const PLAYER_IMG_URL = './xiaohei.png'; 
  let playerImg = null;
  let isImgLoaded = false;
  try {
    playerImg = new Image();
    playerImg.onload = function() { isImgLoaded = true; };
    playerImg.onerror = function() { console.log('xiaohei.png 加载失败，使用备用图形'); };
    playerImg.src = PLAYER_IMG_URL;
  } catch(e) {
    console.log('Image 对象创建异常');
  }

  const WIN_COUNT = 50;           
  const TIME_LIMIT = 1.2;         
  const MIN_DIST = 10;
  const MAX_DIST = 50;            
  const TOLERANCE_RADIUS = 70;    

  let state = {
    phase: 'aim',
    score: 0,           
    resultMsg: '',
    targetX: 0,
    targetZ: 0,
    jumpProgress: 0,
    jumpStartX: 0,
    jumpStartY: 0,
    timeLeft: TIME_LIMIT,
    clickFx: 0,         
    clickSuccess: false,
    clickX: 0,
    clickY: 0,
  };

  let ctx, W, H;
  let cx, cy; 

  function reset() {
    state.phase = 'aim';
    state.score = 0;
    generateTarget();
  }

  function generateTarget() {
    state.phase = 'aim';
    state.timeLeft = TIME_LIMIT;
    const angle = (Math.random() - 0.5) * Math.PI * 0.5;
    const dist = MIN_DIST + Math.random() * (MAX_DIST - MIN_DIST);
    state.targetX = Math.sin(angle) * dist;
    state.targetZ = Math.cos(angle) * dist;
  }

  function project(x, z, yOffset) {
    yOffset = yOffset || 0;
    const maxPixelRadius = Math.min(W, H) * 0.75; 
    const pixelDist = (z / MAX_DIST) * maxPixelRadius;
    return {
      x: cx + x * (maxPixelRadius / MAX_DIST), 
      y: cy - pixelDist + yOffset, 
      scale: 1 - (z / MAX_DIST) * 0.5
    };
  }

  function handlePointerDown(pt) {
    if (state.phase === 'result') { reset(); return; }
    if (state.phase === 'aim') {
      const tPos = project(state.targetX, state.targetZ, -35);
      const dx = pt.x - tPos.x;
      const dy = pt.y - tPos.y;
      const distToTarget = Math.sqrt(dx * dx + dy * dy);

      if (distToTarget <= TOLERANCE_RADIUS) {
        state.clickSuccess = true;
        state.clickFx = 0.3;
        state.clickX = tPos.x;
        state.clickY = tPos.y;
        state.phase = 'jumping';
        state.jumpProgress = 0;
        state.jumpStartX = cx;
        state.jumpStartY = cy;
      } else {
        state.clickSuccess = false;
        state.clickFx = 0.3;
        state.clickX = pt.x;
        state.clickY = pt.y;
        state.phase = 'result';
        state.resultMsg = '点偏了！坚持了 ' + state.score + ' 次';
      }
    }
  }

  function draw3DBlock(sx, sy, size, colorTop, colorSide) {
    ctx.save();
    const h = size * 0.4; 
    const w = size;
    const d = size * 0.6;

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + h, w * 1.2, d * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colorSide;
    ctx.beginPath();
    ctx.moveTo(sx - w, sy); ctx.lineTo(sx, sy + d * 0.5); ctx.lineTo(sx, sy + d * 0.5 + h); ctx.lineTo(sx - w, sy + h); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + w, sy); ctx.lineTo(sx, sy + d * 0.5); ctx.lineTo(sx, sy + d * 0.5 + h); ctx.lineTo(sx + w, sy + h); ctx.fill();

    ctx.fillStyle = colorTop;
    ctx.beginPath();
    ctx.moveTo(sx, sy - d * 0.5); ctx.lineTo(sx + w, sy); ctx.lineTo(sx, sy + d * 0.5); ctx.lineTo(sx - w, sy); ctx.closePath(); ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer(sx, sy, scale) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 25 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isImgLoaded && playerImg && playerImg.width > 0) {
      const baseHeight = 100; 
      const ratio = playerImg.width / playerImg.height || 1;
      const imgW = baseHeight * ratio * scale;
      const imgH = baseHeight * scale;
      ctx.drawImage(playerImg, sx - imgW / 2, sy - imgH, imgW, imgH);
    } else {
      const size = 15 * scale;
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(sx, sy - size, size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx - size*0.3, sy - size*1.2, size*0.25, 0, Math.PI * 2);
      ctx.arc(sx + size*0.3, sy - size*1.2, size*0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    cx = W / 2;
    cy = H * 0.8; 

    ctx.fillStyle = '#121a2b';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = 'rgba(80, 140, 200, 0.1)';
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      const pFar = project(i * 10, 50);
      const pNear = project(i * 10, 0);
      ctx.beginPath();
      ctx.moveTo(pNear.x, pNear.y);
      ctx.lineTo(pFar.x, pFar.y);
      ctx.stroke();
    }
    for (let z = 10; z <= 50; z += 10) {
      const pLeft = project(-50, z);
      const pRight = project(50, z);
      ctx.beginPath();
      ctx.moveTo(pLeft.x, pLeft.y);
      ctx.lineTo(pRight.x, pRight.y);
      ctx.stroke();
    }
    ctx.restore();

    if (state.phase === 'aim') {
      const tPos = project(state.targetX, state.targetZ, -35);
      const size = 25 * tPos.scale; 
      draw3DBlock(tPos.x, tPos.y, size, '#e74c3c', '#c0392b');
      
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(Math.sqrt(state.targetX*state.targetX + state.targetZ*state.targetZ)) + 'm', tPos.x, tPos.y - size * 1.5);

      const pPos = project(0, 0, 0);
      drawPlayer(pPos.x, pPos.y, 1); 

    } else if (state.phase === 'jumping') {
      state.jumpProgress += 0.04; 
      if (state.jumpProgress >= 1) {
        state.jumpProgress = 1;
        state.score++;
        if (state.score >= WIN_COUNT) {
          state.phase = 'result';
          state.resultMsg = '任务成功，接到冬冬';
        } else {
          generateTarget();
        }
      }

      const t = state.jumpProgress;
      const startPos = project(0, 0, 0);
      const endPos = project(state.targetX, state.targetZ, 0);
      
      const curX = startPos.x + (endPos.x - startPos.x) * t;
      const curY = startPos.y + (endPos.y - startPos.y) * t;
      const jumpHeight = Math.sin(t * Math.PI) * 60;
      const curScale = 1 + t * (endPos.scale - 1);

      const tPos = project(state.targetX, state.targetZ, -35);
      draw3DBlock(tPos.x, tPos.y, 25 * tPos.scale, '#e74c3c', '#c0392b');
      drawPlayer(curX, curY - jumpHeight, curScale);

    } else if (state.phase === 'result') {
      const pPos = project(0, 0, 0);
      drawPlayer(pPos.x, pPos.y, 1);
    }

    if (state.clickFx > 0) {
      state.clickFx -= 0.016;
      ctx.strokeStyle = state.clickSuccess ? '#4aff9b' : '#ff6b6b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(state.clickX, state.clickY, (0.3 - state.clickFx) * 200, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    if (state.phase === 'aim') {
      const barW = 300, barX = W / 2 - barW / 2, barY = 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX, barY, barW, 12);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(barX, barY, barW * (state.timeLeft / TIME_LIMIT), 12);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(15, 60, 200, 50);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('进度: ' + state.score + ' / ' + WIN_COUNT, 25, 92);
    ctx.restore();

    if (state.phase === 'result') {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = state.score >= WIN_COUNT ? '#4aff9b' : '#ff6b6b';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.resultMsg, W / 2, H / 2 - 20);
      
      ctx.fillStyle = '#fff';
      ctx.font = '18px sans-serif';
      ctx.fillText('点击屏幕重新开始', W / 2, H / 2 + 40);
      ctx.textAlign = 'left';
    }
  }

  return {
    init: function(env) {
      ctx = env.ctx; W = env.W; H = env.H;
      reset();
      env.setInput({
        onPointerDown: function(pt) { handlePointerDown(pt); }
      });
    },
    update: function(dt) {
      if (state.phase === 'aim') {
        state.timeLeft -= dt;
        if (state.timeLeft <= 0) {
          state.phase = 'result';
          state.resultMsg = '你被发现了，坚持了 ' + state.score + ' 次';
        }
      }
    },
    render: function(g2, w, h) {
      W = w; H = h;
      render();
    },
    destroy: function() {}
  };
})());