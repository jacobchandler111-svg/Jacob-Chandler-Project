# Brookhaven Tax Strategy Planning Engine — 2025 / 2026

A client-side tax strategy recommendation and calculation platform built with HTML, CSS, and vanilla JavaScript. Designed for tax professionals at Brookhaven to help clients identify optimal tax planning strategies, compute federal and state tax liabilities, and model the impact of various strategies on their overall tax position.

Deployed via GitHub Pages.

---

## Overview

The engine walks a tax professional through three pages:

1. **Strategy Selector** — Yes/No toggle questions across eight categories that narrow a universe of 50+ tax strategies down to only those relevant to the client.
2. **Client Financial Inputs** — Hard-number fields for income, capital gains, real estate, business details, deductions, and family information, plus filing status, entity type, state, and tax year.
3. **Strategy Summary** — Matched strategy recommendations grouped by category with estimated tax savings, complexity scores, and a federal vs. state breakdown. Includes the Brookhaven optimizer (Brooklyn / Delphi / Helix capital-loss harvesting) when triggered.

Everything runs in the browser. No server, no database, no build step.

---

## Key Features

- **2025 and 2026 tax brackets** for federal plus all 50 states (single, MFJ, MFS, HoH).
- **Federal AMT, NIIT, Additional Medicare, and self-employment tax** modeling.
- **State tax engine** with bracket-aware deduction handling.
- **Brookhaven optimizer** for capital-loss harvesting (Brooklyn / Delphi / Helix funds) with regression-based loss projection.
- **Strategy solver** that ranks strategies by federal + state savings, complexity, and prerequisite filtering.
- **Modular architecture** — 32 small JavaScript files organized into five numbered subsystems for low cognitive load and minimal merge conflicts.

---

## Project Structure

```
Jacob-Chandler-Project/
├── index.html                              # Single-page entry, loads 32 scripts in order
├── README.md                               # This file
├── strategy-implementation-notes.md        # Strategy-by-strategy implementation status & math notes
│
├── css/
│   └── styles.css                          # All visual styling (extracted from inline)
│
├── data/
│   ├── strategies.json                     # 50+ tax strategy definitions, savings ranges, prerequisites
│   └── taxBrackets.json                    # Federal + 50-state brackets for 2025 and 2026
│
└── js/
    ├── 01-brooklyn/                        # Brookhaven optimizer fund data and date utilities
    │   ├── brooklyn-data.js                # Brooklyn fund constants, regression coefficients
    │   ├── date-utils.js                   # Year/quarter helpers used across optimizer
    │   ├── delphi-helix.js                 # Delphi & Helix fund profiles
    │   └── brooklyn-regression.js          # Loss projection regression
    │
    ├── 02-tax-engine/                      # Pure tax-math primitives (no UI, no DOM)
    │   ├── tax-data.js                     # In-memory caches of bracket JSON
    │   ├── tax-loader.js                   # Async JSON fetcher
    │   ├── tax-lookups.js                  # State / filing-status lookups
    │   ├── tax-calc-federal.js             # Federal liability + AMT + NIIT + SE tax
    │   ├── tax-calc-state.js               # State liability with deduction handling
    │   └── tax-baseline.js                 # Pre-strategy baseline calculator
    │
    ├── 03-solver/                          # Strategy ranking & fee modeling
    │   ├── fees.js                         # Strategy implementation fee estimates
    │   └── solver.js                       # Filter / rank / select strategies
    │
    ├── 04-ui/                              # All DOM-touching code
    │   ├── questions-data.js               # Yes/No question definitions
    │   ├── format-helpers.js               # Currency / percent formatting
    │   ├── questionnaire-builder.js        # Builds question DOM structure
    │   ├── questionnaire-render.js         # Renders questions and handles toggles
    │   ├── answer-state.js                 # Persists answers across pages
    │   ├── progress-and-brooklyn-ui.js     # Progress bar + optimizer UI
    │   ├── inputs-collector.js             # Reads client financial inputs from form
    │   ├── calculate-and-display.js        # Main calculate handler + summary render
    │   └── page-controls.js                # Page navigation, Reset, Print
    │
    └── 05-strategy-calculators/            # Per-category strategy savings calculators
        ├── limits.js                       # Income limits, phase-outs, contribution caps
        ├── calc-retirement.js              # 401(k), IRA, SEP, defined-benefit
        ├── calc-business.js                # QBI, accountable plan, augusta rule, etc.
        ├── calc-charitable.js              # DAF, CRT, bunching, conservation easement
        ├── calc-credits.js                 # R&D, energy, WOTC, child & dependent
        ├── calc-capital-gains.js           # Brooklyn / Delphi / Helix / 1031 / QOZ
        ├── calc-investment.js              # OZ funds, oil & gas, MLPs
        ├── calc-entity.js                  # S-corp election, holding co structures
        ├── calc-estate.js                  # SLAT, GRAT, ILIT, gifting
        ├── calc-misc.js                    # Catch-all strategies not in other categories
        └── orchestrator.js                 # Dispatches per-category calculators
```

