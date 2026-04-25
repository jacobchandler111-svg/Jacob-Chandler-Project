// FILE: js/05-strategy-calculators/orchestrator.js
// evaluateAllStrategies: dispatches input data through every calc_* function and aggregates results (year-parameterized)

function evaluateAllStrategies(inputs) {
  var year = inputs.tax_year || getSelectedTaxYear();
  var L = getLimits(year);
  var filing = inputs.filing_status || 'Single';
  var f = { 'Single': 'single', 'Married Filing Jointly': 'married_joint', 'Married Filing Separately': 'married_separate', 'Head of Household': 'head_household' }[filing] || 'single';
  var totalIncome = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0) + parseFloat(inputs.rental_income || 0) + parseFloat(inputs.dividend_income || 0);
  var margRate = getMarginalRate(totalIncome, f, year);
  var calculators = [calc_EmployerRetirement, calc_DefinedBenefitPlan, calc_BackdoorRoth, calc_401hTrifecta, calc_AugustaRule, calc_AccountablePlan, calc_BusinessVehicle, calc_Sec127EducationAssistance, calc_EquipmentDepreciation, calc_CostSegregation, calc_EquipmentLeasing, calc_CaptiveInsurance, calc_DepletionDeduction, calc_BusinessIncomeOptimization, calc_CharitableDonationAppreciatedAssets, calc_DonorAdvisedFund, calc_CharitableRemainderTrust, calc_QualifiedCharitableDistribution, calc_CharitableGiftFinancing, calc_CharitableLLC, calc_GeneralCharitable, calc_EducationCredits, calc_ChildDependentCareCredit, calc_AdoptionCredit, calc_EVCredit, calc_StudentLoanInterest, calc_529Plan, calc_1031Exchange, calc_DeferredSalesTrust, calc_CapitalLossHarvesting, calc_QSBS1202, calc_CryptoOptimization, calc_Dividends, calc_EmployeeStockOptions, calc_DayTraderTTS, calc_ChoiceOfEntity, calc_CCorpDeductions, calc_CCorpStateTax, calc_ContentCreator, calc_ActiveRealEstateParticipation, calc_EstatePlanning, calc_FamilyLimitedPartnership, calc_ESOP, calc_CorporateVUL, calc_AmendedReturns, calc_CODIncome];
  var results = [];
  for (var i = 0; i < calculators.length; i++) {
    try {
      var result = calculators[i](inputs, year);
      if (result && result.applicable) {
        var savings = 0;
        if (result.deduction > 0) savings += result.deduction * margRate;
        if (result.credit > 0) savings += result.credit;
        if (result.payrollSavings > 0) savings += result.payrollSavings;
        if (result.capitalGainsDeferred > 0) savings += result.capitalGainsDeferred * 0.238;
        if (result.capitalGainsExcluded > 0) savings += result.capitalGainsExcluded * 0.238;
        if (result.capitalGainsAvoided > 0) savings += result.capitalGainsAvoided * 0.238;
        if (result.stateDeduction > 0) savings += result.stateDeduction * 0.05;
        if (result.agiReduction > 0) savings += result.agiReduction * margRate;
        if (result.stGainsReduction > 0) savings += result.stGainsReduction * margRate;
        if (result.ltGainsReduction > 0) savings += result.ltGainsReduction * 0.20;
        result.estimatedSavings = Math.round(savings);
        result.marginalRate = margRate;
        result.year = year;
        results.push(result);
      }
    } catch (e) { console.warn('Strategy calc error:', e.message); }
  }
  results.sort(function(a, b) { return (b.estimatedSavings || 0) - (a.estimatedSavings || 0); });
  var totalDeductions = 0, totalCredits = 0, totalEstSavings = 0;
  for (var j = 0; j < results.length; j++) {
    if (!results[j].alreadyCaptured && !results[j].isRecommendation) { totalDeductions += results[j].deduction || 0; totalCredits += results[j].credit || 0; }
    totalEstSavings += results[j].estimatedSavings || 0;
  }
  return { strategies: results, totalDeductions: totalDeductions, totalCredits: totalCredits, totalEstimatedSavings: totalEstSavings, year: year, marginalRate: margRate, actionable: results.filter(function(r) { return !r.isRecommendation && !r.alreadyCaptured; }), recommendations: results.filter(function(r) { return r.isRecommendation; }), alreadyCaptured: results.filter(function(r) { return r.alreadyCaptured; }) };
}




