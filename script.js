/* ── MOBILE SIDEBAR ── */
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('open');
  hamburger.classList.add('open');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
  hamburger.classList.remove('open');
}
hamburger.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlay.addEventListener('click', closeSidebar);

/* ── NAV ── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  event && event.target && event.target.classList.add('active');
  const labels = {
    home:'Trang chủ', motion:'Vận tốc – Quãng đường', force:'Lực – Kéo co',
    wave:'Sóng cơ học', optics:'Quang học', circuit:'Mạch điện',
    acidbase:'Acid–Base', cell:'Tế bào'
  };
  document.getElementById('status-page').textContent = labels[id] || id;
  if (id === 'motion') { updateMotionParam(); drawMotionFrame(); drawGraph(); }
  if (id === 'force') { drawForceScene(0); }
  // Close sidebar on mobile after nav
  if (window.innerWidth <= 768) closeSidebar();
}

function toggleSubject(el) {
  const items = el.nextElementSibling;
  const arrow = el.querySelector('.arrow');
  items.classList.toggle('open');
  arrow.classList.toggle('open');
}

/* ── MOTION ── */
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
    const s = mV0 * tIn + 0.5 * mA * tIn * tIn;
    document.getElementById('s-input').value = s.toFixed(2);
  } else if (target === 'v') {
    mTmax = tIn;
    const v = mV0 + mA * tIn;
    document.getElementById('v-input').value = v.toFixed(2);
  } else if (target === 't') {
    if (Math.abs(mA) > 0.001) {
      const t = (vIn - mV0) / mA;
      mTmax = Math.max(t, 1);
      document.getElementById('t-input').value = t.toFixed(2);
    } else {
      const t = mV0 > 0 ? sIn / mV0 : 0;
      mTmax = Math.max(t, 1);
      document.getElementById('t-input').value = t.toFixed(2);
    }
  }

  document.getElementById('m-acc').innerHTML = mA.toFixed(2) + '<span class="dc-unit">m/s²</span>';
  motionRunning = false;
  cancelAnimationFrame(motionRAF);
  motionT = 0; graphHistory = []; lastMotionTime = null;
  mSmax = Math.max(mV0 * mTmax + 0.5 * mA * mTmax * mTmax, 1);
  drawMotionFrame(mV0, 0);
  drawGraph();
  setTimeout(() => {
    motionRunning = true;
    document.getElementById('motion-btn').textContent = '⏸ Dừng';
    requestAnimationFrame(motionLoop);
  }, 300);
}

function toggleMotion() {
  motionRunning = !motionRunning;
  document.getElementById('motion-btn').textContent = motionRunning ? '⏸ Dừng' : '▶ Tiếp tục';
  if (motionRunning) { lastMotionTime = null; requestAnimationFrame(motionLoop); }
  else cancelAnimationFrame(motionRAF);
}

function resetMotion() {
  motionRunning = false;
  cancelAnimationFrame(motionRAF);
  motionT = 0; graphHistory = []; lastMotionTime = null;
  document.getElementById('motion-btn').textContent = '▶ Khởi động';
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
    document.getElementById('motion-btn').textContent = '▶ Khởi động';
    lastMotionTime = null;
    drawMotionFrame(Math.max(0,v), s);
    drawGraph();
    document.getElementById('m-time').innerHTML = motionT.toFixed(2) + '<span class="dc-unit">s</span>';
    document.getElementById('m-vel').innerHTML = Math.max(0,v).toFixed(2) + '<span class="dc-unit">m/s</span>';
    document.getElementById('m-dist').innerHTML = s.toFixed(2) + '<span class="dc-unit">m</span>';
    return;
  }
  graphHistory.push({ t: motionT, v: Math.max(0, v), s });
  drawMotionFrame(Math.max(0,v), s);
  drawGraph();
  document.getElementById('m-time').innerHTML = motionT.toFixed(2) + '<span class="dc-unit">s</span>';
  document.getElementById('m-vel').innerHTML = Math.max(0,v).toFixed(2) + '<span class="dc-unit">m/s</span>';
  document.getElementById('m-dist').innerHTML = s.toFixed(2) + '<span class="dc-unit">m</span>';
  if (motionRunning) motionRAF = requestAnimationFrame(motionLoop);
  else lastMotionTime = null;
}

