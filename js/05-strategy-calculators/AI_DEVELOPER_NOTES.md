# AI Developer Notes — Strategy Calculators

This file is for an AI assistant (or any new developer) about to make changes to the strategy-calculator layer or anything downstream of it. It is not a list of TODOs. It is context to load before reasoning about the code.

---

## What this folder is

`js/05-strategy-calculators/` is the per-category math layer. Every file here exports global functions that take a normalized `inputs` object and a `baseline` tax result, and return a savings dollar amount (or zero if the strategy doesn't apply). The orchestrator dispatches by category.

The folder loads after the tax engine and solver but before the UI layer. That ordering is load-bearing — see below.

---

## Script load order (don't reshuffle without thought)

The full order is in `index.html`. Within this folder specifically:

1. `limits.js` — must load first. Every `calc-*.js` reads phase-out thresholds, contribution caps, and AGI limits from it.
2. `calc-retirement.js`, `calc-business.js`, `calc-charitable.js`, `calc-credits.js`, `calc-capital-gains.js`, `calc-investment.js`, `calc-entity.js`, `calc-estate.js`, `calc-misc.js` — order among these doesn't matter; they don't call each other.
3. `orchestrator.js` — must load last. It references every `calc-*` function by name.

Globally, the order across folders is 01-brooklyn → 02-tax-engine → 03-solver → 05-strategy-calculators → 04-ui. The UI layer is last because it touches every primitive below it.

---

## Module conventions

- Every file declares functions on the global `window` namespace. There is no module system, no bundler, no import/export. Adding ES modules would break the load order and the way functions reference each other.
- Function names are unique across the whole codebase. If you're tempted to name a new helper `calculate()` or `getValue()`, prefix it with the strategy or category it belongs to.
- No file in this folder should touch the DOM. Read `inputs`, return a number. UI rendering happens in `js/04-ui/calculate-and-display.js`.
- No file in this folder should mutate `inputs` or `baseline`. Treat them as read-only.

---

## Known quirks

### Duplicate getMarginalRate

`getMarginalRate(income, filingStatus, year)` is defined in two places:

- `js/02-tax-engine/tax-calc-federal.js` (canonical)
- `js/05-strategy-calculators/limits.js` (legacy duplicate)

Because `limits.js` loads after `tax-calc-federal.js`, the `limits.js` version wins at runtime. Both definitions return the same value for any realistic income, so this is a code-smell rather than a bug. If you find yourself touching either copy, dedupe both into the federal one and delete the limits.js copy in the same commit.

### R² character encoding

Comments in `js/01-brooklyn/brooklyn-data.js` use the literal Unicode `²` (U+00B2). Older copies of this file had mojibake `Â²`. If you regenerate or paste from another tool, double-check the encoding stays clean.

### Optimizer enrolment gap

Delphi and Helix funds exist in `js/01-brooklyn/delphi-helix.js` and have full math, but the solver in `js/03-solver/solver.js` does not currently enrol them. Brooklyn is enrolled. This is intentional pending a product decision — do not "fix" it without confirming with the project owner first.

### Sentinel for Infinity

`taxBrackets.json` uses `999999999` instead of `Infinity` because JSON has no infinity literal. `tax-loader.js` converts the sentinel to `Number.POSITIVE_INFINITY` at load. If you add new top-bracket entries, use the sentinel.

### Inline onclick handlers

Six `<button onclick="...">` handlers still live in `index.html` (Reset, Print, page-nav buttons). Migrating them to `addEventListener` in `page-controls.js` is fine but isn't urgent. If you do migrate, keep the same function names so Reset/Print continue to work from the console.

### Duplicated constants

Approximately fifteen small constants (filing-status strings, year strings, a couple of IRS limits) appear in more than one file. They are kept in sync manually. If you change one, grep for the literal value across the whole repo before committing.

---

## Validation commands

The site has no test framework. Validation is done via browser-console regression. The standard procedure:

1. Open `https://jacobchandler111-svg.github.io/Jacob-Chandler-Project/` (or the local server).
2. Paste a Mulberry32 PRNG harness that fills all 26 inputs from a seeded RNG.
3. Run N iterations (50 for spot-check, 1000 for a full pass).
4. Aggregate the per-iteration result hashes into a single hash and compare against the baseline.

The current baseline aggregate hash for 1000 iterations is `eb244545 f84e9294 cc89c097 900113ae 91d46b92 2d2f0e93 1efe62fc b55744da`. The seed-42 single-iteration hash is `fa841cea2ffd60cd…`.

If your change is meant to alter outputs, the hash will change — that's fine. Re-baseline by recording the new hash here and in the commit message.

If your change is meant to be a pure refactor and the hash changes, stop and find the bug.

---

## Don't-touch zones

- `data/taxBrackets.json` — bracket numbers come from IRS publications and state revenue departments. Do not "round" or "tidy" them.
- `data/strategies.json` savings ranges — these are calibrated against real client outcomes. Reformat freely; do not adjust the numbers.
- `js/03-solver/solver.js` ranking weights — calibrated. Add new strategies without changing the weights.
- The optimizer enrolment list (mentioned above) — do not add Delphi/Helix to it without product approval.
- The questionnaire wording in `js/04-ui/questions-data.js` — slated for a separate client-targeting rework. Don't pre-empt it.

---

## How a typical change flows

1. Identify the file(s) you'll touch. If it's more than two files, stop and reconsider — most changes here should be small.
2. Make the change locally or in the GitHub web editor.
3. Run the seed-42 single-iteration check first. If the hash matches expectation, proceed.
4. Run the 50-iteration spot-check. If clean, commit.
5. After commit, wait for Pages redeploy (usually under 60 seconds), then run the 1000-iteration full pass against production.
6. Record results in the commit message.

---

## What this folder is not

- Not a place for I/O. No `fetch`, no `localStorage`, no DOM.
- Not a place for new categories without updating the orchestrator and the UI render layer.
- Not a place for catch-all utility functions. Those go in `js/04-ui/format-helpers.js` if UI-related, or in the relevant tax-engine file if math-related.

---

## Related reading

- `/README.md` — project overview, full file map.
- `/strategy-implementation-notes.md` — strategy-by-strategy implementation status and tax-law references.
- `js/02-tax-engine/tax-calc-federal.js` — canonical `getMarginalRate`, AMT, NIIT, SE tax math.
- `js/03-solver/solver.js` — strategy ranking algorithm.
