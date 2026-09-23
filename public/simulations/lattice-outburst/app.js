import { OutburstModel } from './model.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#lattice');
const ctx = canvas.getContext('2d');
const runButton = $('#run');
const stepButton = $('#step');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let model = new OutburstModel();
let running = false;
let nextEventAt = 0;
let lastAnnouncementAt = 0;

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1b2529';
  ctx.fillRect(0, 0, width, height);

  const bounds = { ...model.bounds };
  const burst = model.lastBurst;
  if (burst) {
    const [x, y] = burst.center;
    bounds.minX = Math.min(bounds.minX, x - burst.radius);
    bounds.maxX = Math.max(bounds.maxX, x + burst.radius);
    bounds.minY = Math.min(bounds.minY, y - burst.radius);
    bounds.maxY = Math.max(bounds.maxY, y + burst.radius);
  }
  const scale = Math.min(28, (width - 56) / Math.max(11, bounds.maxX - bounds.minX + 3),
    (height - 56) / Math.max(11, bounds.maxY - bounds.minY + 3));
  const middleX = (bounds.minX + bounds.maxX) / 2;
  const middleY = (bounds.minY + bounds.maxY) / 2;
  const X = x => width / 2 + (x - middleX) * scale;
  const Y = y => height / 2 - (y - middleY) * scale;

  if (scale > 5) {
    ctx.strokeStyle = '#30413f';
    ctx.lineWidth = .5;
    ctx.beginPath();
    const spanX = Math.ceil(width / (2 * scale)) + 1;
    const spanY = Math.ceil(height / (2 * scale)) + 1;
    for (let x = Math.floor(middleX) - spanX; x <= Math.ceil(middleX) + spanX; x++) {
      ctx.moveTo(X(x) + scale / 2, 0);
      ctx.lineTo(X(x) + scale / 2, height);
    }
    for (let y = Math.floor(middleY) - spanY; y <= Math.ceil(middleY) + spanY; y++) {
      ctx.moveTo(0, Y(y) + scale / 2);
      ctx.lineTo(width, Y(y) + scale / 2);
    }
    ctx.stroke();
  }

  const cell = Math.max(.65, scale * .80);
  ctx.fillStyle = '#8fd3c4';
  for (const [x, y] of model.points) ctx.fillRect(X(x) - cell / 2, Y(y) - cell / 2, cell, cell);
  if (burst) {
    ctx.fillStyle = '#efad89';
    for (const [x, y] of burst.adds) ctx.fillRect(X(x) - cell / 2, Y(y) - cell / 2, cell, cell);
    const [x, y] = burst.center;
    const r = burst.radius + .5;
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y + r));
    ctx.lineTo(X(x + r), Y(y));
    ctx.lineTo(X(x), Y(y - r));
    ctx.lineTo(X(x - r), Y(y));
    ctx.closePath();
    ctx.strokeStyle = '#f4c95d';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#f4c95d';
    ctx.beginPath();
    ctx.arc(X(x), Y(y), Math.max(2.5, Math.min(4, scale / 4)), 0, 2 * Math.PI);
    ctx.fill();
  }

  // A small white cross keeps the initial site identifiable as the view fits.
  ctx.strokeStyle = '#f1f2e6';
  ctx.lineWidth = 1.4;
  const arm = Math.max(2, Math.min(4, scale * .20));
  ctx.beginPath();
  ctx.moveTo(X(0) - arm, Y(0));
  ctx.lineTo(X(0) + arm, Y(0));
  ctx.moveTo(X(0), Y(0) - arm);
  ctx.lineTo(X(0), Y(0) + arm);
  ctx.stroke();
}

function update({ announce = false } = {}) {
  const count = model.points.length.toLocaleString();
  const time = model.time < 100 ? model.time.toFixed(3) : model.time.toFixed(1);
  $('#site-count').textContent = count;
  $('#model-time').textContent = time;
  let description = 'One infected site at the origin.';
  if (model.lastBurst) {
    const { center, radius, adds } = model.lastBurst;
    description = `Radius ${radius} at (${center[0]}, ${center[1]}) · ` +
      (adds.length ? `${adds.length.toLocaleString()} new sites.` : 'Already infected; no new sites.');
  }
  if (model.stopped) description = model.stopped;
  $('#limit-status').hidden = !model.stopped;
  $('#limit-status').textContent = model.stopped;
  $('#event-description').textContent = description;
  canvas.setAttribute('aria-label', `Lattice cluster: ${count} infected sites at model time ${time}. ${description}`);
  if (announce || (running && performance.now() - lastAnnouncementAt > 5000)) {
    $('#announcement').textContent = `${count} infected sites. ${description}`;
    lastAnnouncementAt = performance.now();
  }
  draw();
}

function setRunning(value) {
  running = value && !model.stopped;
  nextEventAt = performance.now();
  runButton.textContent = running ? 'Pause' : 'Run';
  runButton.setAttribute('aria-pressed', String(running));
  runButton.disabled = Boolean(model.stopped);
  stepButton.disabled = running || Boolean(model.stopped);
}

function advance(announce = false) {
  model.step();
  if (model.stopped) setRunning(false);
  update({ announce: announce || Boolean(model.stopped) });
}

function reset() {
  model = new OutburstModel({ alpha: Number($('#alpha').value) });
  setRunning(false);
  update({ announce: true });
}

runButton.addEventListener('click', () => {
  setRunning(!running);
  $('#announcement').textContent = running ? 'Simulation running.' : 'Simulation paused.';
});
stepButton.addEventListener('click', () => advance(true));
$('#reset').addEventListener('click', reset);
$('#alpha').addEventListener('change', reset);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) setRunning(false);
});
new ResizeObserver(() => draw()).observe(canvas);
new ResizeObserver(() => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'lattice-outburst-resize',
      height: Math.ceil(document.querySelector('.outburst').getBoundingClientRect().height) }, window.location.origin);
  }
}).observe(document.querySelector('.outburst'));

function frame(now) {
  if (running && now >= nextEventAt) {
    advance();
    // One event per display step. No skipped null events or fabricated bursts.
    nextEventAt = now + (reducedMotion.matches ? 500 : 120);
  }
  requestAnimationFrame(frame);
}

update();
requestAnimationFrame(frame);