function drawMotionFrame(v, s) {
  const c = document.getElementById('motion-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#d4f1c5'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, H*0.55, W, H*0.3);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H*0.55); ctx.lineTo(W, H*0.55); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H*0.85); ctx.lineTo(W, H*0.85); ctx.stroke();
  ctx.strokeStyle = '#fdcb6e55'; ctx.lineWidth = 2; ctx.setLineDash([20,15]);
  ctx.beginPath(); ctx.moveTo(0, H*0.7); ctx.lineTo(W, H*0.7); ctx.stroke();
  ctx.setLineDash([]);
  const sMax = mSmax > 1 ? mSmax : Math.max(mV0 * mTmax + 0.5 * mA * mTmax * mTmax, 1);
  for (let i = 0; i <= 5; i++) {
    const x = (i / 5) * W;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, H*0.54); ctx.lineTo(x, H*0.86); ctx.stroke();
    ctx.fillStyle = '#555'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText((sMax * i / 5).toFixed(0) + 'm', x, H*0.92);
  }
  const curS = s !== undefined ? s : 0;
  const carX = Math.min((curS / Math.max(sMax, 1)) * W, W - 60);
  const carY = H * 0.58;
  const cw = 60, ch = 28;
  ctx.shadowBlur = 12; ctx.shadowColor = '#d63031';
  ctx.fillStyle = '#2d3436'; ctx.fillRect(carX, carY, cw, ch);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(carX + 8, carY);
  ctx.lineTo(carX + 16, carY - 14);
  ctx.lineTo(carX + 44, carY - 14);
  ctx.lineTo(carX + 52, carY);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#74b9ff';
  ctx.fillRect(carX + 18, carY - 12, 10, 10);
  ctx.fillRect(carX + 32, carY - 12, 10, 10);
  [carX + 10, carX + 42].forEach(wx => {
    ctx.fillStyle = '#636e72'; ctx.beginPath();
    ctx.arc(wx, carY + ch, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b2bec3'; ctx.beginPath();
    ctx.arc(wx, carY + ch, 4, 0, Math.PI * 2); ctx.fill();
  });
  if (v > 0.5) {
    ctx.fillStyle = '#fdcb6e33';
    for (let i = 1; i <= 3; i++) {
      ctx.fillRect(carX - i * 20, carY + 8, 14, 4);
    }
  }
  const speedText = (v || mV0).toFixed(1) + ' m/s';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
  ctx.fillText(speedText, carX + 30, carY - 20);
}

