// FILE: js/02-tax-engine/tax-baseline.js
// computeBaselineTax (no strategies) and computeTaxAfterStrategies (applies losses/offsets/Delphi/Helix). These are the engine entry points the solver calls.

function computeBaselineTax(inputs) {
  const fm = { 'Single': 'single', 'Married Filing Jointly': 'married_joint', 'Married Filing Separately': 'married_separate', 'Head of Household': 'head_household' };
  const f = fm[inputs.filing_status || 'Single'] || 'single';
  const year = inputs.tax_year || getSelectedTaxYear();
  const stateCode = inputs.state || getSelectedState();
  const w2 = parseFloat(inputs.w2_wages || 0);
  const se = parseFloat(inputs.se_income || 0);
  const biz = parseFloat(inputs.biz_revenue || 0);
  const rent = parseFloat(inputs.rental_income || 0);
  const div = parseFloat(inputs.dividend_income || 0);
  const stg = parseFloat(inputs.st_gains || 0);
  const ltg = parseFloat(inputs.lt_gains || 0);
  const seDeduction = se > 0 ? se * getSeTaxMultiplier(year) * getSeTaxRate(year) * 0.5 : 0;
  const ordinaryIncome = w2 + se + biz + rent + div + stg - seDeduction;
  const totalIncome = ordinaryIncome + ltg;
  const sd = getStandardDeduction(year, f);
  const taxableOrdinary = Math.max(0, ordinaryIncome - sd);
  let federalTax = calculateTax(taxableOrdinary, f, year);
  federalTax += calculateLtcgTax(ltg, taxableOrdinary, f, year);
  if (se > 0) federalTax += se * getSeTaxMultiplier(year) * getSeTaxRate(year);
  const niitThreshold = getNiitThreshold(year, f);
  if (totalIncome > niitThreshold) {
    federalTax += Math.min(div + ltg + stg + rent, totalIncome - niitThreshold) * 0.038;
  }
  let stateTax = calculateStateTax(ordinaryIncome + ltg, stateCode, year, f);
  stateTax += calculateWaCapGainsTax(ltg, stateCode, year);
  const roundedFed = Math.round(federalTax);
  const roundedState = Math.round(stateTax);
  return { tax: roundedFed + roundedState, federalTax: roundedFed, stateTax: roundedState, totalIncome: Math.round(totalIncome), ordinaryIncome: Math.round(ordinaryIncome), taxableOrdinary: Math.round(taxableOrdinary), filing: f, year: year, state: stateCode };
}

function computeTaxAfterStrategies(inputs, totalSTLosses, oilGasOffset, delphiAlloc, helixAlloc) {
  const fm = { 'Single': 'single', 'Married Filing Jointly': 'married_joint', 'Married Filing Separately': 'married_separate', 'Head of Household': 'head_household' };
  const f = fm[inputs.filing_status || 'Single'] || 'single';
  const year = inputs.tax_year || getSelectedTaxYear();
  const stateCode = inputs.state || getSelectedState();
  const w2 = parseFloat(inputs.w2_wages || 0);
  const se = parseFloat(inputs.se_income || 0);
  const biz = parseFloat(inputs.biz_revenue || 0);
  const rent = parseFloat(inputs.rental_income || 0);
  const div = parseFloat(inputs.dividend_income || 0);
  const stg = parseFloat(inputs.st_gains || 0);
  const ltg = parseFloat(inputs.lt_gains || 0);

  // Delphi adjustments
  var delphiOrdinaryOffset = 0;
  var delphiSTLoss = 0;
  var delphiLTCG = 0;
  if (delphiAlloc) {
    delphiOrdinaryOffset = Math.abs(delphiAlloc.ordinaryIncomeExpense || 0);
    delphiSTLoss = Math.abs(delphiAlloc.shortTermCapitalGainLoss || 0);
    delphiLTCG = delphiAlloc.longTermCapitalGainLoss || 0;
  }

  // Helix adjustments
  var helixOrdinaryOffset = 0;
  var helixSTLoss = 0;
  var helixLTCG = 0;
  if (helixAlloc) {
    helixOrdinaryOffset = Math.abs(helixAlloc.ordinaryIncomeExpense || 0);
    helixSTLoss = Math.abs(helixAlloc.shortTermCapitalGainLoss || 0);
    helixLTCG = helixAlloc.longTermCapitalGainLoss || 0;
  }
  var delphiQD = delphiAlloc ? (delphiAlloc.qualifiedDividends || 0) : 0;
  var helixQD = helixAlloc ? (helixAlloc.qualifiedDividends || 0) : 0;

  let remainingLoss = totalSTLosses + delphiSTLoss + helixSTLoss;
  let adjStg = stg;
  let adjLtg = ltg + delphiLTCG + helixLTCG + delphiQD + helixQD;
  const stOffset = Math.min(remainingLoss, adjStg);
  adjStg -= stOffset;
  remainingLoss -= stOffset;
  const ltOffset = Math.min(remainingLoss, Math.max(0, adjLtg));
  adjLtg -= ltOffset;
  remainingLoss -= ltOffset;
  const capLossLimit = (f === 'married_separate') ? 1500 : 3000;
  const ordinaryOffset = Math.min(remainingLoss, capLossLimit);
  remainingLoss -= ordinaryOffset;
  const ogOffset = oilGasOffset || 0;
  const seDeduction = se > 0 ? se * getSeTaxMultiplier(year) * getSeTaxRate(year) * 0.5 : 0;
  const ordinaryIncome = w2 + se + biz + rent + div + adjStg - ordinaryOffset - ogOffset - delphiOrdinaryOffset - helixOrdinaryOffset - seDeduction;
  const totalIncome = ordinaryIncome + Math.max(0, adjLtg);
  const sd = getStandardDeduction(year, f);
  const taxableOrdinary = Math.max(0, ordinaryIncome - sd);
  let federalTax = calculateTax(taxableOrdinary, f, year);
  federalTax += calculateLtcgTax(Math.max(0, adjLtg), taxableOrdinary, f, year);
  if (se > 0) federalTax += se * getSeTaxMultiplier(year) * getSeTaxRate(year);
  const niitThreshold = getNiitThreshold(year, f);
  const niitIncome = ordinaryIncome + Math.max(0, adjLtg);
  if (niitIncome > niitThreshold) {
    federalTax += Math.min(div + Math.max(0, adjLtg) + adjStg + rent, niitIncome - niitThreshold) * 0.038;
  }
  // Apply foreign tax credit from Delphi/Helix (dollar-for-dollar reduction of federal tax)
  var foreignTaxCredit = (delphiAlloc ? Math.abs(delphiAlloc.foreignTaxesPaid || 0) : 0) + (helixAlloc ? Math.abs(helixAlloc.foreignTaxesPaid || 0) : 0);
  federalTax = Math.max(0, federalTax - foreignTaxCredit);
  let stateTax = calculateStateTax(ordinaryIncome + Math.max(0, adjLtg), stateCode, year, f);
  stateTax += calculateWaCapGainsTax(Math.max(0, adjLtg), stateCode, year);
  const roundedFed2 = Math.round(federalTax);
  const roundedState2 = Math.round(stateTax);
  return { tax: roundedFed2 + roundedState2, federalTax: roundedFed2, stateTax: roundedState2, totalIncome: Math.round(totalIncome), carryForwardLoss: Math.round(remainingLoss) };
}

