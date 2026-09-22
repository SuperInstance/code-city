<div align="center">

# code-city — quilt substrate edition

**Your codebase as a living 3D city — now with the city running on a substrate you can watch.**

[![forked from](https://img.shields.io/badge/forked%20from-Manavarya09%2Fcode--city-blue)](https://github.com/Manavarya09/code-city)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![tests](https://img.shields.io/badge/tests-10%2F10%20node--test-brightgreen)](tests/quilt.test.mjs)

*Files become buildings, folders become districts, bugs become fires, deploys become rockets —
and every one of them is now a cell in a hash-chained ledger you can open with `Q`.*

</div>

---

## Play it

```bash
npx serve app -l 3333    # or: npm run dev
```

Type a repo (`owner/repo`) and fly. Try the fleet's own:

- **`SuperInstance/SuperInstance`** — the profile; the boat that builds itself
- **`SuperInstance/quilt-studio`** — the kernel's product face
- **`SuperInstance/kev-substrate-competition`** — where witness logs go to be believed
- **`SuperInstance/tidepool`** — the vector memory ocean

Click a building for its file's vitals. Scroll to zoom, drag to orbit,
`R` resets the camera, **press `Q` (or the ◈ button) to open the substrate.**

## The quilt backend (what this fork adds)

Upstream built the city. This fork runs it on the
[Cocapn Fleet](https://github.com/SuperInstance/SuperInstance)'s quilt kernel —
six opcodes, vendored minimal, zero dependencies:

| Game act | Cell |
|---|---|
| Building rises from a file | `BIND {kind: "building", path, loc, language}` |
| District from a folder | `BIND` + `LINK {kind: "containment"}` |
| Dependency drawn as a road | `LINK {kind: "dependency", from, to}` |
| Bug catches fire | `EFFECT {kind: "fire", ...}` |
| New file sparkles | `EFFECT {kind: "sparkle"}` |
| Rocket launch | `EFFECT {kind: "rocket"}` |
| Contributor agent spawns / walks / speaks | `BIND` / `LINK {kind: "walk-to"}` / `EFFECT {kind: "status"}` |
| Every 30th frame | `TICK {frame, fires, rockets, agents}` |
| History trimmed past 500 cells | `FORGET {dropped}` — dormancy is not costume either |

Every cell chains `prev_hash → cell_hash` (FNV-1a-64 over UTF-8 bytes, genesis
`0x0000000000000000`; the fleet canary `café Δ 日本語 → 0x24a555471370b18d`
verified numerically). The **◈ backend pane** streams the live tail, opcode
counters, chain length, and coherence. The **⤓ witness.jsonl** export emits
the chain in the exact shape consumed by
[`kev-substrate-competition`'s `harness/replay.py`](https://github.com/SuperInstance/kev-substrate-competition/blob/main/harness/replay.py)
— numbers without a chain are withdrawals, not submissions, and this toy
produces chains a referee can replay.

Full design notes: [QUILT-BACKEND.md](QUILT-BACKEND.md).

## Respect for the original

[Manavarya Singh](https://github.com/Manavarya09) built code-city, and this
fork treats that as load-bearing fact:

- `app/city.js`, `app/effects.js`, `app/agents.js`, `app/controls.js` are
  **byte-identical to upstream**. The bridge wraps them from outside at
  runtime; `app/index.html` gains eight clearly-marked lines.
- The creator credit on the landing page is guarded by a regression test.
- Upstream history and authorship are intact in git; the fork badge points home.
- The kernel is MIT and zero-dependency — if upstream wants the substrate,
  it's one PR.

## Tests & CI

```bash
npm test    # node --test, 10 tests, zero dependencies
```

Canary byte law, genesis chaining, tamper → coherence drop, honest `FORGET`,
witness field-for-field harness interop with replay verification, wrapper
fidelity (originals still run, order intact), tick cadence, creator-credit
guard. CI runs them on every push (upstream's pipeline shipped broken — no
lockfile vs `npm ci`, a `cache: npm` that required one, and an echo stub that
exited 2 — all fixed here).

## Ecosystem

- [`SuperInstance/SuperInstance`](https://github.com/SuperInstance/SuperInstance) — the profile; start there to wake up
- [`SuperInstance/quilt-studio`](https://github.com/SuperInstance/quilt-studio) — the kernel's product face
- [`SuperInstance/night-city`](../night-city) — the second city (Three.js easter-eggs)
- [`SuperInstance/synthcity`](../synthcity) — the third city (134 MB of procedural neon)
- [`SuperInstance/kev-substrate-competition`](https://github.com/SuperInstance/kev-substrate-competition) — the referee that replays this toy's witness exports

---

*Upstream README preserved for reference: [Manavarya09/code-city](https://github.com/Manavarya09/code-city#readme).*