### Script Load Order

Subsystems load in numeric order (01 → 02 → 03 → 05 → 04). The reason 04-ui loads last is that it depends on every primitive, lookup, and calculator below it. Within `05-strategy-calculators/`, `limits.js` loads first so every `calc-*.js` can read phase-out thresholds.

### data/strategies.json Schema

Each strategy entry includes:

```json
{
  "id": 12,
  "name": "Solo 401(k)",
  "category": "Retirement Planning",
  "savingsLow": 5000,
  "savingsHigh": 25000,
  "complexity": 2,
  "triggers": ["self_employed", "no_employees"],
  "prerequisites": ["business_income > 0"],
  "notes": "..."
}
```

### data/taxBrackets.json Structure

Federal and 50 states, each with brackets for 2025 and 2026 across all four filing statuses (single, mfj, mfs, hoh). States with no income tax (TX, FL, NV, WY, SD, AK, WA, NH, TN) have a single bracket with a 0% rate. The sentinel value `999999999` is used in place of `Infinity` (which JSON does not support) and is converted at load time inside `js/02-tax-engine/tax-loader.js`.

---

## Getting Started

```
# Clone
git clone https://github.com/jacobchandler111-svg/Jacob-Chandler-Project.git
cd Jacob-Chandler-Project

# Option A — open directly
open index.html

# Option B — lightweight local server (Python)
python3 -m http.server 8000
# then visit http://localhost:8000

# Option C — GitHub Pages
# The repo is already configured for Pages deployment on the main branch.
```

---

## Tax Strategy Categories

1. Retirement Planning
2. Business / Self-Employment
3. Charitable Giving
4. Tax Credits
5. Capital Gains Management
6. Investment Strategies
7. Entity Structuring
8. Estate Planning

A ninth informal bucket, "Misc," catches strategies that don't cleanly fit elsewhere.

---

## Brooklyn Strategy Benchmarks

Brooklyn-fund losses are projected via a regression on historical fund returns (see `js/01-brooklyn/brooklyn-regression.js`). Delphi and Helix follow simpler ordinary-income offset models (`js/01-brooklyn/delphi-helix.js`).

---

## Adding a New Strategy — Prompt Template

When asking an AI assistant to add a strategy:

1. Append the strategy entry to `data/strategies.json` with id, name, category, savings range, complexity, triggers, prerequisites, and notes.
2. If there are any new trigger keys that don't already exist in the questionnaire, add the corresponding Yes/No question(s) in `js/04-ui/questions-data.js` under the appropriate category.
3. If the strategy requires a new category that doesn't exist yet, add it to both `data/strategies.json` and the UI rendering logic in `js/04-ui/questionnaire-render.js` and `js/04-ui/calculate-and-display.js`.
4. Add the savings calculator function to the appropriate `js/05-strategy-calculators/calc-*.js` file (or create a new one and register it in the orchestrator).
5. Test with a manual scenario, then run the seed-based regression harness on the live site.

---

## Architecture History

The codebase was originally a single `app.js` monolith. In April 2026 it was modularized into the 32-file structure documented above:

- All 110 functions extracted into the appropriate subsystem.
- Byte-identical parity validated via a 1000-iteration Mulberry32 Monte Carlo against the pre-refactor build (aggregate hash `eb244545…b55744da`).
- Four targeted manual scenarios (single SE-heavy, MFJ retiree, MFS, HoH) confirmed identical to the cent.
- The original `app.js` was deleted from the repo in commit `9eba1e6f` once parity was confirmed.

For developers (human or AI) working on the strategy calculators, see `js/05-strategy-calculators/AI_DEVELOPER_NOTES.md` for load-order rules, known quirks, and don't-touch zones.

---

## Future Work

- Multi-year projections (calculations rolling forward across years).
- Client-facing questionnaire reskin (more outcome-focused phrasing).
- Optimizer enrolment integration so Delphi / Helix funds participate in solver ranking.
- Per-strategy what-if comparison view.

---

## License

Proprietary — internal Brookhaven use only.
