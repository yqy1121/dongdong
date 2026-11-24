// ============================================================
// common.js —— 适配小红书小工具稳定版
// ============================================================
(function () {
  'use strict';

  const LOGICAL_W = 480;
  const LOGICAL_H = 640;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let W = LOGICAL_W;
  let H = LOGICAL_H;

  let uiPhase = 'menu';
  let activeMode = null;
  const modes = {};
  let inputHandlers = { press: null, release: null, onPointerDown: null, onPointerMove: null, onPointerUp: null };

  function fitCanvas() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    const scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
    const displayW = LOGICAL_W * scale;
    const displayH = LOGICAL_H * scale;

    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';
    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);

    ctx.setTransform(
      (displayW * dpr) / LOGICAL_W, 0,
      0, (displayH * dpr) / LOGICAL_H,
      0, 0
    );

    W = LOGICAL_W;
    H = LOGICAL_H;
  }

  function screenToLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width * LOGICAL_W,
      y: (clientY - rect.top) / rect.height * LOGICAL_H
    };
  }

  const MENU_BUTTONS = [
    { mode: 'xiaohei', label: '小黑视角', desc: '和师父一起做任务', x: 90, y: 260, w: 300, h: 64 },
    { mode: 'wuxian', label: '无限视角', desc: '三二一走',       x: 90, y: 340, w: 300, h: 64 },
    { mode: 'baiyou', label: '白游视角', desc: '无话可说',       x: 90, y: 420, w: 300, h: 64 }
  ];
  const BACK_BTN = { x: 380, y: 8, w: 90, h: 32 };

  let pointerDownFlag = false;

  function handleDown(clientX, clientY) {
    if (pointerDownFlag) return;
    pointerDownFlag = true;
    const pt = screenToLogical(clientX, clientY);

    if (uiPhase === 'menu') {
      for (let i = 0; i < MENU_BUTTONS.length; i++) {
        const b = MENU_BUTTONS[i];
        if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
          startMode(b.mode); break;
        }
      }
      return;
    }

    if (uiPhase === 'playing') {
      if (pt.x >= BACK_BTN.x && pt.x <= BACK_BTN.x + BACK_BTN.w && pt.y >= BACK_BTN.y && pt.y <= BACK_BTN.y + BACK_BTN.h) {
        backToMenu(); return;
      }
      if (inputHandlers.press) inputHandlers.press(pt);
      if (inputHandlers.onPointerDown) inputHandlers.onPointerDown(pt);
    }
  }

  function handleMove(clientX, clientY) {
    if (!pointerDownFlag || uiPhase !== 'playing') return;
    if (inputHandlers.onPointerMove) inputHandlers.onPointerMove(screenToLogical(clientX, clientY));
  }

  function handleUp() {
    if (!pointerDownFlag) return;
    pointerDownFlag = false;
    if (uiPhase !== 'playing') return;
    if (inputHandlers.release) inputHandlers.release();
    if (inputHandlers.onPointerUp) inputHandlers.onPointerUp();
  }

  function getTouch(e) {
    if (e.touches && e.touches.length > 0) return e.touches[0];
    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0];
    return null;
  }

  canvas.addEventListener('mousedown', function(e) { e.preventDefault(); handleDown(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function(e) { handleMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', handleUp);

  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = getTouch(e);
    if (t) handleDown(t.clientX, t.clientY);
  }, { passive: false });
  window.addEventListener('touchmove', function(e) {
    e.preventDefault();
    var t = getTouch(e);
    if (t) handleMove(t.clientX, t.clientY);
  }, { passive: false });
  window.addEventListener('touchend', function(e) { e.preventDefault(); handleUp(); }, { passive: false });
  window.addEventListener('touchcancel', handleUp);

  window.addEventListener('resize', fitCanvas);
  window.addEventListener('orientationchange', function() { setTimeout(fitCanvas, 150); });

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x+r, y); c.lineTo(x+w-r, y); c.quadraticCurveTo(x+w, y, x+w, y+r); c.lineTo(x+w, y+h-r); c.quadraticCurveTo(x+w, y+h, x+w-r, y+h); c.lineTo(x+r, y+h); c.quadraticCurveTo(x, y+h, x, y+h-r); c.lineTo(x, y+r); c.quadraticCurveTo(x, y, x+r, y); c.closePath();
  }

  function drawMenu() {
    const bg = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
    bg.addColorStop(0, '#1a1a2e'); bg.addColorStop(1, '#16213e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('营救冬冬', LOGICAL_W / 2, 150);
    ctx.fillStyle = '#8899aa'; ctx.font = '15px sans-serif'; ctx.fillText('选择你的视角', LOGICAL_W / 2, 195);

    for (let i = 0; i < MENU_BUTTONS.length; i++) {
      const b = MENU_BUTTONS[i];
      ctx.fillStyle = '#2c3e6b'; roundRect(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
      ctx.strokeStyle = '#4a7cc9'; ctx.lineWidth = 2; roundRect(ctx, b.x, b.y, b.w, b.h, 12); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(b.label, b.x + b.w / 2, b.y + 26);
      ctx.fillStyle = '#aabbcc'; ctx.font = '13px sans-serif'; ctx.fillText(b.desc, b.x + b.w / 2, b.y + 48);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  function drawBackBtn() {
    ctx.fillStyle = 'rgba(44,62,107,0.9)'; roundRect(ctx, BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h, 8); ctx.fill();
    ctx.strokeStyle = '#4a7cc9'; ctx.lineWidth = 1; roundRect(ctx, BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h, 8); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('← 返回', BACK_BTN.x + BACK_BTN.w / 2, BACK_BTN.y + BACK_BTN.h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

    if (uiPhase === 'menu') {
      drawMenu();
    } else if (uiPhase === 'playing' && activeMode) {
      if (activeMode.update) activeMode.update(dt);
      if (activeMode.render) activeMode.render(ctx, W, H, dt);
      drawBackBtn();
    }
    requestAnimationFrame(loop);
  }

  function startMode(modeName) {
    const mode = modes[modeName];
    if (!mode) return;
    uiPhase = 'playing';
    pointerDownFlag = false; // 修复：进入模式重置，避免第一次点击被吞
    inputHandlers = { press: null, release: null, onPointerDown: null, onPointerMove: null, onPointerUp: null };
    activeMode = mode;

    if (mode.init) {
      mode.init({
        ctx: ctx, W: W, H: H,
        setInput: function(handlers) {
          inputHandlers = Object.assign({ press: null, release: null, onPointerDown: null, onPointerMove: null, onPointerUp: null }, handlers);
        },
        backToMenu: backToMenu
      });
    }
  }

  function backToMenu() {
    if (activeMode && activeMode.destroy) activeMode.destroy();
    activeMode = null;
    uiPhase = 'menu';
    pointerDownFlag = false;
  }

  window.GameAPI = {
    registerMode: function(name, modeObj) { modes[name] = modeObj; },
    start: function(name) { startMode(name); },
    backToMenu: backToMenu
  };

  fitCanvas();
  requestAnimationFrame(loop);
})();