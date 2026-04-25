# Brookhaven Tax Strategy Planning Engine — 2025 / 2026

A client-side tax strategy recommendation and calculation platform built with HTML, CSS, and vanilla JavaScript. Designed for tax professionals at Brookhaven to help clients identify optimal tax planning strategies, compute federal and state tax liabilities, and model the impact of various strategies on their overall tax position.

Deployed via GitHub Pages.

---

## Overview

The engine walks a tax professional through three pages:

1. **Strategy Selector** — Yes/No toggle questions across eight categories that narrow a universe of 50+ tax strategies down to only those relevant to the client.
2. **Client Financial Inputs** — Hard-number fields for income, capital gains, real estate, business details, deductions, and family information, plus filing status, entity type, state, and tax year.
3. **Strategy Summary** — Matched strategy recommendations grouped by category with estimated tax savings, complexity scores, and a federal vs. state tax breakdown.

All calculations run entirely in the browser. No backend server is required once the static files are served.

---

## Key Features

- **Multi-year tax brackets** — Toggle between 2025 and 2026 federal IRS brackets (loaded dynamically from `data/taxBrackets.json`).
- **All 50 states + DC** — State income tax brackets for every U.S. state and the District of Columbia, with year-aware lookups for 2025 and 2026.
- **Brooklyn Strategy Engine** — Linear interpolation and time-weighted regression across six portfolio constructions (Long-Only through 325/225 leverage) with Delphi and Helix fund data.
- **Solver Framework** — Iterative solver that models pre- and post-strategy tax positions and computes estimated savings.
- **Strategy Database** — JSON-driven strategy catalog with trigger-based matching, complexity scoring, and category grouping.
- **No backend required** — Pure HTML/CSS/JS; deploy anywhere that serves static files (GitHub Pages, S3, Netlify, etc.).

---

## Project Structure

```
Jacob-Chandler-Project/
├── data/
│   ├── strategies.json                # Tax strategy catalog (triggers, questions, categories)
│   └── taxBrackets.json               # Federal + state brackets for 2025 and 2026
├── css/
│   └── styles.css                     # Extracted styles (currently still inlined in index.html; cutover pending)
├── js/
│   ├── 01-brooklyn/                   # Brooklyn portfolio data, regression, fund data, date helpers
│   │   ├── brooklyn-data.js
│   │   ├── date-utils.js
│   │   ├── delphi-helix.js
│   │   └── brooklyn-regression.js
│   ├── 02-tax-engine/                 # Federal + state tax calculation pipeline
│   │   ├── tax-data.js
│   │   ├── tax-loader.js
│   │   ├── tax-lookups.js
│   │   ├── tax-calc-federal.js
│   │   ├── tax-calc-state.js
│   │   └── tax-baseline.js
│   ├── 03-solver/                     # Fee model and iterative savings solver
│   │   ├── fees.js
│   │   └── solver.js
│   ├── 05-strategy-calculators/       # Per-strategy estimators + orchestrator
│   │   ├── limits.js
│   │   ├── calc-retirement.js
│   │   ├── calc-business.js
│   │   ├── calc-charitable.js
│   │   ├── calc-credits.js
│   │   ├── calc-capital-gains.js
│   │   ├── calc-investment.js
│   │   ├── calc-entity.js
│   │   ├── calc-estate.js
│   │   ├── calc-misc.js
│   │   └── orchestrator.js
│   └── 04-ui/                         # Questionnaire, rendering, page controls (loaded last)
│       ├── questions-data.js
│       ├── format-helpers.js
│       ├── questionnaire-builder.js
│       ├── questionnaire-render.js
│       ├── answer-state.js
│       ├── progress-and-brooklyn-ui.js
│       ├── inputs-collector.js
│       ├── calculate-and-display.js
│       └── page-controls.js
├── app.js                             # Pre-refactor monolith (kept on disk pending deep audit; not loaded by index.html)
├── index.html                         # Three-page frontend; loads the 32 modular scripts in dependency order
└── README.md
```

### Module Sections

| Folder | Role |
|--------|------|
| **01-brooklyn** | Portfolio constructions, Delphi/Helix fund data, linear interpolation, and time-weighted return calculations. |
| **02-tax-engine** | Loads `taxBrackets.json`, exposes `getFederalBrackets(year)` and `getStateBrackets(state, year)`, computes baseline and post-strategy federal + state tax. Handles LTCG rates, SE tax, NIIT, and standard/itemized deduction logic. Engine functions are year-parameterized for future multi-year projections. |
| **03-solver** | Fee model and iterative engine that pairs each matched strategy with the client's financials to estimate dollar savings. |
| **05-strategy-calculators** | Per-strategy estimators (retirement, business, charitable, credits, capital gains, investment, entity, estate, misc) plus a `limits.js` helper and an `orchestrator.js` that runs them. |
| **04-ui** | DOM wiring for the three-page flow, question rendering, progress bar, navigation, and results display. Reads `tax_year` and `state` from the form to drive year-aware and state-aware calculations. Loaded last so it can call into the engines. |

### Script Load Order

Scripts in `index.html` are loaded in the following dependency order:

1. `js/01-brooklyn/*` (data and regression helpers)
2. `js/02-tax-engine/*` (data → loader → lookups → federal calc → state calc → baseline)
3. `js/03-solver/*` (fees → solver)
4. `js/05-strategy-calculators/*` (limits → all calc-* → orchestrator last)
5. `js/04-ui/*` (questions-data → format-helpers → builders → render → state → progress → collector → calculate-and-display → page-controls last; `page-controls.js` wires `DOMContentLoaded`)

