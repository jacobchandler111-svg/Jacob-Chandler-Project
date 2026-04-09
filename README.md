# Brookhaven Tax Strategy Planning Engine - 2026

A comprehensive tax strategy recommendation platform built with Python (Flask) and HTML/JavaScript. Designed for tax professionals to help clients identify and optimize their tax planning strategies.

## Features

### Page 1: Strategy Selector
- **Yes/No toggle questions** across 8 categories: Income, Business, Investments, Real Estate, Retirement, Charitable, Family, and Special Situations
- Real-time strategy matching as questions are answered
- Progress bar tracking completion
- Maps client responses to 130+ tax strategies

### Page 2: Client Financial Inputs
- **Hard input fields** for income, capital gains, real estate, business details, deductions, and family information
- **Document upload zones** for W-2s, bank statements, and investment statements
- Auto-populate fields from uploaded documents (requires OCR backend)
- Filing status, entity type, and state selection

### Page 3: Strategy Summary
- **Matched strategy recommendations** grouped by category
- Estimated tax savings calculations
- Complexity scoring
- PDF export functionality

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Python 3.11+, Flask
- **Data:** JSON strategy database with trigger-based matching
- **Tax Engine:** 2026 IRS brackets, LTCG rates, SE tax, NIIT calculations

## Project Structure
\`\`\`
Brookhaven-Tax--Project/
├── app.py                  # Flask backend & tax calculation engine
├── requirements.txt        # Python dependencies
├── data/
│   └── strategies.json     # 130+ tax strategies database
├── templates/
│   └── index.html          # Main 3-page frontend
├── static/
│   └── app.js              # Frontend JavaScript logic
└── README.md
\`\`\`

## Quick Start
\`\`\`bash
# Clone the repo
git clone https://github.com/jacobchandler111-svg/Brookhaven-Tax--Project.git
cd Brookhaven-Tax--Project

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py

# Open browser to http://localhost:5000
\`\`\`

## Tax Strategy Categories
- Capital Gains Deferral (1031 Exchange, Deferred Sales Trust, CRT, etc.)
- Business Tax Planning (Accountable Plan, Augusta Rule, Vehicle Usage, etc.)
- Retirement Planning (Backdoor Roth, Mega Backdoor, DB Plans, etc.)
- Depreciation (Cost Segregation, Accelerated Depreciation, etc.)
- Charitable Planning (DAF, Charitable LLC, Gift Financing, etc.)
- Entity Planning (S-Corp, C-Corp, Partnership analysis)
- Income Shifting (Captive Insurance, Hiring Kids, COVUL, etc.)
- Education Planning (529, Education Credits, Sec 127)
- Estate Planning (FLP, Estate Tax, Gifting Strategies)
- Investment Tax Planning (Loss Harvesting, Crypto, NIIT, etc.)
- OBBBA Updates (New 2026 legislation provisions)

## Brooklyn Strategy Benchmarks
Includes investment performance data across multiple portfolio constructions:
- Long-Only, 130/30, 145/45, 200/100, 250/150, 325/225
- Delphi Class A & B fund allocations
- Helix TA fund data
- 10-year performance projections with fee structures
