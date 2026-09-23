import { CCAEngine } from './cca-engine.js';

const $ = id => document.getElementById(id);
const root = document.querySelector('.research-lab');
const query = new URLSearchParams(location.search);
const embedded = query.get('embed') === '1';
if (embedded) {
  root.classList.add('embedded');
  document.documentElement.classList.add('embedded-page');
}
const css = name => getComputedStyle(root).getPropertyValue(name).trim();
const setText = (element, value) => { if (element.textContent !== value) element.textContent = value; };
const colours = new Map();
function clusterColour(id) {
  if (!colours.has(id)) {
    const hue = (Math.imul(id + 1, 2654435761) >>> 0) % 360;
    colours.set(id, `hsl(${hue} 52% 71%)`);
  }
  return colours.get(id);
}

/** Only rendering and playback live here; the scientific event rule is unchanged. */
class SimulationView {
  constructor(prefix, geometry = false) {
    this.prefix = prefix;
    this.geometry = geometry;
    this.canvas = $(`${prefix}-canvas`);
    this.context = this.canvas.getContext('2d');
    this.running = false;
    this.active = !geometry;
    this.frameRequested = false;
    this.previousFrame = null;
    this.accumulator = 0;
    this.pointer = null;
    this.touchParticle = null;
    this.xrayAll = false;
    this.preparing = false;
    this.preparationId = 0;
    this.showingComplete = false;
    this.bind();
    this.reset();
    new ResizeObserver(() => this.render()).observe(this.canvas);
  }

  element(suffix) { return $(`${this.prefix}-${suffix}`); }

  configuration() {
    return this.geometry
      ? { side: Number(this.element('side').value), occupancy: 1, alpha: 1, seed: 1837 }
      : {
          side: Number(this.element('side').value),
          occupancy: Number(this.element('occupancy').value),
          alpha: Number(this.element('alpha').value),
          seed: 2026
        };
  }