> Note: `app.js` is intentionally retained on disk for line-by-line audit but is no longer referenced by `index.html`.
### data/strategies.json Schema

Each strategy object follows this shape:

```jsonc
{
  "id": 1,
  "name": "1031 Exchange on Real Estate (Like Kind Exchange)",
  "type": "Business - Other",
  "applicable_to": "Both",          // "Individual", "Business", or "Both"
  "complexity": "High",             // "Low", "Medium", or "High"
  "recurring": "Never",             // "Never", "Yearly", "Quarterly", etc.
  "tags": ["Real Estate Strategies"],
  "deadline": "12/31",
  "last_updated": "04/01/2026",
  "triggers": [
    "long_term_capital_gains",
    "real_estate_sale",
    "investment_property"
  ],
  "questions": [
    "Do you own investment real estate you plan to sell?",
    "Are you looking to defer capital gains from a property sale?"
  ],
  "category": "Capital Gains Deferral"
}
```

### data/taxBrackets.json Structure

```jsonc
{
  "federal": {
    "2025": {
      "single": [ { "min": 0, "max": 11925, "rate": 0.10 }, ... ],
      "married_filing_jointly": [ ... ],
      "head_of_household": [ ... ],
      "married_filing_separately": [ ... ]
    },
    "2026": { ... }
  },
  "state": {
    "CA": {
      "2025": [ { "min": 0, "max": 10412, "rate": 0.01 }, ... ],
      "2026": [ ... ]
    },
    "TX": {
      "2025": [ { "min": 0, "max": 999999999, "rate": 0.0 } ],
      ...
    }
    // ... all 50 states + DC
  }
}
```

States with no income tax (TX, FL, NV, WY, SD, AK, WA, NH, TN) have a single bracket with a 0% rate. The sentinel value `999999999` is used in place of `Infinity` (which JSON does not support) and is converted at load time in `app.js`.

---

## Getting Started

Because there is no backend, you can run the app by opening `index.html` directly in a browser or by serving the repo with any static file server.

```bash
# Clone
git clone https://github.com/jacobchandler111-svg/Jacob-Chandler-Project.git
cd Jacob-Chandler-Project

# Option A — open directly
open index.html        # macOS
start index.html       # Windows

# Option B — lightweight local server (Python)
python -m http.server 8000
# then visit http://localhost:8000

# Option C — GitHub Pages
# The repo is already configured for Pages deployment on the main branch.
```

---

## Tax Strategy Categories

The strategy database covers the following categories:

Capital Gains Deferral, Business Tax Planning, Retirement Planning, Depreciation, Charitable Planning, Entity Planning, Income Shifting, Education Planning, Estate Planning, Investment Tax Planning, and OBBBA Updates (2026 legislation provisions).

---

## Brooklyn Strategy Benchmarks

The Brooklyn Strategy Engine models investment performance across multiple portfolio leverage constructions: Long-Only, 130/30, 145/45, 200/100, 250/150, and 325/225. It includes Delphi Class A and B fund allocations, Helix TA fund data, and 10-year performance projections with fee structures. The engine uses linear interpolation between data points and time-weighted regression to produce expected return and loss-rate estimates for each construction.

---

## Adding a New Strategy — Prompt Template

Use the prompt below when asking an AI assistant (e.g., Claude) to add a new strategy to the project. Copy the template, fill in the bracketed fields with the details of the strategy you want to add, and paste the completed prompt into the chat.

```
I need you to add a new tax strategy to my Brookhaven Tax Strategy Planning Engine.

Repository: https://github.com/jacobchandler111-svg/Jacob-Chandler-Project
Branch: main

Here are the details for the new strategy:

STRATEGY NAME: [Full name of the strategy, e.g., "Qualified Small Business Stock (Section 1202)"]
TYPE: [Category type, e.g., "Business - Other", "Investment", "Depreciation", "Fringe Benefit", etc.]
APPLICABLE TO: [Who can use it — "Individual", "Business", or "Both"]
COMPLEXITY: [How complex to implement — "Low", "Medium", or "High"]
RECURRING: [How often it can be applied — "Never", "Yearly", "Quarterly", etc.]
TAGS: [Any tags, e.g., "Real Estate Strategies", "OBBBA", etc. Leave blank if none]
DEADLINE: [Key deadline, e.g., "12/31", "04/15", "09/15"]
TRIGGERS: [What client answers should cause this strategy to surface — list the trigger keys, e.g., "business_owner", "capital_gains", "real_estate_sale"]
QUESTIONS: [The Yes/No screening questions to show in Page 1, e.g., "Do you own shares in a qualified small business?", "Have you held QSBS for more than 5 years?"]
CATEGORY: [Which grouping this falls under, e.g., "Capital Gains Deferral", "Business Tax Planning", "Retirement Planning", "Entity Planning", etc.]
DESCRIPTION / NOTES: [Any additional context about how the strategy works, savings estimates, or special rules to be aware of]

Please:
1. Add the strategy entry to data/strategies.json with the next available ID.
2. If there are any new trigger keys that don't already exist in the questionnaire in app.js (Section 4), add the corresponding Yes/No question(s) to the appropriate category.
3. If the strategy requires a new category that doesn't exist yet, add it to both the strategies.json and the UI rendering logic in app.js.
4. Commit the changes to main with a clear commit message.
```

---

## Future Work

- Add additional tax years as IRS publishes new brackets (the data structure supports arbitrary years).
- Verify and update 2026 state bracket projections once official rates are published.
- Expand strategy database as new legislation or planning techniques emerge.
- Build OCR backend for document upload auto-population on Page 2.
- PDF export of strategy summary results.

---

## License

Private project — Brookhaven internal use.
