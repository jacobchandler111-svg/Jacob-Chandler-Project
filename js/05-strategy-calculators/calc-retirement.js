// FILE: js/05-strategy-calculators/calc-retirement.js
// Retirement strategy calculators: EmployerRetirement, DefinedBenefitPlan, BackdoorRoth, 401hTrifecta

function calc_EmployerRetirement(inputs, year) {
  var L = getLimits(year); var age = parseFloat(inputs.taxpayer_age || 0);
  var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0);
  var w2 = parseFloat(inputs.w2_wages || 0); var comp = Math.max(bizIncome, w2);
  if (comp <= 0) return { applicable: false };
  var contribution = parseFloat(inputs.retirement_plan_contribution || 0);
  var maxEmployee = L.retirement401k_employeeDeferral;
  if (age >= 60 && age <= 63) maxEmployee += L.retirement401k_catchUp60to63;
  else if (age >= 50) maxEmployee += L.retirement401k_catchUp50;
  var max401k = Math.min(L.retirement401k_totalLimit, comp);
  var maxSEP = Math.min(comp * L.retirementSEP_maxPct, L.retirementSEP_maxDollar);
  var bestMax = Math.max(max401k, maxSEP);
  var bestPlan = max401k >= maxSEP ? '401(k)' : 'SEP-IRA';
  var deduction = contribution > 0 ? Math.min(contribution, bestMax) : bestMax;
  deduction = Math.min(deduction, comp);
  return { applicable: true, deduction: deduction, credit: 0, category: 'Retirement Planning', strategyId: 46, name: 'Employer Retirement Plan (' + bestPlan + ')', description: bestPlan + ' contribution up to $' + bestMax.toLocaleString(), inputsUsed: ['retirement_plan_contribution'] };
}
function calc_DefinedBenefitPlan(inputs, year) {
  var L = getLimits(year); var age = parseFloat(inputs.taxpayer_age || 0);
  var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0);
  if (bizIncome <= 0 || age <= 0) return { applicable: false };
  var contribution = parseFloat(inputs.db_plan_contribution || 0);
  var approxMax; if (age < 40) approxMax = Math.min(80000, bizIncome); else if (age < 45) approxMax = Math.min(120000, bizIncome); else if (age < 50) approxMax = Math.min(160000, bizIncome); else if (age < 55) approxMax = Math.min(220000, bizIncome); else if (age < 60) approxMax = Math.min(280000, bizIncome); else approxMax = Math.min(350000, bizIncome);
  var deduction = contribution > 0 ? Math.min(contribution, approxMax) : approxMax;
  deduction = Math.min(deduction, bizIncome);
  return { applicable: true, deduction: deduction, credit: 0, category: 'Retirement Planning', strategyId: 37, name: 'Defined Benefit / Cash Balance Plan', description: 'DB plan max ~$' + approxMax.toLocaleString() + ' (age ' + age + ')', inputsUsed: ['db_plan_contribution'] };
}
function calc_BackdoorRoth(inputs, year) {
  var L = getLimits(year); var age = parseFloat(inputs.taxpayer_age || 0);
  var filing = inputs.filing_status || 'Single';
  var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0) + parseFloat(inputs.rental_income || 0) + parseFloat(inputs.dividend_income || 0);
  var limit = filing === 'Married Filing Jointly' ? L.rothIncomeLimit_mfj : L.rothIncomeLimit_single;
  if (agi < limit) return { applicable: false };
  var maxContrib = L.retirementIRA_limit + (age >= 50 ? L.retirementIRA_catchUp50 : 0);
  return { applicable: true, deduction: 0, credit: 0, category: 'Retirement Planning', strategyId: 10, name: 'Backdoor Roth IRA', description: 'Recommend Backdoor Roth: $' + maxContrib.toLocaleString() + '/yr into tax-free growth', isRecommendation: true, estimatedBenefit: maxContrib, inputsUsed: [] };
}
function calc_401hTrifecta(inputs, year) {
  var L = getLimits(year); var age = parseFloat(inputs.taxpayer_age || 0);
  var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0);
  if (bizIncome <= 0 || age <= 0) return { applicable: false };
  var dbAmount; if (age < 40) dbAmount = 80000; else if (age < 50) dbAmount = 150000; else if (age < 55) dbAmount = 220000; else dbAmount = 300000;
  dbAmount = Math.min(dbAmount, bizIncome); var h401Amount = dbAmount * 0.25;
  var totalDeduction = Math.min(dbAmount + h401Amount, bizIncome);
  return { applicable: true, deduction: totalDeduction, credit: 0, category: 'Business Tax Planning', strategyId: 2, name: '401(h) Tax Trifecta', description: 'DB $' + dbAmount.toLocaleString() + ' + 401(h) $' + h401Amount.toLocaleString(), inputsUsed: [] };
}

