// Adapted from the sampling and infection routines in Outburst-Growth-Simulation.
export class OutburstModel {
  constructor({ alpha = 3, maxRadius = 24, rng = Math.random,
    maxSites = 25000, maxEvents = 100000, maxExtent = 400 } = {}) {
    if (!(alpha > 1) || !Number.isFinite(alpha)) throw new RangeError('alpha must be finite and greater than 1');
    if (!Number.isInteger(maxRadius) || maxRadius < 1) throw new RangeError('maxRadius must be a positive integer');
    this.alpha = alpha;
    this.maxRadius = maxRadius;
    this.rng = rng;
    this.limits = { maxSites, maxEvents, maxExtent };
    this.radiusCdf = [];
    this.radiusRate = 0;
    for (let radius = 1; radius <= maxRadius; radius++) {
      this.radiusRate += radius ** -alpha;
      this.radiusCdf.push(this.radiusRate);
    }
    this.reset();
  }

  reset() {
    this.infected = new Set(['0,0']);
    this.points = [[0, 0]];
    this.time = 0;
    this.events = 0;
    this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    this.lastBurst = null;
    this.stopped = '';
  }

  chooseRadius() {
    const target = this.rng() * this.radiusRate;
    let low = 0;
    let high = this.radiusCdf.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (target < this.radiusCdf[middle]) high = middle;
      else low = middle + 1;
    }
    return low + 1;
  }

  step() {
    if (this.stopped) return null;
    if (this.events >= this.limits.maxEvents) {
      this.stopped = 'Event limit reached. Reset to start a new sample.';
      return null;
    }
    // Every infected site remains an eligible center, including interior sites.
    const totalRate = this.points.length * this.radiusRate;
    const delay = -Math.log1p(-this.rng()) / totalRate;
    const center = this.points[Math.floor(this.rng() * this.points.length)];
    const radius = this.chooseRadius();
    const [cx, cy] = center;
    const adds = [];
    for (let dy = -radius; dy <= radius; dy++) {
      const span = radius - Math.abs(dy);
      for (let dx = -span; dx <= span; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (!this.infected.has(`${x},${y}`)) adds.push([x, y]);
      }
    }
    if (this.points.length + adds.length > this.limits.maxSites ||
      adds.some(([x, y]) => Math.max(Math.abs(x), Math.abs(y)) > this.limits.maxExtent)) {
      this.stopped = 'Display limit reached. Paused before the next outburst; reset for a new sample.';
      return null;
    }
    for (const [x, y] of adds) {
      this.infected.add(`${x},${y}`);
      this.points.push([x, y]);
      this.bounds.minX = Math.min(this.bounds.minX, x);
      this.bounds.maxX = Math.max(this.bounds.maxX, x);
      this.bounds.minY = Math.min(this.bounds.minY, y);
      this.bounds.maxY = Math.max(this.bounds.maxY, y);
    }
    // Null outbursts still count and advance model time.
    this.time += delay;
    this.events++;
    this.lastBurst = { center, radius, adds, delay };
    return this.lastBurst;
  }
}