  bind() {
    this.element('play').addEventListener('click', () => {
      if (this.preparing) return;
      if (this.running) { this.pause(); return; }
      if (this.geometry && this.showingComplete) this.beginReplay();
      else this.start();
    });
    if (!this.geometry) {
      this.element('reset').addEventListener('click', () => this.reset());
      ['side', 'occupancy', 'alpha'].forEach(name => {
        this.element(name).addEventListener('input', () => this.reset());
      });
      return;
    }
    this.element('side').addEventListener('input', () => this.reset());
    this.element('speed').addEventListener('input', () => {
      this.element('speed-value').value = `${Number(this.element('speed').value).toFixed(2)}×`;
    });
    this.element('finish').addEventListener('click', () => this.showComplete());
    this.element('xray').addEventListener('click', () => this.toggleXray());
    this.canvas.addEventListener('keydown', event => {
      if (event.key.toLowerCase() === 'x') { event.preventDefault(); this.toggleXray(); }
      if (event.key === 'Escape') {
        this.xrayAll = false; this.touchParticle = null; this.pointer = null;
        this.updateControls(); this.render();
      }
    });
    this.canvas.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      this.touchParticle = null;
      const box = this.canvas.getBoundingClientRect();
      this.pointer = [(event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height];
      this.render();
    });
    this.canvas.addEventListener('pointerleave', () => { this.pointer = null; this.render(); });
    this.canvas.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch') return;
      const box = this.canvas.getBoundingClientRect();
      const id = this.particleAt([(event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height]);
      this.touchParticle = id === this.touchParticle ? null : id;
      this.pointer = null;
      this.render();
    });
  }

  toggleXray() {
    this.xrayAll = !this.xrayAll;
    this.updateControls();
    this.render();
  }

  reset() {
    this.pause();
    this.preparationId++;
    this.engine = new CCAEngine(this.configuration());
    this.targetTime = 0;
    this.pointer = null;
    this.touchParticle = null;
    this.showingComplete = false;
    if (this.geometry) {
      const side = this.engine.config.side;
      this.element('side-value').value = `${side} × ${side}`;
      this.element('speed-value').value = `${Number(this.element('speed').value).toFixed(2)}×`;
      setText(this.element('hint'), `Hover or tap a cluster to see through it. Full occupancy · ${side} × ${side} · α = 1.`);
      this.completeSnapshot = null;
      this.preparing = true;
      this.snapshot = null;
      this.updateControls();
      this.render();
      this.prepareComplete();
    } else {
      const { side, occupancy, alpha } = this.engine.config;
      this.element('side-value').value = `${side} × ${side}`;
      this.element('occupancy-value').value = `${Math.round(occupancy * 100)}%`;
      this.element('alpha-value').value = alpha.toFixed(2);
      this.refresh();
    }
  }

  prepareComplete() {
    // Bound each preparation batch so inputs and scrolling remain responsive.
    // Ignore obsolete batches if the lattice size changes before completion.
    const preparationId = this.preparationId;
    const engine = this.engine;
    const work = () => {
      if (preparationId !== this.preparationId) return;
      const deadline = performance.now() + 7;
      let budget = 256;
      while (engine.clusterCount > 1 && budget-- > 0 && performance.now() < deadline) engine.step();
      if (engine.clusterCount > 1) queue(work);
      else {
        this.completeSnapshot = engine.snapshot();
        this.preparing = false;
        this.showComplete();
      }
    };
    const queue = callback => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(callback, { timeout: 200 });
      else setTimeout(callback, 0);
    };
    queue(work);
  }

  showComplete() {
    if (!this.completeSnapshot) return;
    this.pause();
    this.snapshot = this.completeSnapshot;
    this.showingComplete = true;
    this.updateControls();
    this.render();
  }

  beginReplay() {
    this.engine = new CCAEngine(this.configuration());
    this.showingComplete = false;
    this.accumulator = 0;
    this.refresh();
    this.start();
  }

  start() {
    if (this.engine.clusterCount <= 1) return;
    this.running = true;
    this.previousFrame = null;
    this.targetTime = this.engine.time;
    this.updateControls();
    this.schedule();
  }

  pause() {
    this.running = false;
    this.previousFrame = null;
    this.accumulator = 0;
    this.updateControls();
  }

  updateControls() {
    if (!this.engine) return;
    const ended = this.engine.clusterCount <= 1;
    if (this.geometry) {
      setText(this.element('play'), this.running ? 'Pause' : this.showingComplete || this.engine.attempts === 0 ? 'Replay' : 'Continue');
      this.element('play').disabled = this.preparing;
      this.element('finish').disabled = this.preparing || this.showingComplete;
      this.element('xray').setAttribute('aria-pressed', String(this.xrayAll));
      const side = this.engine.config.side;
      const particles = this.engine.particleCount;
      const state = this.preparing ? 'Preparing the complete tree.' : this.showingComplete ? `Complete tree: ${particles.toLocaleString()} particles joined by ${(particles - 1).toLocaleString()} bonds.` : this.running ? 'Replaying aggregation. Hover a cluster to reveal its bonds.' : 'Replay paused.';
      setText(this.element('status'), state);
      this.canvas.setAttribute('aria-label', `${this.showingComplete ? 'Completed merger tree' : 'Merger forest'} on a fully occupied ${side} by ${side} periodic lattice. Hover or tap a cluster to reveal its bonds. Press X or use X-ray all to reveal every tree.`);
    } else {
      setText(this.element('play'), this.running ? 'Pause' : this.engine.attempts ? 'Play' : 'Start');
      this.element('play').disabled = ended;
      setText(this.element('status'), this.engine.particleCount === 0 ? 'No particles in this sample. Increase initial occupancy to start.' : ended ? 'One cluster remains. Reset to start again.' : 'Each occupied site starts as a separate cluster. Opposite edges wrap around.');
    }
    this.element('play').setAttribute('aria-pressed', String(this.running));
  }

  schedule() {
    if (!this.frameRequested && this.running && this.active && !document.hidden) {
      this.frameRequested = true;
      requestAnimationFrame(now => this.frame(now));
    }
  }

  frame(now) {
    this.frameRequested = false;
    if (!this.running || !this.active || document.hidden) { this.previousFrame = null; return; }
    const elapsed = this.previousFrame === null ? 0 : Math.min(100, now - this.previousFrame);
    this.previousFrame = now;
    const previousAttempts = this.engine.attempts;
    const deadline = performance.now() + 8;
    if (this.geometry) {
      // Replay events at an adjustable rate; the model's event history is unchanged.
      this.accumulator = Math.min(300, this.accumulator + elapsed * 180 * Number(this.element('speed').value) / 1000);
      while (this.accumulator >= 1 && this.engine.clusterCount > 1 && performance.now() < deadline) {
        this.engine.step(); this.accumulator--;
      }
    } else {
      // Advance in physical model time: changing alpha changes visible waiting.
      this.targetTime = Math.min(this.engine.time + 1, this.targetTime + elapsed * 2.8 / 1000);
      while (this.engine.clusterCount > 1 && performance.now() < deadline) {
        if (this.engine.advanceTo(this.targetTime, { maxEvents: 100 }).reached) break;
      }
    }
    if (this.engine.clusterCount <= 1) {
      this.running = false;
      if (this.geometry) this.showingComplete = true;
      this.refresh();
    } else if (this.engine.attempts !== previousAttempts) this.refresh();
    this.schedule();
  }

  refresh() {
    this.snapshot = this.engine.snapshot();
    this.updateControls();
    this.render();
  }

  particleAt(pointer) {
    if (!pointer || !this.snapshot || !this.transform) return null;
    const { pad, scale, width } = this.transform;
    const x = Math.floor((pointer[0] * width - pad) / scale);
    const y = Math.floor((pointer[1] * width - pad) / scale);
    const side = this.snapshot.config.side;
    // Full occupancy fixes positions; labels follow the row-major initialization.
    return x >= 0 && y >= 0 && x < side && y < side ? y * side + x : null;
  }

  render() {
    const box = this.canvas.getBoundingClientRect();
    if (!box.width) return;
    const w = box.width, h = box.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(w * ratio) || this.canvas.height !== Math.round(h * ratio)) {
      this.canvas.width = Math.round(w * ratio); this.canvas.height = Math.round(h * ratio);
    }
    const ctx = this.context;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = css('--lab-canvas'); ctx.fillRect(0, 0, w, h);
    if (!this.snapshot) {
      ctx.fillStyle = css('--lab-muted'); ctx.font = `11px ${css('--lab-mono')}`; ctx.textAlign = 'center';
      ctx.fillText('Preparing the tree…', w / 2, h / 2);
      return;
    }
    const side = this.snapshot.config.side;
    const pad = 8;
    const scale = (w - 2 * pad) / side;
    this.transform = { pad, scale, width: w };
    const selectedId = this.geometry ? this.touchParticle ?? this.particleAt(this.pointer) : null;
    const selectedOwner = selectedId === null ? null : this.snapshot.owners[selectedId];
    const inspecting = this.xrayAll || selectedOwner !== null;
    const brightBond = css('--lab-bond');
    if (!this.geometry && side <= 64) {
      ctx.fillStyle = css('--lab-grid');
      for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) ctx.fillRect(pad + (x + .5) * scale - .5, pad + (y + .5) * scale - .5, 1, 1);
    }
    const gap = this.geometry ? Math.min(.6, scale * .06) : scale * .24;
    for (let id = 0; id < this.snapshot.particleCount; id++) {
      const [x, y] = this.snapshot.positions[id];
      const owner = this.snapshot.owners[id];
      ctx.fillStyle = clusterColour(owner);
      ctx.globalAlpha = this.geometry ? (this.xrayAll || owner === selectedOwner ? .035 : inspecting ? .07 : .82) : .94;
      ctx.fillRect(pad + x * scale + gap / 2, pad + y * scale + gap / 2, scale - gap, scale - gap);
    }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(pad, pad, side * scale, side * scale); ctx.clip();
    ctx.lineCap = 'round';
    for (const [a, b] of this.snapshot.bonds) {
      const owner = this.snapshot.owners[a];
      const highlighted = this.geometry && (this.xrayAll || owner === selectedOwner);
      const [ax, ay] = this.snapshot.positions[a], [bx, by] = this.snapshot.positions[b];
      let dx = bx - ax, dy = by - ay;
      if (dx > side / 2) dx -= side; if (dx < -side / 2) dx += side;
      if (dy > side / 2) dy -= side; if (dy < -side / 2) dy += side;
      const shiftsX = ax + dx < 0 ? [0, side] : ax + dx >= side ? [0, -side] : [0];
      const shiftsY = ay + dy < 0 ? [0, side] : ay + dy >= side ? [0, -side] : [0];
      ctx.strokeStyle = highlighted ? brightBond : clusterColour(owner);
      ctx.lineWidth = this.geometry ? Math.max(1.05, scale * (highlighted ? .20 : .15)) : Math.max(.8, scale * .13);
      ctx.globalAlpha = highlighted ? 1 : this.geometry && inspecting ? .33 : .92;
      for (const sx of shiftsX) for (const sy of shiftsY) {
        ctx.beginPath();
        ctx.moveTo(pad + (ax + .5 + sx) * scale, pad + (ay + .5 + sy) * scale);
        ctx.lineTo(pad + (ax + dx + .5 + sx) * scale, pad + (ay + dy + .5 + sy) * scale);
        ctx.stroke();
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
    if (!this.snapshot.particleCount) {
      ctx.fillStyle = css('--lab-muted'); ctx.textAlign = 'center'; ctx.font = `11px ${css('--lab-mono')}`;
      ctx.fillText('No particles in this sample', w / 2, h / 2);
    }
  }
}

