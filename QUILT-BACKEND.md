# Quilt Backend

The Cocapn Fleet fork adds a live substrate under the city: the
[quilt kernel](https://github.com/SuperInstance/quilt-studio) in its
5(+1)-opcode form — `BIND / LINK / EFFECT / VIEW / TICK (+ FORGET)` —
with every cell hash-chained (`prev_hash`, FNV-1a-64 over UTF-8 bytes,
genesis `0x0000000000000000`).

## What it does

- **Every game act becomes a cell.** Buildings and agents `BIND` into
  being; dependencies and agent walks are `LINK`s; fires, sparkles,
  rockets, and status changes are `EFFECT`s; the scene is a `VIEW`;
  every 30th frame is a `TICK` with aggregate counters. When the live
  tail grows past 500 cells, older history is trimmed — and the trim is
  recorded as a `FORGET` cell. Dormancy is not costume either.
- **Toggle the backend while playing.** Press `Q` (or the ◈ button,
  top right). A phosphor pane shows the live cell tail, per-opcode
  counters, chain length, local coherence, and the current chain head.
- **Export the witness.** The pane's `⤓ witness.jsonl` button downloads
  the full retained chain in the JSONL shape consumed by
  [`harness/replay.py`](https://github.com/SuperInstance/kev-substrate-competition/blob/main/harness/replay.py)
  — this toy is a witness-log producer for the kev competition's
  referee. Numbers without a chain are withdrawals, not submissions.

## Design constraints (how we treat the creators' work)

- `app/city.js`, `app/effects.js`, `app/agents.js`, `app/controls.js`
  are **byte-identical to upstream**. The bridge wraps their methods
  from outside at runtime; the only upstream file touched is
  `app/index.html` (imports + 8 lines, clearly marked).
- The fork keeps GitHub's "forked from Manavarya09/code-city"
  attribution, the MIT license, and the creator credit on the landing
  page. Original authorship is preserved in git history.
- The kernel is vendored minimal (`app/quilt/kernel.mjs`, ~120 lines,
  zero dependencies) so the toy never needs a build step. `npm test`
  runs the 10-test suite in `tests/` with plain `node --test`.

## Canary

`fnv1a64("café Δ 日本語") == 0x24a555471370b18d` — the fleet's pinned
vector, byte-hashed, compared numerically. (Some docs spell it with a
stray leading zero; 64-bit values have no leading zeros. Numeric
comparison is law.)
