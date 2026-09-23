/**
 * Exact continuous-time cluster–cluster dynamics on a two-dimensional torus.
 * One rate m^-alpha clock per cluster; direction first, then uniform contact.
 * Stable particle IDs carry merger bonds through rigid translations.
 * Browser/Node ES module; no dependencies. See ../simulations.md.
 */

export const ENGINE_VERSION = '1.0.0';
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function seedWords(value) {
  const text = String(value);
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  const next = () => {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
  const words = [next(), next(), next(), next()];
  if (words.every(x => x === 0)) words[0] = 1;
  return words;
}

/** xoshiro128** with deterministic string-seed expansion; open unit interval. */
export function createRandom(seed) {
  let [a, b, c, d] = seedWords(seed);
  return () => {
    const v = Math.imul(b, 5);
    const result = Math.imul((v << 7 | v >>> 25), 9) >>> 0;
    const t = b << 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t;
    d = d << 11 | d >>> 21;
    return (result + 0.5) / 4294967296;
  };
}

class Fenwick {
  constructor(n) {
    this.n = n;
    this.values = new Float64Array(n);
    this.tree = new Float64Array(n + 1);
  }
  set(i, value) {
    const delta = value - this.values[i];
    this.values[i] = value;
    for (let j = i + 1; j <= this.n; j += j & -j) this.tree[j] += delta;
  }
  rebuild() {
    this.tree.fill(0);
    for (let i = 1; i <= this.n; i++) {
      this.tree[i] += this.values[i - 1];
      const j = i + (i & -i);
      if (j <= this.n) this.tree[j] += this.tree[i];
    }
  }
  get total() {
    let sum = 0;
    for (let j = this.n; j > 0; j -= j & -j) sum += this.tree[j];
    return sum;
  }
  sample(value) {
    let i = 0;
    let bit = 1;
    while (bit * 2 <= this.n) bit *= 2;
    for (; bit > 0; bit >>= 1) {
      const j = i + bit;
      if (j <= this.n && this.tree[j] <= value) {
        value -= this.tree[j];
        i = j;
      }
    }
    return Math.min(i, this.n - 1);
  }
}

function configuration(input = {}) {
  const config = { side: 40, occupancy: 0.35, alpha: 1, seed: 20260923, ...input };
  if (!Number.isInteger(config.side) || config.side < 3 || config.side > 4096) {
    throw new RangeError('Lattice side must be an integer from 3 to 4096.');
  }
  if (!Number.isFinite(config.occupancy) || config.occupancy < 0 || config.occupancy > 1) {
    throw new RangeError('Occupancy must be between zero and one.');
  }
  if (!Number.isFinite(config.alpha) || config.alpha < 0 || config.alpha > 8) {
    throw new RangeError('Alpha must be between zero and eight.');
  }
  config.seed = String(config.seed);
  return config;
}

export class CCAEngine {
  constructor(config = {}) { this.reset(config); }

  reset(input = this.config) {
    this.config = configuration(input);
    this._random = createRandom(this.config.seed);
    const { side, occupancy } = this.config;
    const positions = [];
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        if (occupancy === 1 || (occupancy > 0 && this._random() < occupancy)) positions.push([x, y]);
      }
    }
    this._initialize(positions, []);
    return this;
  }

  /** Deterministic finite-state initialization for scientific validation. */
  static fromState({ side, alpha = 1, seed = 1, positions, bonds = [] }) {
    if (!Array.isArray(positions)) throw new TypeError('positions must be an array');
    const result = Object.create(CCAEngine.prototype);
    result.config = configuration({ side, alpha, seed, occupancy: positions.length / (side * side) });
    result._random = createRandom(result.config.seed);
    result._initialize(positions, bonds);
    result.validate();
    return result;
  }

  _initialize(positions, bonds) {
    const n = positions.length;
    const L = this.config.side;
    this.particleCount = n;
    this.clusterCount = n;
    this.time = 0;
    this.attempts = 0;
    this.mergers = 0;
    this.translations = 0;
    this.nullAttempts = 0;
    this.lastEvent = null;
    this._nextTime = null;
    this._x = new Int32Array(n);
    this._y = new Int32Array(n);
    this._owner = new Int32Array(n);
    this._occupancy = new Int32Array(L * L).fill(-1);
    this._members = Array.from({ length: n }, (_, i) => [i]);
    this._adjacency = Array.from({ length: n }, () => []);
    this._bonds = [];
    this._rates = new Fenwick(n);
    this._momentSums = [n, n, n];
    this._largest = n ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const [x, y] = positions[i];
      if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= L || y >= L) {
        throw new RangeError('Particle coordinates must be lattice sites in the torus.');
      }
      if (this._occupancy[y * L + x] !== -1) throw new Error('Duplicate occupied site');
      this._x[i] = x; this._y[i] = y; this._owner[i] = i;
      this._occupancy[y * L + x] = i;
      this._rates.values[i] = 1;
    }
    this._rates.rebuild();
    for (const [a, b] of bonds) {
      this._checkParticle(a); this._checkParticle(b);
      if (this._distance(a, b) !== 1) throw new Error('Merger bond must join neighbouring sites');
      if (this._root(a) === this._root(b)) throw new Error('Initial bonds must form a forest');
      this._merge(a, b);
    }
    // Existing bonds are initial data, not new simulation events.
    this.mergers = 0;
    this._initialBondCount = this._bonds.length;
  }

  _checkParticle(id) {
    if (!Number.isInteger(id) || id < 0 || id >= this.particleCount) throw new RangeError('Invalid particle id');
  }

  _root(i) {
    let r = i;
    while (this._owner[r] !== r) r = this._owner[r];
    while (this._owner[i] !== i) {
      const next = this._owner[i]; this._owner[i] = r; i = next;
    }
    return r;
  }

  _distance(a, b) {
    const L = this.config.side;
    const dx = Math.abs(this._x[a] - this._x[b]);
    const dy = Math.abs(this._y[a] - this._y[b]);
    return Math.min(dx, L - dx) + Math.min(dy, L - dy);
  }

  _merge(a, b) {
    let r = this._root(a), s = this._root(b);
    if (r === s) throw new Error('Attempted internal merger');
    if (this._members[r].length < this._members[s].length) [r, s] = [s, r];
    const m = this._members[r].length, n = this._members[s].length;
    this._bonds.push([a, b]);
    this._adjacency[a].push(b); this._adjacency[b].push(a);
    this._owner[s] = r;
    for (const id of this._members[s]) this._members[r].push(id);
    this._members[s] = null;
    this._rates.set(s, 0);
    this._rates.set(r, (m + n) ** (-this.config.alpha));
    this.clusterCount--;
    this.mergers++;
    this._largest = Math.max(this._largest, m + n);
    for (let i = 0; i < 3; i++) this._momentSums[i] += (m + n) ** (i + 2) - m ** (i + 2) - n ** (i + 2);
    // Rebuild at geometric milestones to avoid cancellation in very small rates.
    if (this.clusterCount <= 16 || (this.clusterCount & (this.clusterCount - 1)) === 0) this._rates.rebuild();
    return r;
  }

  _schedule() {
    if (this._nextTime !== null) return this._nextTime;
    if (!this.particleCount) return Infinity;
    let total = this._rates.total;
    if (!(total > 0)) { this._rates.rebuild(); total = this._rates.total; }
    if (!(total > 0)) throw new Error('Positive clusters have no positive attempt rate');
    const wait = -Math.log(this._random()) / total;
    this._nextTime = this.time + wait;
    if (!Number.isFinite(this._nextTime)) throw new Error('Simulation clock exceeded numerical range');
    return this._nextTime;
  }

  step() {
    if (!this.particleCount) return { kind: 'empty', time: this.time, source: null, target: null, direction: [0, 0], bond: null, sourceMass: 0 };
    this.time = this._schedule();
    this._nextTime = null;
    const source = this._rates.sample(this._random() * this._rates.total);
    const members = this._members[source];
    if (!members?.length) throw new Error('Numerical rate selection chose an inactive cluster');
    const sourceMass = members.length;
    const [dx, dy] = DIRECTIONS[Math.floor(this._random() * 4)];
    const L = this.config.side;
    let count = 0, contactA = -1, contactB = -1;
    for (const id of members) {
      const x = (this._x[id] + dx + L) % L;
      const y = (this._y[id] + dy + L) % L;
      const other = this._occupancy[y * L + x];
      if (other >= 0 && this._root(other) !== source) {
        count++;
        // Reservoir sampling is uniform over contacts, not distinct target clusters.
        if (this._random() * count < 1) { contactA = id; contactB = other; }
      }
    }
    this.attempts++;
    const event = { kind: null, time: this.time, source, target: null, direction: [dx, dy], bond: null, sourceMass, contacts: count };
    if (count > 0) {
      event.kind = 'merge';
      event.target = this._root(contactB);
      event.bond = [contactA, contactB];
      event.result = this._merge(contactA, contactB);
    } else {
      // Clear old occupancy together: own overlap is allowed during rigid motion.
      let changesSites = false;
      for (const id of members) {
        const x = (this._x[id] + dx + L) % L, y = (this._y[id] + dy + L) % L;
        if (this._occupancy[y * L + x] < 0) changesSites = true;
      }
      if (changesSites) {
        for (const id of members) this._occupancy[this._y[id] * L + this._x[id]] = -1;
        for (const id of members) {
          this._x[id] = (this._x[id] + dx + L) % L;
          this._y[id] = (this._y[id] + dy + L) % L;
          this._occupancy[this._y[id] * L + this._x[id]] = id;
        }
      }
      // Finite-torus convention: self-invariant wrapping translations are null,
      // with labels/bonds retained. No finite cluster in Z² has this issue.
      event.kind = changesSites ? 'move' : 'null';
      if (changesSites) this.translations++; else this.nullAttempts++;
    }
    this.lastEvent = event;
    return event;
  }

  /** Advance at fixed physical times without discarding an already drawn wait. */
  advanceTo(targetTime, { maxEvents = Infinity } = {}) {
    if (!Number.isFinite(targetTime) || targetTime < this.time) throw new RangeError('Observation time must be finite and nondecreasing');
    if (!(maxEvents >= 0)) throw new RangeError('maxEvents must be nonnegative');
    let events = 0;
    while (this._schedule() <= targetTime && events < maxEvents) { this.step(); events++; }
    const reached = this._schedule() > targetTime;
    if (reached) this.time = targetTime;
    return { reached, events, time: this.time };
  }

  observables() {
    const n = this.particleCount;
    const moments = n ? this._momentSums.map(x => x / n) : [null, null, null];
    const a = this.config.alpha;
    const logScale = a > 0 ? Math.log1p(a * this.time) / a : this.time;
    return {
      time: this.time, clusters: this.clusterCount, particles: n,
      countMeanMass: n ? n / this.clusterCount : null,
      siteMoments: moments,
      normalizedMoments: moments.map((m, i) => m === null ? null : m * Math.exp(-(i + 1) * logScale)),
      largestMass: this._largest, largestFraction: n ? this._largest / n : null,
      attempts: this.attempts, mergers: this.mergers
    };
  }

  snapshot() {
    return {
      engineVersion: ENGINE_VERSION, config: { ...this.config }, time: this.time,
      particleCount: this.particleCount, clusterCount: this.clusterCount,
      attempts: this.attempts, mergers: this.mergers, translations: this.translations, nullAttempts: this.nullAttempts,
      positions: Array.from({ length: this.particleCount }, (_, i) => [this._x[i], this._y[i]]),
      owners: Array.from({ length: this.particleCount }, (_, i) => this._root(i)),
      bonds: this._bonds.map(pair => [...pair]),
      clusters: this._members.flatMap((list, id) => list ? [{ id, mass: list.length }] : []),
      lastEvent: this.lastEvent ? { ...this.lastEvent, direction: [...this.lastEvent.direction], bond: this.lastEvent.bond ? [...this.lastEvent.bond] : null } : null,
      observables: this.observables()
    };
  }

  pathBetween(a, b) {
    this._checkParticle(a); this._checkParticle(b);
    const latticeDistance = this._distance(a, b);
    if (this._root(a) !== this._root(b)) return { connected: false, path: [], treeDistance: null, latticeDistance };
    const parent = new Int32Array(this.particleCount).fill(-1);
    const queue = [a]; parent[a] = a;
    for (let i = 0; i < queue.length && parent[b] === -1; i++) {
      const u = queue[i];
      for (const v of this._adjacency[u]) if (parent[v] === -1) { parent[v] = u; queue.push(v); }
    }
    if (parent[b] === -1) throw new Error('Cluster membership disagrees with merger tree');
    const path = [b];
    while (path[path.length - 1] !== a) path.push(parent[path[path.length - 1]]);
    path.reverse();
    return { connected: true, path, treeDistance: path.length - 1, latticeDistance };
  }

  validate() {
    const n = this.particleCount, L = this.config.side;
    if (this._bonds.length !== n - this.clusterCount) throw new Error('Forest edge count failed');
    const counts = new Map();
    const occupied = new Set();
    for (let i = 0; i < n; i++) {
      const site = this._y[i] * L + this._x[i];
      if (occupied.has(site) || this._occupancy[site] !== i) throw new Error('Occupancy/position mismatch');
      occupied.add(site);
      const root = this._root(i);
      counts.set(root, (counts.get(root) || 0) + 1);
    }
    if (counts.size !== this.clusterCount) throw new Error('Cluster count failed');
    let totalRate = 0;
    const sums = [0, 0, 0];
    for (let r = 0; r < n; r++) {
      const list = this._members[r];
      if (list) {
        if (counts.get(r) !== list.length || new Set(list).size !== list.length || list.some(i => this._root(i) !== r)) throw new Error('Cluster members failed');
        const rate = list.length ** (-this.config.alpha);
        if (Math.abs(this._rates.values[r] - rate) > 1e-12 * rate) throw new Error('Cluster rate failed');
        totalRate += rate;
        for (let k = 0; k < 3; k++) sums[k] += list.length ** (k + 2);
      } else if (this._rates.values[r] !== 0) throw new Error('Inactive cluster has a positive rate');
    }
    if (Math.abs(totalRate - this._rates.total) > 1e-8 * Math.max(totalRate, 1e-12)) throw new Error('Total attempt rate failed');
    for (let k = 0; k < 3; k++) if (Math.abs(sums[k] - this._momentSums[k]) > 1e-10 * Math.max(sums[k], 1)) throw new Error('Moment sum failed');
    const parent = Int32Array.from({ length: n }, (_, i) => i);
    const root = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    for (const [a, b] of this._bonds) {
      if (this._distance(a, b) !== 1 || this._root(a) !== this._root(b)) throw new Error('Invalid geometric merger bond');
      const ra = root(a), rb = root(b);
      if (ra === rb) throw new Error('Cycle in merger graph');
      parent[ra] = rb;
    }
    return true;
  }
}
