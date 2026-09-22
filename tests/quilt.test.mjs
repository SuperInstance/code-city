// tests/quilt.test.mjs — node --test, zero dependencies.
// The kernel, the bridge wrappers, and harness-format interop.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { Kernel, fnv1a64, hash16, canaryOk, CANARY_VEC, GENESIS_PREV_HASH } from '../app/quilt/kernel.mjs';
import { QuiltBridge } from '../app/quilt/bridge.mjs';

test('canary: byte hash, numeric law', () => {
  assert.equal(canaryOk(), true);
  assert.equal(fnv1a64(CANARY_VEC), 0x24a555471370b18dn);
  assert.equal(hash16(CANARY_VEC), '0x24a555471370b18d');
});

test('genesis prev_hash chains to real cells', () => {
  const k = new Kernel('t');
  const c0 = k.emit('BIND', { kind: 'building', path: 'a.js' });
  assert.equal(c0.prev_hash, GENESIS_PREV_HASH);
  const c1 = k.emit('EFFECT', { kind: 'fire' });
  assert.equal(c1.prev_hash, c0.cell_hash);
  assert.equal(k.cells.length, 2);
});

test('unknown opcode rejected', () => {
  const k = new Kernel('t');
  assert.throws(() => k.emit('HYPOTHESIZE', {}), /unknown opcode/);
});

test('local coherence is 1.0 on an unbroken chain', () => {
  const k = new Kernel('t');
  for (let i = 0; i < 10; i++) k.emit('TICK', { frame: i });
  assert.equal(k.coherence(), 1);
});

test('coherence drops at the first tampered cell', () => {
  const k = new Kernel('t');
  const cells = [];
  for (let i = 0; i < 5; i++) cells.push(k.emit('BIND', { i }));
  k.cells[2].payload = { i: 999, forged: true };
  assert.ok(k.coherence() < 1);
  assert.equal(k.coherence(), 2 / 5);
});

test('FORGET is emitted honestly, counters stay right', () => {
  const k = new Kernel('t');
  for (let i = 0; i < 10; i++) k.emit('TICK', { i });
  const f = k.forget(5);
  assert.equal(f.op, 'FORGET');
  assert.equal(k.cells.length, 6); // 5 kept + the FORGET cell
  assert.equal(k.counters().FORGET, 1);
});

test('witness export matches harness replay field-for-field', () => {
  const k = new Kernel('code-city:demo');
  k.emit('BIND', { kind: 'building', path: 'src/x.js', loc: 42 });
  k.emit('LINK', { kind: 'dependency', from: 'a', to: 'b' });
  const w = k.witness();
  assert.equal(w.length, 2);
  for (const cell of w) {
    for (const key of ['conv_id', 'cell_id', 'tick', 'state_json',
                       'answers_json', 'prev_hash', 'cell_hash']) {
      assert.ok(key in cell, `witness cell missing ${key}`);
    }
    assert.equal(cell.answers_json, '[]');
    const body = JSON.parse(cell.state_json);
    assert.ok('op' in body && 'payload' in body);
  }
  // replay-verify: hashes recompute from verbatim strings
  let last = GENESIS_PREV_HASH;
  for (const cell of w) {
    assert.equal(cell.prev_hash, last);
    const recomputed = hash16(cell.cell_id + cell.state_json + cell.answers_json + cell.prev_hash);
    assert.equal(recomputed, cell.cell_hash);
    last = cell.cell_hash;
  }
});

function fakeCity() {
  const calls = [];
  const city = { buildings: [
    { data: { path: 'src/a.js', metrics: { loc: 120, language: 'javascript' } }, height: 12.345 },
    { data: { path: 'src/b.py', metrics: { loc: 60, language: 'python' } }, height: 6.1 },
  ]};
  const effects = {
    fires: [], rockets: [], sparkles: [],
    addFire(x, y, z, i = 1) { calls.push(['fire', x, y, z, i]); },
    addSparkle(x, y, z) { calls.push(['sparkle', x, y, z]); },
    launchRocket(x, z) { calls.push(['rocket', x, z]); },
  };
  const agents = {
    agents: [],
    createAgent(id, name) { const a = { id, name, target: null }; this.agents.push(a); return a; },
    setTarget(agent, p) { agent.target = { path: p }; calls.push(['walk', p]); },
    setStatus(id, t) { calls.push(['status', id, t]); },
  };
  return { calls, city, effects, agents };
}

test('bridge wraps every game act without touching the originals', () => {
  const { calls, city, effects, agents } = fakeCity();
  const data = { fullName: 'demo/repo', dependencies: [{ from: 'src/a.js', to: 'src/b.py' }] };
  const bridge = new QuiltBridge(city, effects, agents, data, { keep: 1000 }).wrap();

  const seen = [];
  bridge.onCell(c => seen.push(c.op));

  bridge.ingestCity();
  effects.addFire(1, 2, 3, 1.5);
  effects.addSparkle(4, 5, 6);
  effects.launchRocket(7, 8);
  const ag = agents.createAgent(0, 'ada');
  agents.setTarget(ag, 'src/a.js');
  agents.setStatus(0, 'reviewing');
  bridge.tick(); // frame 1 < tickEvery, no-op

  assert.equal(calls.length, 5);            // originals still ran, order intact
  const ops = seen.join(' ');
  assert.ok(ops.includes('BIND') && ops.includes('LINK') &&
            ops.includes('EFFECT') && ops.includes('VIEW') && ops.includes('TICK'));
  assert.equal(seen.filter(o => o === 'BIND').length, 3); // 2 buildings + 1 agent
  assert.equal(seen.filter(o => o === 'LINK').length, 2); // dependency + walk-to
  assert.equal(seen.filter(o => o === 'EFFECT').length, 4); // fire + sparkle + rocket + status
});

test('bridge emits aggregate TICK on the cadence', () => {
  const { city, effects, agents } = fakeCity();
  const bridge = new QuiltBridge(city, effects, agents, {}, { tickEvery: 3, keep: 1000 }).wrap();
  bridge.ingestCity();
  assert.equal(bridge.tick(), null); // frame 1
  assert.equal(bridge.tick(), null); // frame 2
  const cell = bridge.tick();        // frame 3
  assert.equal(cell.op, 'TICK');
  assert.equal(cell.payload.frame, 3);
});

test('README credits survive the fork (nod to the creator)', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(/Manavarya/i.test(readme), 'creator credit must stay visible');
});
