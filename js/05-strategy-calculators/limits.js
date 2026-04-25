// FILE: js/05-strategy-calculators/limits.js
// STRATEGY_LIMITS table + getLimits/getMarginalRate/phaseoutFactor helpers (year-parameterized)

const STRATEGY_LIMITS = {
  '2025': {
    retirement401k_employeeDeferral: 23500, retirement401k_catchUp50: 7500, retirement401k_catchUp60to63: 11250,
    retirement401k_totalLimit: 70000, retirementSEP_maxPct: 0.25, retirementSEP_maxDollar: 70000,
    retirementSIMPLE_employeeDeferral: 16500, retirementSIMPLE_catchUp50: 3500, retirementDBPlan_maxBenefit: 280000,
    retirementIRA_limit: 7000, retirementIRA_catchUp50: 1000, rothIncomeLimit_single: 150000, rothIncomeLimit_mfj: 236000,
    section179_limit: 1250000, section179_phaseoutStart: 3130000, bonusDepreciation_pct: 0.40,
    charitableCash_agiLimit: 0.60, charitableAppreciated_agiLimit: 0.30, qcd_maxAmount: 108000, qcd_minAge: 70.5,
    aotc_maxCredit: 2500, aotc_phaseoutStart_single: 80000, aotc_phaseoutEnd_single: 90000,
    aotc_phaseoutStart_mfj: 160000, aotc_phaseoutEnd_mfj: 180000, llc_maxCredit: 2000,
    childDependentCare_max1: 3000, childDependentCare_max2plus: 6000,
    adoptionCredit_max: 17280, adoptionCredit_phaseoutStart: 259190, adoptionCredit_phaseoutRange: 40000,
    evCredit_new_max: 7500, evCredit_used_max: 4000, evCredit_incomeLimit_single: 150000, evCredit_incomeLimit_mfj: 300000,
    augustaRule_maxDays: 14, accountablePlan_ficaRate: 0.153, sec127_maxPerEmployee: 5250,
    captiveInsurance_831b_limit: 2800000, standardMileageRate: 0.70, heavyVehicle_gvwr: 6000,
    excessBusinessLoss_single: 305000, excessBusinessLoss_mfj: 610000,
    capitalLoss_maxOrdinaryOffset: 3000, qsbs1202_maxExclusion: 10000000, qsbs1202_exclusionPct: 1.0, qsbs1202_maxCorpAssets: 50000000,
    esop_maxContribPct: 0.25, annualGiftExclusion: 19000, lifetimeEstatExemption: 13990000, estateGiftTaxRate: 0.40,
    plan529_maxStateDeduction: { 'default': 0, 'NY': 10000, 'CA': 0, 'IL': 10000, 'GA': 8000, 'VA': 4000, 'CO': 20000, 'PA': 17000, 'OH': 4000, 'NJ': 0 },
    socialSecurityWageBase: 176100, seTaxRate: 0.153, medicareAdditionalThreshold_single: 200000, medicareAdditionalThreshold_mfj: 250000,
    standardDeduction_single: 15000, standardDeduction_mfj: 30000, section7520Rate: 0.052,
    studentLoanInterest_max: 2500, studentLoanInterest_phaseoutStart_single: 80000, studentLoanInterest_phaseoutEnd_single: 95000,
    oilGasDepletion_pct: 0.15, qbiDeduction_pct: 0.20, qbiPhaseoutStart_single: 191950, qbiPhaseoutEnd_single: 241950,
    qbiPhaseoutStart_mfj: 383900, qbiPhaseoutEnd_mfj: 483900, deprecRecapture_maxRate: 0.25
  },
  '2026': {
    retirement401k_employeeDeferral: 23500, retirement401k_catchUp50: 7500, retirement401k_catchUp60to63: 11250,
    retirement401k_totalLimit: 70000, retirementSEP_maxPct: 0.25, retirementSEP_maxDollar: 70000,
    retirementSIMPLE_employeeDeferral: 16500, retirementSIMPLE_catchUp50: 3500, retirementDBPlan_maxBenefit: 280000,
    retirementIRA_limit: 7000, retirementIRA_catchUp50: 1000, rothIncomeLimit_single: 153000, rothIncomeLimit_mfj: 240000,
    section179_limit: 1290000, section179_phaseoutStart: 3220000, bonusDepreciation_pct: 0.20,
    charitableCash_agiLimit: 0.60, charitableAppreciated_agiLimit: 0.30, qcd_maxAmount: 110000, qcd_minAge: 70.5,
    aotc_maxCredit: 2500, aotc_phaseoutStart_single: 80000, aotc_phaseoutEnd_single: 90000,
    aotc_phaseoutStart_mfj: 160000, aotc_phaseoutEnd_mfj: 180000, llc_maxCredit: 2000,
    childDependentCare_max1: 3000, childDependentCare_max2plus: 6000,
    adoptionCredit_max: 17740, adoptionCredit_phaseoutStart: 265700, adoptionCredit_phaseoutRange: 40000,
    evCredit_new_max: 7500, evCredit_used_max: 4000, evCredit_incomeLimit_single: 150000, evCredit_incomeLimit_mfj: 300000,
    augustaRule_maxDays: 14, accountablePlan_ficaRate: 0.153, sec127_maxPerEmployee: 5250,
    captiveInsurance_831b_limit: 2800000, standardMileageRate: 0.70, heavyVehicle_gvwr: 6000,
    excessBusinessLoss_single: 313000, excessBusinessLoss_mfj: 626000,
    capitalLoss_maxOrdinaryOffset: 3000, qsbs1202_maxExclusion: 10000000, qsbs1202_exclusionPct: 1.0, qsbs1202_maxCorpAssets: 50000000,
    esop_maxContribPct: 0.25, annualGiftExclusion: 19000, lifetimeEstatExemption: 7000000, estateGiftTaxRate: 0.40,
    plan529_maxStateDeduction: { 'default': 0, 'NY': 10000, 'CA': 0, 'IL': 10000, 'GA': 8000, 'VA': 4000, 'CO': 20000, 'PA': 17000, 'OH': 4000, 'NJ': 0 },
    socialSecurityWageBase: 180000, seTaxRate: 0.153, medicareAdditionalThreshold_single: 200000, medicareAdditionalThreshold_mfj: 250000,
    standardDeduction_single: 15350, standardDeduction_mfj: 30700, section7520Rate: 0.052,
    studentLoanInterest_max: 2500, studentLoanInterest_phaseoutStart_single: 80000, studentLoanInterest_phaseoutEnd_single: 95000,
    oilGasDepletion_pct: 0.15, qbiDeduction_pct: 0.20, qbiPhaseoutStart_single: 197300, qbiPhaseoutEnd_single: 247300,
    qbiPhaseoutStart_mfj: 394600, qbiPhaseoutEnd_mfj: 494600, deprecRecapture_maxRate: 0.25
  }
};

function getLimits(year) { return STRATEGY_LIMITS[year] || STRATEGY_LIMITS['2026']; }
function getMarginalRate(income, filing, year) { var brackets = getFederalBrackets(year, filing); var rate = 0.10; for (var i = 0; i < brackets.length; i++) { if (income > (i > 0 ? brackets[i-1][0] : 0)) rate = brackets[i][1]; else break; } return rate; }
function phaseoutFactor(income, start, range) { if (income <= start) return 1; if (income >= start + range) return 0; return 1 - (income - start) / range; }