function drawGraph() {
  const c = document.getElementById('graph-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, W, H);
  const pad = { l:40, r:12, t:10, b:20 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t+gH); ctx.lineTo(pad.l+gW, pad.t+gH); ctx.stroke();
  if (graphHistory.length < 2) return;
  const maxV = Math.max(...graphHistory.map(p=>p.v), 1);
  const maxT = mTmax;
  ctx.strokeStyle = '#d63031'; ctx.lineWidth = 2;
  ctx.beginPath();
  graphHistory.forEach((p, i) => {
    const x = pad.l + (p.t / maxT) * gW;
    const y = pad.t + gH - (p.v / maxV) * gH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#d63031'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('v(t)', pad.l + 4, pad.t + 12);
  ctx.fillStyle = '#555'; ctx.textAlign = 'center';
  ctx.fillText(maxT.toFixed(0)+'s', pad.l + gW, pad.t + gH + 16);
  ctx.textAlign = 'right';
  ctx.fillText(maxV.toFixed(0), pad.l - 4, pad.t + 10);
}

window.addEventListener('load', () => {
  mV0 = 10; mA = 2; mTmax = 10;
  mSmax = Math.max(mV0 * mTmax + 0.5 * mA * mTmax * mTmax, 1);
  updateInputFields();
  drawMotionFrame(mV0, 0);
  drawGraph();
});

/* ── FORCE (KÉO CO) SIMULATION ── */
let forceRunning = false;
let forceRAF = null;
let forceOffset = 0;      // rope center offset (-1 to 1, positive = right wins)
let forceVelocity = 0;
let forceLastTime = null;

function getForceValues() {
  const f1 = parseFloat(document.getElementById('force-left').value) || 0;
  const f2 = parseFloat(document.getElementById('force-right').value) || 0;
  // Tự tính số người: tỉ lệ với lực, tối thiểu 1, tối đa 8
  const maxF = Math.max(f1, f2, 1);
  const pl = Math.max(1, Math.round((f1 / maxF) * 8));
  const pr = Math.max(1, Math.round((f2 / maxF) * 8));
  return { f1, f2, pl, pr };
}

function updateForceDisplay() {
  const { f1, f2 } = getForceValues();
  document.getElementById('fp-f1').innerHTML = f1 + '<span class="dc-unit">N</span>';
  document.getElementById('fp-f2').innerHTML = f2 + '<span class="dc-unit">N</span>';
  const net = f2 - f1;
  document.getElementById('fp-net').innerHTML = Math.abs(net).toFixed(0) + '<span class="dc-unit">N</span>';
  if (net > 0) document.getElementById('fp-result').textContent = '→ Phải thắng';
  else if (net < 0) document.getElementById('fp-result').textContent = '← Trái thắng';
  else document.getElementById('fp-result').textContent = '⇌ Cân bằng';
  if (!forceRunning) drawForceScene(forceOffset);
}

function toggleForce() {
  forceRunning = !forceRunning;
  document.getElementById('force-btn').textContent = forceRunning ? '⏸ Dừng' : '▶ Tiếp tục';
  if (forceRunning) { forceLastTime = null; requestAnimationFrame(forceLoop); }
  else cancelAnimationFrame(forceRAF);
}

function resetForce() {
  forceRunning = false;
  cancelAnimationFrame(forceRAF);
  forceOffset = 0;
  forceVelocity = 0;
  forceLastTime = null;
  document.getElementById('force-btn').textContent = '▶ Chạy';
  drawForceScene(0);
  updateForceDisplay();
}

function forceLoop(ts) {
  if (!forceLastTime) forceLastTime = ts;
  const dt = Math.min((ts - forceLastTime) / 1000, 0.05);
  forceLastTime = ts;
  const { f1, f2 } = getForceValues();
  const net = f2 - f1;         // positive = right wins
  const mass = 50;
  const accel = net / mass;
  const damping = 0.97;
  forceVelocity = forceVelocity * damping + accel * dt;
  forceOffset += forceVelocity * dt;
  forceOffset = Math.max(-1, Math.min(1, forceOffset));
  drawForceScene(forceOffset);
  // Update net force display live
  document.getElementById('fp-net').innerHTML = Math.abs(net).toFixed(0) + '<span class="dc-unit">N</span>';
  if (Math.abs(forceOffset) >= 0.98) {
    forceRunning = false;
    document.getElementById('force-btn').textContent = '▶ Chạy lại';
    if (forceOffset > 0) document.getElementById('fp-result').textContent = '→ Phải thắng!';
    else document.getElementById('fp-result').textContent = '← Trái thắng!';
    drawForceScene(forceOffset);
    return;
  }
  if (forceRunning) forceRAF = requestAnimationFrame(forceLoop);
}

function drawForceScene(offset) {
  const c = document.getElementById('force-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a1a2e');
  bg.addColorStop(1, '#16213e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ground
  ctx.fillStyle = '#2d5016';
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
  ctx.fillStyle = '#3a6b1a';
  ctx.fillRect(0, H * 0.72, W, 6);

  // Grass blades (decorative)
  ctx.strokeStyle = '#4a8a20';
  ctx.lineWidth = 1.5;
  for (let i = 10; i < W; i += 18) {
    ctx.beginPath();
    ctx.moveTo(i, H * 0.72);
    ctx.lineTo(i + 3, H * 0.72 - 8);
    ctx.stroke();
  }

  const { f1, f2, pl, pr } = getForceValues();

  // Rope center X
  const centerX = W / 2 + offset * (W * 0.28);
  const ropeY = H * 0.48;

  // Rope
  const ropeLeft = 60;
  const ropeRight = W - 60;
  ctx.strokeStyle = '#c8a96e';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ropeLeft, ropeY);
  ctx.lineTo(ropeRight, ropeY);
  ctx.stroke();

  // Rope stripes
  ctx.strokeStyle = '#a07840';
  ctx.lineWidth = 1.5;
  for (let rx = ropeLeft; rx < ropeRight; rx += 14) {
    ctx.beginPath();
    ctx.moveTo(rx, ropeY - 2);
    ctx.lineTo(rx + 7, ropeY + 2);
    ctx.stroke();
  }

  // Center marker (flag/mud puddle)
  const mudR = 18;
  ctx.fillStyle = offset > 0.05 ? '#0984e3' : offset < -0.05 ? '#d63031' : '#888';
  ctx.shadowBlur = 14;
  ctx.shadowColor = ctx.fillStyle;
  ctx.beginPath();
  ctx.arc(centerX, ropeY, mudR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Flag on center
  ctx.fillStyle = '#fff';
  ctx.fillRect(centerX - 1.5, ropeY - mudR - 10, 3, mudR);
  ctx.fillStyle = '#fdcb6e';
  ctx.beginPath();
  ctx.moveTo(centerX + 1, ropeY - mudR - 10);
  ctx.lineTo(centerX + 14, ropeY - mudR - 4);
  ctx.lineTo(centerX + 1, ropeY - mudR + 2);
  ctx.closePath();
  ctx.fill();

  // Draw people function
  function drawPerson(x, y, color, facingLeft) {
    const scale = 1;
    const dir = facingLeft ? -1 : 1;
    // Body
    ctx.fillStyle = color;
    ctx.fillRect(x - 5 * scale, y - 20 * scale, 10 * scale, 18 * scale);
    // Head
    ctx.beginPath();
    ctx.arc(x, y - 26 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
    // Arms pulling rope
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y - 16 * scale);
    ctx.lineTo(x + dir * 12 * scale, y - 10 * scale);
    ctx.stroke();
    // Legs
    ctx.beginPath();
    ctx.moveTo(x - 3 * scale, y - 2 * scale);
    ctx.lineTo(x - 6 * scale, y + 14 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 3 * scale, y - 2 * scale);
    ctx.lineTo(x + 4 * scale, y + 14 * scale);
    ctx.stroke();
  }

  // Left team
  const leftColors = ['#e17055', '#d63031', '#c0392b', '#e74c3c', '#ff6b6b', '#ff7675', '#fab1a0', '#fd79a8'];
  const spacing = Math.min(52, (centerX - ropeLeft - 30) / (pl + 1));
  for (let i = 0; i < pl; i++) {
    const px = centerX - 40 - (i + 1) * spacing;
    const py = ropeY + 2;
    if (px > ropeLeft + 10) {
      drawPerson(px, py, leftColors[i % leftColors.length], false);
    }
  }

  // Right team
  const rightColors = ['#0984e3', '#74b9ff', '#0652dd', '#1289A7', '#12CBC4', '#1e90ff', '#6c5ce7', '#a29bfe'];
  const rspacing = Math.min(52, (ropeRight - centerX - 30) / (pr + 1));
  for (let i = 0; i < pr; i++) {
    const px = centerX + 40 + (i + 1) * rspacing;
    const py = ropeY + 2;
    if (px < ropeRight - 10) {
      drawPerson(px, py, rightColors[i % rightColors.length], true);
    }
  }

  // Force arrows
  const arrowLen = Math.min(80, f1 / 2);
  const arrowLenR = Math.min(80, f2 / 2);

  // Force arrows — drawn well above the people (head top ~ropeY-33, add 25px gap → ropeY-58)
  const arrowY = ropeY - 62;

  // Left arrow (pointing left)
  ctx.strokeStyle = '#d63031';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 8; ctx.shadowColor = '#d63031';
  ctx.beginPath();
  ctx.moveTo(ropeLeft + arrowLen + 10, arrowY);
  ctx.lineTo(ropeLeft + 10, arrowY);
  ctx.stroke();
  ctx.fillStyle = '#d63031';
  ctx.beginPath();
  ctx.moveTo(ropeLeft + 8, arrowY);
  ctx.lineTo(ropeLeft + 20, arrowY - 6);
  ctx.lineTo(ropeLeft + 20, arrowY + 6);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff7675';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('F₁ = ' + f1 + 'N', ropeLeft + arrowLen / 2 + 10, arrowY - 8);

  // Right arrow (pointing right)
  ctx.strokeStyle = '#0984e3';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 8; ctx.shadowColor = '#0984e3';
  ctx.beginPath();
  ctx.moveTo(ropeRight - arrowLenR - 10, arrowY);
  ctx.lineTo(ropeRight - 10, arrowY);
  ctx.stroke();
  ctx.fillStyle = '#0984e3';
  ctx.beginPath();
  ctx.moveTo(ropeRight - 8, arrowY);
  ctx.lineTo(ropeRight - 20, arrowY - 6);
  ctx.lineTo(ropeRight - 20, arrowY + 6);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#74b9ff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('F₂ = ' + f2 + 'N', ropeRight - arrowLenR / 2 - 10, arrowY - 8);

  // Team labels
  ctx.fillStyle = '#ff7675';
  ctx.font = 'bold 14px Times New Roman';
  ctx.textAlign = 'left';
  ctx.fillText('ĐỘI TRÁI', 8, 20);
  ctx.fillStyle = '#74b9ff';
  ctx.textAlign = 'right';
  ctx.fillText('ĐỘI PHẢI', W - 8, 20);

  // Net force bar at bottom
  const barW = W * 0.5;
  const barX = (W - barW) / 2;
  const barY = H * 0.88;
  const barH = 10;
  ctx.fillStyle = '#222';
  ctx.fillRect(barX, barY, barW, barH);
  const net = f2 - f1;
  const maxF = 200;
  const fillPct = Math.min(Math.abs(net) / maxF, 1);
  if (Math.abs(net) > 1) {
    const fillW = fillPct * (barW / 2);
    ctx.fillStyle = net > 0 ? '#0984e3' : '#d63031';
    if (net > 0) {
      ctx.fillRect(barX + barW / 2, barY, fillW, barH);
    } else {
      ctx.fillRect(barX + barW / 2 - fillW, barY, fillW, barH);
    }
  }
  // Center mark
  ctx.fillStyle = '#fff';
  ctx.fillRect(barX + barW / 2 - 1.5, barY - 3, 3, barH + 6);
  ctx.fillStyle = '#aaa';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HỢP LỰC: ' + (net >= 0 ? '+' : '') + net.toFixed(0) + ' N', W / 2, barY + barH + 16);
}

/* ── CHEM ── */
function mixReaction() {
  const ac = parseFloat(document.getElementById('acid-conc').value) || 0.5;
  const bc = parseFloat(document.getElementById('base-conc').value) || 0.5;
  const ratio = ac / bc;
  let pH;
  if (Math.abs(ratio - 1) < 0.05) { pH = 7.0; }
  else if (ratio > 1) { pH = -Math.log10(ac - bc); pH = Math.max(0, pH); }
  else { pH = 14 + Math.log10(bc - ac); pH = Math.min(14, pH); }
  pH = Math.round(pH * 10) / 10;
  let color, env;
  if (pH < 6) { color = '#ff7675cc'; env = '⚡ Axit mạnh'; }
  else if (pH < 7) { color = '#fdcb6ecc'; env = '〰 Axit yếu'; }
  else if (pH === 7) { color = '#dfe6e9cc'; env = '✓ Trung tính'; }
  else if (pH < 8) { color = '#81ececcc'; env = '〰 Kiềm yếu'; }
  else { color = '#74b9ffcc'; env = '⚡ Kiềm mạnh'; }
  document.getElementById('liq-acid').style.height = '20%';
  document.getElementById('liq-base').style.height = '20%';
  document.getElementById('liq-result').style.height = '70%';
  document.getElementById('liq-result').style.background = color;
  document.getElementById('ph-display').style.display = 'block';
  document.getElementById('ph-val').textContent = pH.toFixed(1);
  document.getElementById('chem-ph-val').innerHTML = pH.toFixed(1);
  document.getElementById('chem-env').textContent = env;
}

function resetChem() {
  document.getElementById('liq-acid').style.height = '60%';
  document.getElementById('liq-base').style.height = '60%';
  document.getElementById('liq-result').style.height = '0%';
  document.getElementById('ph-display').style.display = 'none';
  document.getElementById('chem-ph-val').textContent = '–';
  document.getElementById('chem-env').textContent = 'Chưa trộn';
}

/* ── MODAL ── */
document.getElementById('openModal').addEventListener('click', () => {
  document.getElementById('feedbackModal').classList.add('open');
  document.getElementById('modal-form-body').style.display = 'block';
  document.getElementById('success-msg').style.display = 'none';
  document.querySelector('.modal-footer').style.display = 'flex';
});
function closeModal() { document.getElementById('feedbackModal').classList.remove('open'); }
document.getElementById('feedbackModal').addEventListener('click', e => { if (e.target.id === 'feedbackModal') closeModal(); });

function submitFeedback() {
  const name = document.getElementById('fb-name').value.trim();
  const content = document.getElementById('fb-content').value.trim();
  if (!name || !content) { alert('Vui lòng điền đầy đủ thông tin!'); return; }
  document.getElementById('modal-form-body').style.display = 'none';
  document.querySelector('.modal-footer').style.display = 'none';
  document.getElementById('success-msg').style.display = 'block';
  setTimeout(closeModal, 2500);
}

// Init force display
window.addEventListener('load', () => {
  updateForceDisplay();
  drawForceScene(0);
});
