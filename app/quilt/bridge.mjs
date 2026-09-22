// bridge.mjs — QuiltBridge: the city speaks quilt without its files being
// touched. Every game act is wrapped from OUTSIDE; the creators' modules
// stay byte-identical. Toggle the pane and you watch the substrate run
// while you play: every fire, walk, rocket, and frame as chain cells.

import { Kernel } from './kernel.mjs';

export class QuiltBridge {
  constructor(city, effects, agents, data, { convId, tickEvery = 30, keep = 500 } = {}) {
    this.kernel = new Kernel(convId || `code-city:${data?.fullName || 'unknown'}`);
    this.city = city;
    this.effects = effects;
    this.agents = agents;
    this.data = data;
    this.tickEvery = tickEvery;
    this.keep = keep;
    this.frame = 0;
    this.listeners = new Set();
  }

  onCell(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #announce(cell) { for (const fn of this.listeners) fn(cell); }

  #emit(op, payload) {
    const cell = this.kernel.emit(op, payload);
    this.#announce(cell);
    return cell;
  }

  ingestCity() {
    const k = this.kernel;
    this.#emit('VIEW', { scene: 'sunset-metropolis', city_size: 250 });
    for (const b of this.city.buildings) {
      const m = b.data.metrics || {};
      this.#emit('BIND', {
        kind: 'building', path: b.data.path, loc: m.loc || 1,
        language: m.language || 'unknown', height: +b.height.toFixed(2),
      });
    }
    for (const dep of (this.data.dependencies || [])) {
      this.#emit('LINK', { kind: 'dependency', from: dep.from, to: dep.to });
    }
    this.#emit('TICK', { phase: 'city-built', buildings: this.city.buildings.length });
    return k.cells.length;
  }

  wrap() {
    const fx = this.effects;
    const ag = this.agents;

    fx.addFire = ((orig) => (x, y, z, intensity = 1) => {
      this.#emit('EFFECT', { kind: 'fire', at: [+x.toFixed(1), +y.toFixed(1), +z.toFixed(1)], intensity });
      return orig.call(fx, x, y, z, intensity);
    })(fx.addFire.bind(fx));

    fx.addSparkle = ((orig) => (x, y, z) => {
      this.#emit('EFFECT', { kind: 'sparkle', at: [+x.toFixed(1), +y.toFixed(1), +z.toFixed(1)] });
      return orig.call(fx, x, y, z);
    })(fx.addSparkle.bind(fx));

    fx.launchRocket = ((orig) => (x, z) => {
      this.#emit('EFFECT', { kind: 'rocket', at: [+x.toFixed(1), 0, +z.toFixed(1)] });
      return orig.call(fx, x, z);
    })(fx.launchRocket.bind(fx));

    ag.setTarget = ((orig) => (agent, filePath) => {
      if (agent.target?.path !== filePath) {
        this.#emit('LINK', { kind: 'walk-to', agent: agent.name || agent.id, file: filePath });
      }
      return orig.call(ag, agent, filePath);
    })(ag.setTarget.bind(ag));

    ag.createAgent = ((orig) => (id, name, targetFile) => {
      const agent = orig.call(ag, id, name, targetFile);
      this.#emit('BIND', { kind: 'agent', name: agent.name || `agent-${id}` });
      return agent;
    })(ag.createAgent.bind(ag));

    ag.setStatus = ((orig) => (agentId, text) => {
      this.#emit('EFFECT', { kind: 'status', agent: agentId, text: String(text).slice(0, 40) });
      return orig.call(ag, agentId, text);
    })(ag.setStatus.bind(ag));

    return this;
  }

  tick() {
    this.frame++;
    if (this.frame % this.tickEvery !== 0) return null;
    const cell = this.#emit('TICK', {
      frame: this.frame,
      fires: this.effects.fires.length,
      rockets: this.effects.rockets.filter(r => r.alive).length,
      agents: this.agents.agents.length,
    });
    this.kernel.forget(this.keep);
    return cell;
  }

  stats() {
    return {
      frames: this.frame,
      cells: this.kernel.cells.length,
      coherence: +this.kernel.coherence().toFixed(4),
      counters: this.kernel.counters(),
      head: this.kernel.lastHash.slice(0, 12),
    };
  }
}
