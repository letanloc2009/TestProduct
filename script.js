/* ==================== MOBILE SIDEBAR ==================== */
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); hamburger.classList.add('open'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); hamburger.classList.remove('open'); }
hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
overlay.addEventListener('click', closeSidebar);

/* ==================== NAVIGATION ==================== */
function showPage(id) {
  // Ẩn toàn bộ các trang đang active trước đó
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // Kích hoạt trang được chọn hiển thị lên màn hình
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  
  // Cập nhật trạng thái lựa chọn trên thanh Sidebar
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (window.event && window.event.target) window.event.target.classList.add('active');
  
  // Định nghĩa nhãn hiển thị tương ứng với ID trang
  const labels = {
    home: 'Trang chủ', motion: 'Chuyển động thẳng', force: 'Lực – Kéo co',
    wave: 'Sóng cơ học', optics: 'Sóng ánh sáng', circuit: 'Mạch điện',
    acidbase: 'Acid – Base', cell: 'Tế bào', dna: 'Lắp ráp DNA',
    periodic: 'Bảng tuần hoàn'
  };
  
  const statusPage = document.getElementById('status-page');
  if (statusPage) {
    statusPage.textContent = (labels[id] || id).toUpperCase();
  }
  
  // Khởi chạy các hàm logic tương ứng cho từng trang mô phỏng
  if (id === 'motion') { updateMotionParam(); drawMotionFrame(); drawGraph(); }
  if (id === 'force') { drawForceScene(0); }
  if (id === 'wave') { if (!waveRunning) drawWaveFrame(0); }
  if (id === 'optics') { runOptics(); }
  if (id === 'circuit') { resetCircuit(); }
  if (id === 'acidbase') { initShelf(); }
  if (id === 'dna') { initDNA(); }
  if (id === 'cell') { drawPlantCell(); setupCellEvents(); }
  if (id === 'young') { runYoung(); syncYoungSliders(); }
  if (id === 'energy') { resetEnergy(); if(!energyRunning) toggleEnergySim(); }
  if (id === 'torque') { updateTorque(); }
  if (id === 'periodic') {
	if (!window.periodicRendered) {
		renderPeriodicTable();
		window.periodicRendered = true;
	}
  }
  
  // Tự động đóng sidebar nếu người dùng đang dùng thiết bị di động screen <= 768px
  if (window.innerWidth <= 768) closeSidebar();
}

function toggleSubject(el) {
  const items = el.nextElementSibling;
  const arrow = el.querySelector('.arrow');
  items.classList.toggle('open');
  arrow.classList.toggle('open');
}

/* ==================== MOTION ==================== */
let motionRunning = false, motionRAF = null, motionT = 0;
let mV0 = 10, mA = 2, mTmax = 10, mSmax = 1;
let graphHistory = [];

function updateInputFields() {
  const target = document.getElementById('calc-target').value;
  document.getElementById('s-group').style.display = target === 's' ? 'none' : 'block';
  document.getElementById('v-group').style.display = target === 'v' ? 'none' : 'block';
  document.getElementById('t-group').style.display = target === 't' ? 'none' : 'block';
}

function updateMotionParam() {
  mV0 = parseFloat(document.getElementById('v0-input').value) || 10;
  mA  = parseFloat(document.getElementById('a-input').value) || 0;
  mTmax = parseFloat(document.getElementById('t-input').value) || 10;
  mSmax = Math.max(mV0 * mTmax + 0.5 * mA * mTmax * mTmax, 1);
}

function calcAndRun() {
  const target = document.getElementById('calc-target').value;
  mV0 = parseFloat(document.getElementById('v0-input').value) || 0;
  mA  = parseFloat(document.getElementById('a-input').value) || 0;
  const tIn = parseFloat(document.getElementById('t-input').value) || 0;
  const vIn = parseFloat(document.getElementById('v-input').value) || 0;
  const sIn = parseFloat(document.getElementById('s-input').value) || 0;
  if (target === 's') {
    mTmax = tIn;
    document.getElementById('s-input').value = (mV0 * tIn + 0.5 * mA * tIn * tIn).toFixed(2);
  } else if (target === 'v') {
    mTmax = tIn;
    document.getElementById('v-input').value = (mV0 + mA * tIn).toFixed(2);
  } else if (target === 't') {
    const t = Math.abs(mA) > 0.001 ? (vIn - mV0) / mA : (mV0 > 0 ? sIn / mV0 : 0);
    mTmax = Math.max(t, 1);
    document.getElementById('t-input').value = t.toFixed(2);
  }
  document.getElementById('m-acc').innerHTML = mA.toFixed(2) + '<span class="dc-unit">m/s²</span>';
  motionRunning = false; cancelAnimationFrame(motionRAF);
  motionT = 0; graphHistory = []; lastMotionTime = null;
  mSmax = Math.max(mV0 * mTmax + 0.5 * mA * mTmax * mTmax, 1);
  drawMotionFrame(mV0, 0); drawGraph();
  setTimeout(() => {
    motionRunning = true;
    document.getElementById('motion-btn').textContent = '⏸ DỪNG';
    requestAnimationFrame(motionLoop);
  }, 300);
}

function toggleMotion() {
  motionRunning = !motionRunning;
  document.getElementById('motion-btn').textContent = motionRunning ? '⏸ DỪNG' : '▶ TIẾP TỤC';
  if (motionRunning) { lastMotionTime = null; requestAnimationFrame(motionLoop); }
  else cancelAnimationFrame(motionRAF);
}

function resetMotion() {
  motionRunning = false; cancelAnimationFrame(motionRAF);
  motionT = 0; graphHistory = []; lastMotionTime = null;
  document.getElementById('motion-btn').textContent = '▶ CHẠY';
  drawMotionFrame(mV0, 0); drawGraph();
  document.getElementById('m-time').innerHTML = '0.00<span class="dc-unit">s</span>';
  document.getElementById('m-vel').innerHTML = mV0.toFixed(2) + '<span class="dc-unit">m/s</span>';
  document.getElementById('m-dist').innerHTML = '0.00<span class="dc-unit">m</span>';
}

let lastMotionTime = null;
function motionLoop(ts) {
  if (!lastMotionTime) lastMotionTime = ts;
  const dt = Math.min((ts - lastMotionTime) / 1000, 0.05);
  lastMotionTime = ts;
  motionT += dt;
  const v = mV0 + mA * motionT;
  const s = mV0 * motionT + 0.5 * mA * motionT * motionT;
  if ((mA < 0 && v <= 0) || motionT > mTmax) {
    motionRunning = false;
    document.getElementById('motion-btn').textContent = '▶ CHẠY';
    lastMotionTime = null;
    drawMotionFrame(Math.max(0,v), s); drawGraph();
    document.getElementById('m-time').innerHTML = motionT.toFixed(2) + '<span class="dc-unit">s</span>';
    document.getElementById('m-vel').innerHTML = Math.max(0,v).toFixed(2) + '<span class="dc-unit">m/s</span>';
    document.getElementById('m-dist').innerHTML = s.toFixed(2) + '<span class="dc-unit">m</span>';
    return;
  }
  graphHistory.push({ t: motionT, v: Math.max(0, v), s });
  drawMotionFrame(Math.max(0,v), s); drawGraph();
  document.getElementById('m-time').innerHTML = motionT.toFixed(2) + '<span class="dc-unit">s</span>';
  document.getElementById('m-vel').innerHTML = Math.max(0,v).toFixed(2) + '<span class="dc-unit">m/s</span>';
  document.getElementById('m-dist').innerHTML = s.toFixed(2) + '<span class="dc-unit">m</span>';
  if (motionRunning) motionRAF = requestAnimationFrame(motionLoop);
  else lastMotionTime = null;
}

function drawMotionFrame(v, s) {
  const c = document.getElementById('motion-canvas'); if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#c8e6c9'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#37474f'; ctx.fillRect(0, H*0.55, W, H*0.3);
  ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 2; ctx.setLineDash([20,15]);
  ctx.beginPath(); ctx.moveTo(0, H*0.7); ctx.lineTo(W, H*0.7); ctx.stroke();
  ctx.setLineDash([]);
  const sMax = mSmax > 1 ? mSmax : Math.max(mV0 * mTmax + 0.5 * mA * mTmax * mTmax, 1);
  for (let i = 0; i <= 5; i++) {
    const x = (i / 5) * W;
    ctx.fillStyle = '#90a4ae'; ctx.font = '10px Space Mono,monospace'; ctx.textAlign = 'center';
    ctx.fillText((sMax * i / 5).toFixed(0) + 'm', x, H*0.92);
  }
  const curS = s !== undefined ? s : 0;
  const carX = Math.min((curS / Math.max(sMax, 1)) * W, W - 70);
  const carY = H * 0.58;
  const cw = 62, ch = 26;
  ctx.shadowBlur = 14; ctx.shadowColor = '#1565c0';
  ctx.fillStyle = '#1565c0'; ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(carX, carY, cw, ch, 5) : ctx.fillRect(carX, carY, cw, ch);
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#1976d2';
  ctx.beginPath(); ctx.moveTo(carX+10, carY); ctx.lineTo(carX+18, carY-14); ctx.lineTo(carX+44, carY-14); ctx.lineTo(carX+52, carY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#80d8ff';
  ctx.fillRect(carX+20, carY-12, 10, 10); ctx.fillRect(carX+33, carY-12, 10, 10);
  [carX+12, carX+44].forEach(wx => {
    ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(wx, carY+ch, 9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#b0bec5'; ctx.beginPath(); ctx.arc(wx, carY+ch, 4, 0, Math.PI*2); ctx.fill();
  });
  const speedText = (v||mV0).toFixed(1) + ' m/s';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Space Mono,monospace'; ctx.textAlign = 'center';
  ctx.fillText(speedText, carX + 31, carY - 20);
}

function drawGraph() {
  const c = document.getElementById('graph-canvas'); if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1b2a'; ctx.fillRect(0, 0, W, H);
  const pad = { l:40, r:12, t:10, b:20 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;
  ctx.strokeStyle = '#334'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t+gH); ctx.lineTo(pad.l+gW, pad.t+gH); ctx.stroke();
  if (graphHistory.length < 2) { ctx.fillStyle = '#7cb9ff'; ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillText('v(t) – Biểu đồ vận tốc', pad.l+4, pad.t+14); return; }
  const maxV = Math.max(...graphHistory.map(p=>p.v), 1);
  const maxT = mTmax;
  ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2;
  ctx.beginPath();
  graphHistory.forEach((p, i) => {
    const x = pad.l + (p.t / maxT) * gW;
    const y = pad.t + gH - (p.v / maxV) * gH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#e74c3c'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('v(t)', pad.l+4, pad.t+12);
  ctx.fillStyle = '#7cb9ff'; ctx.textAlign = 'center';
  ctx.fillText(maxT.toFixed(0)+'s', pad.l+gW, pad.t+gH+16);
  ctx.textAlign = 'right';
  ctx.fillText(maxV.toFixed(0), pad.l-4, pad.t+10);
}

/* ==================== FORCE – PUSH/PULL BOX ==================== */
let forceRunning = false, forceRAF = null, forceOffset = 0, forceVelocity = 0, forceLastTime = null;
let leftMode = null, rightMode = null; // 'pull' | 'push' | null

function fDragStart(event, type) {
  event.dataTransfer.setData('forceType', type);
}
function fDrop(event, side) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const type = event.dataTransfer.getData('forceType');
  if (!type) return;
  if (side === 'left') leftMode = type;
  else rightMode = type;
  updateForceZoneUI();
  updateForceDisplay();
}
function clearForceZone(side) {
  if (side === 'left') leftMode = null;
  else rightMode = null;
  updateForceZoneUI();
  updateForceDisplay();
}
function clearAllForceZones() {
  leftMode = null; rightMode = null;
  forceOffset = 0; forceVelocity = 0;
  forceRunning = false; cancelAnimationFrame(forceRAF);
  document.getElementById('force-btn').textContent = '▶ CHẠY';
  updateForceZoneUI(); updateForceDisplay();
}
function updateForceZoneUI() {
  const zl = document.getElementById('force-zone-left');
  const zr = document.getElementById('force-zone-right');
  const il = document.getElementById('fz-left-icon');
  const ir = document.getElementById('fz-right-icon');
  const ll = document.getElementById('fz-left-label');
  const lr = document.getElementById('fz-right-label');
  zl.className = 'force-zone' + (leftMode === 'pull' ? ' has-pull' : leftMode === 'push' ? ' has-push' : '');
  zr.className = 'force-zone right-zone' + (rightMode === 'pull' ? ' has-pull' : rightMode === 'push' ? ' has-push' : '');
  il.textContent = leftMode === 'pull' ? '🏃' : leftMode === 'push' ? '💪' : '❓';
  ir.textContent = rightMode === 'pull' ? '🏃' : rightMode === 'push' ? '💪' : '❓';
  ll.innerHTML = leftMode === 'pull' ? 'Người kéo<br><small style="color:#e74c3c">←  Kéo về trái</small>' 
               : leftMode === 'push' ? 'Người đẩy<br><small style="color:#2980b9">→  Đẩy sang phải</small>'
               : 'Thả nhân vật<br>vào đây';
  lr.innerHTML = rightMode === 'pull' ? 'Người kéo<br><small style="color:#2980b9">→  Kéo về phải</small>'
               : rightMode === 'push' ? 'Người đẩy<br><small style="color:#e74c3c">←  Đẩy sang trái</small>'
               : 'Thả nhân vật<br>vào đây';
}

function getForceNet() {
  const f1 = parseFloat(document.getElementById('force-left').value) || 0;
  const f2 = parseFloat(document.getElementById('force-right').value) || 0;
  // Left pull → force ← (negative), Left push → force → (positive)
  // Right pull → force → (positive), Right push → force ← (negative)
  let contrib1 = 0, contrib2 = 0;
  if (leftMode === 'pull') contrib1 = -f1;
  else if (leftMode === 'push') contrib1 = +f1;
  if (rightMode === 'pull') contrib2 = +f2;
  else if (rightMode === 'push') contrib2 = -f2;
  return { f1, f2, net: contrib1 + contrib2, contrib1, contrib2 };
}

function updateForceDisplay() {
  const { f1, f2, net } = getForceNet();
  document.getElementById('fl-val').textContent = f1 + ' N';
  document.getElementById('fr-val').textContent = f2 + ' N';
  document.getElementById('fp-f1').innerHTML = f1 + '<span class="dc-unit">N</span>';
  document.getElementById('fp-f2').innerHTML = f2 + '<span class="dc-unit">N</span>';
  document.getElementById('fp-net').innerHTML = (leftMode || rightMode) ? Math.abs(net).toFixed(0) + '<span class="dc-unit">N</span>' : '–<span class="dc-unit">N</span>';
  if (!leftMode && !rightMode) {
    document.getElementById('fp-result').textContent = '— Chọn nhân vật —';
  } else {
    document.getElementById('fp-result').textContent = net > 0.5 ? '→ Thùng sang phải' : net < -0.5 ? '← Thùng sang trái' : '⇌ Cân bằng';
  }
  if (!forceRunning) drawForceScene(forceOffset);
}

function toggleForce() {
  forceRunning = !forceRunning;
  document.getElementById('force-btn').textContent = forceRunning ? '⏸ DỪNG' : '▶ TIẾP TỤC';
  if (forceRunning) { forceLastTime = null; requestAnimationFrame(forceLoop); }
  else cancelAnimationFrame(forceRAF);
}

function resetForce() {
  forceRunning = false; cancelAnimationFrame(forceRAF);
  forceOffset = 0; forceVelocity = 0; forceLastTime = null;
  document.getElementById('force-btn').textContent = '▶ CHẠY';
  drawForceScene(0); updateForceDisplay();
}

function forceLoop(ts) {
  if (!forceLastTime) forceLastTime = ts;
  const dt = Math.min((ts - forceLastTime)/1000, 0.05); forceLastTime = ts;
  const { net } = getForceNet();
  forceVelocity = forceVelocity * 0.96 + (net/600) * dt;
  forceOffset += forceVelocity * dt;
  forceOffset = Math.max(-1, Math.min(1, forceOffset));
  drawForceScene(forceOffset);
  if (Math.abs(forceOffset) >= 0.97) {
    forceRunning = false;
    document.getElementById('force-btn').textContent = '▶ CHẠY LẠI';
    document.getElementById('fp-result').textContent = forceOffset > 0 ? '→ Thùng đã sang phải!' : '← Thùng đã sang trái!';
    drawForceScene(forceOffset); return;
  }
  if (forceRunning) forceRAF = requestAnimationFrame(forceLoop);
}

function drawForceScene(offset) {
  const c = document.getElementById('force-canvas'); if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  // Background warehouse
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#1a1a2e'); bg.addColorStop(1,'#16213e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // Floor
  ctx.fillStyle = '#2a2a3e'; ctx.fillRect(0, H*0.75, W, H*0.25);
  // Floor tiles
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  for(let x=0; x<W; x+=50) { ctx.beginPath(); ctx.moveTo(x, H*0.75); ctx.lineTo(x, H); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, H*0.88); ctx.lineTo(W, H*0.88); ctx.stroke();
  // Floor shadow line
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, H*0.75, W, 4);

  const { f1, f2, net, contrib1, contrib2 } = getForceNet();
  const groundY = H * 0.75;
  const boxW = 80, boxH = 64;
  const boxX = W/2 + offset*(W*0.30) - boxW/2;
  const boxY = groundY - boxH;

  // ---- Draw rope/connection if needed ----
  const ropeY = boxY + boxH/2;
  if (leftMode === 'pull') {
    ctx.strokeStyle = '#c8a96e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(boxX, ropeY); ctx.lineTo(boxX - 90, ropeY); ctx.stroke();
    // Rope texture
    ctx.strokeStyle = '#a07840'; ctx.lineWidth = 1;
    for(let rx = boxX-90; rx < boxX; rx += 10) {
      ctx.beginPath(); ctx.moveTo(rx, ropeY-2); ctx.lineTo(rx+5, ropeY+2); ctx.stroke();
    }
  }
  if (rightMode === 'pull') {
    ctx.strokeStyle = '#c8a96e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(boxX+boxW, ropeY); ctx.lineTo(boxX+boxW+90, ropeY); ctx.stroke();
    ctx.strokeStyle = '#a07840'; ctx.lineWidth = 1;
    for(let rx = boxX+boxW; rx < boxX+boxW+90; rx += 10) {
      ctx.beginPath(); ctx.moveTo(rx, ropeY-2); ctx.lineTo(rx+5, ropeY+2); ctx.stroke();
    }
  }

  // ---- Draw box (thùng hàng) ----
  ctx.save();
  const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX+boxW, boxY+boxH);
  boxGrad.addColorStop(0,'#8B5E3C'); boxGrad.addColorStop(0.5,'#A0714A'); boxGrad.addColorStop(1,'#6B4226');
  ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(160,113,74,0.5)';
  ctx.fillStyle = boxGrad;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(boxX, boxY, boxW, boxH, 4) : ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fill(); ctx.shadowBlur = 0;
  // Box top
  ctx.fillStyle = '#B88A5A';
  ctx.fillRect(boxX+2, boxY+2, boxW-4, 12);
  // Box stripes
  ctx.strokeStyle = '#6B4226'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(boxX+boxW/2, boxY); ctx.lineTo(boxX+boxW/2, boxY+boxH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(boxX, boxY+boxH/2); ctx.lineTo(boxX+boxW, boxY+boxH/2); ctx.stroke();
  // Box icon
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
  ctx.fillText('📦', boxX+boxW/2, boxY+boxH/2+6);
  // Box shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(boxX+boxW/2, groundY+2, boxW/2+8, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // ---- Draw persons ----
  function drawWorkerPull(cx, groundY, color, shirtColor, facingRight, leaning) {
    const dir = facingRight ? 1 : -1;
    const armX = cx + dir * 18;
    // Leaning back
    const lean = leaning * 0.25;
    ctx.save(); ctx.translate(cx, groundY - 2);
    // Shoes
    ctx.fillStyle = '#222';
    ctx.fillRect(-6 + lean*30, -8, 12, 6);
    // Legs
    ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4+lean*20, -8); ctx.lineTo(-6+lean*40, -30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4+lean*20, -8); ctx.lineTo(6+lean*40, -30); ctx.stroke();
    // Body (torso)
    ctx.fillStyle = shirtColor;
    ctx.fillRect(-8+lean*30, -50, 16, 22);
    // Arms – reaching toward box
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0+lean*30, -40); ctx.lineTo(dir*22+lean*30, -30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0+lean*30, -40); ctx.lineTo(dir*22+lean*30, -50); ctx.stroke();
    // Head
    ctx.fillStyle = '#F5CBA7'; ctx.beginPath(); ctx.arc(lean*30, -58, 10, 0, Math.PI*2); ctx.fill();
    // Hard hat
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.ellipse(lean*30, -65, 12, 5, 0, 0, Math.PI); ctx.fill();
    ctx.fillRect(-12+lean*30, -66, 24, 4);
    ctx.restore();
  }

  function drawWorkerPush(cx, groundY, color, shirtColor, facingRight) {
    const dir = facingRight ? 1 : -1;
    ctx.save(); ctx.translate(cx, groundY - 2);
    // Shoes
    ctx.fillStyle = '#222'; ctx.fillRect(-6+dir*4, -8, 12, 6);
    // Legs
    ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4+dir*4, -8); ctx.lineTo(-5+dir*8, -30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4+dir*4, -8); ctx.lineTo(5+dir*8, -30); ctx.stroke();
    // Body – leaning forward
    ctx.fillStyle = shirtColor;
    ctx.fillRect(-8+dir*6, -52, 16, 22);
    // Arms – pushing
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0+dir*6, -42); ctx.lineTo(dir*22+dir*6, -38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0+dir*6, -42); ctx.lineTo(dir*22+dir*6, -50); ctx.stroke();
    // Head
    ctx.fillStyle = '#F5CBA7'; ctx.beginPath(); ctx.arc(dir*6, -62, 10, 0, Math.PI*2); ctx.fill();
    // Hard hat
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath(); ctx.ellipse(dir*6, -69, 12, 5, 0, 0, Math.PI); ctx.fill();
    ctx.fillRect(-12+dir*6, -70, 24, 4);
    ctx.restore();
  }

  // Left person
  if (leftMode === 'pull') {
    const px = boxX - 100;
    drawWorkerPull(px, groundY, '#2d3436', '#e74c3c', true, 1);
  } else if (leftMode === 'push') {
    const px = boxX - 30;
    drawWorkerPush(px, groundY, '#2d3436', '#2980b9', true);
  }

  // Right person
  if (rightMode === 'pull') {
    const px = boxX + boxW + 100;
    drawWorkerPull(px, groundY, '#2d3436', '#2980b9', false, 1);
  } else if (rightMode === 'push') {
    const px = boxX + boxW + 30;
    drawWorkerPush(px, groundY, '#2d3436', '#e74c3c', false);
  }

  // ---- Force arrows on box ----
  const arrowY = boxY - 20;
  const cx = boxX + boxW/2;
  if (leftMode) {
    const dir1 = contrib1 >= 0 ? 1 : -1;
    const len1 = Math.min(Math.abs(contrib1)/3 + 20, 130);
    const color1 = contrib1 >= 0 ? '#2ecc71' : '#e74c3c';
    ctx.strokeStyle = color1; ctx.lineWidth = 3; ctx.shadowBlur = 8; ctx.shadowColor = color1;
    ctx.beginPath(); ctx.moveTo(cx, arrowY); ctx.lineTo(cx + dir1 * len1, arrowY); ctx.stroke();
    ctx.fillStyle = color1;
    const ax = cx + dir1 * len1;
    ctx.beginPath(); ctx.moveTo(ax + dir1*8, arrowY); ctx.lineTo(ax - dir1*4, arrowY-5); ctx.lineTo(ax - dir1*4, arrowY+5); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = color1;
    ctx.fillText('F₁='+f1+'N', cx + dir1*len1/2, arrowY - 8);
  }
  if (rightMode) {
    const offsetY2 = leftMode ? 18 : 0;
    const dir2 = contrib2 >= 0 ? 1 : -1;
    const len2 = Math.min(Math.abs(contrib2)/3 + 20, 130);
    const color2 = contrib2 >= 0 ? '#3498db' : '#e67e22';
    ctx.strokeStyle = color2; ctx.lineWidth = 3; ctx.shadowBlur = 8; ctx.shadowColor = color2;
    ctx.beginPath(); ctx.moveTo(cx, arrowY - offsetY2); ctx.lineTo(cx + dir2 * len2, arrowY - offsetY2); ctx.stroke();
    ctx.fillStyle = color2;
    const ax2 = cx + dir2 * len2;
    ctx.beginPath(); ctx.moveTo(ax2+dir2*8, arrowY-offsetY2); ctx.lineTo(ax2-dir2*4, arrowY-offsetY2-5); ctx.lineTo(ax2-dir2*4, arrowY-offsetY2+5); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = color2;
    ctx.fillText('F₂='+f2+'N', cx + dir2*len2/2, arrowY - offsetY2 - 8);
  }

  // ---- Net force bar at bottom ----
  if (leftMode || rightMode) {
    const barW = W * 0.55, barX = (W - barW)/2, barY = H - 28, barH = 10;
    ctx.fillStyle = '#111'; ctx.fillRect(barX, barY, barW, barH);
    if (Math.abs(net) > 0.5) {
      const fillW = Math.min(Math.abs(net)/600, 1) * (barW/2);
      const netColor = net > 0 ? '#2ecc71' : '#e74c3c';
      ctx.fillStyle = netColor;
      if (net > 0) ctx.fillRect(barX+barW/2, barY, fillW, barH);
      else ctx.fillRect(barX+barW/2-fillW, barY, fillW, barH);
    }
    ctx.fillStyle = '#fff'; ctx.fillRect(barX+barW/2-1.5, barY-3, 3, barH+6);
    ctx.fillStyle = '#aaa'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    const netSign = net > 0 ? '+' : '';
    ctx.fillText('HỢP LỰC: ' + netSign + net.toFixed(0) + ' N', W/2, barY + barH + 14);
  } else {
    ctx.fillStyle = '#7cb9ff'; ctx.font = '12px Space Mono,monospace'; ctx.textAlign = 'center';
    ctx.fillText('← Kéo nhân vật vào 2 vùng bên trên để xem lực tác dụng →', W/2, H - 16);
  }

  // Title labels
  ctx.fillStyle = '#ffe082'; ctx.font = 'bold 12px Nunito,sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('🏭 KHO HÀNG – MÔ PHỎNG LỰC', 12, 20);
}

