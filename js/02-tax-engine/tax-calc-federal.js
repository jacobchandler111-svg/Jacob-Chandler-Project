// FILE: js/02-tax-engine/tax-calc-federal.js
// Federal ordinary income tax, LTCG (with stacking on top of ordinary income), and marginal-rate lookup. All year-parameterized.

function calculateTax(taxableIncome, filing, year) {
  year = year || getSelectedTaxYear();
  filing = filing || 'single';
  const brackets = getFederalBrackets(year, filing);
  let tax = 0, prev = 0;
  for (const [limit, rate] of brackets) {
    if (taxableIncome <= prev) break;
    tax += (Math.min(taxableIncome, limit) - prev) * rate;
    prev = limit;
  }
  return tax;
}

function calculateLtcgTax(ltcg, ordinaryIncome, filing, year) {
  year = year || getSelectedTaxYear();
  filing = filing || 'single';
  const rates = getLtcgRates(year, filing);
  let tax = 0, prev = 0;
  const total = ordinaryIncome + ltcg;
  for (const [limit, rate] of rates) {
    if (total <= prev || ordinaryIncome >= limit) { prev = limit; continue; }
    const start = Math.max(ordinaryIncome, prev);
    const end = Math.min(total, limit);
    if (end > start) tax += (end - start) * rate;
    prev = limit;
  }
  return tax;
}

function getMarginalRate(income, filing, year) {
  year = year || getSelectedTaxYear();
  filing = filing || 'single';
  const brackets = getFederalBrackets(year, filing);
  for (const [limit, rate] of brackets) {
    if (income <= limit) return rate;
  }
  return 0.37;
               }