const dynamics = new SimulationView('dynamics');
const geometry = new SimulationView('geometry', true);
const simulations = [dynamics, geometry];
const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab, focus = false) {
  tabs.forEach(item => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    $(item.dataset.panel).hidden = !active;
  });
  simulations.forEach(simulation => {
    simulation.active = tab.dataset.panel === `figure-${simulation.prefix}`;
    if (!simulation.active) simulation.pause(); else simulation.render();
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let target = null;
    if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') target = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') target = tabs[0];
    if (event.key === 'End') target = tabs[tabs.length - 1];
    if (target) { event.preventDefault(); activateTab(target, true); }
  });
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) simulations.forEach(simulation => simulation.pause());
});
// Retired ?view=moments links fall back to the simple model.
const requestedView = query.get('view') || location.hash.replace('#figure-', '');
activateTab(tabs.find(tab => tab.dataset.panel === `figure-${requestedView}`) || tabs[0]);

if (embedded && window.parent !== window) {
  let lastHeight = 0;
  const reportHeight = () => {
    const height = Math.ceil(root.getBoundingClientRect().height);
    if (height !== lastHeight) {
      lastHeight = height;
      window.parent.postMessage({ type: 'cca:resize', height }, location.origin);
    }
  };
  new ResizeObserver(reportHeight).observe(root);
  window.addEventListener('load', reportHeight);
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === window.parent && event.data?.type === 'cca:measure') {
      lastHeight = 0; reportHeight();
    }
  });
  reportHeight();
}