/* ==================== WAVE SIM ==================== */
let waveRunning = false, waveRAF = null, wavePhase = 0, waveLastTime = null;

function updateWaveAmpNumber() { let val = document.getElementById('wave-amp').value; resetWave(); }
function updateWaveFreqNumber() { let val = document.getElementById('wave-freq').value; resetWave(); }
function updateWaveSpeedNumber() { let val = document.getElementById('wave-speed').value; resetWave(); }

function toggleWave() {
  waveRunning = !waveRunning;
  document.getElementById('wave-btn').textContent = waveRunning ? '⏸ DỪNG' : '▶ CHẠY';
  if (waveRunning) { waveLastTime = null; requestAnimationFrame(waveLoop); }
  else cancelAnimationFrame(waveRAF);
}

function resetWave() {
  waveRunning = false; cancelAnimationFrame(waveRAF);
  wavePhase = 0; waveLastTime = null;
  document.getElementById('wave-btn').textContent = '▶ CHẠY';
  drawWaveFrame(0);
}

function waveLoop(ts) {
  if (!waveLastTime) waveLastTime = ts;
  const dt = Math.min((ts - waveLastTime)/1000, 0.05); waveLastTime = ts;
  const freq = parseFloat(document.getElementById('wave-freq').value) || 2;
  wavePhase += freq * dt * Math.PI * 2;
  drawWaveFrame(wavePhase);
  updateWaveData();
  if (waveRunning) waveRAF = requestAnimationFrame(waveLoop);
}

function updateWaveData() {
  const A = parseFloat(document.getElementById('wave-amp').value) || 30;
  const f = parseFloat(document.getElementById('wave-freq').value) || 2;
  const spd = parseFloat(document.getElementById('wave-speed').value) || 3;
  document.getElementById('wave-A-display').innerHTML = A + '<span class="dc-unit">px</span>';
  document.getElementById('wave-f-display').innerHTML = f + '<span class="dc-unit">Hz</span>';
  document.getElementById('wave-T-display').innerHTML = (1/f).toFixed(2) + '<span class="dc-unit">s</span>';
  document.getElementById('wave-L-display').innerHTML = (spd/f).toFixed(1) + '<span class="dc-unit">cm</span>';
}

