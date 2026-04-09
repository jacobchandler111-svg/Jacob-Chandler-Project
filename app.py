"""
Brookhaven Tax Strategy Planner - Flask Backend
================================================
This is the Python backend for the Brookhaven Tax Strategy Planning Engine.
It provides:
  - Strategy data API
  - Tax calculation engine
  - Document parsing (W-2, bank statements, investment statements)
  - PDF export functionality

To run:
  pip install -r requirements.txt
  python app.py
"""

from flask import Flask, render_template, jsonify, request, send_file
import json
import os

app = Flask(__name__)

# ============ LOAD STRATEGIES DATA ============
def load_strategies():
    """Load tax strategies from JSON data file."""
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'strategies.json')
    try:
        with open(data_path, 'r') as f:
            data = json.load(f)
        return data.get('strategies', [])
    except FileNotFoundError:
        print(f"Warning: {data_path} not found. Using empty strategies list.")
        return []

STRATEGIES = load_strategies()

# ============ 2026 TAX BRACKETS ============
TAX_BRACKETS_2026 = {
    "single": [
        (11600, 0.10), (47150, 0.12), (100525, 0.22),
        (191950, 0.24), (243725, 0.32), (609350, 0.35), (float('inf'), 0.37)
    ],
    "married_joint": [
        (23200, 0.10), (94300, 0.12), (201050, 0.22),
        (383900, 0.24), (487450, 0.32), (731200, 0.35), (float('inf'), 0.37)
    ],
    "married_separate": [
        (11600, 0.10), (47150, 0.12), (100525, 0.22),
        (191950, 0.24), (243725, 0.32), (365600, 0.35), (float('inf'), 0.37)
    ],
    "head_household": [
        (16550, 0.10), (63100, 0.12), (100500, 0.22),
        (191950, 0.24), (243700, 0.32), (609350, 0.35), (float('inf'), 0.37)
    ]
}

STANDARD_DEDUCTION_2026 = {
    "single": 15000,
    "married_joint": 30000,
    "married_separate": 15000,
    "head_household": 22500
}

LTCG_RATES = {
    "single": [(47025, 0), (518900, 0.15), (float('inf'), 0.20)],
    "married_joint": [(94050, 0), (583750, 0.15), (float('inf'), 0.20)]
}

# ============ ROUTES ============
@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')

