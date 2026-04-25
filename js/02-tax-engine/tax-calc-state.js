// FILE: js/02-tax-engine/tax-calc-state.js
// State income tax (bracketed) + WA capital-gains tax (flat above threshold). Year-parameterized.

function calculateStateTax(taxableIncome, stateCode, year, filing) {
  if (!TAX_DATA || !stateCode || stateCode === '' || stateCode === 'none') return 0;
  year = year || getSelectedTaxYear();
  filing = filing || 'single';
  const stateYearData = TAX_DATA.state[year];
  if (!stateYearData) return 0;
  const stateData = stateYearData[stateCode];
  if (!stateData || stateData.noIncomeTax) return 0;
  const brackets = stateData.brackets ? (stateData.brackets[filing] || stateData.brackets.single) : null;
  if (!brackets || brackets.length === 0) return 0;
  const stateSD = stateData.standardDeduction ? (stateData.standardDeduction[filing] || stateData.standardDeduction.single || 0) : 0;
  const stateTaxable = Math.max(0, taxableIncome - stateSD);
  let tax = 0, prev = 0;
  for (const [limit, rate] of brackets) {
    if (stateTaxable <= prev) break;
    tax += (Math.min(stateTaxable, limit) - prev) * rate;
    prev = limit;
  }
  if (stateData.mentalHealthSurcharge && taxableIncome > stateData.mentalHealthSurcharge.threshold) {
    tax += (taxableIncome - stateData.mentalHealthSurcharge.threshold) * stateData.mentalHealthSurcharge.rate;
  }
  if (stateData.millionaireSurcharge && taxableIncome > stateData.millionaireSurcharge.threshold) {
    tax += (taxableIncome - stateData.millionaireSurcharge.threshold) * stateData.millionaireSurcharge.rate;
  }
  return tax;
}

function calculateWaCapGainsTax(ltGains, stateCode, year) {
  if (stateCode !== 'WA' || !TAX_DATA) return 0;
  year = year || getSelectedTaxYear();
  const stateYearData = TAX_DATA.state[year];
  if (!stateYearData || !stateYearData.WA || !stateYearData.WA.capitalGainsTax) return 0;
  const cgt = stateYearData.WA.capitalGainsTax;
  if (ltGains > cgt.threshold) { return (ltGains - cgt.threshold) * cgt.rate; }
  return 0;
}