function drawWaveFrame(phase) {
  const c = document.getElementById('wave-canvas'); if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0d1b2a'); bg.addColorStop(1,'#0a1628');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

  const A = parseFloat(document.getElementById('wave-amp').value) || 30;
  const f = parseFloat(document.getElementById('wave-freq').value) || 2;
  const spd = parseFloat(document.getElementById('wave-speed').value) || 3;
  const waveType = document.getElementById('wave-type').value;
  const lambda = spd / f * (W/6); // scale for display

  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }

  const cy = H/2;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.setLineDash([10,10]);
  ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();
  ctx.setLineDash([]);

  if (waveType === 'transverse') {
    const grad = ctx.createLinearGradient(0,0,W,0);
    grad.addColorStop(0,'#e74c3c'); grad.addColorStop(0.5,'#f39c12'); grad.addColorStop(1,'#e74c3c');
    ctx.strokeStyle = grad; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      const y = cy + A * Math.sin(2*Math.PI*x/lambda - phase);
      x === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();
    for (let x = 0; x < W; x += 30) {
      const y = cy + A * Math.sin(2*Math.PI*x/lambda - phase);
      ctx.fillStyle = '#ffe082'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffe082';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#aac4e6'; ctx.font = '12px Space Mono,monospace'; ctx.textAlign = 'left';
    ctx.fillText('Sóng ngang – dao động ⊥ phương truyền', 10, 20);
    ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(20, cy-A); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffe082'; ctx.textAlign = 'left';
    ctx.fillText('A='+A, 24, cy-A/2);
  } else if (waveType === 'longitudinal') {
    ctx.fillStyle = '#aac4e6'; ctx.font = '12px Space Mono,monospace'; ctx.textAlign = 'left';
    ctx.fillText('Sóng dọc – dao động ∥ phương truyền', 10, 20);
    const rows = 5;
    const rowH = (H-80)/rows;
    for (let row = 0; row < rows; row++) {
      const rowY = 50 + row * rowH + rowH/2;
      for (let xi = 0; xi < W; xi += 18) {
        const displacement = A * 0.3 * Math.sin(2*Math.PI*xi/lambda - phase);
        const px = xi + displacement;
        const density = Math.abs(Math.cos(2*Math.PI*xi/lambda - phase));
        const alpha = 0.3 + 0.7 * density;
        const size = 3 + 2 * density;
        ctx.fillStyle = `rgba(100, 181, 246, ${alpha})`;
        ctx.shadowBlur = density > 0.7 ? 6 : 0; ctx.shadowColor = '#4fc3f7';
        ctx.beginPath(); ctx.arc(px, rowY, size, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.fillStyle = '#ffe082'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('NÉNCHẶT', W*0.25, H-12);
    ctx.fillText('LOÃNG', W*0.75, H-12);
  } else if (waveType === 'standing') {
    ctx.strokeStyle = 'rgba(231,76,60,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      const y = cy + A * Math.sin(2*Math.PI*x/lambda - phase);
      x === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(52,152,219,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      const y = cy + A * Math.sin(2*Math.PI*x/lambda + phase);
      x === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();
    const grad = ctx.createLinearGradient(0,0,W,0);
    grad.addColorStop(0,'#27ae60'); grad.addColorStop(0.5,'#2ecc71'); grad.addColorStop(1,'#27ae60');
    ctx.strokeStyle = grad; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      const y = cy + 2*A*Math.sin(2*Math.PI*x/lambda)*Math.cos(phase);
      x === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();
    for (let x = 0; x < W; x += lambda/2) {
      ctx.fillStyle = '#e74c3c'; ctx.shadowBlur = 8; ctx.shadowColor = '#e74c3c';
      ctx.beginPath(); ctx.arc(x, cy, 5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#aac4e6'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText('nút', x, cy+18);
    }
    ctx.fillStyle = '#aac4e6'; ctx.font = '12px Space Mono,monospace'; ctx.textAlign = 'left';
    ctx.fillText('Sóng dừng – Giao thoa hai sóng ngược chiều', 10, 20);
  }
  ctx.strokeStyle = '#7cb9ff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W-100, 35); ctx.lineTo(W-20, 35); ctx.stroke();
  ctx.fillStyle = '#7cb9ff';
  ctx.beginPath(); ctx.moveTo(W-15, 35); ctx.lineTo(W-28, 29); ctx.lineTo(W-28, 41); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7cb9ff'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('→ truyền', W-58, 30);
}

/* ==================== OPTICS ==================== */
function runOptics() {
  const c = document.getElementById('optics-canvas'); if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#030712'; ctx.fillRect(0,0,W,H);

  const mode = document.getElementById('optics-mode').value;
  const angleDeg = parseFloat(document.getElementById('optics-angle').value) || 40;
  const n2 = parseFloat(document.getElementById('optics-n').value) || 1.5;
  const n1 = 1.0;
  const angleRad = angleDeg * Math.PI / 180;
  const sinR = (n1/n2) * Math.sin(angleRad);
  const rRad = Math.asin(Math.min(sinR, 1));
  const rDeg = rRad * 180 / Math.PI;

  document.getElementById('opt-i').innerHTML = angleDeg + '<span class="dc-unit">°</span>';
  document.getElementById('opt-r').innerHTML = rDeg.toFixed(1) + '<span class="dc-unit">°</span>';
  document.getElementById('opt-n').textContent = n2.toFixed(2);

  if (mode === 'dispersion') {
    document.getElementById('opt-desc').textContent = 'Tán sắc';
    drawDispersion(ctx, W, H, angleDeg);
  } else if (mode === 'refraction') {
    document.getElementById('opt-desc').textContent = 'Khúc xạ';
    drawRefraction(ctx, W, H, angleDeg, rDeg, n1, n2);
  } else {
    document.getElementById('opt-desc').textContent = 'Giao thoa';
    drawInterference(ctx, W, H);
  }
}

function drawDispersion(ctx, W, H) {
  const cx = W*0.35, cy = H/2;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx-80, cy+80); ctx.lineTo(cx+80, cy+80); ctx.lineTo(cx, cy-80); ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = 'rgba(100,200,255,0.08)'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.shadowBlur = 6; ctx.shadowColor = '#fff';
  ctx.beginPath(); ctx.moveTo(30, cy-30); ctx.lineTo(cx-20, cy+30); ctx.stroke();
  const colors = ['#ff0000','#ff7700','#ffff00','#00ff00','#0088ff','#4400ff','#8800ff'];
  const angles = [-12,-8,-4,0,4,8,12];
  colors.forEach((col, i) => {
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.shadowBlur = 8; ctx.shadowColor = col;
    const ang = (angles[i]) * Math.PI/180;
    ctx.beginPath();
    ctx.moveTo(cx+20, cy+30);
    ctx.lineTo(cx+20 + Math.cos(ang)*200, cy+30 - Math.sin(ang)*200);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#aac4e6'; ctx.font = '12px Space Mono,monospace'; ctx.textAlign = 'left';
  ctx.fillText('Tán sắc ánh sáng – lăng kính tách 7 màu', 10, 20);
  ctx.fillStyle = '#ffe082'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
  ctx.fillText('Ánh sáng trắng', 10, cy-30);
  ctx.fillStyle = '#7cb9ff';
  ctx.fillText('Lăng kính', cx-40, cy+100);
}

function drawRefraction(ctx, W, H, i_deg, r_deg, n1, n2) {
  const iRad = i_deg * Math.PI/180;
  const rRad = r_deg * Math.PI/180;
  const midX = W/2, midY = H/2;
  ctx.fillStyle = 'rgba(52,152,219,0.1)';
  ctx.fillRect(0, midY, W, H-midY);
  ctx.strokeStyle = 'rgba(52,152,219,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();
  ctx.fillStyle = '#7cb9ff'; ctx.font = '11px monospace'; ctx.textAlign = 'right';
  ctx.fillText('n₁ = '+n1.toFixed(2)+' (không khí)', W-10, midY-10);
  ctx.fillStyle = '#4fc3f7'; ctx.fillText('n₂ = '+n2.toFixed(2), W-10, midY+20);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.setLineDash([6,6]);
  ctx.beginPath(); ctx.moveTo(midX, midY-120); ctx.lineTo(midX, midY+120); ctx.stroke();
  ctx.setLineDash([]);
  const iX = midX - Math.sin(iRad)*150, iY = midY - Math.cos(iRad)*150;
  ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 3; ctx.shadowBlur = 8; ctx.shadowColor = '#ffe082';
  ctx.beginPath(); ctx.moveTo(iX, iY); ctx.lineTo(midX, midY); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe082'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
  ctx.fillText('i = '+i_deg+'°', iX+30, iY+20);
  const rX = midX + Math.sin(rRad)*150, rY = midY + Math.cos(rRad)*150;
  ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 3; ctx.shadowBlur = 8; ctx.shadowColor = '#2ecc71';
  ctx.beginPath(); ctx.moveTo(midX, midY); ctx.lineTo(rX, rY); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2ecc71'; ctx.fillText('r = '+r_deg.toFixed(1)+'°', rX-30, rY-20);
  const refX = midX + Math.sin(iRad)*100, refY = midY - Math.cos(iRad)*100;
  ctx.strokeStyle = 'rgba(255,224,130,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([6,6]);
  ctx.beginPath(); ctx.moveTo(midX, midY); ctx.lineTo(refX, refY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#aac4e6'; ctx.font = '12px Space Mono,monospace'; ctx.textAlign = 'left';
  ctx.fillText('Khúc xạ ánh sáng – Định luật Snell', 10, 20);
}

function drawInterference(ctx, W, H) {
  const cx = W/2, cy = H/2;
  const slit1 = { x: cx-60, y: cy };
  const slit2 = { x: cx+60, y: cy };
  ctx.fillStyle = '#aac4e6'; ctx.font = '12px Space Mono,monospace'; ctx.textAlign = 'left';
  ctx.fillText('Giao thoa ánh sáng – vân sáng/tối', 10, 20);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const d1 = Math.sqrt((x-slit1.x)**2 + (y-slit1.y)**2);
      const d2 = Math.sqrt((x-slit2.x)**2 + (y-slit2.y)**2);
      const delta = d1 - d2;
      const lambda = 30;
      const intensity = Math.cos(Math.PI*delta/lambda)**2;
      if (intensity > 0.7) {
        ctx.fillStyle = `rgba(255, 235, 59, ${(intensity-0.7)*3.3*0.3})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(slit1.x, slit1.y, 5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(slit2.x, slit2.y, 5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ffe082'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
  ctx.fillText('S₁', slit1.x, slit1.y-10);
  ctx.fillText('S₂', slit2.x, slit2.y-10);
  ctx.fillStyle = '#7cb9ff'; ctx.font = '11px monospace';
  ctx.fillText('Vân sáng: δ=kλ', W*0.8, H-20);
}

/* ==================== CIRCUIT ==================== */
let circuitClosed = false;

function setSwitch(closed) {
  circuitClosed = closed;
  runCircuit();
}

function resetCircuit() {
  circuitClosed = false;
  ['circ-A','circ-V','circ-Rtotal','circ-P'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '–<span class="dc-unit">' + (id==='circ-A'?'A':id==='circ-V'?'V':id==='circ-Rtotal'?'Ω':'W') + '</span>';
  });
  drawCircuit(false, 0, 0);
}

function runCircuit() {
  const E = parseFloat(document.getElementById('circuit-emf').value) || 12;
  const R1 = parseFloat(document.getElementById('circuit-r1').value) || 10;
  const R2 = parseFloat(document.getElementById('circuit-r2').value) || 10;
  const RL = parseFloat(document.getElementById('circuit-lamp').value) || 5;
  const type = document.getElementById('circuit-type').value;
  let Rtotal;
  if (type === 'series') Rtotal = R1 + R2 + RL;
  else if (type === 'parallel') Rtotal = (1/(1/R1 + 1/R2)) + RL;
  else Rtotal = 1/(1/R1 + 1/(R2+RL));
  const I = circuitClosed ? E / Rtotal : 0;
  const V = circuitClosed ? I * RL : 0;
  const P = circuitClosed ? E * I : 0;
  document.getElementById('circ-A').innerHTML = I.toFixed(2) + '<span class="dc-unit">A</span>';
  document.getElementById('circ-V').innerHTML = (I*RL).toFixed(2) + '<span class="dc-unit">V</span>';
  document.getElementById('circ-Rtotal').innerHTML = Rtotal.toFixed(1) + '<span class="dc-unit">Ω</span>';
  document.getElementById('circ-P').innerHTML = P.toFixed(2) + '<span class="dc-unit">W</span>';
  drawCircuit(circuitClosed, I, E);
}


function drawCircuit(closed, I, E) {
  const c = document.getElementById('circuit-canvas'); if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  // Nền phòng lab tối
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0a0f1a'); bg.addColorStop(1,'#0d1520');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

  // Lưới nền nhẹ
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for(let x=0; x<W; x+=30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0; y<H; y+=30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  const type = document.getElementById('circuit-type').value;
  const R1 = parseFloat(document.getElementById('circuit-r1').value)||10;
  const R2 = parseFloat(document.getElementById('circuit-r2').value)||10;
  const RL = parseFloat(document.getElementById('circuit-lamp').value)||5;
  const glow = closed && I > 0.01;
  const wireColor = glow ? '#ffd54f' : '#445566';
  const lineW = glow ? 3 : 2;
  const shadowC = glow ? '#ffd54f' : 'transparent';

  function wire(x1,y1,x2,y2, color, lw, sh) {
    ctx.save();
    if(sh) { ctx.shadowBlur=10; ctx.shadowColor=sh; }
    ctx.strokeStyle=color||wireColor; ctx.lineWidth=lw||lineW;
    ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.restore();
  }

  // Hàm vẽ điện trở (zig-zag chuẩn)
  function drawResistor(x, y, w, label, value) {
    const h2 = 10, segs = 8;
    ctx.fillStyle = '#1a2640';
    ctx.strokeStyle = glow ? '#ffa726' : '#607d8b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for(let i = 0; i <= segs; i++) {
      const px = x + (w/segs)*i;
      const py = y + (i%2===0 ? -h2 : h2);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x+w, y); ctx.stroke();
    // Nhãn
    ctx.fillStyle = '#b0c4de'; ctx.font = 'bold 11px Space Mono,monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, x+w/2, y-18);
    ctx.fillStyle = '#7cb9ff'; ctx.font = '10px monospace';
    ctx.fillText(value+'Ω', x+w/2, y+24);
  }

  // Hàm vẽ bóng đèn
  function drawLamp(cx, cy, label, glowing) {
    ctx.save();
    if(glowing) { ctx.shadowBlur=30; ctx.shadowColor='#fff176'; }
    // Vòng tròn bóng đèn
    ctx.strokeStyle = glowing ? '#ffd54f' : '#607d8b'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI*2); ctx.stroke();
    // Dấu x bên trong
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx-9, cy-9); ctx.lineTo(cx+9, cy+9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+9, cy-9); ctx.lineTo(cx-9, cy+9); ctx.stroke();
    if(glowing) {
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff176';
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.fillStyle = glowing ? '#ffd54f' : '#b0c4de';
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy - 20);
  }

  // Hàm vẽ nguồn điện (pin)
  function drawBattery(cx, cy, voltage) {
    const bw=14, bh=36;
    // Thân pin
    ctx.fillStyle = '#1e3a5f';
    ctx.strokeStyle = '#90caf9'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx-bw/2-4,cy-bh/2-6,bw+8,bh+12,4): ctx.rect(cx-bw/2-4,cy-bh/2-6,bw+8,bh+12); ctx.fill(); ctx.stroke();
    // Vạch cực
    ctx.strokeStyle = '#ef5350'; ctx.lineWidth = 3; // cực dương (+)
    ctx.beginPath(); ctx.moveTo(cx-bw/2,cy-bh/2); ctx.lineTo(cx+bw/2,cy-bh/2); ctx.stroke();
    ctx.strokeStyle = '#90caf9'; ctx.lineWidth = 2; // cực âm (-)
    ctx.beginPath(); ctx.moveTo(cx-bw/2+4,cy+bh/2); ctx.lineTo(cx+bw/2-4,cy+bh/2); ctx.stroke();
    // Ký hiệu + và -
    ctx.fillStyle = '#ef5350'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('+', cx, cy-bh/2-10);
    ctx.fillStyle = '#90caf9'; ctx.fillText('–', cx, cy+bh/2+12);
    // Giá trị E
    ctx.fillStyle = '#ffe082'; ctx.font = 'bold 10px monospace';
    ctx.fillText(voltage+'V', cx, cy+3);
    ctx.fillStyle = '#7cb9ff'; ctx.font = '9px monospace'; ctx.fillText('Pin', cx, cy-8);
  }

  // Hàm vẽ ampe kế
  function drawAmmeter(cx, cy, iVal) {
    ctx.save();
    if(glow) { ctx.shadowBlur=8; ctx.shadowColor='#80ff80'; }
    ctx.strokeStyle = glow ? '#69f0ae' : '#546e7a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#aaffaa'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('A', cx, cy+4);
    if(closed) {
      ctx.fillStyle = '#69f0ae'; ctx.font = '9px monospace';
      ctx.fillText(iVal+'A', cx, cy+20);
    }
  }

  // Hàm vẽ vôn kế
  function drawVoltmeter(cx, cy, vVal) {
    ctx.save();
    ctx.strokeStyle = glow ? '#80b4ff' : '#546e7a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#aaccff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('V', cx, cy+4);
    if(closed) {
      ctx.fillStyle = '#80b4ff'; ctx.font = '9px monospace';
      ctx.fillText(vVal+'V', cx, cy+20);
    }
  }

  // Hàm vẽ khóa K
  function drawSwitch(x, y, isClosed) {
    ctx.strokeStyle = glow && isClosed ? '#ffd54f' : '#90a4ae'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x-14, y); ctx.lineTo(x-4, y); ctx.stroke();
    ctx.beginPath(); ctx.arc(x-4, y, 3, 0, Math.PI*2); ctx.fillStyle='#90a4ae'; ctx.fill();
    if(isClosed) {
      ctx.beginPath(); ctx.moveTo(x-4, y); ctx.lineTo(x+4, y); ctx.lineTo(x+14, y); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x-4, y); ctx.lineTo(x+10, y-12); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x+14, y, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#90a4ae'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('K', x, y+14);
  }

  // Hạt điện tử di chuyển
  function drawElectrons(points, count, progress) {
    if(!closed || I < 0.01) return;
    ctx.save();
    for(let e=0; e<count; e++) {
      const t = ((progress + e/count) % 1);
      const idx = Math.floor(t * (points.length-1));
      const frac = (t * (points.length-1)) - idx;
      if(idx >= points.length-1) continue;
      const ex = points[idx].x + (points[idx+1].x - points[idx].x)*frac;
      const ey = points[idx].y + (points[idx+1].y - points[idx].y)*frac;
      ctx.shadowBlur=6; ctx.shadowColor='#ffd54f';
      ctx.fillStyle='#ffe082';
      ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  const eProgress = (Date.now() % 3000) / 3000;

  if(type === 'series') {
    // Layout nối tiếp: pin → K → Ammeter → R1 → R2 → Lamp → về pin
    // Đường chính: chữ nhật lớn
    const left=60, right=640, top=80, bot=240;
    const batX=left+30, batY=(top+bot)/2;
    const swX=left+110, swY=top;
    const amX=left+200, amY=top;
    const r1X=left+280, r1Y=top;
    const r2X=left+400, r2Y=top;
    const lampX=right-40, lampY=(top+bot)/2;

    wire(left, top, left, bot, wireColor, lineW, shadowC); // dây trái (pin)
    wire(left, bot, right, bot, wireColor, lineW, shadowC); // dây dưới
    wire(right, bot, right, top, wireColor, lineW, shadowC); // dây phải (đèn)
    wire(right, top, lampX+15, top, wireColor, lineW, shadowC);
    wire(right, bot, right, lampY+15, wireColor, lineW, shadowC);
    wire(left, top, swX-14, top, wireColor, lineW, shadowC);
    wire(swX+14, top, amX-14, top, wireColor, lineW, shadowC);
    wire(amX+14, top, r1X, top, wireColor, lineW, shadowC);
    wire(r1X+60, top, r2X, top, wireColor, lineW, shadowC);
    wire(r2X+60, top, lampX, top, wireColor, lineW, shadowC);

    // Dây nối pin vào mạch
    wire(left, batY-18, left, top, wireColor, lineW, shadowC);
    wire(left, batY+18, left, bot, wireColor, lineW, shadowC);

    drawBattery(batX-30, batY, E);
    drawSwitch(swX, swY, closed);
    drawAmmeter(amX, amY, I.toFixed(2));
    drawResistor(r1X, r1Y, 60, 'R₁', R1);
    drawResistor(r2X, r2Y, 60, 'R₂', R2);
    drawLamp(lampX, lampY, 'Đèn', glow);

    // Vôn kế song song với đèn (nét đứt màu xanh)
    const vmX = lampX, vmY = bot-40;
    ctx.save(); ctx.strokeStyle='#4488ff'; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.moveTo(right-4, top); ctx.lineTo(right-4, vmY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right-4, vmY); ctx.lineTo(vmX+14, vmY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(right-4, bot-4); ctx.lineTo(right-4, vmY); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    drawVoltmeter(vmX-15, vmY, (I*RL).toFixed(1));

    // Electrons
    const ePath = [
      {x:left,y:bot},{x:right,y:bot},{x:right,y:top+30},{x:lampX,y:top+30},
      {x:r2X+60,y:top},{x:r2X,y:top},{x:r1X+60,y:top},{x:r1X,y:top},
      {x:amX+14,y:top},{x:swX+14,y:top},{x:swX-14,y:top},{x:left,y:top},{x:left,y:bot}
    ];
    if(closed) drawElectrons(ePath, 6, eProgress);

  } else if(type === 'parallel') {
    // Layout song song: pin → K → Ammeter → (R1 // R2) → Lamp → về
    const left=60, right=640, top=70, mid=170, bot=260;
    const batX=left+30, batY=(top+bot)/2;
    const swX=130, swY=top;
    const amX=210, amY=top;
    const jL=290, jR=440; // junction points

    // Dây ngoài
    wire(left, batY-18, left, top, wireColor, lineW, shadowC);
    wire(left, batY+18, left, bot, wireColor, lineW, shadowC);
    wire(left, top, swX-14, top, wireColor, lineW, shadowC);
    wire(swX+14, top, amX-14, top, wireColor, lineW, shadowC);
    wire(amX+14, top, jL, top, wireColor, lineW, shadowC);
    wire(jR, top, right-30, top, wireColor, lineW, shadowC);
    wire(left, bot, right, bot, wireColor, lineW, shadowC);
    wire(right, bot, right, top, wireColor, lineW, shadowC);
    wire(right, top, right-30, top, wireColor, lineW, shadowC);

    // Nhánh R1 (trên)
    wire(jL, top, jL, mid-30, wireColor, lineW, shadowC);
    wire(jL, mid-30, jL+10, mid-30, wireColor, lineW, shadowC);
    wire(jR, mid-30, jR, top, wireColor, lineW, shadowC);
    wire(jR-10, mid-30, jR, mid-30, wireColor, lineW, shadowC);
    drawResistor(jL+10, mid-30, jR-jL-20, 'R₁', R1);

    // Nhánh R2 (dưới)
    wire(jL, top, jL, mid+30, wireColor, lineW, shadowC);
    wire(jL, mid+30, jL+10, mid+30, wireColor, lineW, shadowC);
    wire(jR, mid+30, jR, top, wireColor, lineW, shadowC);
    wire(jR-10, mid+30, jR, mid+30, wireColor, lineW, shadowC);
    drawResistor(jL+10, mid+30, jR-jL-20, 'R₂', R2);

    // Đèn nối tiếp sau song song
    const lampX = right-60, lampY=(top+bot)/2;
    wire(right, top, right, lampY-15, wireColor, lineW, shadowC);
    wire(right, lampY+15, right, bot, wireColor, lineW, shadowC);
    drawLamp(lampX+20, lampY, 'Đèn', glow);

    drawBattery(batX-30, batY, E);
    drawSwitch(swX, swY, closed);
    drawAmmeter(amX, amY, I.toFixed(2));

    // Junction dots
    [jL,jR].forEach(jx => {
      ctx.fillStyle = wireColor; ctx.beginPath(); ctx.arc(jx, top, 5, 0, Math.PI*2); ctx.fill();
    });

  } else { // mixed
    const left=60, right=640, top=80, bot=240;
    const batX=left+20, batY=(top+bot)/2;
    const swX=120, swY=top;
    const amX=200, amY=top;
    const jL=290, jR=430;

    wire(left, batY-18, left, top, wireColor, lineW, shadowC);
    wire(left, batY+18, left, bot, wireColor, lineW, shadowC);
    wire(left, top, swX-14, top, wireColor, lineW, shadowC);
    wire(swX+14, top, amX-14, top, wireColor, lineW, shadowC);
    wire(amX+14, top, jL, top, wireColor, lineW, shadowC);
    wire(jR, top, right, top, wireColor, lineW, shadowC);
    wire(left, bot, right, bot, wireColor, lineW, shadowC);
    wire(right, bot, right, top, wireColor, lineW, shadowC);

    // R1 nhánh trên song song
    wire(jL, top, jL, top-50, wireColor, lineW, shadowC);
    wire(jL, top-50, jL+15, top-50, wireColor, lineW, shadowC);
    wire(jR, top, jR, top-50, wireColor, lineW, shadowC);
    wire(jR-15, top-50, jR, top-50, wireColor, lineW, shadowC);
    drawResistor(jL+15, top-50, jR-jL-30, 'R₁', R1);

    // R2 nhánh dưới song song
    wire(jL, top, jL, top+50, wireColor, lineW, shadowC);
    wire(jL, top+50, jL+15, top+50, wireColor, lineW, shadowC);
    wire(jR, top, jR, top+50, wireColor, lineW, shadowC);
    wire(jR-15, top+50, jR, top+50, wireColor, lineW, shadowC);
    drawResistor(jL+15, top+50, jR-jL-30, 'R₂', R2);

    // Đèn sau khối song song
    const lampX=right-50, lampY=(top+bot)/2;
    wire(right, top, right, lampY-15, wireColor, lineW, shadowC);
    wire(right, lampY+15, right, bot, wireColor, lineW, shadowC);
    drawLamp(lampX, lampY, 'Đèn', glow);

    [jL,jR].forEach(jx => {
      ctx.fillStyle = wireColor; ctx.beginPath(); ctx.arc(jx, top, 5, 0, Math.PI*2); ctx.fill();
    });

    drawBattery(batX-10, batY, E);
    drawSwitch(swX, swY, closed);
    drawAmmeter(amX, amY, I.toFixed(2));
  }

  // Nhãn trạng thái dưới cùng
  ctx.font = 'bold 12px Space Mono,monospace'; ctx.textAlign = 'center';
  if(closed) {
    ctx.fillStyle = '#69f0ae';
    ctx.fillText(`✔ Mạch đóng  |  I = ${I.toFixed(2)} A  |  P = ${(E*I).toFixed(2)} W`, W/2, H-10);
  } else {
    ctx.fillStyle = '#ef5350';
    ctx.fillText('✘ Mạch hở – Đóng khóa K để bật mạch', W/2, H-10);
  }
}
requestAnimationFrame(function loop(ts) {
  const cPage = document.getElementById('page-circuit');
  if(cPage && cPage.classList.contains('active') && circuitClosed) {
    const E2 = parseFloat(document.getElementById('circuit-emf').value)||12;
    const R12 = parseFloat(document.getElementById('circuit-r1').value)||10;
    const R22 = parseFloat(document.getElementById('circuit-r2').value)||10;
    const RL2 = parseFloat(document.getElementById('circuit-lamp').value)||5;
    const type2 = document.getElementById('circuit-type').value;
    let Rt; if(type2==='series') Rt=R12+R22+RL2; else if(type2==='parallel') Rt=(1/(1/R12+1/R22))+RL2; else Rt=1/(1/R12+1/(R22+RL2));
    const I2 = E2/Rt;
    drawCircuit(true, I2, E2);
  }
  requestAnimationFrame(loop);
});
/* ==================== CHEMISTRY ==================== */
const chemicals = [
  { id:'HCl',  name:'HCl',    type:'acid',    strength:'strong', pH:1.0,  pKa: -6,   pKb: null, color:'#ff8a65cc', typeLabel:'Acid mạnh',  formula:'HCl → H⁺ + Cl⁻' },
  { id:'H2SO4',name:'H₂SO₄', type:'acid',    strength:'strong', pH:0.5,  pKa: -3,   pKb: null, color:'#ff7043cc', typeLabel:'Acid mạnh',  formula:'H₂SO₄ → 2H⁺ + SO₄²⁻' },
  { id:'CH3COOH',name:'CH₃COOH',type:'acid', strength:'weak',   pH:3.0,  pKa: 4.76, pKb: null, color:'#ffcc80cc', typeLabel:'Acid yếu',   formula:'CH₃COOH ⇌ CH₃COO⁻ + H⁺' },
  { id:'HNO3', name:'HNO₃',  type:'acid',    strength:'strong', pH:1.2,  pKa: -1,   pKb: null, color:'#ffb74dcc', typeLabel:'Acid mạnh',  formula:'HNO₃ → H⁺ + NO₃⁻' },
  { id:'NaOH', name:'NaOH',  type:'base',    strength:'strong', pH:13.0, pKa: null, pKb: 0,   color:'#4fc3f7cc', typeLabel:'Base mạnh',  formula:'NaOH → Na⁺ + OH⁻' },
  { id:'KOH',  name:'KOH',   type:'base',    strength:'strong', pH:13.0, pKa: null, pKb: 0,   color:'#29b6f6cc', typeLabel:'Base mạnh',  formula:'KOH → K⁺ + OH⁻' },
  { id:'CuOH2',name:'Cu(OH)₂',type:'base',  strength:'weak',   pH:9.0,  pKa: null, pKb: 6.5, color:'#80deea cc', typeLabel:'Base yếu',   formula:'Cu(OH)₂ ⇌ Cu²⁺ + 2OH⁻' },
  { id:'NH3',  name:'NH₃',   type:'base',    strength:'weak',   pH:11.0, pKa: null, pKb: 4.75,color:'#80cbc4cc', typeLabel:'Base yếu',   formula:'NH₃ + H₂O ⇌ NH₄⁺ + OH⁻' },
  { id:'H2O',  name:'H₂O',   type:'neutral', strength:'neutral',pH:7.0,  pKa: null, pKb: null,color:'#b2ebf2cc', typeLabel:'Trung tính', formula:'H₂O – nước tinh khiết' },
  { id:'NaCl', name:'NaCl',  type:'neutral', strength:'neutral',pH:7.0,  pKa: null, pKb: null,color:'#e0e0e0cc', typeLabel:'Muối',       formula:'NaCl – muối ăn' },
  // Thêm vào cuối mảng chemicals
  { id:'CaOH2', name:'Ca(OH)₂', type:'base', strength:'strong', pH:12.5, pKa: null, pKb: 0, color:'#4db6accc', typeLabel:'Base mạnh', formula:'Ca(OH)₂ → Ca²⁺ + 2OH⁻' },
  { id:'Na2CO3', name:'Na₂CO₃', type:'base', strength:'weak', pH:11.0, pKa: null, pKb: 3.67, color:'#80cbc4cc', typeLabel:'Base yếu', formula:'Na₂CO₃ + H₂O ⇌ HCO₃⁻ + OH⁻' },
  { id:'AlCl3', name:'AlCl₃', type:'acid', strength:'weak', pH:4.0, pKa: 5.0, pKb: null, color:'#ffb74dcc', typeLabel:'Acid yếu (thủy phân)', formula:'AlCl₃ + 3H₂O ⇌ Al(OH)₃ + 3H⁺' }
];

let selectedA = null, selectedB = null;

function initShelf() {
  const row = document.getElementById('shelf-row'); if (!row) return;
  row.innerHTML = '';
  chemicals.forEach(ch => {
    const emoji = ch.type === 'acid' ? '🔴' : ch.type === 'base' ? '🔵' : '⚪';
    const div = document.createElement('div');
    div.className = 'chem-bottle';
    div.id = 'bottle-' + ch.id;
    div.innerHTML = `<div class="bottle-svg">${emoji}🧪</div><div class="bottle-name">${ch.name}</div><div class="bottle-type">${ch.typeLabel}</div>`;
    div.onclick = () => selectChemical(ch);
    row.appendChild(div);
  });
  resetChem();
}

function selectChemical(ch) {
  if (!selectedA) {
    selectedA = ch;
    document.getElementById('slot-A-name').textContent = ch.name;
    document.getElementById('slot-A').style.borderColor = '#e74c3c';
    document.getElementById('bottle-'+ch.id).classList.add('selected');
    document.getElementById('beaker-A-label').textContent = ch.name;
    document.getElementById('liq-acid').style.background = ch.color;
  } else if (!selectedB && ch.id !== selectedA.id) {
    selectedB = ch;
    document.getElementById('slot-B-name').textContent = ch.name;
    document.getElementById('slot-B').style.borderColor = '#e74c3c';
    document.getElementById('bottle-'+ch.id).classList.add('selected');
    document.getElementById('beaker-B-label').textContent = ch.name;
    document.getElementById('liq-base').style.background = ch.color;
  }
  updateLitmus();
  document.getElementById('chem-A').textContent = selectedA ? selectedA.name : '–';
  document.getElementById('chem-B').textContent = selectedB ? selectedB.name : '–';
}

function clearSlot(slot) {
  if (slot === 'A' && selectedA) {
    document.getElementById('bottle-'+selectedA.id).classList.remove('selected');
    selectedA = null;
    document.getElementById('slot-A-name').textContent = '— chưa chọn —';
    document.getElementById('slot-A').style.borderColor = '';
    document.getElementById('chem-A').textContent = '–';
  }
  if (slot === 'B' && selectedB) {
    document.getElementById('bottle-'+selectedB.id).classList.remove('selected');
    selectedB = null;
    document.getElementById('slot-B-name').textContent = '— chưa chọn —';
    document.getElementById('slot-B').style.borderColor = '';
    document.getElementById('chem-B').textContent = '–';
  }
  updateLitmus();
}

function updateLitmus() {
  const paper = document.getElementById('litmus-paper');
  const result = document.getElementById('litmus-result');
  if (!selectedA) { paper.style.background = '#9c27b0'; document.getElementById('litmus-text').textContent = 'Quỳ tím'; result.textContent = 'Chưa thử'; return; }
  const pH = selectedA.pH;
  if (pH < 7) { paper.style.background = '#e74c3c'; document.getElementById('litmus-text').textContent = 'Đỏ'; result.textContent = `pH = ${pH} → Môi trường acid 🔴`; }
  else if (pH > 7) { paper.style.background = '#1565c0'; document.getElementById('litmus-text').textContent = 'Xanh'; result.textContent = `pH = ${pH} → Môi trường base 🔵`; }
  else { paper.style.background = '#9c27b0'; document.getElementById('litmus-text').textContent = 'Tím'; result.textContent = `pH = ${pH} → Trung tính ⚪`; }
}

function computePH(chemical, concentration) {
  if (!chemical || chemical.type === 'neutral') return 7.0;
  if (chemical.type === 'acid') {
    if (chemical.strength === 'strong') {
      let h = concentration;
      if (chemical.id === 'H2SO4') h = 2 * concentration;
      return h > 0 ? -Math.log10(h) : 7;
    } else {
      const h = Math.sqrt(concentration * Math.pow(10, -chemical.pKa));
      return -Math.log10(h);
    }
  } else {
    if (chemical.strength === 'strong') {
      let oh = concentration;
      const poh = -Math.log10(oh);
      return 14 - poh;
    } else {
      const oh = Math.sqrt(concentration * Math.pow(10, -chemical.pKb));
      const poh = -Math.log10(oh);
      return 14 - poh;
    }
  }
}

function mixChemicals() {
  if (!selectedA || !selectedB) { alert('Hãy chọn 2 chất từ kệ để phản ứng!'); return; }
  const concA = parseFloat(document.getElementById('conc-A').value) || 0.1;
  const concB = parseFloat(document.getElementById('conc-B').value) || 0.1;
  const volA = parseFloat(document.getElementById('vol-A').value) || 1.0;
  const volB = volA;
  const volTotal = volA + volB;
  
  let finalpH = 7.0;
  let env = 'Trung tính';
  let description = '';

  if ((selectedA.type === 'acid' && selectedB.type === 'base') || (selectedA.type === 'base' && selectedB.type === 'acid')) {
    const acid = selectedA.type === 'acid' ? selectedA : selectedB;
    const base = selectedA.type === 'base' ? selectedA : selectedB;
    const concAcid = selectedA.type === 'acid' ? concA : concB;
    const concBase = selectedA.type === 'base' ? concA : concB;
    const volAcid = selectedA.type === 'acid' ? volA : volB;
    const volBase = selectedA.type === 'base' ? volA : volB;
    
    let nH = 0, nOH = 0;
    if (acid.strength === 'strong') {
      nH = concAcid * volAcid;
      if (acid.id === 'H2SO4') nH *= 2;
    } else {
      nH = concAcid * volAcid;
    }
    if (base.strength === 'strong') {
      nOH = concBase * volBase;
    } else {
      nOH = concBase * volBase;
    }
    
    const nDiff = Math.abs(nH - nOH);
    if (nDiff < 1e-6) {
      finalpH = 7.0;
      env = 'Trung tính (phản ứng trung hòa)';
      description = 'Acid và base vừa đủ → muối trung hòa + nước';
    } else if (nH > nOH) {
      const h_conc = (nH - nOH) / volTotal;
      finalpH = -Math.log10(h_conc);
      env = 'Acid';
      description = `Acid dư ${(nH-nOH).toFixed(4)} mol → pH = ${finalpH.toFixed(2)}`;
    } else {
      const oh_conc = (nOH - nH) / volTotal;
      finalpH = 14 - (-Math.log10(oh_conc));
      env = 'Kiềm';
      description = `Kiềm dư ${(nOH-nH).toFixed(4)} mol → pH = ${finalpH.toFixed(2)}`;
    }
  } 
  else if (selectedA.type === 'acid' && selectedB.type === 'acid') {
    const pH1 = computePH(selectedA, concA);
    const pH2 = computePH(selectedB, concB);
    const h1 = Math.pow(10, -pH1);
    const h2 = Math.pow(10, -pH2);
    const h_avg = (h1 * volA + h2 * volB) / volTotal;
    finalpH = -Math.log10(h_avg);
    env = 'Hỗn hợp acid';
    description = `pH trung bình theo nồng độ H⁺ = ${finalpH.toFixed(2)}`;
  } 
  else if (selectedA.type === 'base' && selectedB.type === 'base') {
    const pH1 = computePH(selectedA, concA);
    const pH2 = computePH(selectedB, concB);
    const oh1 = Math.pow(10, -(14 - pH1));
    const oh2 = Math.pow(10, -(14 - pH2));
    const oh_avg = (oh1 * volA + oh2 * volB) / volTotal;
    finalpH = 14 - (-Math.log10(oh_avg));
    env = 'Hỗn hợp base';
    description = `pH trung bình theo nồng độ OH⁻ = ${finalpH.toFixed(2)}`;
  }
  else {
    const active = selectedA.type !== 'neutral' ? selectedA : selectedB;
    const concActive = selectedA.type !== 'neutral' ? concA : concB;
    finalpH = computePH(active, concActive);
    env = active.type === 'acid' ? 'Môi trường acid' : (active.type === 'base' ? 'Môi trường base' : 'Trung tính');
    description = `Chỉ có ${active.name} ảnh hưởng pH`;
  }

  finalpH = Math.min(14, Math.max(0, finalpH));
  
  document.getElementById('ph-val').textContent = finalpH.toFixed(2);
  document.getElementById('chem-ph-val').innerHTML = finalpH.toFixed(2);
  document.getElementById('chem-env').textContent = env;
  document.getElementById('liq-acid').style.height = '20%';
  document.getElementById('liq-base').style.height = '20%';
  document.getElementById('liq-result').style.height = '70%';
  let color;
  if (finalpH < 6) color = '#ff8a65cc';
  else if (finalpH < 7) color = '#ffcc80cc';
  else if (finalpH > 8) color = '#4fc3f7cc';
  else if (finalpH > 7) color = '#80cbc4cc';
  else color = '#b2ebf2cc';
  document.getElementById('liq-result').style.background = color;
  document.getElementById('ph-display').style.display = 'flex';
  
  const paper = document.getElementById('litmus-paper');
  const resultSpan = document.getElementById('litmus-result');
  if (finalpH < 7) { paper.style.background = '#e74c3c'; document.getElementById('litmus-text').textContent = 'Đỏ'; resultSpan.textContent = `pH = ${finalpH.toFixed(2)} → Môi trường acid 🔴`; }
  else if (finalpH > 7) { paper.style.background = '#1565c0'; document.getElementById('litmus-text').textContent = 'Xanh'; resultSpan.textContent = `pH = ${finalpH.toFixed(2)} → Môi trường base 🔵`; }
  else { paper.style.background = '#9c27b0'; document.getElementById('litmus-text').textContent = 'Tím'; resultSpan.textContent = `pH = 7.00 → Trung tính ⚪`; }
  
  const eqDiv = document.getElementById('reaction-equation');
  const eqText = document.getElementById('reaction-text');
  const eqNote = document.getElementById('reaction-note');
  eqDiv.style.display = 'block';
  if (selectedA.type === 'acid' && selectedB.type === 'base') {
    eqText.textContent = selectedA.name + ' + ' + selectedB.name + ' → Muối + H₂O';
    eqNote.textContent = `Phản ứng trung hòa. ${description}`;
  } else if (selectedA.type === 'base' && selectedB.type === 'acid') {
    eqText.textContent = selectedA.name + ' + ' + selectedB.name + ' → Muối + H₂O';
    eqNote.textContent = `Phản ứng trung hòa. ${description}`;
  } else if (selectedA.type === 'acid' && selectedB.type === 'acid') {
    eqText.textContent = selectedA.name + ' + ' + selectedB.name + ' → Hỗn hợp acid';
    eqNote.textContent = description;
  } else if (selectedA.type === 'base' && selectedB.type === 'base') {
    eqText.textContent = selectedA.name + ' + ' + selectedB.name + ' → Hỗn hợp base';
    eqNote.textContent = description;
  } else {
    eqText.textContent = selectedA.name + ' + ' + selectedB.name;
    eqNote.textContent = description;
  }
}

function resetChem() {
  document.querySelectorAll('.chem-bottle').forEach(b => b.classList.remove('selected'));
  selectedA = null; selectedB = null;
  document.getElementById('slot-A-name').textContent = '— chưa chọn —';
  document.getElementById('slot-B-name').textContent = '— chưa chọn —';
  document.getElementById('slot-A').style.borderColor = '';
  document.getElementById('slot-B').style.borderColor = '';
  document.getElementById('liq-acid').style.height = '60%';
  document.getElementById('liq-acid').style.background = '#ff8a65cc';
  document.getElementById('liq-base').style.height = '60%';
  document.getElementById('liq-base').style.background = '#4fc3f7cc';
  document.getElementById('liq-result').style.height = '0%';
  document.getElementById('ph-display').style.display = 'none';
  document.getElementById('chem-ph-val').textContent = '–';
  document.getElementById('chem-env').textContent = '–';
  document.getElementById('chem-A').textContent = '–';
  document.getElementById('chem-B').textContent = '–';
  document.getElementById('reaction-equation').style.display = 'none';
  document.getElementById('beaker-A-label').textContent = 'Chất A';
  document.getElementById('beaker-B-label').textContent = 'Chất B';
  document.getElementById('conc-A').value = '0.1';
  document.getElementById('conc-B').value = '0.1';
  document.getElementById('vol-A').value = '1.0';
  updateLitmus();
}

/* ==================== PERIODIC TABLE ==================== */
const elementsData = [
  // Chu kỳ 1
  { symbol:"H", name:"Hydrogen", number:1, mass:1.008, group:"IA", period:1, category:"nonmetal", electronegativity:2.20, config:"1s¹" },
  { symbol:"He", name:"Helium", number:2, mass:4.0026, group:"VIIIA", period:1, category:"noble gas", electronegativity:null, config:"1s²" },
  // Chu kỳ 2
  { symbol:"Li", name:"Lithium", number:3, mass:6.94, group:"IA", period:2, category:"alkali metal", electronegativity:0.98, config:"[He] 2s¹" },
  { symbol:"Be", name:"Beryllium", number:4, mass:9.012, group:"IIA", period:2, category:"alkaline earth", electronegativity:1.57, config:"[He] 2s²" },
  { symbol:"B", name:"Boron", number:5, mass:10.81, group:"IIIA", period:2, category:"metalloid", electronegativity:2.04, config:"[He] 2s² 2p¹" },
  { symbol:"C", name:"Carbon", number:6, mass:12.011, group:"IVA", period:2, category:"nonmetal", electronegativity:2.55, config:"[He] 2s² 2p²" },
  { symbol:"N", name:"Nitrogen", number:7, mass:14.007, group:"VA", period:2, category:"nonmetal", electronegativity:3.04, config:"[He] 2s² 2p³" },
  { symbol:"O", name:"Oxygen", number:8, mass:15.999, group:"VIA", period:2, category:"nonmetal", electronegativity:3.44, config:"[He] 2s² 2p⁴" },
  { symbol:"F", name:"Fluorine", number:9, mass:18.998, group:"VIIA", period:2, category:"halogen", electronegativity:3.98, config:"[He] 2s² 2p⁵" },
  { symbol:"Ne", name:"Neon", number:10, mass:20.180, group:"VIIIA", period:2, category:"noble gas", electronegativity:null, config:"[He] 2s² 2p⁶" },
  // Chu kỳ 3
  { symbol:"Na", name:"Sodium", number:11, mass:22.990, group:"IA", period:3, category:"alkali metal", electronegativity:0.93, config:"[Ne] 3s¹" },
  { symbol:"Mg", name:"Magnesium", number:12, mass:24.305, group:"IIA", period:3, category:"alkaline earth", electronegativity:1.31, config:"[Ne] 3s²" },
  { symbol:"Al", name:"Aluminium", number:13, mass:26.982, group:"IIIA", period:3, category:"post-transition", electronegativity:1.61, config:"[Ne] 3s² 3p¹" },
  { symbol:"Si", name:"Silicon", number:14, mass:28.086, group:"IVA", period:3, category:"metalloid", electronegativity:1.90, config:"[Ne] 3s² 3p²" },
  { symbol:"P", name:"Phosphorus", number:15, mass:30.974, group:"VA", period:3, category:"nonmetal", electronegativity:2.19, config:"[Ne] 3s² 3p³" },
  { symbol:"S", name:"Sulfur", number:16, mass:32.06, group:"VIA", period:3, category:"nonmetal", electronegativity:2.58, config:"[Ne] 3s² 3p⁴" },
  { symbol:"Cl", name:"Chlorine", number:17, mass:35.45, group:"VIIA", period:3, category:"halogen", electronegativity:3.16, config:"[Ne] 3s² 3p⁵" },
  { symbol:"Ar", name:"Argon", number:18, mass:39.95, group:"VIIIA", period:3, category:"noble gas", electronegativity:null, config:"[Ne] 3s² 3p⁶" },
  // Chu kỳ 4
  { symbol:"K", name:"Potassium", number:19, mass:39.098, group:"IA", period:4, category:"alkali metal", electronegativity:0.82, config:"[Ar] 4s¹" },
  { symbol:"Ca", name:"Calcium", number:20, mass:40.078, group:"IIA", period:4, category:"alkaline earth", electronegativity:1.00, config:"[Ar] 4s²" },
  { symbol:"Sc", name:"Scandium", number:21, mass:44.956, group:"IIIB", period:4, category:"transition", electronegativity:1.36, config:"[Ar] 3d¹ 4s²" },
  { symbol:"Ti", name:"Titanium", number:22, mass:47.867, group:"IVB", period:4, category:"transition", electronegativity:1.54, config:"[Ar] 3d² 4s²" },
  { symbol:"V", name:"Vanadium", number:23, mass:50.942, group:"VB", period:4, category:"transition", electronegativity:1.63, config:"[Ar] 3d³ 4s²" },
  { symbol:"Cr", name:"Chromium", number:24, mass:51.996, group:"VIB", period:4, category:"transition", electronegativity:1.66, config:"[Ar] 3d⁵ 4s¹" },
  { symbol:"Mn", name:"Manganese", number:25, mass:54.938, group:"VIIB", period:4, category:"transition", electronegativity:1.55, config:"[Ar] 3d⁵ 4s²" },
  { symbol:"Fe", name:"Iron", number:26, mass:55.845, group:"VIIIB", period:4, category:"transition", electronegativity:1.83, config:"[Ar] 3d⁶ 4s²" },
  { symbol:"Co", name:"Cobalt", number:27, mass:58.933, group:"VIIIB", period:4, category:"transition", electronegativity:1.88, config:"[Ar] 3d⁷ 4s²" },
  { symbol:"Ni", name:"Nickel", number:28, mass:58.693, group:"VIIIB", period:4, category:"transition", electronegativity:1.91, config:"[Ar] 3d⁸ 4s²" },
  { symbol:"Cu", name:"Copper", number:29, mass:63.546, group:"IB", period:4, category:"transition", electronegativity:1.90, config:"[Ar] 3d¹⁰ 4s¹" },
  { symbol:"Zn", name:"Zinc", number:30, mass:65.38, group:"IIB", period:4, category:"transition", electronegativity:1.65, config:"[Ar] 3d¹⁰ 4s²" },
  { symbol:"Ga", name:"Gallium", number:31, mass:69.723, group:"IIIA", period:4, category:"post-transition", electronegativity:1.81, config:"[Ar] 3d¹⁰ 4s² 4p¹" },
  { symbol:"Ge", name:"Germanium", number:32, mass:72.630, group:"IVA", period:4, category:"metalloid", electronegativity:2.01, config:"[Ar] 3d¹⁰ 4s² 4p²" },
  { symbol:"As", name:"Arsenic", number:33, mass:74.922, group:"VA", period:4, category:"metalloid", electronegativity:2.18, config:"[Ar] 3d¹⁰ 4s² 4p³" },
  { symbol:"Se", name:"Selenium", number:34, mass:78.971, group:"VIA", period:4, category:"nonmetal", electronegativity:2.55, config:"[Ar] 3d¹⁰ 4s² 4p⁴" },
  { symbol:"Br", name:"Bromine", number:35, mass:79.904, group:"VIIA", period:4, category:"halogen", electronegativity:2.96, config:"[Ar] 3d¹⁰ 4s² 4p⁵" },
  { symbol:"Kr", name:"Krypton", number:36, mass:83.798, group:"VIIIA", period:4, category:"noble gas", electronegativity:3.00, config:"[Ar] 3d¹⁰ 4s² 4p⁶" },
  // Chu kỳ 5
  { symbol:"Rb", name:"Rubidium", number:37, mass:85.468, group:"IA", period:5, category:"alkali metal", electronegativity:0.82, config:"[Kr] 5s¹" },
  { symbol:"Sr", name:"Strontium", number:38, mass:87.62, group:"IIA", period:5, category:"alkaline earth", electronegativity:0.95, config:"[Kr] 5s²" },
  { symbol:"Y", name:"Yttrium", number:39, mass:88.906, group:"IIIB", period:5, category:"transition", electronegativity:1.22, config:"[Kr] 4d¹ 5s²" },
  { symbol:"Zr", name:"Zirconium", number:40, mass:91.224, group:"IVB", period:5, category:"transition", electronegativity:1.33, config:"[Kr] 4d² 5s²" },
  { symbol:"Nb", name:"Niobium", number:41, mass:92.906, group:"VB", period:5, category:"transition", electronegativity:1.6, config:"[Kr] 4d⁴ 5s¹" },
  { symbol:"Mo", name:"Molybdenum", number:42, mass:95.95, group:"VIB", period:5, category:"transition", electronegativity:2.16, config:"[Kr] 4d⁵ 5s¹" },
  { symbol:"Tc", name:"Technetium", number:43, mass:98, group:"VIIB", period:5, category:"transition", electronegativity:1.9, config:"[Kr] 4d⁵ 5s²" },
  { symbol:"Ru", name:"Ruthenium", number:44, mass:101.07, group:"VIIIB", period:5, category:"transition", electronegativity:2.2, config:"[Kr] 4d⁷ 5s¹" },
  { symbol:"Rh", name:"Rhodium", number:45, mass:102.91, group:"VIIIB", period:5, category:"transition", electronegativity:2.28, config:"[Kr] 4d⁸ 5s¹" },
  { symbol:"Pd", name:"Palladium", number:46, mass:106.42, group:"VIIIB", period:5, category:"transition", electronegativity:2.20, config:"[Kr] 4d¹⁰" },
  { symbol:"Ag", name:"Silver", number:47, mass:107.87, group:"IB", period:5, category:"transition", electronegativity:1.93, config:"[Kr] 4d¹⁰ 5s¹" },
  { symbol:"Cd", name:"Cadmium", number:48, mass:112.41, group:"IIB", period:5, category:"transition", electronegativity:1.69, config:"[Kr] 4d¹⁰ 5s²" },
  { symbol:"In", name:"Indium", number:49, mass:114.82, group:"IIIA", period:5, category:"post-transition", electronegativity:1.78, config:"[Kr] 4d¹⁰ 5s² 5p¹" },
  { symbol:"Sn", name:"Tin", number:50, mass:118.71, group:"IVA", period:5, category:"post-transition", electronegativity:1.96, config:"[Kr] 4d¹⁰ 5s² 5p²" },
  { symbol:"Sb", name:"Antimony", number:51, mass:121.76, group:"VA", period:5, category:"metalloid", electronegativity:2.05, config:"[Kr] 4d¹⁰ 5s² 5p³" },
  { symbol:"Te", name:"Tellurium", number:52, mass:127.6, group:"VIA", period:5, category:"metalloid", electronegativity:2.1, config:"[Kr] 4d¹⁰ 5s² 5p⁴" },
  { symbol:"I", name:"Iodine", number:53, mass:126.90, group:"VIIA", period:5, category:"halogen", electronegativity:2.66, config:"[Kr] 4d¹⁰ 5s² 5p⁵" },
  { symbol:"Xe", name:"Xenon", number:54, mass:131.29, group:"VIIIA", period:5, category:"noble gas", electronegativity:2.6, config:"[Kr] 4d¹⁰ 5s² 5p⁶" },
  // Chu kỳ 6
  { symbol:"Cs", name:"Cesium", number:55, mass:132.91, group:"IA", period:6, category:"alkali metal", electronegativity:0.79, config:"[Xe] 6s¹" },
  { symbol:"Ba", name:"Barium", number:56, mass:137.33, group:"IIA", period:6, category:"alkaline earth", electronegativity:0.89, config:"[Xe] 6s²" },
  { symbol:"La", name:"Lanthanum", number:57, mass:138.91, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.1, config:"[Xe] 5d¹ 6s²" },
  { symbol:"Ce", name:"Cerium", number:58, mass:140.12, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.12, config:"[Xe] 4f¹ 5d¹ 6s²" },
  { symbol:"Pr", name:"Praseodymium", number:59, mass:140.91, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.13, config:"[Xe] 4f³ 6s²" },
  { symbol:"Nd", name:"Neodymium", number:60, mass:144.24, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.14, config:"[Xe] 4f⁴ 6s²" },
  { symbol:"Pm", name:"Promethium", number:61, mass:145, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.13, config:"[Xe] 4f⁵ 6s²" },
  { symbol:"Sm", name:"Samarium", number:62, mass:150.36, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.17, config:"[Xe] 4f⁶ 6s²" },
  { symbol:"Eu", name:"Europium", number:63, mass:151.96, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.2, config:"[Xe] 4f⁷ 6s²" },
  { symbol:"Gd", name:"Gadolinium", number:64, mass:157.25, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.2, config:"[Xe] 4f⁷ 5d¹ 6s²" },
  { symbol:"Tb", name:"Terbium", number:65, mass:158.93, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.2, config:"[Xe] 4f⁹ 6s²" },
  { symbol:"Dy", name:"Dysprosium", number:66, mass:162.5, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.22, config:"[Xe] 4f¹⁰ 6s²" },
  { symbol:"Ho", name:"Holmium", number:67, mass:164.93, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.23, config:"[Xe] 4f¹¹ 6s²" },
  { symbol:"Er", name:"Erbium", number:68, mass:167.26, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.24, config:"[Xe] 4f¹² 6s²" },
  { symbol:"Tm", name:"Thulium", number:69, mass:168.93, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.25, config:"[Xe] 4f¹³ 6s²" },
  { symbol:"Yb", name:"Ytterbium", number:70, mass:173.05, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.1, config:"[Xe] 4f¹⁴ 6s²" },
  { symbol:"Lu", name:"Lutetium", number:71, mass:174.97, group:"IIIB", period:6, category:"lanthanide", electronegativity:1.27, config:"[Xe] 4f¹⁴ 5d¹ 6s²" },
  { symbol:"Hf", name:"Hafnium", number:72, mass:178.49, group:"IVB", period:6, category:"transition", electronegativity:1.3, config:"[Xe] 4f¹⁴ 5d² 6s²" },
  { symbol:"Ta", name:"Tantalum", number:73, mass:180.95, group:"VB", period:6, category:"transition", electronegativity:1.5, config:"[Xe] 4f¹⁴ 5d³ 6s²" },
  { symbol:"W", name:"Tungsten", number:74, mass:183.84, group:"VIB", period:6, category:"transition", electronegativity:2.36, config:"[Xe] 4f¹⁴ 5d⁴ 6s²" },
  { symbol:"Re", name:"Rhenium", number:75, mass:186.21, group:"VIIB", period:6, category:"transition", electronegativity:1.9, config:"[Xe] 4f¹⁴ 5d⁵ 6s²" },
  { symbol:"Os", name:"Osmium", number:76, mass:190.23, group:"VIIIB", period:6, category:"transition", electronegativity:2.2, config:"[Xe] 4f¹⁴ 5d⁶ 6s²" },
  { symbol:"Ir", name:"Iridium", number:77, mass:192.22, group:"VIIIB", period:6, category:"transition", electronegativity:2.2, config:"[Xe] 4f¹⁴ 5d⁷ 6s²" },
  { symbol:"Pt", name:"Platinum", number:78, mass:195.08, group:"VIIIB", period:6, category:"transition", electronegativity:2.28, config:"[Xe] 4f¹⁴ 5d⁹ 6s¹" },
  { symbol:"Au", name:"Gold", number:79, mass:196.97, group:"IB", period:6, category:"transition", electronegativity:2.54, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s¹" },
  { symbol:"Hg", name:"Mercury", number:80, mass:200.59, group:"IIB", period:6, category:"transition", electronegativity:2.00, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s²" },
  { symbol:"Tl", name:"Thallium", number:81, mass:204.38, group:"IIIA", period:6, category:"post-transition", electronegativity:1.62, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹" },
  { symbol:"Pb", name:"Lead", number:82, mass:207.2, group:"IVA", period:6, category:"post-transition", electronegativity:2.33, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²" },
  { symbol:"Bi", name:"Bismuth", number:83, mass:208.98, group:"VA", period:6, category:"post-transition", electronegativity:2.02, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³" },
  { symbol:"Po", name:"Polonium", number:84, mass:209, group:"VIA", period:6, category:"post-transition", electronegativity:2.0, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴" },
  { symbol:"At", name:"Astatine", number:85, mass:210, group:"VIIA", period:6, category:"halogen", electronegativity:2.2, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵" },
  { symbol:"Rn", name:"Radon", number:86, mass:222, group:"VIIIA", period:6, category:"noble gas", electronegativity:null, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶" },
  // Chu kỳ 7 (87-118)
  { symbol:"Fr", name:"Francium", number:87, mass:223, group:"IA", period:7, category:"alkali metal", electronegativity:0.7, config:"[Rn] 7s¹" },
  { symbol:"Ra", name:"Radium", number:88, mass:226, group:"IIA", period:7, category:"alkaline earth", electronegativity:0.9, config:"[Rn] 7s²" },
  { symbol:"Ac", name:"Actinium", number:89, mass:227, group:"IIIB", period:7, category:"actinide", electronegativity:1.1, config:"[Rn] 6d¹ 7s²" },
  { symbol:"Th", name:"Thorium", number:90, mass:232.04, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 6d² 7s²" },
  { symbol:"Pa", name:"Protactinium", number:91, mass:231.04, group:"IIIB", period:7, category:"actinide", electronegativity:1.5, config:"[Rn] 5f² 6d¹ 7s²" },
  { symbol:"U", name:"Uranium", number:92, mass:238.03, group:"IIIB", period:7, category:"actinide", electronegativity:1.38, config:"[Rn] 5f³ 6d¹ 7s²" },
  { symbol:"Np", name:"Neptunium", number:93, mass:237, group:"IIIB", period:7, category:"actinide", electronegativity:1.36, config:"[Rn] 5f⁴ 6d¹ 7s²" },
  { symbol:"Pu", name:"Plutonium", number:94, mass:244, group:"IIIB", period:7, category:"actinide", electronegativity:1.28, config:"[Rn] 5f⁶ 7s²" },
  { symbol:"Am", name:"Americium", number:95, mass:243, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 5f⁷ 7s²" },
  { symbol:"Cm", name:"Curium", number:96, mass:247, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 5f⁷ 6d¹ 7s²" },
  { symbol:"Bk", name:"Berkelium", number:97, mass:247, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 5f⁹ 7s²" },
  { symbol:"Cf", name:"Californium", number:98, mass:251, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 5f¹⁰ 7s²" },
  { symbol:"Es", name:"Einsteinium", number:99, mass:252, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 5f¹¹ 7s²" },
  { symbol:"Fm", name:"Fermium", number:100, mass:257, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 5f¹² 7s²" },
  { symbol:"Md", name:"Mendelevium", number:101, mass:258, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 5f¹³ 7s²" },
  { symbol:"No", name:"Nobelium", number:102, mass:259, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 5f¹⁴ 7s²" },
  { symbol:"Lr", name:"Lawrencium", number:103, mass:266, group:"IIIB", period:7, category:"actinide", electronegativity:1.3, config:"[Rn] 5f¹⁴ 6d¹ 7s²" },
  { symbol:"Rf", name:"Rutherfordium", number:104, mass:267, group:"IVB", period:7, category:"transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d² 7s²" },
  { symbol:"Db", name:"Dubnium", number:105, mass:268, group:"VB", period:7, category:"transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d³ 7s²" },
  { symbol:"Sg", name:"Seaborgium", number:106, mass:269, group:"VIB", period:7, category:"transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d⁴ 7s²" },
  { symbol:"Bh", name:"Bohrium", number:107, mass:270, group:"VIIB", period:7, category:"transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d⁵ 7s²" },
  { symbol:"Hs", name:"Hassium", number:108, mass:269, group:"VIIIB", period:7, category:"transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d⁶ 7s²" },
  { symbol:"Mt", name:"Meitnerium", number:109, mass:278, group:"VIIIB", period:7, category:"transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d⁷ 7s²" },
  { symbol:"Ds", name:"Darmstadtium", number:110, mass:281, group:"VIIIB", period:7, category:"transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d⁸ 7s²" },
  { symbol:"Rg", name:"Roentgenium", number:111, mass:282, group:"IB", period:7, category:"transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d¹⁰ 7s¹" },
  { symbol:"Cn", name:"Copernicium", number:112, mass:285, group:"IIB", period:7, category:"transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d¹⁰ 7s²" },
  { symbol:"Nh", name:"Nihonium", number:113, mass:286, group:"IIIA", period:7, category:"post-transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹" },
  { symbol:"Fl", name:"Flerovium", number:114, mass:289, group:"IVA", period:7, category:"post-transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²" },
  { symbol:"Mc", name:"Moscovium", number:115, mass:290, group:"VA", period:7, category:"post-transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³" },
  { symbol:"Lv", name:"Livermorium", number:116, mass:293, group:"VIA", period:7, category:"post-transition", electronegativity:null, config:"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴" },
  { symbol:"Ts", name:"Tennessine", number:117, mass:294, group:"VIIA", period:7, category:"halogen", electronegativity:null, config:"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵" },
  { symbol:"Og", name:"Oganesson", number:118, mass:294, group:"VIIIA", period:7, category:"noble gas", electronegativity:null, config:"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶" }
];


// === THÊM SỐ OXI HÓA PHỔ BIẾN ===
elementsData.forEach(el => {
  let ox = "–";
  const num = el.number;
  const cat = el.category;
  if (cat === "alkali metal") ox = "+1";
  else if (cat === "alkaline earth") ox = "+2";
  else if (cat === "halogen") ox = "-1 (có thể +1,+3,+5,+7)";
  else if (cat === "noble gas") ox = "0";
  else if (cat === "nonmetal") {
    if (num === 1) ox = "+1, -1";
    else if (num === 6) ox = "-4, +4";
    else if (num === 7) ox = "-3, +3, +5";
    else if (num === 8) ox = "-2";
    else if (num === 15) ox = "-3, +3, +5";
    else if (num === 16) ox = "-2, +4, +6";
    else ox = "–";
  }
  else if (cat === "metalloid") {
    if (num === 5) ox = "+3";
    else if (num === 14) ox = "-4, +4";
    else if (num === 32) ox = "+2, +4";
    else if (num === 33) ox = "-3, +3, +5";
    else if (num === 51) ox = "-3, +3, +5";
    else if (num === 52) ox = "-2, +4, +6";
    else ox = "–";
  }
  else if (cat === "post-transition") {
    if (num === 13) ox = "+3";
    else if (num === 31) ox = "+3";
    else if (num === 49) ox = "+3";
    else if (num === 81) ox = "+1, +3";
    else if (num === 82) ox = "+2, +4";
    else if (num === 83) ox = "+3, +5";
    else ox = "–";
  }
  else if (cat === "transition") ox = "thường +2,+3,...";
  else if (cat === "lanthanide") ox = "+3";
  else if (cat === "actinide") ox = "+3, +4, +5, +6";
  el.oxidation = ox;
});

function getCategoryClass(cat) {
  const map = {
    'alkali metal':   'alkali-metal',
    'alkaline earth': 'alkaline-earth',
    'transition':     'transition-metal',
    'post-transition':'post-transition',
    'metalloid':      'metalloid',
    'nonmetal':       'nonmetal',
    'halogen':        'halogen',
    'noble gas':      'noble-gas',
    'lanthanide':     'lanthanide',
    'actinide':       'actinide'
  };
  return map[cat] || 'transition-metal';
}

const categoryViNames = {
  'alkali-metal':   'Kim loại kiềm',
  'alkaline-earth': 'Kiềm thổ',
  'transition-metal':'Kim loại chuyển tiếp',
  'post-transition':'Hậu chuyển tiếp',
  'metalloid':      'Á kim',
  'nonmetal':       'Phi kim',
  'halogen':        'Halogen',
  'noble-gas':      'Khí hiếm',
  'lanthanide':     'Lanthanide',
  'actinide':       'Actinide'
};

function _renderCell(elem) {
  const cls = getCategoryClass(elem.category);
  const shortName = elem.name.length > 11 ? elem.name.substr(0,10)+'…' : elem.name;
  return `<div class="element-cell ${cls}" onclick="showElementDetail(${elem.number})" title="${elem.name} (${elem.number})">
    <div class="atomic-num">${elem.number}</div>
    <div class="symbol">${elem.symbol}</div>
    <div class="elem-name">${shortName}</div>
  </div>`;
}

function _emptyCell() { return '<div class="element-cell empty"></div>'; }
function _placeholderCell(txt) { return `<div class="element-cell placeholder">${txt}</div>`; }

function renderPeriodicTable() {
  const grid = document.getElementById('periodic-grid');
  if (!grid) return;

  function e(n) {
    const el = elementsData.find(el => el.number === n);
    return el ? _renderCell(el) : _emptyCell();
  }
  function row(cells) { return `<div class="periodic-row">${cells.join('')}</div>`; }

  let html = '';

  // Hàng 1: H ... He
  const r1 = [e(1)]; for(let i=0;i<16;i++) r1.push(_emptyCell()); r1.push(e(2));
  html += row(r1);

  // Hàng 2: Li,Be ... B-Ne (10 trống giữa)
  const r2 = [e(3),e(4)]; for(let i=0;i<10;i++) r2.push(_emptyCell()); for(let n=5;n<=10;n++) r2.push(e(n));
  html += row(r2);

  // Hàng 3: Na,Mg ... Al-Ar (10 trống giữa)
  const r3 = [e(11),e(12)]; for(let i=0;i<10;i++) r3.push(_emptyCell()); for(let n=13;n<=18;n++) r3.push(e(n));
  html += row(r3);

  // Hàng 4: K-Kr (đầy đủ 18)
  const r4 = []; for(let n=19;n<=36;n++) r4.push(e(n));
  html += row(r4);

  // Hàng 5: Rb-Xe (đầy đủ 18)
  const r5 = []; for(let n=37;n<=54;n++) r5.push(e(n));
  html += row(r5);

  // Hàng 6: Cs,Ba, [57-71], Hf-Rn
  const r6 = [e(55),e(56),_placeholderCell('57–71')]; for(let n=72;n<=86;n++) r6.push(e(n));
  html += row(r6);

  // Hàng 7: Fr,Ra, [89-103], Rf-Og
  const r7 = [e(87),e(88),_placeholderCell('89–103')]; for(let n=104;n<=118;n++) r7.push(e(n));
  html += row(r7);

  // Nhãn f-block
  html += `<div class="fblock-label">🏷️ Họ Lanthanide (57–71)</div>`;
  const rLa = [_emptyCell(),_emptyCell()]; for(let n=57;n<=71;n++) rLa.push(e(n)); rLa.push(_emptyCell());
  html += row(rLa);

  html += `<div class="fblock-label" style="margin-top:4px;">🏷️ Họ Actinide (89–103)</div>`;
  const rAc = [_emptyCell(),_emptyCell()]; for(let n=89;n<=103;n++) rAc.push(e(n)); rAc.push(_emptyCell());
  html += row(rAc);

  grid.innerHTML = html;
}

function showElementDetail(num) {
  const element = elementsData.find(el => el.number === num);
  if (!element) return;

  // Highlight ô đang chọn
  document.querySelectorAll('.element-cell').forEach(c => c.classList.remove('selected-cell'));
  const cells = document.querySelectorAll('.element-cell');
  cells.forEach(c => { if(c.querySelector('.atomic-num') && c.querySelector('.atomic-num').textContent == num) c.classList.add('selected-cell'); });

  const detail = document.getElementById('element-detail');
  detail.style.display = 'block';
  const cls = getCategoryClass(element.category);
  const catVi = categoryViNames[cls] || element.category;

  detail.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
      <div class="detail-symbol ${cls}">${element.symbol}</div>
      <div>
        <div class="detail-name">${element.name}</div>
        <div style="font-size:11px;color:#aac4e6;margin-top:3px;letter-spacing:.05em;">${catVi} &nbsp;•&nbsp; Chu kỳ ${element.period} &nbsp;•&nbsp; Nhóm ${element.group}</div>
      </div>
    </div>
    <div class="detail-body">
      <div><strong>Số nguyên tử (Z)</strong>&nbsp; ${element.number}</div>
      <div><strong>Khối lượng nguyên tử</strong>&nbsp; ${element.mass} u</div>
      <div><strong>Độ âm điện (Pauling)</strong>&nbsp; ${element.electronegativity !== null ? element.electronegativity : '—'}</div>
      <div><strong>Cấu hình electron</strong>&nbsp; <code>${element.config}</code></div>
      <div><strong>Số oxi hóa phổ biến</strong>&nbsp; ${element.oxidation}</div>
	</div>`;
}

function lookupByAtomicNumber(val) {
  const num = parseInt(val);
  if (num >= 1 && num <= 118) showElementDetail(num);
}

function resetPeriodicHighlight() {
  document.querySelectorAll('.element-cell').forEach(c => c.classList.remove('selected-cell'));
  const detail = document.getElementById('element-detail');
  detail.style.display = 'none';
  detail.innerHTML = '<div class="detail-placeholder"><p>🔍 Bấm vào một nguyên tố bất kỳ trong bảng, hoặc nhập số hiệu nguyên tử ở trên để xem thông tin chi tiết.</p></div>';
  const inp = document.getElementById('atomic-number-input');
  if (inp) inp.value = '';
}

/* ==================== GIAO THOA YOUNG ==================== */

function syncYoungSliders() {
  const r1 = document.getElementById('lambda-range');
  const r2 = document.getElementById('a-range');
  const r3 = document.getElementById('D-range');
  const r4 = document.getElementById('orders-range');
  if(r1) r1.value = document.getElementById('lambda').value;
  if(r2) r2.value = document.getElementById('a-slit').value;
  if(r3) r3.value = document.getElementById('D-screen').value;
  if(r4) r4.value = document.getElementById('young-orders').value;
}

function getLambdaColorName(lambda) {
  if (lambda < 420) return 'Tím';
  if (lambda < 450) return 'Tím – Chàm';
  if (lambda < 495) return 'Xanh lam';
  if (lambda < 530) return 'Xanh lục';
  if (lambda < 570) return 'Vàng lục';
  if (lambda < 590) return 'Vàng';
  if (lambda < 625) return 'Cam';
  if (lambda < 700) return 'Cam đỏ';
  return 'Đỏ';
}

// Hàm đổi bước sóng (nm) sang mã màu RGB
function lambdaToColor(lambda) {
  let r, g, b, alpha;
  if (lambda >= 380 && lambda < 440) { r = -(lambda - 440) / (440 - 380); g = 0.0; b = 1.0; } 
  else if (lambda >= 440 && lambda < 490) { r = 0.0; g = (lambda - 440) / (490 - 440); b = 1.0; } 
  else if (lambda >= 490 && lambda < 510) { r = 0.0; g = 1.0; b = -(lambda - 510) / (510 - 490); } 
  else if (lambda >= 510 && lambda < 580) { r = (lambda - 510) / (580 - 510); g = 1.0; b = 0.0; } 
  else if (lambda >= 580 && lambda < 645) { r = 1.0; g = -(lambda - 645) / (645 - 580); b = 0.0; } 
  else if (lambda >= 645 && lambda <= 780) { r = 1.0; g = 0.0; b = 0.0; } 
  else { r = 0.0; g = 0.0; b = 0.0; }
  
  if (lambda >= 380 && lambda < 420) alpha = 0.3 + 0.7 * (lambda - 380) / (420 - 380);
  else if (lambda >= 420 && lambda < 700) alpha = 1.0;
  else if (lambda >= 700 && lambda <= 780) alpha = 0.3 + 0.7 * (780 - lambda) / (780 - 700);
  else alpha = 0;
  
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

function runYoung() {
  const c = document.getElementById('young-canvas');
  if(!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;

  // Lấy dữ liệu từ input
  const lambda = parseFloat(document.getElementById('lambda').value) || 600;
  const a = parseFloat(document.getElementById('a-slit').value) || 0.5;
  const D = parseFloat(document.getElementById('D-screen').value) || 1.5;
  const orders = parseInt(document.getElementById('young-orders').value) || 7;

  // Tính khoảng vân i (mm)
  const i_mm = (lambda * 1e-6 * D * 1e3) / a;

  // Tên màu
  const colorName = getLambdaColorName(lambda);
  const el = document.getElementById('lambda-color-label');
  if (el) { el.textContent = colorName; el.style.color = lambdaToColor(lambda).replace(/,[^,]+\)/, ',1)'); }
  // Color dot
  const dot = document.getElementById('lambda-color-dot');
  if (dot) dot.style.background = lambdaToColor(lambda).replace(/,[^,]+\)/, ',1)');

  // Cập nhật data panel (dùng đúng ID trong HTML)
  const iEl = document.getElementById('i-val');
  if (iEl) iEl.innerHTML = i_mm.toFixed(3) + '<span class="dc-unit">mm</span>';

  const lambdaDisp = document.getElementById('lambda-val-display');
  if (lambdaDisp) lambdaDisp.innerHTML = lambda + '<span class="dc-unit">nm</span>';

  const calcEl = document.getElementById('young-calc-display');
  if (calcEl) calcEl.textContent = `${lambda}×10⁻⁹×${D}/${a}×10⁻³ = ${i_mm.toFixed(3)} mm`;

  const descEl = document.getElementById('young-desc');
  if (descEl) descEl.textContent = colorName;

  // Tính scale: hiển thị đủ ±orders vân trong canvas
  // scaleX (px/mm) để orders*i_mm lấp đầy nửa chiều rộng
  const halfW = (W - 20) / 2;
  const scaleX = Math.max(10, halfW / (Math.max(orders, 3) * i_mm));
  const centerX = W / 2;
  const colorStr = lambdaToColor(lambda);

  // Xóa canvas
  ctx.clearRect(0,0,W,H);

  // Nền tối
  const bgGrad = ctx.createLinearGradient(0,0,0,H);
  bgGrad.addColorStop(0, '#050a12'); bgGrad.addColorStop(1, '#030712');
  ctx.fillStyle = bgGrad; ctx.fillRect(0,0,W,H);

  const rulerH = 44;
  const patternH = H - rulerH;

  // ---- Vẽ hệ vân ----
  for (let px = 0; px < W; px++) {
    const mmX = (px - centerX) / scaleX;
    const intensity = Math.pow(Math.cos(Math.PI * mmX / i_mm), 2);
    ctx.globalAlpha = intensity * 0.92;
    ctx.fillStyle = colorStr;
    ctx.fillRect(px, 0, 1, patternH);
  }
  ctx.globalAlpha = 1.0;

  // ---- Nhãn vân sáng (k=0,±1,±2...) ----
  ctx.font = 'bold 9px "Space Mono", monospace';
  ctx.textAlign = 'center';
  for (let k = -orders; k <= orders; k++) {
    const px = centerX + k * i_mm * scaleX;
    if (px < 4 || px > W-4) continue;
    ctx.strokeStyle = k === 0 ? 'rgba(231,76,60,0.7)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = k === 0 ? 1.5 : 1;
    ctx.setLineDash(k === 0 ? [] : [3,3]);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, patternH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = k === 0 ? '#e74c3c' : 'rgba(255,255,255,0.6)';
    ctx.fillText(k === 0 ? 'k=0' : (k > 0 ? `+${k}` : `${k}`), px, patternH - 6);
  }

  // ---- Thước đo ở đáy ----
  const rulerY = patternH;
  ctx.fillStyle = '#0e1520'; ctx.fillRect(0, rulerY, W, rulerH);
  ctx.strokeStyle = '#2a3a55'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, rulerY); ctx.lineTo(W, rulerY); ctx.stroke();

  // Vạch mm
  const mmStep = scaleX > 25 ? 1 : (scaleX > 10 ? 2 : 5);
  const mmRange = Math.ceil(halfW / scaleX) + 2;
  for (let mm = -mmRange; mm <= mmRange; mm += 0.5) {
    const px = centerX + mm * scaleX;
    if (px < 0 || px > W) continue;
    const isMajor = Number.isInteger(mm) && mm % mmStep === 0;
    const isMid = mm % 0.5 === 0 && !Number.isInteger(mm);
    ctx.strokeStyle = isMajor ? '#445' : '#2a3a4a';
    ctx.lineWidth = isMajor ? 1.2 : 0.8;
    ctx.beginPath();
    ctx.moveTo(px, rulerY + 2);
    ctx.lineTo(px, rulerY + (isMajor ? 18 : 10));
    ctx.stroke();
    if (isMajor) {
      ctx.fillStyle = '#6a8aaa';
      ctx.font = '9px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(mm + 'mm', px, rulerY + 30);
    }
  }
  // Đường giữa
  ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(centerX, rulerY); ctx.lineTo(centerX, rulerY + 22); ctx.stroke();

  // ---- Thông số góc trên ----
  ctx.font = '10px "Space Mono", monospace';
  ctx.textAlign = 'left'; ctx.fillStyle = '#7cb9ff';
  ctx.fillText(`λ = ${lambda} nm  |  a = ${a} mm  |  D = ${D} m  |  i = ${i_mm.toFixed(3)} mm`, 10, 16);

  // ---- Sơ đồ nguồn khe nhỏ bên trái ----
  const slitDraw = (x0, yc) => {
    ctx.fillStyle = '#334';
    ctx.fillRect(x0, yc - 60, 6, 44);
    ctx.fillRect(x0, yc + 16, 6, 44);
    ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0+6, yc - 14); ctx.lineTo(x0+6, yc + 14); ctx.stroke();
    ctx.fillStyle = '#f39c12'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText('S₁', x0+8, yc - 6);
    ctx.fillText('S₂', x0+8, yc + 12);
  };
  slitDraw(2, patternH/2);
}

function resetYoung() {
  document.getElementById('lambda').value = 600;
  document.getElementById('a-slit').value = 0.5;
  document.getElementById('D-screen').value = 1.5;
  document.getElementById('young-orders').value = 7;
  runYoung();
}
/* ==================== ĐỘNG NĂNG - THẾ NĂNG ==================== */
let energyRunning = false, energyRAF = null;
let kePhase = 0, peY = 0;

function switchEnergyTab(tab) {
  const tabKe = document.getElementById('tab-ke');
  const tabPe = document.getElementById('tab-pe');
  tabKe.classList.toggle('active', tab === 'ke');
  tabPe.classList.toggle('active', tab === 'pe');
  document.getElementById('panel-ke').style.display = tab === 'ke' ? 'block' : 'none';
  document.getElementById('panel-pe').style.display = tab === 'pe' ? 'block' : 'none';
  if(tab === 'ke') resetKE(); else resetPE();
}
function resetEnergy() { switchEnergyTab('ke'); }
function toggleEnergySim() {} // Dummy để bọc logic từ showPage (vì code HTML đã tách riêng nút Chạy)

function calcKE() {
  const m = parseFloat(document.getElementById('ke-mass').value) || 60;
  const v = parseFloat(document.getElementById('ke-velocity').value) || 5;
  const ke = 0.5 * m * v * v;
  document.getElementById('ke-m-val').innerHTML = m + '<span class="dc-unit">kg</span>';
  document.getElementById('ke-v-val').innerHTML = v.toFixed(1) + '<span class="dc-unit">m/s</span>';
  document.getElementById('ke-result-val').innerHTML = ke.toFixed(1) + '<span class="dc-unit">J</span>';
  document.getElementById('ke-formula-display').innerHTML = `Wđ = ½ × ${m} × ${v}² = <b>${ke.toFixed(1)} J</b>`;
  drawKEFrame();
}
function toggleKE() {
  energyRunning = !energyRunning;
  document.getElementById('ke-btn').textContent = energyRunning ? '⏸ Dừng' : '▶ Chạy';
  if (energyRunning) requestAnimationFrame(keLoop);
  else cancelAnimationFrame(energyRAF);
}
function resetKE() {
  energyRunning = false; cancelAnimationFrame(energyRAF); kePhase = 0;
  document.getElementById('ke-btn').textContent = '▶ Chạy'; calcKE();
}
function keLoop() {
  const v = parseFloat(document.getElementById('ke-velocity').value) || 5;
  kePhase += v * 0.5; drawKEFrame();
  if (energyRunning) energyRAF = requestAnimationFrame(keLoop);
}
function drawKEFrame() {
  const c = document.getElementById('ke-canvas'); if(!c) return;
  const ctx = c.getContext('2d'); const W = c.width, H = c.height;
  ctx.clearRect(0,0,W,H);

  // Sky gradient
  const sky = ctx.createLinearGradient(0,0,0,H-40);
  sky.addColorStop(0,'#87CEEB'); sky.addColorStop(0.6,'#b0e0f8'); sky.addColorStop(1,'#c8f0e8');
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

  // Clouds
  function cloud(x, y, r) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    [0,r*0.6,-r*0.6,r*1.1,-r*1.1].forEach((dx,i) => {
      ctx.beginPath(); ctx.arc(x+dx, y+(i%2===0?0:-r*0.2), r*(i===0?1:0.72), 0, Math.PI*2); ctx.fill();
    });
  }
  cloud(80, 30, 22); cloud(300, 20, 18); cloud(520, 38, 25); cloud(650, 18, 16);

  // Road surface
  ctx.fillStyle = '#4a5568'; ctx.fillRect(0, H-50, W, 50);
  ctx.fillStyle = '#2d3748'; ctx.fillRect(0, H-50, W, 8);
  // Road dashes
  ctx.strokeStyle = '#fdcb6e'; ctx.lineWidth = 3; ctx.setLineDash([28,20]);
  ctx.beginPath(); ctx.moveTo(0, H-26); ctx.lineTo(W, H-26); ctx.stroke();
  ctx.setLineDash([]);
  // Road markings animated
  ctx.fillStyle = '#718096';
  for(let x = -(kePhase%80); x < W; x += 80) { ctx.fillRect(x, H-50, 40, 8); }

  // Buildings in background
  const bColors = ['#2c3e50','#34495e','#2e4057','#1a252f'];
  [[30,80,40,H-50],[100,60,35,H-50],[160,100,50,H-50],[550,70,45,H-50],[620,90,38,H-50]].forEach(([bx,bh,bw,by],i) => {
    ctx.fillStyle = bColors[i%bColors.length];
    ctx.fillRect(bx, by-bh, bw, bh);
    // Windows
    ctx.fillStyle = 'rgba(255,235,150,0.5)';
    for(let wy=by-bh+8; wy<by-8; wy+=14)
      for(let wx=bx+5; wx<bx+bw-5; wx+=12)
        ctx.fillRect(wx, wy, 6, 8);
  });

  const v = parseFloat(document.getElementById('ke-velocity').value) || 5;
  const m = parseFloat(document.getElementById('ke-mass').value) || 60;
  const ke = 0.5 * m * v * v;

  // Runner position
  const rx = 130, ry = H - 50;
  const bounce = Math.sin(kePhase * 0.13) * 5;
  const t = kePhase;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(rx, ry, 22, 5, 0, 0, Math.PI*2); ctx.fill();

  // ---- Detailed runner ----
  ctx.save();
  ctx.translate(rx, ry + bounce);

  // Shoes
  const legSwing = Math.sin(t * 0.18) * 0.6;
  // Left leg
  const lLegAng = legSwing;
  const lFootX = Math.sin(lLegAng)*22, lKneeX = Math.sin(lLegAng)*12;
  const lLegY = -8, lKneeY = -24, lFootY = 0;
  ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(lKneeX, lKneeY); ctx.lineTo(lFootX, lLegY); ctx.stroke();
  ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(lFootX, lLegY, 10, 5, lLegAng*0.3, 0, Math.PI*2); ctx.fill();
  // Right leg
  const rLegAng = -legSwing;
  const rFootX = Math.sin(rLegAng)*22, rKneeX = Math.sin(rLegAng)*12;
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(rKneeX, lKneeY); ctx.lineTo(rFootX, lLegY); ctx.stroke();
  ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(rFootX, lLegY, 10, 5, rLegAng*0.3, 0, Math.PI*2); ctx.fill();

  // Shorts
  ctx.fillStyle = '#2980b9';
  ctx.beginPath(); ctx.ellipse(0, -32, 12, 8, 0, 0, Math.PI*2); ctx.fill();

  // Torso – jersey
  const jerseyGrad = ctx.createLinearGradient(-12,-60,12,-30);
  jerseyGrad.addColorStop(0,'#e74c3c'); jerseyGrad.addColorStop(1,'#c0392b');
  ctx.fillStyle = jerseyGrad;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-10,-62,20,30,3) : ctx.fillRect(-10,-62,20,30);
  ctx.fill();
  // Number on jersey
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('1', 0, -44);

  // Arms
  const armSwing = -legSwing * 0.7;
  ctx.strokeStyle = '#F5CBA7'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-4, -54);
  ctx.lineTo(-4 + Math.sin(armSwing)*20, -40 + Math.cos(armSwing)*10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -54);
  ctx.lineTo(4 - Math.sin(armSwing)*20, -40 + Math.cos(armSwing)*10); ctx.stroke();

  // Head
  ctx.fillStyle = '#F5CBA7';
  ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.arc(0, -72, 12, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  // Hair
  ctx.fillStyle = '#2c1810';
  ctx.beginPath(); ctx.arc(0, -79, 8, Math.PI, 0); ctx.fill();
  // Face
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(-4, -71, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -71, 2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -68, 4, 0.2, Math.PI-0.2); ctx.stroke();
  // Headband
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -72, 12, -Math.PI*0.7, -Math.PI*0.3); ctx.stroke();

  ctx.restore();

  // Velocity arrow
  ctx.strokeStyle = '#e17055'; ctx.lineWidth = 2.5;
  const arrowLen = Math.min(v * 10, 140);
  ctx.shadowBlur = 6; ctx.shadowColor = '#e17055';
  ctx.beginPath(); ctx.moveTo(rx+18, ry-55+bounce); ctx.lineTo(rx+18+arrowLen, ry-55+bounce); ctx.stroke();
  ctx.fillStyle = '#e17055';
  ctx.beginPath(); ctx.moveTo(rx+26+arrowLen, ry-55+bounce); ctx.lineTo(rx+12+arrowLen, ry-61+bounce); ctx.lineTo(rx+12+arrowLen, ry-49+bounce); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = 'bold 11px Space Mono,monospace'; ctx.fillStyle = '#e17055'; ctx.textAlign = 'center';
  ctx.fillText('v = '+v+' m/s', rx+18+arrowLen/2, ry-66+bounce);

  // KE bar
  const barX = W - 100, barY = 16, barMaxH = H - 80;
  const barFill = Math.min(ke / 15000, 1);
  ctx.fillStyle = '#2d3748'; ctx.fillRect(barX, barY, 28, barMaxH);
  const keGrad = ctx.createLinearGradient(0,barY+barMaxH,0,barY);
  keGrad.addColorStop(0,'#fdcb6e'); keGrad.addColorStop(0.5,'#e17055'); keGrad.addColorStop(1,'#d63031');
  ctx.fillStyle = keGrad;
  ctx.fillRect(barX, barY+barMaxH*(1-barFill), 28, barMaxH*barFill);
  ctx.strokeStyle='#4a5568'; ctx.lineWidth=1; ctx.strokeRect(barX,barY,28,barMaxH);
  ctx.fillStyle='#2d3436'; ctx.font='bold 10px Nunito,sans-serif'; ctx.textAlign='center';
  ctx.fillText('Wđ', barX+14, barY+barMaxH+14);
  ctx.fillStyle='#e17055'; ctx.font='bold 9px monospace';
  ctx.fillText(ke.toFixed(0)+'J', barX+14, Math.max(barY+barMaxH*(1-barFill)-5, barY+12));
}

function calcPE() {
  const m = parseFloat(document.getElementById('pe-mass').value) || 55;
  const h = parseFloat(document.getElementById('pe-height').value) || 5;
  const pe = m * 9.8 * h;
  const vland = Math.sqrt(2 * 9.8 * h);
  document.getElementById('pe-m-val').innerHTML = m + '<span class="dc-unit">kg</span>';
  document.getElementById('pe-h-val').innerHTML = h.toFixed(1) + '<span class="dc-unit">m</span>';
  document.getElementById('pe-result-val').innerHTML = pe.toFixed(0) + '<span class="dc-unit">J</span>';
  document.getElementById('pe-vland-val').innerHTML = vland.toFixed(1) + '<span class="dc-unit">m/s</span>';
  document.getElementById('pe-formula-display').innerHTML = `Wt = mgh = ${m} × 9.8 × ${h} = <b>${pe.toFixed(0)} J</b> | v chạm nước = <b>${vland.toFixed(1)} m/s</b>`;
  drawPEFrame();
}
function togglePE() {
  if(!energyRunning) {
    energyRunning = true; peY = 0; kePhase = 0;
    document.getElementById('pe-btn').textContent = '⏸ Đang rơi...';
    requestAnimationFrame(peLoop);
  }
}
function resetPE() {
  energyRunning = false; cancelAnimationFrame(energyRAF); peY = 0; kePhase = 0;
  document.getElementById('pe-btn').textContent = '▶ Nhảy!'; calcPE();
}
function peLoop() {
  kePhase += 0.05; peY = 0.5 * 9.8 * kePhase * kePhase * 8; 
  if(peY > 150) { peY = 150; energyRunning = false; document.getElementById('pe-btn').textContent = '▶ Chạm nước'; }
  drawPEFrame();
  if(energyRunning) energyRAF = requestAnimationFrame(peLoop);
}
function drawPEFrame() {
  const c = document.getElementById('pe-canvas'); if(!c) return;
  const ctx = c.getContext('2d'); const W = c.width, H = c.height;
  ctx.clearRect(0,0,W,H);
  // Sky gradient
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#74b9ff'); sky.addColorStop(0.6,'#a8d8ea'); sky.addColorStop(1,'#55efc4');
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
  // Pool water
  const waterY = H - 56;
  const waterGrad = ctx.createLinearGradient(0,waterY,0,H);
  waterGrad.addColorStop(0,'#0984e3'); waterGrad.addColorStop(1,'#2d3436');
  ctx.fillStyle = waterGrad; ctx.fillRect(0, waterY, W, 56);
  // Water shimmer
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,waterY+4);ctx.quadraticCurveTo(x+15,waterY+1,x+30,waterY+4);ctx.stroke();}
  // Pool edge
  ctx.fillStyle = '#b2bec3'; ctx.fillRect(0, waterY-6, W, 6);

  // Diving platform
  const platX = 60, platY = H - 200;
  ctx.fillStyle = '#636e72'; ctx.fillRect(platX-10, platY, 120, 10);
  ctx.fillStyle = '#b2bec3';
  ctx.fillRect(platX+100, platY, 15, 200 - 56); // pole
  ctx.fillStyle = '#74b9ff'; ctx.fillRect(platX-10, platY-2, 120, 4); // board

  const h = parseFloat(document.getElementById('pe-height').value) || 5;
  const m = parseFloat(document.getElementById('pe-mass').value) || 55;
  const totalE = m * 9.8 * h;
  const curY = platY - 30 + peY;
  const p = Math.min(peY / 150, 1);
  
  // Person (stick figure)
  const px = platX + 55;
  ctx.fillStyle = '#d63031';
  ctx.beginPath(); ctx.arc(px, curY-20, 10, 0, Math.PI*2); ctx.fill(); // head
  ctx.strokeStyle = '#d63031'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(px, curY-10); ctx.lineTo(px, curY+14); ctx.stroke(); // torso
  // Arms raised while falling
  const armAng = p * 0.8;
  ctx.beginPath(); ctx.moveTo(px, curY-2);
  ctx.lineTo(px+Math.cos(armAng)*16, curY-14-Math.sin(armAng)*8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px, curY-2);
  ctx.lineTo(px-Math.cos(armAng)*16, curY-14-Math.sin(armAng)*8); ctx.stroke();
  // Legs
  ctx.beginPath(); ctx.moveTo(px, curY+14); ctx.lineTo(px-8, curY+34); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px, curY+14); ctx.lineTo(px+8, curY+34); ctx.stroke();

  // Energy labels
  if(peY > 5 || energyRunning) {
    ctx.font = 'bold 11px Space Mono,monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = '#ffeaa7';
    ctx.fillText(`Wt: ${(totalE*(1-p)).toFixed(0)} J`, px+20, curY-10);
    ctx.fillStyle = '#ff7675';
    ctx.fillText(`Wđ: ${(totalE*p).toFixed(0)} J`, px+20, curY+6);
  }
  
  // Height arrow
  if(!energyRunning && peY < 5) {
    ctx.strokeStyle='#fdcb6e'; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(platX-25, platY); ctx.lineTo(platX-25, waterY-6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#fdcb6e'; ctx.font='10px Nunito,sans-serif'; ctx.textAlign='center';
    ctx.fillText('h='+h+'m', platX-40, (platY+waterY)/2);
  }
}


/* ==================== MOMENT LỰC ==================== */
let torqueRunning = false, torqueRAF = null, torqueAngle = 0, torqueOmega = 0, torqueLastTime = null;

function updateTorqueDisplay() {
  const F1 = parseFloat(document.getElementById('F1-torque').value) || 0;
  const d1 = parseFloat(document.getElementById('d1-torque').value) || 0;
  const F2 = parseFloat(document.getElementById('F2-torque').value) || 0;
  const d2 = parseFloat(document.getElementById('d2-torque').value) || 0;
  const M1 = F1 * d1, M2 = F2 * d2, diff = M2 - M1;
  const m1El = document.getElementById('M1-val');
  if (m1El) m1El.innerHTML = M1.toFixed(1) + '<span class="dc-unit">Nm</span>';
  const m2El = document.getElementById('M2-val');
  if (m2El) m2El.innerHTML = M2.toFixed(1) + '<span class="dc-unit">Nm</span>';
  const resEl = document.getElementById('torque-result');
  let res = '⚖ Cân bằng', color = '#27ae60';
  if (diff > 0.1) { res = '↻ Quay phải'; color = '#e74c3c'; }
  else if (diff < -0.1) { res = '↺ Quay trái'; color = '#e74c3c'; }
  if (resEl) resEl.innerHTML = `<span style="color:${color}; font-weight:800;">${res}</span>`;
  const diffEl = document.getElementById('torque-diff');
  if (diffEl) diffEl.innerHTML = Math.abs(diff).toFixed(1) + '<span class="dc-unit">Nm</span>';
  const fmEl = document.getElementById('torque-formula-display');
  if (fmEl) fmEl.innerHTML = `M₁ = ${F1} × ${d1} = <b>${M1.toFixed(1)} Nm</b> &nbsp;|&nbsp; M₂ = ${F2} × ${d2} = <b>${M2.toFixed(1)} Nm</b> &nbsp;→ ${res}`;
  drawTorqueFrame(torqueAngle);
}

function updateTorque() { updateTorqueDisplay(); }

function startTorque() {
  const F1 = parseFloat(document.getElementById('F1-torque').value) || 0;
  const d1 = parseFloat(document.getElementById('d1-torque').value) || 0;
  const F2 = parseFloat(document.getElementById('F2-torque').value) || 0;
  const d2 = parseFloat(document.getElementById('d2-torque').value) || 0;
  const diff = F2*d2 - F1*d1;
  if (Math.abs(diff) < 0.1) {
    // Balanced – small oscillation
    torqueAngle = 0; torqueOmega = 0.002;
  }
  torqueRunning = !torqueRunning;
  const btn = document.getElementById('torque-run-btn');
  if (torqueRunning) {
    btn.textContent = '⏸ DỪNG';
    torqueLastTime = null;
    requestAnimationFrame(torqueLoop);
  } else {
    btn.textContent = '▶ CHẠY';
    cancelAnimationFrame(torqueRAF);
  }
}

function torqueLoop(ts) {
  if (!torqueLastTime) torqueLastTime = ts;
  const dt = Math.min((ts - torqueLastTime)/1000, 0.05); torqueLastTime = ts;
  const F1 = parseFloat(document.getElementById('F1-torque').value) || 0;
  const d1 = parseFloat(document.getElementById('d1-torque').value) || 0;
  const F2 = parseFloat(document.getElementById('F2-torque').value) || 0;
  const d2 = parseFloat(document.getElementById('d2-torque').value) || 0;
  const diff = F2*d2 - F1*d1; // positive = clockwise
  const maxAngle = 0.55;
  // Angular acceleration proportional to net moment
  const alpha = diff * 0.008;
  torqueOmega += alpha * dt;
  torqueOmega *= 0.96; // damping
  torqueAngle += torqueOmega * dt;
  torqueAngle = Math.max(-maxAngle, Math.min(maxAngle, torqueAngle));
  // Stop if at limit
  if (Math.abs(torqueAngle) >= maxAngle * 0.98 && Math.abs(diff) > 0.5) {
    torqueOmega = 0;
  }
  drawTorqueFrame(torqueAngle);
  updateTorqueDisplay();
  if (torqueRunning) torqueRAF = requestAnimationFrame(torqueLoop);
}

function resetTorque() {
  torqueRunning = false; cancelAnimationFrame(torqueRAF);
  torqueAngle = 0; torqueOmega = 0; torqueLastTime = null;
  document.getElementById('F1-torque').value = 10;
  document.getElementById('d1-torque').value = 0.8;
  document.getElementById('F2-torque').value = 20;
  document.getElementById('d2-torque').value = 0.4;
  const btn = document.getElementById('torque-run-btn');
  if (btn) btn.textContent = '▶ CHẠY';
  updateTorqueDisplay();
}

function drawTorqueFrame(angle) {
  const c = document.getElementById('torque-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0,0,W,H);

  // Background gradient
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#e8f8f5'); bg.addColorStop(1,'#d1f2eb');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  // Grid
  ctx.strokeStyle='rgba(39,174,96,0.10)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  const F1 = parseFloat(document.getElementById('F1-torque').value) || 0;
  const d1 = parseFloat(document.getElementById('d1-torque').value) || 0;
  const F2 = parseFloat(document.getElementById('F2-torque').value) || 0;
  const d2 = parseFloat(document.getElementById('d2-torque').value) || 0;
  const M1 = F1 * d1, M2 = F2 * d2;

  const cx = W/2, cy = H/2 + 20;
  const pxPerM = W/5;

  // Pivot triangle
  ctx.fillStyle = '#7f8c8d';
  ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.moveTo(cx,cy+6); ctx.lineTo(cx-26,cy+52); ctx.lineTo(cx+26,cy+52); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle='#bdc3c7'; ctx.fillRect(cx-44,cy+52,88,10);

  // Ground line
  ctx.strokeStyle='#95a5a6'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(cx-200, cy+62); ctx.lineTo(cx+200, cy+62); ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Lever bar
  ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(0,0,0,0.25)';
  const barGrad = ctx.createLinearGradient(0,-6,0,6);
  barGrad.addColorStop(0,'#9b59b6'); barGrad.addColorStop(0.5,'#8e44ad'); barGrad.addColorStop(1,'#6c3483');
  ctx.fillStyle = barGrad;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-W/2+30,-6,W-60,12,3) : ctx.fillRect(-W/2+30,-6,W-60,12);
  ctx.fill(); ctx.shadowBlur = 0;
  // Scale marks
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
  for(let i=-4;i<=4;i++){const sx=i*pxPerM; ctx.beginPath();ctx.moveTo(sx,-8);ctx.lineTo(sx,8);ctx.stroke();}
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='8px monospace'; ctx.textAlign='center';
  for(let i=-4;i<=4;i++){ctx.fillText(Math.abs(i)+'m', i*pxPerM, 20);}

  const wx1 = -d1*pxPerM, wx2 = d2*pxPerM;
  const s1 = Math.max(24, Math.min(20 + F1*0.45, 58));
  const s2 = Math.max(24, Math.min(20 + F2*0.45, 58));

  // ===== LEFT WEIGHT (M1) =====
  // Vertical force arrow (down)
  const arr1Len = Math.min(50, M1 * 3 + 15);
  ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 2.5;
  ctx.shadowBlur = 6; ctx.shadowColor = '#1565c0';
  ctx.beginPath(); ctx.moveTo(wx1, -(6+s1)); ctx.lineTo(wx1, -(6+s1)-arr1Len); ctx.stroke();
  ctx.fillStyle = '#1565c0';
  ctx.beginPath(); ctx.moveTo(wx1, -(6+s1)); ctx.lineTo(wx1-5, -(6+s1)-12); ctx.lineTo(wx1+5, -(6+s1)-12); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // Arm span line (d1)
  ctx.strokeStyle = 'rgba(21,101,192,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(0, 25); ctx.lineTo(wx1, 25); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#1565c0'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('d₁='+d1+'m', wx1/2, 38);
  // Curved moment arrow (counter-clockwise = left side down)
  ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 2; ctx.shadowBlur = 6; ctx.shadowColor = '#1565c0';
  ctx.beginPath(); ctx.arc(0, 0, 45, Math.PI*1.1, Math.PI*1.7, false); ctx.stroke();
  ctx.fillStyle = '#1565c0';
  ctx.beginPath();
  const ang1e = Math.PI*1.7;
  ctx.moveTo(45*Math.cos(ang1e), 45*Math.sin(ang1e));
  ctx.lineTo(45*Math.cos(ang1e-0.25)-6*Math.sin(ang1e-0.25), 45*Math.sin(ang1e-0.25)+6*Math.cos(ang1e-0.25));
  ctx.lineTo(45*Math.cos(ang1e+0.25)-6*Math.sin(ang1e+0.25), 45*Math.sin(ang1e+0.25)+6*Math.cos(ang1e+0.25));
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  // String
  ctx.strokeStyle='#2980b9'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(wx1,-(6+s1)); ctx.lineTo(wx1,-6); ctx.stroke();
  // Block
  const g1 = ctx.createLinearGradient(wx1-s1/2,0,wx1+s1/2,0);
  g1.addColorStop(0,'#1565c0'); g1.addColorStop(0.5,'#1976d2'); g1.addColorStop(1,'#0d47a1');
  ctx.fillStyle = g1; ctx.shadowBlur = 10; ctx.shadowColor = '#1976d255';
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(wx1-s1/2,-(6+s1),s1,s1,4) : ctx.fillRect(wx1-s1/2,-(6+s1),s1,s1);
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle='#fff'; ctx.font=`bold ${Math.min(13,s1/2.5)}px monospace`; ctx.textAlign='center';
  ctx.fillText(F1+'N', wx1, -(6+s1/2)+4);
  ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.font='8px monospace';
  ctx.fillText('M₁='+M1.toFixed(1)+'Nm', wx1, -(6+s1)-18);

  // ===== RIGHT WEIGHT (M2) =====
  const arr2Len = Math.min(50, M2 * 3 + 15);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2.5;
  ctx.shadowBlur = 6; ctx.shadowColor = '#c0392b';
  ctx.beginPath(); ctx.moveTo(wx2, -(6+s2)); ctx.lineTo(wx2, -(6+s2)-arr2Len); ctx.stroke();
  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.moveTo(wx2, -(6+s2)); ctx.lineTo(wx2-5, -(6+s2)-12); ctx.lineTo(wx2+5, -(6+s2)-12); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(192,57,43,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(0, 25); ctx.lineTo(wx2, 25); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#c0392b'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('d₂='+d2+'m', wx2/2, 38);
  // Curved moment arrow (clockwise = right side down)
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.shadowBlur = 6; ctx.shadowColor = '#c0392b';
  ctx.beginPath(); ctx.arc(0, 0, 58, -Math.PI*0.7, -Math.PI*0.1, false); ctx.stroke();
  ctx.fillStyle = '#c0392b';
  const ang2e = -Math.PI*0.1;
  ctx.beginPath();
  ctx.moveTo(58*Math.cos(ang2e), 58*Math.sin(ang2e));
  ctx.lineTo(58*Math.cos(ang2e-0.25)-7*Math.sin(ang2e-0.25), 58*Math.sin(ang2e-0.25)+7*Math.cos(ang2e-0.25));
  ctx.lineTo(58*Math.cos(ang2e+0.25)-7*Math.sin(ang2e+0.25), 58*Math.sin(ang2e+0.25)+7*Math.cos(ang2e+0.25));
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  // String
  ctx.strokeStyle='#e74c3c'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(wx2,-(6+s2)); ctx.lineTo(wx2,-6); ctx.stroke();
  // Block
  const g2 = ctx.createLinearGradient(wx2-s2/2,0,wx2+s2/2,0);
  g2.addColorStop(0,'#c0392b'); g2.addColorStop(0.5,'#e74c3c'); g2.addColorStop(1,'#922b21');
  ctx.fillStyle = g2; ctx.shadowBlur = 10; ctx.shadowColor = '#e74c3c55';
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(wx2-s2/2,-(6+s2),s2,s2,4) : ctx.fillRect(wx2-s2/2,-(6+s2),s2,s2);
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle='#fff'; ctx.font=`bold ${Math.min(13,s2/2.5)}px monospace`; ctx.textAlign='center';
  ctx.fillText(F2+'N', wx2, -(6+s2/2)+4);
  ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.font='8px monospace';
  ctx.fillText('M₂='+M2.toFixed(1)+'Nm', wx2, -(6+s2)-18);

  ctx.restore();

  // Labels
  ctx.fillStyle='#1565c0'; ctx.font='bold 13px Nunito,sans-serif'; ctx.textAlign='left';
  ctx.fillText(`M₁ = ${M1.toFixed(1)} Nm  ↺`, 16, 24);
  ctx.fillStyle='#c0392b'; ctx.textAlign='right';
  ctx.fillText(`↻  M₂ = ${M2.toFixed(1)} Nm`, W-16, 24);
  // Angle display
  const angDeg = (angle * 180 / Math.PI).toFixed(1);
  ctx.fillStyle='#7f8c8d'; ctx.font='10px monospace'; ctx.textAlign='center';
  ctx.fillText(`Góc nghiêng: ${angDeg}°`, W/2, H-12);
}

/* ==================== LẮP RÁP DNA ==================== */
let dnaPairs = [];
function initDNA() { applyDNAPairCount(); }
function applyDNAPairCount() {
  const count = parseInt(document.getElementById('dna-pair-count').value) || 6;
  dnaPairs = [];
  const bases = ['A', 'T', 'G', 'C'], comp = {'A':'T', 'T':'A', 'G':'C', 'C':'G'};
  for(let i=0; i<count; i++) {
    const b1 = bases[Math.floor(Math.random()*bases.length)];
    dnaPairs.push({ b1: b1, target: comp[b1], current: null });
  }
  document.getElementById('dna-score').innerHTML = '';
  renderDNAStrands();
}
function renderDNAStrands() {
  const c = document.getElementById('dna-strands'); if(!c) return;
  let html = '<div class="dna-strand-container">';
  dnaPairs.forEach((p, i) => {
    html += `
    <div class="dna-strand-row">
      <div class="dna-strand-label">Cặp ${i+1}</div>
      <div class="dna-base-slot filled base-${p.b1}">${p.b1}</div>
      <div class="dna-bonds-row" id="bond-${i}">
        <span class="dna-bond">—</span><span class="dna-bond">—</span>${(p.b1==='G'||p.b1==='C')?'<span class="dna-bond">—</span>':''}
      </div>
      <div class="dna-base-slot ${p.current?'filled base-'+p.current:''}" id="slot-${i}" 
           ondragover="event.preventDefault()" ondrop="dropBase(event, ${i})" onclick="cycleBase(${i})">
           ${p.current||'?'}
      </div>
    </div>`;
  });
  c.innerHTML = html + '</div>';
}
function dragBase(ev, base) { ev.dataTransfer.setData("base", base); }
function dropBase(ev, idx) {
  const b = ev.dataTransfer.getData("base");
  if(b) { dnaPairs[idx].current = b; renderDNAStrands(); }
}
function cycleBase(idx) {
  const bases = ['A', 'T', 'G', 'C'];
  let cur = dnaPairs[idx].current;
  dnaPairs[idx].current = cur ? bases[(bases.indexOf(cur)+1)%4] : 'A';
  renderDNAStrands();
}
function checkDNA() {
  let corrects = 0;
  dnaPairs.forEach((p, i) => {
    const s = document.getElementById(`slot-${i}`), b = document.getElementById(`bond-${i}`);
    if(p.current === p.target) {
      corrects++; s.classList.add('correct'); s.classList.remove('wrong');
      b.querySelectorAll('.dna-bond').forEach(el => el.classList.add('active'));
    } else {
      s.classList.add('wrong'); s.classList.remove('correct');
      b.querySelectorAll('.dna-bond').forEach(el => el.classList.remove('active'));
    }
  });
  const scr = document.getElementById('dna-score');
  if(corrects === dnaPairs.length) scr.innerHTML = `🎉 Tuyệt vời! Đúng ${corrects}/${dnaPairs.length} cặp. Chuỗi DNA đã liên kết!`;
  else scr.innerHTML = `⚠️ Mới đúng ${corrects}/${dnaPairs.length} cặp. Hãy xem lại nguyên tắc A-T, G-C.`;
}
function resetDNA() { applyDNAPairCount(); }


/* ==================== CẤU TẠO TẾ BÀO ==================== */
const cellData = {
  wall: { name: 'Thành tế bào', latin: 'Cell Wall', emoji: '🟫', desc: 'Bao bọc bên ngoài, tạo hình dáng và độ cứng chắc cho tế bào thực vật. Cấu tạo chủ yếu từ xenlulôzơ.', fun: 'Bảo vệ tế bào khỏi bị vỡ khi hút quá nhiều nước.' },
  membrane: { name: 'Màng sinh chất', latin: 'Plasma Membrane', emoji: '🟡', desc: 'Lớp màng bán thấm chọn lọc, kiểm soát sự ra vào của các chất.', fun: 'Giống như "người gác cổng" của tế bào.' },
  nucleus: { name: 'Nhân tế bào', latin: 'Nucleus', emoji: '🟠', desc: 'Chứa vật chất di truyền (DNA), điều khiển mọi hoạt động sống của tế bào.', fun: 'Đóng vai trò như "bộ não" của tế bào.' },
  vacuole: { name: 'Không bào trung tâm', latin: 'Central Vacuole', emoji: '🔵', desc: 'Túi lớn chứa dịch tế bào (nước, chất dinh dưỡng, chất thải). Tạo áp suất thẩm thấu.', fun: 'Chiếm tới 80-90% thể tích tế bào thực vật trưởng thành!' },
  chloroplast: { name: 'Lục lạp', latin: 'Chloroplast', emoji: '🟢', desc: 'Bào quan quang hợp, chứa diệp lục hấp thụ ánh sáng mặt trời.', fun: 'Nhà máy năng lượng mặt trời của tế bào.' },
  mitochondria: { name: 'Ty thể', latin: 'Mitochondrion', emoji: '🔴', desc: 'Nơi diễn ra hô hấp tế bào, tạo ra năng lượng ATP cho tế bào hoạt động.', fun: '"Nhà máy điện" của tế bào.' },
  golgi: { name: 'Bộ máy Golgi', latin: 'Golgi Apparatus', emoji: '🩷', desc: 'Hệ thống túi dẹp xếp chồng, làm nhiệm vụ sửa đổi, phân loại và đóng gói protein.', fun: '"Bưu điện" của tế bào.' },
  er: { name: 'Lưới nội chất', latin: 'Endoplasmic Reticulum', emoji: '🟣', desc: 'Mạng lưới ống và xoang mang màng, tổng hợp protein (ER hạt) và lipid (ER trơn).', fun: 'Hệ thống "đường cao tốc" vận chuyển nội bộ.' },
  ribosome: { name: 'Ribosome', latin: 'Ribosome', emoji: '⚪', desc: 'Bộ máy tổng hợp protein từ axit amin theo khuôn mẫu mARN.', fun: 'Cấu trúc không có màng bao bọc.' }
};

let currentOrganelle = null, cellCanvasSetup = false;
let chipBoxOrganelle = null; // chỉ set khi click vào chip tên bào quan

// Tọa độ hộp bao quanh từng bào quan (relative to cx,cy)
function getOrganelleBounds(id, cx, cy) {
  const boxes = {
    wall:         { x: cx-215, y: cy-138, w: 430, h: 276 },
    membrane:     { x: cx-195, y: cy-116, w: 390, h: 232 },
    nucleus:      { x: cx-172, y: cy-82,  w: 88,  h: 88  },
    vacuole:      { x: cx-128, y: cy-68,  w: 256, h: 156 },
    chloroplast:  { x: cx-108, y: cy-80,  w: 272, h: 180 },
    mitochondria: { x: cx-142, y: cy-96,  w: 260, h: 178 },
    golgi:        { x: cx+40,  y: cy-52,  w: 92,  h: 104 },
    er:           { x: cx-102, y: cy-70,  w: 86,  h: 62  },
    ribosome:     { x: cx-112, y: cy-82,  w: 76,  h: 100 }
  };
  return boxes[id] || null;
}

function drawPlantCell() {
  const c = document.getElementById('cell-canvas'); if(!c) return;
  const ctx = c.getContext('2d'); const W = c.width, H = c.height;
  ctx.clearRect(0,0,W,H);
  
  const cx = W/2, cy = H/2;
  
  // Wall
  ctx.lineWidth = 15; ctx.strokeStyle = currentOrganelle === 'wall' ? '#e67e22' : '#27ae60';
  ctx.fillStyle = '#1e3b2b'; ctx.beginPath(); ctx.roundRect(cx - 200, cy - 120, 400, 240, 30); ctx.fill(); ctx.stroke();
  
  // Membrane
  ctx.lineWidth = 3; ctx.strokeStyle = currentOrganelle === 'membrane' ? '#f1c40f' : '#82e0aa';
  ctx.beginPath(); ctx.roundRect(cx - 190, cy - 110, 380, 220, 25); ctx.stroke();
  
  // Vacuole
  ctx.fillStyle = currentOrganelle === 'vacuole' ? 'rgba(52, 152, 219, 0.6)' : 'rgba(52, 152, 219, 0.2)';
  ctx.strokeStyle = currentOrganelle === 'vacuole' ? '#3498db' : 'rgba(52, 152, 219, 0.5)';
  ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy + 10, 120, 70, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  
  // Nucleus
  ctx.fillStyle = currentOrganelle === 'nucleus' ? '#e67e22' : '#d35400'; ctx.beginPath(); ctx.arc(cx - 130, cy - 40, 35, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(cx - 140, cy - 45, 12, 0, Math.PI*2); ctx.fill();
  
  // ER
  ctx.strokeStyle = currentOrganelle === 'er' ? '#9b59b6' : '#8e44ad'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx-90, cy-40); ctx.lineTo(cx-70, cy-60); ctx.lineTo(cx-50, cy-20); ctx.lineTo(cx-30, cy-50); ctx.stroke();
  
  // Chloroplasts
  [[cx-80,cy+80], [cx+120,cy-60], [cx+140,cy+60]].forEach(pos => {
    ctx.fillStyle = currentOrganelle === 'chloroplast' ? '#2ecc71' : '#1e8449';
    ctx.beginPath(); ctx.ellipse(pos[0], pos[1], 20, 12, Math.PI/4, 0, Math.PI*2); ctx.fill();
  });
  
  // Mitochondria
  [[cx-120,cy+60], [cx+100,cy+70], [cx+60,cy-80]].forEach(pos => {
    ctx.fillStyle = currentOrganelle === 'mitochondria' ? '#e74c3c' : '#c0392b';
    ctx.beginPath(); ctx.ellipse(pos[0], pos[1], 15, 8, -Math.PI/6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(pos[0]-10, pos[1]); ctx.lineTo(pos[0]-5, pos[1]-4); ctx.lineTo(pos[0], pos[1]+4); ctx.lineTo(pos[0]+5, pos[1]-4); ctx.lineTo(pos[0]+10, pos[1]); ctx.stroke();
  });
  
  // Golgi
  ctx.strokeStyle = currentOrganelle === 'golgi' ? '#fd79a8' : '#e84393'; ctx.lineWidth = 5;
  for(let i=0; i<4; i++) { ctx.beginPath(); ctx.arc(cx+80, cy, 30+i*6, -Math.PI/3, Math.PI/3); ctx.stroke(); }
  
  // Ribosome
  ctx.fillStyle = currentOrganelle === 'ribosome' ? '#fff' : '#aaa';
  [[cx-60,cy-30], [cx-40,cy-40], [cx-80,cy-60], [cx-50,cy-70], [cx-100,cy+10]].forEach(pos => {
    ctx.beginPath(); ctx.arc(pos[0], pos[1], 3, 0, Math.PI*2); ctx.fill();
  });

  // ---- Vẽ hình chữ nhật vàng nét đứt khi click vào chip ----
  if (chipBoxOrganelle) {
    const b = getOrganelleBounds(chipBoxOrganelle, cx, cy);
    if (b) {
      ctx.save();
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f1c40f';
      const pad = 8;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(b.x - pad, b.y - pad, b.w + pad*2, b.h + pad*2, 8);
        ctx.stroke();
      } else {
        ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad*2, b.h + pad*2);
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function setupCellEvents() {
  if (cellCanvasSetup) return;
  const c = document.getElementById('cell-canvas'); if(!c) return;
  
  function detectOrganelle(e) {
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width, scaleY = c.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const cx = c.width/2, cy = c.height/2;
    if(Math.hypot(x-(cx-130), y-(cy-40)) < 40) return 'nucleus';
    if(Math.hypot(x-cx, y-(cy+10)) < 80) return 'vacuole';
    if(Math.hypot(x-(cx-120), y-(cy+60))<22 || Math.hypot(x-(cx+100), y-(cy+70))<22 || Math.hypot(x-(cx+60), y-(cy-80))<22) return 'mitochondria';
    if(Math.hypot(x-(cx-80), y-(cy+80))<26 || Math.hypot(x-(cx+120), y-(cy-60))<26 || Math.hypot(x-(cx+140), y-(cy+60))<26) return 'chloroplast';
    if(x > cx+58 && x < cx+115 && Math.abs(y-cy) < 42) return 'golgi';
    if(x > cx-100 && x < cx-15 && y > cy-72 && y < cy-8) return 'er';
    if(Math.abs(x-cx) > 168 && Math.abs(x-cx) < 215 && Math.abs(y-cy) < 132) return 'wall';
    if(Math.abs(x-cx) < 205 && Math.abs(y-cy) < 128) return 'membrane';
    if(Math.hypot(x-(cx-60), y-(cy-30))<8 || Math.hypot(x-(cx-40),y-(cy-40))<8 || Math.hypot(x-(cx-80),y-(cy-60))<8) return 'ribosome';
    return null;
  }

  c.addEventListener('mousemove', (e) => {
    const hovered = detectOrganelle(e);
    const tt = document.getElementById('cell-tooltip');
    if(hovered) { tt.style.opacity = 1; tt.textContent = cellData[hovered].emoji + ' ' + cellData[hovered].name; c.style.cursor = 'pointer'; }
    else { tt.style.opacity = 0; c.style.cursor = 'crosshair'; }
  });

  c.addEventListener('click', (e) => {
    const clicked = detectOrganelle(e);
    if(clicked) {
      chipBoxOrganelle = null; // click canvas: không vẽ hình chữ nhật
      showOrganelleInfo(clicked);
    }
  });

  cellCanvasSetup = true;
}

function highlightOrganelle(id) { currentOrganelle = id; drawPlantCell(); }

// Gọi từ chip (tên bào quan): vẽ hình chữ nhật vàng nét đứt
function showOrganelleInfoFromChip(id) {
  chipBoxOrganelle = id;
  showOrganelleInfo(id);
}

function showOrganelleInfo(id) {
  highlightOrganelle(id);
  document.querySelectorAll('.cell-chip').forEach(chip => {
    chip.classList.remove('active');
    if(chip.getAttribute('onclick').includes(`'${id}'`)) chip.classList.add('active');
  });
  const panel = document.getElementById('organelle-info-panel');
  if(!id) { panel.style.display = 'none'; return; }
  panel.style.display = 'flex';
  const data = cellData[id];
  document.getElementById('organelle-emoji').textContent = data.emoji;
  document.getElementById('organelle-name').textContent = data.name;
  document.getElementById('organelle-latin').textContent = data.latin;
  document.getElementById('organelle-desc').textContent = data.desc;
  const funEl = document.getElementById('organelle-fun');
  if(data.fun) { funEl.style.display = 'block'; funEl.textContent = '💡 Mẹo: ' + data.fun; } 
  else funEl.style.display = 'none';
}
function resetCellView() {
  chipBoxOrganelle = null;
  highlightOrganelle(null);
  document.querySelectorAll('.cell-chip').forEach(c => c.classList.remove('active'));
  document.getElementById('organelle-info-panel').style.display = 'none';
}