@app.route('/api/strategies')
def get_strategies():
    """Return all tax strategies as JSON."""
    return jsonify({"strategies": STRATEGIES})

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """
    Calculate tax savings based on client inputs and matched strategies.
    Expects JSON body with: answers, inputs, matched_ids
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    inputs = data.get('inputs', {})
    matched_ids = data.get('matched_ids', [])

    # Parse income values
    w2 = float(inputs.get('w2_wages', 0) or 0)
    se = float(inputs.get('se_income', 0) or 0)
    biz = float(inputs.get('biz_revenue', 0) or 0)
    rental = float(inputs.get('rental_income', 0) or 0)
    dividends = float(inputs.get('dividend_income', 0) or 0)
    st_gains = float(inputs.get('st_gains', 0) or 0)
    lt_gains = float(inputs.get('lt_gains', 0) or 0)

    total_ordinary = w2 + se + biz + rental + dividends + st_gains
    total_income = total_ordinary + lt_gains

    # Parse filing status
    filing_raw = inputs.get('filing_status', 'Single')
    filing_map = {
        'Single': 'single',
        'Married Filing Jointly': 'married_joint',
        'Married Filing Separately': 'married_separate',
        'Head of Household': 'head_household'
    }
    filing = filing_map.get(filing_raw, 'single')

    # Calculate baseline tax
    std_deduction = STANDARD_DEDUCTION_2026.get(filing, 15000)
    taxable_ordinary = max(0, total_ordinary - std_deduction)
    baseline_tax = calculate_tax(taxable_ordinary, filing)

    # Add LTCG tax
    ltcg_tax = calculate_ltcg_tax(lt_gains, taxable_ordinary, filing)
    baseline_tax += ltcg_tax

    # Add SE tax if applicable
    se_tax = se * 0.9235 * 0.153 if se > 0 else 0
    baseline_tax += se_tax

    # Add NIIT if applicable (3.8% on investment income above threshold)
    niit_threshold = 200000 if filing == 'single' else 250000
    if total_income > niit_threshold:
        investment_income = dividends + lt_gains + st_gains + rental
        niit = min(investment_income, total_income - niit_threshold) * 0.038
        baseline_tax += niit

    # Estimate savings from matched strategies
    matched = [s for s in STRATEGIES if s.get('id') in matched_ids]
    estimated_savings = estimate_strategy_savings(
        matched, inputs, total_income, baseline_tax, filing
    )

    return jsonify({
        "baseline_tax": round(baseline_tax),
        "estimated_savings": round(estimated_savings),
        "effective_rate": round(baseline_tax / total_income * 100, 1) if total_income > 0 else 0,
        "new_effective_rate": round((baseline_tax - estimated_savings) / total_income * 100, 1) if total_income > 0 else 0,
        "total_income": round(total_income),
        "strategies_applied": len(matched)
    })

def calculate_tax(taxable_income, filing='single'):
    """Calculate federal income tax based on 2026 brackets."""
    brackets = TAX_BRACKETS_2026.get(filing, TAX_BRACKETS_2026['single'])
    tax = 0
    prev_limit = 0
    for limit, rate in brackets:
        if taxable_income <= prev_limit:
            break
        taxable_in_bracket = min(taxable_income, limit) - prev_limit
        tax += taxable_in_bracket * rate
        prev_limit = limit
    return tax

def calculate_ltcg_tax(ltcg, ordinary_income, filing='single'):
    """Calculate long-term capital gains tax."""
    rates = LTCG_RATES.get(filing, LTCG_RATES['single'])
    tax = 0
    prev_limit = 0
    total = ordinary_income + ltcg
    for limit, rate in rates:
        if total <= prev_limit or ordinary_income >= limit:
            prev_limit = limit
            continue
        start = max(ordinary_income, prev_limit)
        end = min(total, limit)
        if end > start:
            tax += (end - start) * rate
        prev_limit = limit
    return tax

def estimate_strategy_savings(strategies, inputs, total_income, baseline_tax, filing):
    """
    Estimate total tax savings from matched strategies.
    This is a simplified estimation engine. Each strategy type has
    different savings calculations.
    """
    savings = 0
    biz_revenue = float(inputs.get('biz_revenue', 0) or 0)
    lt_gains = float(inputs.get('lt_gains', 0) or 0)
    charitable = float(inputs.get('charitable', 0) or 0)
    salt = float(inputs.get('salt', 0) or 0)
    retirement = float(inputs.get('retirement_contrib', 0) or 0)

    marginal_rate = get_marginal_rate(total_income, filing)

    for s in strategies:
        stype = s.get('type', '')
        complexity = s.get('complexity', 'Medium')

        if stype == 'Retirement':
            # Retirement strategies save at marginal rate
            max_contrib = 23500 if total_income < 500000 else 69000
            potential = min(max_contrib, total_income * 0.10)
            savings += potential * marginal_rate

        elif stype == 'Depreciation':
            # Depreciation saves based on property/equipment values
            prop_val = float(inputs.get('property_values', 0) or 0)
            savings += min(prop_val * 0.05, total_income * 0.15) * marginal_rate

        elif stype in ('Cap Gains', 'Business Sale'):
            # Capital gains strategies
            savings += lt_gains * 0.05  # Conservative 5% reduction estimate

        elif stype in ('Itemized Ded',):
            # Itemized deduction optimization
            savings += min(charitable + salt, total_income * 0.10) * marginal_rate * 0.3

        elif stype == 'Self-Employment Tax':
            # Entity optimization for SE tax savings
            se = float(inputs.get('se_income', 0) or 0)
            savings += se * 0.0765 * 0.5  # Save half of SE tax

        elif stype == 'Income Shifting':
            # Income shifting strategies
            savings += total_income * 0.02 * marginal_rate

        elif stype in ('C Corp', 'Passthrough'):
            # Entity-specific savings
            savings += biz_revenue * 0.03 * marginal_rate

        elif stype == 'Credit/Payment':
            # Tax credits (direct dollar-for-dollar)
            savings += min(5000, baseline_tax * 0.05)

        elif stype == 'Fringe Benefit':
            savings += min(10000, biz_revenue * 0.02) * marginal_rate

        else:
            # General business/personal strategies
            savings += total_income * 0.01 * marginal_rate

    return min(savings, baseline_tax * 0.60)  # Cap at 60% of baseline tax

def get_marginal_rate(income, filing='single'):
    """Get the marginal tax rate for a given income level."""
    brackets = TAX_BRACKETS_2026.get(filing, TAX_BRACKETS_2026['single'])
    for limit, rate in brackets:
        if income <= limit:
            return rate
    return 0.37

@app.route('/api/parse-document', methods=['POST'])
def parse_document():
    """
    Parse uploaded financial documents (W-2, bank statements, etc.)
    and extract relevant financial data.

    In production, this would use OCR (Tesseract) and PDF parsing.
    For now, returns a placeholder response.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    filename = file.filename.lower()

    # Placeholder: In production, implement actual document parsing
    # using libraries like: pytesseract, pdfplumber, tabula-py
    fields = {}

    if 'w2' in filename or 'w-2' in filename or '1099' in filename:
        fields = {
            "w2_wages": "0",
            "_message": "W-2/1099 parsing requires OCR setup. Please enter values manually."
        }
    elif 'bank' in filename:
        fields = {
            "_message": "Bank statement parsing requires OCR setup. Please enter values manually."
        }
    elif 'invest' in filename or 'brokerage' in filename:
        fields = {
            "_message": "Investment statement parsing requires OCR setup. Please enter values manually."
        }

    return jsonify({"fields": fields, "filename": file.filename})

@app.route('/api/export', methods=['POST'])
def export_report():
    """
    Generate a PDF report of the tax strategy recommendations.
    Requires: reportlab or weasyprint
    """
    data = request.get_json()
    # Placeholder: Generate PDF report
    # In production, use reportlab or weasyprint to create PDF
    return jsonify({
        "message": "PDF export requires reportlab. Install with: pip install reportlab",
        "strategies_count": len(data.get('strategies', []))
    })

# ============ MAIN ============
if __name__ == '__main__':
    print("=" * 60)
    print("Brookhaven Tax Strategy Planner")
    print(f"Loaded {len(STRATEGIES)} tax strategies")
    print("Server starting at http://localhost:5000")
    print("=" * 60)
    app.run(debug=True, port=5000)
