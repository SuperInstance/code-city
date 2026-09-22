// kernel.mjs — the quilt 5-opcode kernel, vendored minimal for code-city.
//
// BIND   entity comes into being (building, district, agent)
// LINK   relationship between bound entities (containment, dependency, walk-to)
// EFFECT something happens to an entity (fire, sparkle, rocket, status)
// VIEW   the scene is (re)presented
// TICK   time advances; aggregate counters flow
// FORGET history is trimmed honestly — dormancy is not costume either.
//
// Cells chain via prev_hash (FNV-1a-64 over UTF-8 BYTES, format 016x,
// genesis 0x0000000000000000). Numeric comparison is law; the docs'
// 17-hex-digit canary spelling carries a stray leading zero.
//
// witness() emits the JSONL cell shape consumed by kev-substrate-
// competition's harness/replay.py — this toy is a witness-log producer.
// state_json carries {op, payload} verbatim; answers_json is "[]".

export const OPS = Object.freeze(['BIND', 'LINK', 'EFFECT', 'VIEW', 'TICK', 'FORGET']);

export const GENESIS_PREV_HASH = '0x' + '0'.repeat(16);

export function fnv1a64(str) {
  // UTF-8 BYTES, not code points — the fleet canary is a byte hash.
  const bytes = new TextEncoder().encode(str);
  let h = 0xcbf29ce484222325n;
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h;
}

export function hash16(str) {
  return '0x' + fnv1a64(str).toString(16).padStart(16, '0');
}

export const CANARY_VEC = 'café Δ 日本語';
export const CANARY_EXPECTED = 0x24a555471370b18dn; // BigInt — numeric law, never string-compare

export function canaryOk() {
  return fnv1a64(CANARY_VEC) === BigInt(CANARY_EXPECTED);
}

let CELL_SEQ = 0;

export class Kernel {
  constructor(convId = 'city') {
    this.convId = convId;
    this.cells = [];          // full history (the pane tails the tail)
    this.lastHash = GENESIS_PREV_HASH;
    this.tickCount = 0;
    this.trimmed = 0;
  }

  emit(op, payload = {}) {
    if (!OPS.includes(op)) throw new Error(`unknown opcode: ${op}`);
    this.tickCount++;
    const cell = {
      conv_id: this.convId,
      cell_id: `cell-${CELL_SEQ++}`,
      tick: this.tickCount,
      op,
      payload,
      prev_hash: this.lastHash,
    };
    cell.cell_hash = hash16(
      cell.cell_id + JSON.stringify({ op, payload }) + '[]' + cell.prev_hash
    );
    this.cells.push(cell);
    this.lastHash = cell.cell_hash;
    return cell;
  }

  forget(keep = 500) {
    // Trim history, but say so in the chain — honest dormancy.
    if (this.cells.length <= keep) return null;
    const dropped = this.cells.splice(0, this.cells.length - keep);
    this.trimmed += dropped.length;
    return this.emit('FORGET', { dropped: dropped.length, trimmed_total: this.trimmed });
  }

  counters() {
    const c = {};
    for (const cell of this.cells) c[cell.op] = (c[cell.op] || 0) + 1;
    return c;
  }

  coherence() {
    // Local re-verification of the retained window. Not a substitute for
    // harness/replay.py — the harness replays the exported witness.
    let last = GENESIS_PREV_HASH;
    let verified = 0;
    for (const cell of this.cells) {
      const recomputed = hash16(
        cell.cell_id + JSON.stringify({ op: cell.op, payload: cell.payload }) +
        '[]' + cell.prev_hash
      );
      if (cell.prev_hash !== last || recomputed !== cell.cell_hash) break;
      verified++;
      last = cell.cell_hash;
    }
    return this.cells.length ? verified / this.cells.length : 1;
  }

  witness() {
    // kev harness JSONL shape: verbatim serialized strings, metrics ride
    // inside the chain or the submission withdraws (F5).
    return this.cells.map(c => ({
      conv_id: c.conv_id,
      cell_id: c.cell_id,
      tick: c.tick,
      state_json: JSON.stringify({ op: c.op, payload: c.payload }),
      answers_json: '[]',
      prev_hash: c.prev_hash,
      cell_hash: c.cell_hash,
    }));
  }

  witnessJsonl() {
    return this.witness().map(c => JSON.stringify(c)).join('\n') + '\n';
  }
}
