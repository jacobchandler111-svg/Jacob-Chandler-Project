// Brookhaven Tax Strategy Planning Engine - 2025/2026
// All calculations run client-side in JavaScript
// Brooklyn Strategy Engine with Linear Interpolation, Time-Weighting, and Solver Framework
// Multi-year federal + state tax bracket support via taxBrackets.json

// ============================================================
// SECTION 1: BROOKLYN STRATEGY DATA & REGRESSION ENGINE
// ============================================================

const BROOKLYN_STRATEGIES = {
  beta1: {
    id: 'brooklyn_beta1',
    name: 'S&P 500 - Brooklyn Managed - Beta 1',
    benchmark: 'S&P 500',
    advisorManaged: false,
    beta: 1,
    dataPoints: [
      { leverage: 0, longPct: 100, shortPct: 0, lossRate: 0.104, label: 'Long-Only', minInvestment: 250000 },
      { leverage: 0.30, longPct: 130, shortPct: 30, lossRate: 0.248, label: '130/30', minInvestment: 500000 },
      { leverage: 0.45, longPct: 145, shortPct: 45, lossRate: 0.322, label: '145/45', minInvestment: 500000 },
      { leverage: 1.00, longPct: 200, shortPct: 100, lossRate: 0.590, label: '200/100', minInvestment: 1000000 },
      { leverage: 1.50, longPct: 250, shortPct: 150, lossRate: 0.855, label: '250/150', minInvestment: 1000000 },
      { leverage: 2.25, longPct: 325, shortPct: 225, lossRate: 1.224, label: '325/225', minInvestment: 1000000 }
    ],
    presets: ['Long-Only','130/30','145/45','200/100','250/150','325/225'],
    minInvestment: 250000,
    managementFee: 0
  },
  beta0: {
    id: 'brooklyn_beta0',
    name: 'CASH - Brooklyn Managed - Beta 0',
    benchmark: 'CASH',
    advisorManaged: false,
    beta: 0,
    dataPoints: [
      { leverage: 1.00, longPct: 100, shortPct: 100, lossRate: 0.495, label: '100/100', minInvestment: 1000000 },
      { leverage: 1.50, longPct: 150, shortPct: 150, lossRate: 0.758, label: '150/150', minInvestment: 1000000 },
      { leverage: 2.00, longPct: 200, shortPct: 200, lossRate: 1.011, label: '200/200', minInvestment: 1000000 },
      { leverage: 2.75, longPct: 275, shortPct: 275, lossRate: 1.427, label: '275/275', minInvestment: 1000000 }
    ],
    presets: ['100/100','150/150','200/200','275/275'],
    minInvestment: 1000000,
    managementFee: 0
  },
  beta05: {
    id: 'brooklyn_beta05',
    name: 'CASH/S&P 500 - Brooklyn Managed - Beta 0.5',
    benchmark: 'CASH/S&P 500',
    advisorManaged: false,
    beta: 0.5,
    dataPoints: [
      { leverage: 1.00, longPct: 200, shortPct: 100, lossRate: 0.674, label: '200/100', minInvestment: 1000000 },
      { leverage: 1.50, longPct: 250, shortPct: 150, lossRate: 0.933, label: '250/150', minInvestment: 1000000 },
      { leverage: 2.25, longPct: 325, shortPct: 225, lossRate: 1.3255, label: '325/225', minInvestment: 1000000 }
    ],
    presets: ['200/100','250/150','325/225'],
    minInvestment: 1000000,
    managementFee: 0
  },
  advisorManaged: {
    id: 'brooklyn_advisor',
    name: 'S&P 500 - Advisor Managed',
    benchmark: 'S&P 500',
    advisorManaged: true,
    beta: null,
    dataPoints: [
      { leverage: 0, longPct: 100, shortPct: 0, lossRate: 0.104, label: 'Long-Only', minInvestment: 250000 },
      { leverage: 0.30, longPct: 130, shortPct: 30, lossRate: 0.144, label: '130/30', minInvestment: 500000 },
      { leverage: 0.45, longPct: 145, shortPct: 45, lossRate: 0.218, label: '145/45', minInvestment: 500000 },
      { leverage: 1.00, longPct: 200, shortPct: 100, lossRate: 0.486, label: '200/100', minInvestment: 1000000 },
      { leverage: 1.50, longPct: 250, shortPct: 150, lossRate: 0.751, label: '250/150', minInvestment: 1000000 },
      { leverage: 2.25, longPct: 325, shortPct: 225, lossRate: 1.120, label: '325/225', minInvestment: 1000000 }
    ],
    presets: ['Long-Only','130/30','145/45','200/100','250/150','325/225'],
    minInvestment: 250000,
    managementFee: 0
  }
};

// Delphi Fund Strategies - Class A and Class B
const DELPHI_STRATEGIES = {
  classA: {
    id: 'delphi_classA',
    name: 'Delphi - Class A',
    minInvestment: 5000000,
    managementFee: 0.0175,
    liquidity: 'Monthly',
    liquidityNotice: '30 days',
    allocations: {
      shortTermCapitalGainLoss: -0.05,
      ordinaryIncomeExpense: -0.30,
      longTermCapitalGainLoss: 0.25,
      qualifiedDividends: 0.06,
      foreignTaxesPaid: -0.01
    }
  },
  classB: {
    id: 'delphi_classB',
    name: 'Delphi - Class B',
    minInvestment: 1000000,
    managementFee: 0.02,
    liquidity: 'Quarterly',
    liquidityNotice: '30 days',
    allocations: {
      shortTermCapitalGainLoss: -0.05,
      ordinaryIncomeExpense: -0.30,
      longTermCapitalGainLoss: 0.25,
      qualifiedDividends: 0.06,
      foreignTaxesPaid: -0.01
    }
  }
};

function computeDelphiAllocation(classKey, investmentAmount, investmentDate) {
  const fund = DELPHI_STRATEGIES[classKey];
  if (!fund) return null;
  const alloc = fund.allocations;
  let fraction = 1;
  if (investmentDate) {
    const now = new Date(investmentDate);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const msInYear = yearEnd - yearStart;
    const remaining = yearEnd - now;
    fraction = Math.max(0, Math.min(1, remaining / msInYear));
  }
  const netInvestment = investmentAmount * (1 - fund.managementFee);
  return {
    shortTermCapitalGainLoss: netInvestment * alloc.shortTermCapitalGainLoss * fraction,
    ordinaryIncomeExpense: netInvestment * alloc.ordinaryIncomeExpense * fraction,
    longTermCapitalGainLoss: netInvestment * alloc.longTermCapitalGainLoss * fraction,
    qualifiedDividends: netInvestment * alloc.qualifiedDividends * fraction,
    foreignTaxesPaid: netInvestment * alloc.foreignTaxesPaid * fraction,
    netOrdinaryOffset: netInvestment * (alloc.ordinaryIncomeExpense + alloc.shortTermCapitalGainLoss) * fraction,
    netLTCG: netInvestment * alloc.longTermCapitalGainLoss * fraction,
    managementFee: investmentAmount * fund.managementFee,
    className: fund.name,
    liquidity: fund.liquidity,
    liquidityNotice: fund.liquidityNotice
  };
}

function getDelphiMinInvestment(classKey) {
  const fund = DELPHI_STRATEGIES[classKey];
  return fund ? fund.minInvestment : 0;
}

function interpolateLossRate(strategyKey, leverage) {
  const strat = BROOKLYN_STRATEGIES[strategyKey];
  if (!strat) return 0;
  const pts = strat.dataPoints;
  if (pts.length === 0) return 0;
  if (leverage <= pts[0].leverage) return pts[0].lossRate;
  if (leverage >= pts[pts.length - 1].leverage) return pts[pts.length - 1].lossRate;
  for (let i = 0; i < pts.length - 1; i++) {
    if (leverage >= pts[i].leverage && leverage <= pts[i + 1].leverage) {
      const t = (leverage - pts[i].leverage) / (pts[i + 1].leverage - pts[i].leverage);
      return pts[i].lossRate + t * (pts[i + 1].lossRate - pts[i].lossRate);
    }
  }
  return pts[pts.length - 1].lossRate;
}

function timeWeightedLoss(annualLossRate, implementationDate) {
  const now = new Date();
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const implDate = new Date(implementationDate);
  if (implDate > yearEnd) return 0;
  const msInYear = 365.25 * 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, yearEnd - implDate);
  const fraction = Math.min(1, remaining / msInYear);
  return annualLossRate * fraction;
}

function computeBrooklynLoss(strategyKey, leverage, investmentAmount, implementationDate) {
  const annualRate = interpolateLossRate(strategyKey, leverage);
  const twRate = timeWeightedLoss(annualRate, implementationDate);
  return investmentAmount * twRate;
}

function getBrooklynStrategyKey(advisorManaged, beta) {
  if (advisorManaged) return 'advisorManaged';
  if (beta === 0) return 'beta0';
  if (beta === 0.5) return 'beta05';
  return 'beta1';
}

function getMinInvestmentForLeverage(strategyKey, leverage) {
  const strat = BROOKLYN_STRATEGIES[strategyKey];
  if (!strat) return 0;
  const pts = strat.dataPoints;
  let lower = pts[0], upper = pts[pts.length - 1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (leverage >= pts[i].leverage && leverage <= pts[i + 1].leverage) {
      lower = pts[i];
      upper = pts[i + 1];
      break;
    }
  }
  const lowerMin = lower.minInvestment || strat.minInvestment || 0;
  const upperMin = upper.minInvestment || strat.minInvestment || 0;
  if (leverage <= lower.leverage) return lowerMin; if (leverage >= upper.leverage) return upperMin; return upperMin;
}

// Helper: find leverage label from data points
function getLeverageLabel(strategyKey, leverage) {
  var strat = BROOKLYN_STRATEGIES[strategyKey];
  if (!strat) return leverage.toFixed(2) + 'x';
  var pts = strat.dataPoints;
  for (var i = 0; i < pts.length; i++) {
    if (Math.abs(pts[i].leverage - leverage) < 0.001) {
      return pts[i].label + ' (' + pts[i].longPct + '/' + pts[i].shortPct + ')';
    }
  }
  // Interpolated - show long/short percentages
  var longPct = Math.round((1 + leverage) * 100);
  var shortPct = Math.round(leverage * 100);
  return longPct + '/' + shortPct + ' (custom ' + (leverage * 100).toFixed(0) + '% leverage)';
}

// ============================================================
// SECTION 2: TAX CALCULATION ENGINE (Multi-Year + State)
// ============================================================

let TAX_DATA = null;

const TAX_BRACKETS_2026_FALLBACK = {
  single: [[11600,0.10],[47150,0.12],[100525,0.22],[191950,0.24],[243725,0.32],[609350,0.35],[Infinity,0.37]],
  married_joint: [[23200,0.10],[94300,0.12],[201050,0.22],[383900,0.24],[487450,0.32],[731200,0.35],[Infinity,0.37]],
  married_separate: [[11600,0.10],[47150,0.12],[100525,0.22],[191950,0.24],[243725,0.32],[365600,0.35],[Infinity,0.37]],
  head_household: [[16550,0.10],[63100,0.12],[100500,0.22],[191950,0.24],[243700,0.32],[609350,0.35],[Infinity,0.37]]
};

const STANDARD_DEDUCTION_2026_FALLBACK = {
  single: 15000, married_joint: 30000, married_separate: 15000, head_household: 22500
};

const LTCG_RATES_FALLBACK = {
  single: [[47025,0],[518900,0.15],[Infinity,0.20]],
  married_joint: [[94050,0],[583750,0.15],[Infinity,0.20]]
};

async function loadTaxBrackets() {
  const paths = ['data/taxBrackets.json', '../data/taxBrackets.json', './data/taxBrackets.json'];
  for (const p of paths) {
    try {
      const r = await fetch(p);
      if (r.ok) {
        TAX_DATA = await r.json();
        convertSentinelsToInfinity(TAX_DATA);
        console.log('Tax brackets loaded for years:', Object.keys(TAX_DATA.federal));
        console.log('State tax data loaded for years:', Object.keys(TAX_DATA.state));
        return;
      }
    } catch (e) {}
  }
  console.warn('Failed to load taxBrackets.json - using hardcoded 2026 federal fallback');
}

function convertSentinelsToInfinity(data) {
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 999999999) { data[i] = Infinity; }
      else if (typeof data[i] === 'object') { convertSentinelsToInfinity(data[i]); }
    }
  } else if (typeof data === 'object' && data !== null) {
    for (const key of Object.keys(data)) {
      if (data[key] === 999999999) { data[key] = Infinity; }
      else if (typeof data[key] === 'object') { convertSentinelsToInfinity(data[key]); }
    }
  }
}

function getSelectedTaxYear() {
  var el = document.getElementById('tax_year');
  return el ? el.value : '2026';
}

function getSelectedState() {
  var el = document.getElementById('state');
  return el ? el.value : '';
}

function getFederalBrackets(year, filing) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return TAX_BRACKETS_2026_FALLBACK[filing] || TAX_BRACKETS_2026_FALLBACK.single;
  const yearData = TAX_DATA.federal[year];
  return yearData.brackets[filing] || yearData.brackets.single;
}

function getStandardDeduction(year, filing) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return STANDARD_DEDUCTION_2026_FALLBACK[filing] || 15000;
  return TAX_DATA.federal[year].standardDeduction[filing] || 15000;
}

function getLtcgRates(year, filing) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return LTCG_RATES_FALLBACK[filing] || LTCG_RATES_FALLBACK.single;
  return TAX_DATA.federal[year].ltcgRates[filing] || TAX_DATA.federal[year].ltcgRates.single;
}

function getNiitThreshold(year, filing) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return filing === 'single' ? 200000 : 250000;
  return TAX_DATA.federal[year].niitThreshold[filing] || 200000;
}

function getSeTaxRate(year) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return 0.153;
  return TAX_DATA.federal[year].seTaxRate || 0.153;
}

function getSeTaxMultiplier(year) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return 0.9235;
  return TAX_DATA.federal[year].seTaxMultiplier || 0.9235;
}

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
  const ordinaryIncome = w2 + se + biz + rent + div + stg;
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
  let stateTax = calculateStateTax(ordinaryIncome, stateCode, year, f);
  stateTax += calculateWaCapGainsTax(ltg, stateCode, year);
  const totalTax = federalTax + stateTax;
  return { tax: Math.round(totalTax), federalTax: Math.round(federalTax), stateTax: Math.round(stateTax), totalIncome: Math.round(totalIncome), ordinaryIncome: Math.round(ordinaryIncome), taxableOrdinary: Math.round(taxableOrdinary), filing: f, year: year, state: stateCode };
}

function computeTaxAfterStrategies(inputs, totalSTLosses, oilGasOffset, delphiAlloc) {
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

  let remainingLoss = totalSTLosses + delphiSTLoss;
  let adjStg = stg;
  let adjLtg = ltg + delphiLTCG;
  const stOffset = Math.min(remainingLoss, adjStg);
  adjStg -= stOffset;
  remainingLoss -= stOffset;
  const ltOffset = Math.min(remainingLoss, Math.max(0, adjLtg));
  adjLtg -= ltOffset;
  remainingLoss -= ltOffset;
  const ordinaryOffset = Math.min(remainingLoss, 3000);
  remainingLoss -= ordinaryOffset;
  const ogOffset = oilGasOffset || 0;
  const ordinaryIncome = w2 + se + biz + rent + div + adjStg - ordinaryOffset - ogOffset - delphiOrdinaryOffset;
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
  let stateTax = calculateStateTax(ordinaryIncome, stateCode, year, f);
  stateTax += calculateWaCapGainsTax(Math.max(0, adjLtg), stateCode, year);
  const totalTax = federalTax + stateTax;
  return { tax: Math.round(totalTax), federalTax: Math.round(federalTax), stateTax: Math.round(stateTax), totalIncome: Math.round(totalIncome), carryForwardLoss: Math.round(remainingLoss) };
}

// ================================================================
// SECTION 3: SOLVER FRAMEWORK (Brooklyn + Delphi + Oil & Gas)
// ================================================================

// Brookhaven Fee Configuration (adjustable)
const BROOKHAVEN_FEES = {
  flatFee: 45000,
  quarterlyFee: 2000,
  annualQuarterlyTotal: 8000
};

function computeBrookhavenFees(implementationDate) {
  var flat = BROOKHAVEN_FEES.flatFee;
  var annual = BROOKHAVEN_FEES.annualQuarterlyTotal;
  // Pro-rata: remaining time in year from implementation date
  var fraction = 1;
  if (implementationDate) {
    var dp = implementationDate.split('-'); var impl = new Date(parseInt(dp[0]), parseInt(dp[1]) - 1, parseInt(dp[2]));
    var yearEnd = new Date(impl.getFullYear(), 11, 31);
    var yearStart = new Date(impl.getFullYear(), 0, 1);
    var msInYear = yearEnd - yearStart;
    var remaining = yearEnd - impl;
    fraction = Math.max(0, Math.min(1, remaining / msInYear));
  }
  var proRataQuarterly = Math.round(annual * fraction);
  return {
    flatFee: flat,
    quarterlyFee: proRataQuarterly,
    totalFee: flat + proRataQuarterly
  };
}

function solveOptimalAllocation(inputs, enabledStrategies, availableCapital, maxLeverage, implementationDate) {
  const baseline = computeBaselineTax(inputs);
  let bestTax = baseline.tax;
  let bestAllocation = [];
  let bestLosses = 0;
  let bestOilGasOffset = 0;
  let bestDelphiAlloc = null;

  const ogMaxInvest = parseFloat(inputs.oil_gas_max || 0);
  const ogRate = parseFloat(inputs.oil_gas_rate || 0.95);

  const strategies = enabledStrategies.filter(function(s) {
    return BROOKLYN_STRATEGIES[s.key] != null;
  });

  const steps = 20;
  const ogSteps = 10;
  const delphiSteps = 5;

  // Determine eligible Delphi classes
  var delphiClasses = [];
  if (availableCapital >= 5000000) delphiClasses.push('classA');
  if (availableCapital >= 1000000) delphiClasses.push('classB');

  // Helper to try a combination and track the best
  function tryCombo(brooklynKey, brooklynInvest, lev, ogInvest, delphiClass, delphiInvest) {
    var totalUsed = brooklynInvest + ogInvest + delphiInvest;
    if (totalUsed > availableCapital + 1) return; // tolerance

    var losses = brooklynInvest > 0 && brooklynKey ? computeBrooklynLoss(brooklynKey, lev, brooklynInvest, implementationDate) : 0;
    var ogOffset = ogInvest * ogRate;
    var dAlloc = delphiInvest > 0 && delphiClass ? computeDelphiAllocation(delphiClass, delphiInvest, implementationDate) : null;

    var result = computeTaxAfterStrategies(inputs, losses, ogOffset, dAlloc);
    if (result.tax < bestTax || (result.tax === bestTax && lev < (bestAllocation.length > 0 ? bestAllocation[0].leverage : 999))) {
      bestTax = result.tax;
      bestAllocation = [{
        key: brooklynKey,
        leverage: lev,
        investment: brooklynInvest,
        losses: losses,
        oilGasInvestment: ogInvest,
        oilGasOffset: ogOffset,
        delphiClass: delphiClass,
        delphiInvestment: delphiInvest,
        delphiAllocation: dAlloc
      }];
      bestLosses = losses;
      bestOilGasOffset = ogOffset;
      bestDelphiAlloc = dAlloc;
    }
  }

  // Iterate Brooklyn strategies
  for (var si = 0; si < strategies.length; si++) {
    var s = strategies[si];
    var strat = BROOKLYN_STRATEGIES[s.key];
    if (!strat) continue;
    var maxBrooklyn = Math.min(availableCapital, s.maxInvestment || availableCapital);
    var lev = s.customLeverage || maxLeverage || 0.3;

    for (var bStep = 0; bStep <= steps; bStep++) {
      var brooklynInvest = (maxBrooklyn / steps) * bStep;
      var leverageMinInvestment = getMinInvestmentForLeverage(s.key, lev);
      if (brooklynInvest > 0 && brooklynInvest < leverageMinInvestment) continue;

      var remainingAfterBrooklyn = availableCapital - brooklynInvest;

      // O&G allocation
      var ogMax = Math.min(ogMaxInvest, remainingAfterBrooklyn);
      var ogMaxSafe = Math.max(0, ogMax);
      var ogStepSize = ogMaxSafe > 0 ? ogMaxSafe / ogSteps : 0;

      for (var ogStep = 0; ogStep <= (ogMaxSafe > 0 ? ogSteps : 0); ogStep++) {
        var ogInvest = ogStepSize * ogStep;
        var remainingAfterBoth = remainingAfterBrooklyn - ogInvest;

        // Try without Delphi
        tryCombo(s.key, brooklynInvest, lev, ogInvest, null, 0);

        // Try with Delphi
        for (var di = 0; di < delphiClasses.length; di++) {
          var dc = delphiClasses[di];
          var delphiMin = getDelphiMinInvestment(dc);
          var delphiMax = Math.max(0, remainingAfterBoth);
          if (delphiMax < delphiMin) continue;

          var dStepSize = (delphiMax - delphiMin) / delphiSteps;
          for (var dStep = 0; dStep <= delphiSteps; dStep++) {
            var dInvest = delphiMin + dStepSize * dStep;
            tryCombo(s.key, brooklynInvest, lev, ogInvest, dc, dInvest);
          }
        }
      }
    }
  }

  // Oil & Gas only (no Brooklyn)
  if (ogMaxInvest > 0) {
    var ogOnlyMax = Math.min(ogMaxInvest, availableCapital);
    var ogOnlyStep = ogOnlyMax / ogSteps;
    for (var ogStep2 = 1; ogStep2 <= ogSteps; ogStep2++) {
      var ogInvest2 = ogOnlyStep * ogStep2;
      var remainOG = availableCapital - ogInvest2;

      // O&G only, no Delphi
      tryCombo(null, 0, 0, ogInvest2, null, 0);

      // O&G + Delphi
      for (var di2 = 0; di2 < delphiClasses.length; di2++) {
        var dc2 = delphiClasses[di2];
        var dMin2 = getDelphiMinInvestment(dc2);
        var dMax2 = Math.max(0, remainOG);
        if (dMax2 < dMin2) continue;
        var dStep2 = (dMax2 - dMin2) / delphiSteps;
        for (var ds2 = 0; ds2 <= delphiSteps; ds2++) {
          tryCombo(null, 0, 0, ogInvest2, dc2, dMin2 + dStep2 * ds2);
        }
      }
    }
  }

  // Delphi only (no Brooklyn, no O&G)
  for (var di3 = 0; di3 < delphiClasses.length; di3++) {
    var dc3 = delphiClasses[di3];
    var dMin3 = getDelphiMinInvestment(dc3);
    var dMax3 = availableCapital;
    if (dMax3 < dMin3) continue;
    var dStep3 = (dMax3 - dMin3) / delphiSteps;
    for (var ds3 = 0; ds3 <= delphiSteps; ds3++) {
      tryCombo(null, 0, 0, 0, dc3, dMin3 + dStep3 * ds3);
    }
  }

  // Minimum Leverage Optimization
  if (bestAllocation.length > 0 && bestAllocation[0].key) {
    var bestEntry = bestAllocation[0];
    var targetTax = bestTax;
    var minLev = bestEntry.leverage;
    var minLevAllocation = Object.assign({}, bestEntry);
    var leverageStep = 0.05;
    for (var tryLev = bestEntry.leverage - leverageStep; tryLev >= 0; tryLev = Math.round((tryLev - leverageStep) * 100) / 100) {
      var levMinInv = getMinInvestmentForLeverage(bestEntry.key, tryLev);
      if (bestEntry.investment > 0 && bestEntry.investment < levMinInv) continue;
      var losses2 = computeBrooklynLoss(bestEntry.key, tryLev, bestEntry.investment, implementationDate);
      var result2 = computeTaxAfterStrategies(inputs, losses2, bestEntry.oilGasOffset || 0, bestEntry.delphiAllocation || null);
      if (result2.tax <= targetTax + 100) {
        minLev = tryLev;
        minLevAllocation = {
          key: bestEntry.key, leverage: tryLev, investment: bestEntry.investment,
          losses: losses2, oilGasInvestment: bestEntry.oilGasInvestment || 0,
          oilGasOffset: bestEntry.oilGasOffset || 0,
          delphiClass: bestEntry.delphiClass, delphiInvestment: bestEntry.delphiInvestment || 0,
          delphiAllocation: bestEntry.delphiAllocation
        };
      } else { break; }
    }
    if (minLev < bestEntry.leverage) {
      bestAllocation[0].minLeverageOption = minLevAllocation;
    }
  }

  var a0 = bestAllocation.length > 0 ? bestAllocation[0] : null;
  var totalInvestment = a0 ? (a0.investment || 0) + (a0.oilGasInvestment || 0) + (a0.delphiInvestment || 0) : 0;

  return {
    baselineTax: baseline.tax,
    baselineFederalTax: baseline.federalTax,
    baselineStateTax: baseline.stateTax,
    optimizedTax: bestTax,
    savings: baseline.tax - bestTax,
    allocation: bestAllocation,
    totalLosses: bestLosses,
    totalOilGasOffset: bestOilGasOffset,
    totalDelphiAlloc: bestDelphiAlloc,
    totalIncome: baseline.totalIncome,
    year: baseline.year,
    state: baseline.state,
    roi: totalInvestment > 0 ? ((baseline.tax - bestTax) / totalInvestment * 100).toFixed(1) + '%' : '0%'
  };
}

// ================================================================
// SECTION 4: CONDITIONAL QUESTIONNAIRE & UI
// ==========================================================

const questions = {
  income: [
    {
      id: 'high_income', text: 'Are you a high-income earner?', trigger: 'high_income',
      followUp: [
        {
          id: 'w2_employee', text: 'Are you a W-2 employee?', trigger: 'w2_employee',
          followUp: [{
            id: 'w2_amount', text: 'How much did you earn from W-2 jobs?', trigger: 'w2_employee',
            inputField: { type: 'number', placeholder: 'e.g. 150,000', label: 'Annual W-2 Income', mapTo: 'w2_wages' }
          }]
        },
        {
          id: 'multiple_income', text: 'Do you have multiple sources of income?', trigger: 'multiple_income',
          followUp: [
            { id: 'has_rental', text: 'Do you own rental properties?', trigger: 'rental_property',
              inputField: { type: 'number', placeholder: 'e.g. 50,000', label: 'Annual Rental Income', mapTo: 'rental_income' } },
            { id: 'has_business', text: 'Do you own a business?', trigger: 'has_business',
              inputField: { type: 'number', placeholder: 'e.g. 100,000', label: 'Annual Business Revenue', mapTo: 'biz_revenue' } },
            { id: 'has_self_employment', text: 'Do you have self-employment income?', trigger: 'self_employed',
              inputField: { type: 'number', placeholder: 'e.g. 75,000', label: 'Annual Self-Employment Income', mapTo: 'se_income' } },
            { id: 'has_retirement_income', text: 'Are you receiving retirement benefits?', trigger: 'retirement_income',
              inputField: { type: 'number', placeholder: 'e.g. 40,000', label: 'Annual Retirement Distributions', mapTo: 'retirement_distributions' } },
            { id: 'has_dividend_income', text: 'Do you receive significant dividend income?', trigger: 'dividend_income',
              inputField: { type: 'number', placeholder: 'e.g. 25,000', label: 'Annual Dividend Income', mapTo: 'dividend_income' } }
          ]
        }
      ]
    }
  ],

  assets: [
    {
      id: 'appreciated_asset', text: 'Do you have appreciated assets you are looking to sell?', trigger: 'appreciated_asset',
      followUp: [
        { id: 'asset_value', text: 'What is the total value of assets?', trigger: 'appreciated_asset',
          inputField: { type: 'number', placeholder: 'e.g. 500,000', label: 'Portfolio Value of Sale', mapTo: 'portfolio_value' } },
        { id: 'cost_basis_amt', text: 'What is your cost basis?', trigger: 'appreciated_asset',
          inputField: { type: 'number', placeholder: 'e.g. 200,000', label: 'Cost Basis', mapTo: 'cost_basis' } },
        { id: 'lt_gains_amt', text: 'Amount that is long-term capital gains?', trigger: 'appreciated_asset',
          inputField: { type: 'number', placeholder: 'e.g. 200,000', label: 'Long-Term Capital Gains', mapTo: 'lt_gains' } },
        { id: 'st_gains_amt', text: 'Amount that is short-term capital gains?', trigger: 'appreciated_asset',
          inputField: { type: 'number', placeholder: 'e.g. 50,000', label: 'Short-Term Capital Gains', mapTo: 'st_gains' } }
      ]
    },
    { id: 'stock_options', text: 'Do you have stock options (ISO or NSO)?', trigger: 'stock_options' }
  ],

  strategy: [
    {
      id: 'custom_leverage', text: 'Are you interested in custom leverage?', trigger: 'custom_leverage',
      followUp: [{
        id: 'max_leverage_amt', text: 'What is your maximum leverage?', trigger: 'custom_leverage',
        inputField: { type: 'number', placeholder: 'e.g. 1.5', label: 'Max Leverage (decimal)', mapTo: 'custom_leverage_value' }
      }]
    },
    {
      id: 'sector_investment', text: 'How much are you willing to invest in sector-specific instruments (e.g. Oil & Gas)?', trigger: 'interested_oil_gas',
      inputField: { type: 'number', placeholder: 'e.g. 100,000', label: 'Max Sector Investment (Oil & Gas)', mapTo: 'oil_gas_max' }
    }
  ],

  realestate: [
    { id: 'real_estate_sale', text: 'Are you planning to sell real estate this year?', trigger: 'real_estate_sale' },
    { id: 'cost_segregation', text: 'Have you considered cost segregation for rental properties?', trigger: 'cost_segregation',
      showWhen: function(a) { return a.rental_property === true; } },
    { id: 'opportunity_zone', text: 'Are you interested in Opportunity Zone investments?', trigger: 'opportunity_zone' }
  ],
  retirement: [
    { id: 'retirement_planning', text: 'Are you actively planning for retirement?', trigger: 'retirement_planning' },
    { id: 'over_50', text: 'Are you over 50 years old?', trigger: 'over_50' },
    { id: 'max_401k', text: 'Are you maximizing your 401(k) contributions?', trigger: 'max_401k' }
  ],
  business: [
    { id: 'business_owner', text: 'Do you own or operate a business?', trigger: 'has_business',
      followUp: [
        { id: 'is_s_corp', text: 'Is your business an S Corporation?', trigger: 's_corp' },
        { id: 'is_partnership', text: 'Are you in a partnership or LLC?', trigger: 'partnership' }
      ]
    },
    { id: 's_corp', text: 'Is your business an S Corporation?', trigger: 's_corp',
      showWhen: function(a) { return a.has_business === true; } },
    { id: 'partnership', text: 'Are you in a partnership or LLC?', trigger: 'partnership',
      showWhen: function(a) { return a.has_business === true; } }
  ]
};

const sectionMap = {
  income: 'q-income', assets: 'q-assets', strategy: 'q-strategy',
  realestate: 'q-realestate', retirement: 'q-retirement', business: 'q-business'
};

let userAnswers = {};
let strategiesData = [];

// --- Accounting Format Helper ---
function formatCurrency(value) {
  if (!value && value !== 0) return '';
  var num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  if (isNaN(num)) return '';
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function parseCurrencyInput(str) {
  return str ? str.replace(/[^0-9.-]/g, '') : '0';
}

function setupCurrencyInput(input, mapTo) {
  input.addEventListener('blur', function() {
    var raw = parseCurrencyInput(this.value);
    var num = parseFloat(raw);
    if (!isNaN(num) && num > 0) {
      this.value = formatCurrency(num);
    }
    // Auto-fill to Page 2
    if (mapTo) {
      var target = document.getElementById(mapTo);
      if (target) {
        target.value = this.value;
        target.dispatchEvent(new Event('blur'));
      }
    }
  });
}

function setupPage2CurrencyInputs() {
  var currencyFields = ['w2_wages','se_income','biz_revenue','rental_income',
    'dividend_income','retirement_distributions','st_gains','lt_gains','portfolio_value',
    'cost_basis','charitable','salt','retirement_contrib','property_values',
    'available_capital','oil_gas_max'];
  currencyFields.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { setupCurrencyInput(el, null); }
  });
}

// --- Build Questions with Conditional Logic ---
function buildQuestions() {
  Object.keys(questions).forEach(function(section) {
    var container = document.getElementById(sectionMap[section]);
    if (!container) return;
    container.innerHTML = '';
    questions[section].forEach(function(q) {
      if (q.showWhen && !q.showWhen(userAnswers)) return;
      if (q.choiceType === 'select') { renderSelectQuestion(container, q, section); }
      else if (q.choiceType === 'leverage_preset') { renderPresetQuestion(container, q, section); }
      else { renderQuestion(container, q, section); }
    });
  });
}

function buildSectionQuestions(section) {
  var container = document.getElementById(sectionMap[section]);
  if (!container) return;
  container.innerHTML = '';
  questions[section].forEach(function(q) {
    if (q.showWhen && !q.showWhen(userAnswers)) return;
    if (q.choiceType === 'select') { renderSelectQuestion(container, q, section); }
    else if (q.choiceType === 'leverage_preset') { renderPresetQuestion(container, q, section); }
    else { renderQuestion(container, q, section); }
  });
}

function renderQuestion(container, q, section) {
  var card = document.createElement('div');
  card.className = 'question-card';
  card.setAttribute('data-question', q.id);
  var textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = q.text;
  card.appendChild(textDiv);
  var toggleDiv = document.createElement('div');
  toggleDiv.className = 'toggle-group';
  var yesBtn = document.createElement('button');
  yesBtn.className = 'toggle-btn yes' + (userAnswers[q.trigger] === true ? ' selected' : '');
  yesBtn.textContent = 'Yes';
  yesBtn.onclick = function() { setAnswer(q.id, q.trigger, true, this, q, section); };
  var noBtn = document.createElement('button');
  noBtn.className = 'toggle-btn no' + (userAnswers[q.trigger] === false ? ' selected' : '');
  noBtn.textContent = 'No';
  noBtn.onclick = function() { setAnswer(q.id, q.trigger, false, this, q, section); };
  toggleDiv.appendChild(yesBtn);
  toggleDiv.appendChild(noBtn);
  card.appendChild(toggleDiv);
  container.appendChild(card);
  // Render inline input if this question has one (for non-followUp questions like sector investment)
  if (q.inputField) { renderInlineInput(card, q); }
  // Render follow-up questions if answered yes
  if (q.followUp && userAnswers[q.trigger] === true) {
    var fc = document.createElement('div');
    fc.className = 'follow-up-container';
    fc.id = 'followup-' + q.id;
    q.followUp.forEach(function(fq) { renderFollowUpQuestion(fc, fq, section); });
    container.appendChild(fc);
  }
}

function renderFollowUpQuestion(container, fq, section) {
  var card = document.createElement('div');
  card.className = 'follow-up-question';
  card.setAttribute('data-question', fq.id);
  var textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = fq.text;
  card.appendChild(textDiv);
  if (fq.followUp || !fq.inputField) {
    var toggleDiv = document.createElement('div');
    toggleDiv.className = 'toggle-group';
    var yesBtn = document.createElement('button');
    yesBtn.className = 'toggle-btn yes' + (userAnswers[fq.trigger] === true ? ' selected' : '');
    yesBtn.textContent = 'Yes';
    yesBtn.onclick = function() { setAnswer(fq.id, fq.trigger, true, this, fq, section); };
    var noBtn = document.createElement('button');
    noBtn.className = 'toggle-btn no' + (userAnswers[fq.trigger] === false ? ' selected' : '');
    noBtn.textContent = 'No';
    noBtn.onclick = function() { setAnswer(fq.id, fq.trigger, false, this, fq, section); };
    toggleDiv.appendChild(yesBtn);
    toggleDiv.appendChild(noBtn);
    card.appendChild(toggleDiv);
  }
  if (fq.inputField) { renderInlineInput(card, fq); }
  container.appendChild(card);
  // Handle nested follow-ups (e.g., W-2 amount after W-2 employee Yes)
  if (fq.followUp && userAnswers[fq.trigger] === true) {
    var nestedFc = document.createElement('div');
    nestedFc.className = 'follow-up-container';
    nestedFc.id = 'followup-' + fq.id;
    fq.followUp.forEach(function(nfq) { renderFollowUpQuestion(nestedFc, nfq, section); });
    container.appendChild(nestedFc);
  }
}

function renderInlineInput(card, q) {
  var inputDiv = document.createElement('div');
  inputDiv.className = 'inline-input-container';
  inputDiv.id = 'input-wrap-' + q.id;
  inputDiv.style.display = userAnswers[q.trigger] === true ? 'block' : 'none';
  inputDiv.style.marginTop = '10px';
  var label = document.createElement('label');
  label.textContent = q.inputField.label;
  label.style.color = '#b0bec5';
  label.style.fontSize = '0.9em';
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = q.inputField.placeholder || '';
  input.id = 'inline-' + q.id;
  input.className = 'currency-input';
  input.style.cssText = 'width:100%;padding:10px 12px;margin-top:4px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1626;color:#e0e6ed;font-size:1em;';
  if (q.inputField.mapTo) { setupCurrencyInput(input, q.inputField.mapTo); }
  // Restore saved value
  var savedKey = '_input_' + q.id;
  if (userAnswers[savedKey]) { input.value = userAnswers[savedKey]; }
  input.addEventListener('input', function() { userAnswers['_input_' + q.id] = this.value; });
  inputDiv.appendChild(label);
  inputDiv.appendChild(input);
  card.appendChild(inputDiv);
}

function renderSelectQuestion(container, q, section) {
  var card = document.createElement('div');
  card.className = 'question-card';
  card.setAttribute('data-question', q.id);
  var textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = q.text;
  card.appendChild(textDiv);
  var sel = document.createElement('select');
  sel.className = 'strategy-select';
  sel.style.cssText = 'padding:10px 14px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1626;color:#e0e6ed;font-size:1em;width:100%;margin-top:8px;';
  var defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Select --';
  sel.appendChild(defaultOpt);
  q.choices.forEach(function(c) {
    var opt = document.createElement('option');
    opt.value = c.value;
    opt.textContent = c.label;
    sel.appendChild(opt);
  });
  var savedVal = userAnswers['_select_' + q.id];
  if (savedVal) sel.value = savedVal;
  sel.onchange = function() {
    userAnswers['_select_' + q.id] = this.value;
    userAnswers[q.trigger] = !!this.value;
    var betaEl = document.getElementById('beta_selection');
    if (betaEl && this.value) betaEl.value = this.value;
    autoFillLeverage();
    rebuildConditionalSections();
    buildSectionQuestions('strategy');
    updateProgress();
  };
  card.appendChild(sel);
  container.appendChild(card);
}

function renderPresetQuestion(container, q, section) {
  var card = document.createElement('div');
  card.className = 'question-card';
  card.setAttribute('data-question', q.id);
  var textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = q.text;
  card.appendChild(textDiv);
  var sel = document.createElement('select');
  sel.className = 'strategy-select';
  sel.style.cssText = 'padding:10px 14px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1626;color:#e0e6ed;font-size:1em;width:100%;margin-top:8px;';
  var defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Select Leverage --';
  sel.appendChild(defaultOpt);
  var beta = userAnswers['_select_beta_selection_q'] || '1';
  var isAdvisor = userAnswers.advisor_managed === true;
  var stratKey = getBrooklynStrategyKey(isAdvisor, parseFloat(beta));
  var strat = BROOKLYN_STRATEGIES[stratKey];
  if (strat && strat.dataPoints) {
    strat.dataPoints.forEach(function(dp) {
      var opt = document.createElement('option');
      opt.value = dp.label;
      opt.textContent = dp.label + ' (' + dp.longPct + '/' + dp.shortPct + ')';
      sel.appendChild(opt);
    });
  }
  var savedPreset = userAnswers['_preset_leverage'];
  if (savedPreset) sel.value = savedPreset;
  sel.onchange = function() {
    userAnswers['_preset_leverage'] = this.value;
    userAnswers[q.trigger] = !!this.value;
    var presetEl = document.getElementById('brooklyn_preset');
    if (presetEl && this.value) presetEl.value = this.value;
    autoFillLeverage();
    updateProgress();
  };
  card.appendChild(sel);
  container.appendChild(card);
}

// Auto-fill leverage on Page 2 based on strategy selections
function autoFillLeverage() {
  var beta = userAnswers['_select_beta_selection_q'] || '1';
  var isAdvisor = userAnswers.advisor_managed === true;
  var stratKey = getBrooklynStrategyKey(isAdvisor, parseFloat(beta));
  var strat = BROOKLYN_STRATEGIES[stratKey];

  if (userAnswers.custom_leverage === true) return; // User wants custom

  var presetLabel = userAnswers['_preset_leverage'];
  if (presetLabel && strat) {
    var dp = strat.dataPoints.find(function(p) { return p.label === presetLabel; });
    if (dp) {
      var levEl = document.getElementById('max_leverage');
      if (levEl) levEl.value = dp.leverage;
      var customEl = document.getElementById('custom_leverage_value');
      if (customEl) customEl.value = dp.leverage;
    }
  } else if (strat && strat.dataPoints.length > 0) {
    // Default to first preset
    var dp = strat.dataPoints[0];
    var levEl = document.getElementById('max_leverage');
    if (levEl) levEl.value = dp.leverage;
    var customEl = document.getElementById('custom_leverage_value');
    if (customEl) customEl.value = dp.leverage;
  }
}

function setAnswer(questionId, trigger, value, btn, questionObj, section) {
  userAnswers[trigger] = value;
  var card = btn.closest('.question-card') || btn.closest('.follow-up-question');
  if (card) {
    card.querySelectorAll('.toggle-btn').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
  }
  var inputWrap = document.getElementById('input-wrap-' + questionId);
  if (inputWrap) { inputWrap.style.display = value ? 'block' : 'none'; }
  if (questionObj && questionObj.followUp) {
    var existingFollowUp = document.getElementById('followup-' + questionId);
    if (value && !existingFollowUp) { buildSectionQuestions(section); }
    else if (!value && existingFollowUp) { existingFollowUp.remove(); }
  }
  rebuildConditionalSections();
  if (section === 'strategy' || trigger === 'advisor_managed' || trigger === 'custom_leverage') {
    buildSectionQuestions('strategy');
  }
  syncPage2Visibility();
  updateProgress();
  updateMatchCount();
  updateBrooklynUI();
}

function rebuildConditionalSections() {
  ['business', 'realestate'].forEach(function(section) {
    var container = document.getElementById(sectionMap[section]);
    if (!container) return;
    container.innerHTML = '';
    questions[section].forEach(function(q) {
      if (q.showWhen && !q.showWhen(userAnswers)) return;
      renderQuestion(container, q, section);
    });
  });
}

function syncPage2Visibility() {
  var fieldVisibility = {
    has_business: ['biz_revenue'],
    rental_property: ['rental_income'],
    dividend_income: ['dividend_income']
  };
  Object.entries(fieldVisibility).forEach(function(entry) {
    var trigger = entry[0], fieldIds = entry[1];
    var answered = userAnswers[trigger];
    fieldIds.forEach(function(fieldId) {
      var inputEl = document.getElementById(fieldId);
      if (!inputEl) return;
      var group = inputEl.closest('.input-group');
      if (group) {
        if (answered === false) { group.style.display = 'none'; inputEl.value = ''; }
        else { group.style.display = ''; }
      }
    });
  });
  var ogField = document.getElementById('oil_gas_max');
  if (ogField) {
    var ogGroup = ogField.closest('.input-group');
    if (ogGroup) { ogGroup.style.display = userAnswers.interested_oil_gas === true ? '' : 'none'; }
  }
}

function updateProgress() {
  var total = 0, answered = 0;
  Object.values(questions).forEach(function(arr) {
    arr.forEach(function(q) {
      if (q.showWhen && !q.showWhen(userAnswers)) return;
      total++;
      if (userAnswers[q.trigger] !== undefined) answered++;
    });
  });
  var pct = total > 0 ? Math.round(answered / total * 100) : 0;
  var bar = document.getElementById('progress-fill');
  if (bar) bar.style.width = pct + '%';
  var label = document.getElementById('progress-pct');
  if (label) label.textContent = pct + '%';
}

function updateMatchCount() {
  if (!strategiesData.length) return;
  var count = 0;
  strategiesData.forEach(function(s) {
    if (!s.triggers) return;
    var matched = s.triggers.every(function(t) { return userAnswers[t] === true; });
    if (matched) count++;
  });
  var el = document.getElementById('match-count');
  if (el) el.textContent = count;
}

function updateBrooklynUI() {
  var customLev = userAnswers.custom_leverage;
  var section = document.getElementById('custom-leverage-section');
  if (section) { section.classList.toggle('hidden', !customLev); }
}

function getFormInputs() {
  var fields = ['w2_wages','se_income','biz_revenue','rental_income',
    'dividend_income','retirement_distributions','st_gains','lt_gains','portfolio_value',
    'cost_basis','charitable','salt','retirement_contrib','property_values','taxpayer_age','state',
    'implementation_date','available_capital','max_leverage','beta_selection',
    'brooklyn_preset','custom_leverage_value','filing_status','tax_year',
    'oil_gas_max','oil_gas_rate','months_remaining'];
  var inp = {};
  fields.forEach(function(f) {
    var el = document.getElementById(f);
    if (el) {
      // Strip currency formatting for numeric fields
      var val = el.value;
      if (el.type === 'text' && val && val.indexOf('$') >= 0) {
        val = parseCurrencyInput(val);
      }
      inp[f] = val;
    }
  });
  return inp;
}

function calculateStrategies() {
  var inp = getFormInputs();
  var baseline = computeBaselineTax(inp);
  var advisorManaged = userAnswers.advisor_managed === true;
  var beta = parseFloat(inp.beta_selection || '1');
  var stratKey = getBrooklynStrategyKey(advisorManaged, beta);
  var implDate = inp.implementation_date || new Date().toISOString().split('T')[0];
  var availCap = parseFloat(inp.available_capital || 0);
  var customLev = userAnswers.custom_leverage;
  var leverage = 0.3;
  if (customLev && inp.custom_leverage_value) {
    leverage = parseFloat(inp.custom_leverage_value);
  } else if (inp.brooklyn_preset) {
    var presetMap = {
      'Long-Only': 0, '100/100': 1.0, '130/30': 0.3, '145/45': 0.45,
      '160/60': 0.6, '200/100': 1.0, '225/125': 1.25, '250/150': 1.5,
      '275/275': 2.75, '325/225': 2.25, '150/150': 1.5, '200/200': 2.0
    };
    leverage = presetMap[inp.brooklyn_preset] || 0.3;
  }
  var enabledStrategies = [{ key: stratKey, maxInvestment: availCap, customLeverage: leverage }];
  var result = solveOptimalAllocation(inp, enabledStrategies, availCap, leverage, implDate);
  displayResults(result, baseline, inp);
}

function displayResults(result, baseline, inputs) {
  var a = result.allocation.length > 0 ? result.allocation[0] : null;
  var strat = a && a.key ? BROOKLYN_STRATEGIES[a.key] : null;
  var effRate = result.totalIncome > 0 ? (result.baselineTax / result.totalIncome * 100).toFixed(1) : '0';
  var newRate = result.totalIncome > 0 ? (result.optimizedTax / result.totalIncome * 100).toFixed(1) : '0';
  var totalInvested = a ? (a.investment || 0) + (a.oilGasInvestment || 0) + (a.delphiInvestment || 0) : 0;

  // Compute fees
  var implDate = inputs.implementation_date || new Date().toISOString().split('T')[0];
  var fees = computeBrookhavenFees(implDate);

  var page3 = document.getElementById('page3');
  if (!page3) return;
  page3.innerHTML = '';

  // Header
  var header = document.createElement('div');
  header.innerHTML = '<h2 style="font-size:1.4em;font-weight:700;margin-bottom:4px;">Strategy Summary & Optimization</h2><p style="color:#8899aa;margin-bottom:20px;">Optimized tax strategy allocation based on your inputs.</p>';
  page3.appendChild(header);

  // TABLE 1: BASELINE
  var t1 = document.createElement('div');
  t1.className = 'results-table-section';
  t1.innerHTML = '<h3 class="table-title">Baseline \u2014 Without Tax Planning</h3>' +
    '<table class="results-table"><tbody>' +
    '<tr><td>Tax Year</td><td>' + (result.year || getSelectedTaxYear()) + '</td></tr>' +
    '<tr><td>Filing Status</td><td>' + (inputs.filing_status || 'Single') + '</td></tr>' +
    '<tr><td>State</td><td>' + (result.state || getSelectedState() || 'N/A') + '</td></tr>' +
    '<tr><td>Total Income</td><td>' + formatCurrency(result.totalIncome) + '</td></tr>' +
    '<tr><td>Federal Tax</td><td>' + formatCurrency(result.baselineFederalTax) + '</td></tr>' +
    '<tr><td>State Tax</td><td>' + formatCurrency(result.baselineStateTax) + '</td></tr>' +
    '<tr class="total-row"><td>Total Tax Liability</td><td>' + formatCurrency(result.baselineTax) + '</td></tr>' +
    '<tr><td>Effective Tax Rate</td><td>' + effRate + '%</td></tr>' +
    '</tbody></table>';
  page3.appendChild(t1);

  // TABLE 2: WITH PLANNING
  var t2 = document.createElement('div');
  t2.className = 'results-table-section';
  var stratRows = '';

  if (a && a.key && strat && a.investment > 0) {
    var leverageLabel = getLeverageLabel(a.key, a.leverage);
    stratRows += '<tr class="strategy-header"><td colspan="2">Brooklyn Strategy: ' + strat.name + '</td></tr>';
    stratRows += '<tr><td>Leverage</td><td>' + leverageLabel + '</td></tr>';
    stratRows += '<tr><td>Investment</td><td>' + formatCurrency(a.investment) + '</td></tr>';
    stratRows += '<tr><td>Short-Term Losses Generated</td><td>' + formatCurrency(a.losses) + '</td></tr>';
  }

  if (a && a.delphiInvestment > 0 && a.delphiClass) {
    var delphiFund = DELPHI_STRATEGIES[a.delphiClass];
    var dAlloc = a.delphiAllocation;
    stratRows += '<tr class="strategy-header"><td colspan="2">Delphi Strategy: ' + (delphiFund ? delphiFund.name : a.delphiClass) + '</td></tr>';
    stratRows += '<tr><td>Investment</td><td>' + formatCurrency(a.delphiInvestment) + '</td></tr>';
    if (dAlloc) {
      stratRows += '<tr><td>Ordinary Income Offset</td><td>' + formatCurrency(Math.abs(dAlloc.ordinaryIncomeExpense)) + '</td></tr>';
      stratRows += '<tr><td>ST Loss Generated</td><td>' + formatCurrency(Math.abs(dAlloc.shortTermCapitalGainLoss)) + '</td></tr>';
      stratRows += '<tr><td>LT Capital Gain</td><td>' + formatCurrency(dAlloc.longTermCapitalGainLoss) + '</td></tr>';
    }
  }

  if (a && a.oilGasInvestment > 0) {
    stratRows += '<tr class="strategy-header"><td colspan="2">Oil & Gas Strategy</td></tr>';
    stratRows += '<tr><td>Investment</td><td>' + formatCurrency(a.oilGasInvestment) + '</td></tr>';
    stratRows += '<tr><td>Ordinary Income Offset (' + (parseFloat(inputs.oil_gas_rate || 0.95) * 100).toFixed(0) + '%)</td><td>' + formatCurrency(a.oilGasOffset) + '</td></tr>';
  }

  var minLevRow = '';
  if (a && a.minLeverageOption) {
    var mlo = a.minLeverageOption;
    var mloLabel = getLeverageLabel(mlo.key, mlo.leverage);
    minLevRow = '<tr class="alt-row"><td>Lower Leverage Alternative</td><td>' + mloLabel + ' \u2014 same result within $100</td></tr>';
  }

  t2.innerHTML = '<h3 class="table-title">With Tax Planning</h3>' +
    '<table class="results-table"><tbody>' +
    '<tr class="strategy-header"><td colspan="2">Strategies Applied</td></tr>' +
    stratRows + minLevRow +
    '<tr class="spacer-row"><td colspan="2"></td></tr>' +
    '<tr><td>Optimized Tax</td><td>' + formatCurrency(result.optimizedTax) + '</td></tr>' +
    '<tr><td>New Effective Rate</td><td>' + newRate + '%</td></tr>' +
    '<tr><td>Total Investment</td><td>' + formatCurrency(totalInvested) + '</td></tr>' +
    '</tbody></table>';
  page3.appendChild(t2);

  // TABLE 3: RETURN ON PLANNING with fees
  var t3 = document.createElement('div');
  t3.className = 'results-table-section summary-section';
  var totalFees = fees.totalFee;
  var netSavings = result.savings - totalFees;
  var roiPct = totalFees > 0 ? (result.savings / totalFees * 100).toFixed(1) : (result.savings > 0 ? '\u221e' : '0');

  t3.innerHTML = '<h3 class="table-title summary-title">Return on Planning</h3>' +
    '<table class="results-table summary-table"><tbody>' +
    '<tr><td>Tax Without Planning</td><td>' + formatCurrency(result.baselineTax) + '</td></tr>' +
    '<tr><td>Tax With Planning</td><td>' + formatCurrency(result.optimizedTax) + '</td></tr>' +
    '<tr class="savings-row"><td>Tax Savings</td><td>' + formatCurrency(result.savings) + '</td></tr>' +
    '<tr class="spacer-row"><td colspan="2"></td></tr>' +
    '<tr class="strategy-header"><td colspan="2">Fees</td></tr>' +
    '<tr><td>Brookhaven Flat Fee</td><td>' + formatCurrency(fees.flatFee) + '</td></tr>' +
    '<tr><td>Quarterly Fee (pro-rata)</td><td>' + formatCurrency(fees.quarterlyFee) + '</td></tr>' +
    '<tr class="total-row"><td>Total Fees</td><td>' + formatCurrency(totalFees) + '</td></tr>' +
    '<tr class="spacer-row"><td colspan="2"></td></tr>' +
    '<tr class="savings-row"><td>Net Savings After Fees</td><td>' + formatCurrency(netSavings) + '</td></tr>' +
    '<tr class="total-row"><td>Return on Investment (Savings / Fees)</td><td>' + roiPct + '%</td></tr>' +
    '</tbody></table>';
  page3.appendChild(t3);

  // Buttons
  var btnDiv = document.createElement('div');
  btnDiv.style.cssText = 'margin-top:30px;display:flex;gap:15px;';
  btnDiv.innerHTML = '<button class="btn btn-primary" onclick="calculateStrategies()">Recalculate</button><button class="btn btn-secondary" onclick="exportResults()">Export Report</button>';
  page3.appendChild(btnDiv);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.remove('active'); });
  var pg = document.getElementById(pageId);
  if (pg) pg.classList.add('active');
  var ti = pageId === 'page1' ? 0 : pageId === 'page2' ? 1 : 2;
  var tabs = document.querySelectorAll('.nav-tab');
  if (tabs[ti]) tabs[ti].classList.add('active');
  if (pageId === 'page2') {
    syncPage2Visibility();
    setupPage2CurrencyInputs();
  }
  if (pageId === 'page3') calculateStrategies();
}

function exportResults() {
  var inp = getFormInputs();
  var baseline = computeBaselineTax(inp);
  var advisorManaged = userAnswers.advisor_managed === true;
  var beta = parseFloat(inp.beta_selection || '1');
  var stratKey = getBrooklynStrategyKey(advisorManaged, beta);
  var implDate = inp.implementation_date || new Date().toISOString().split('T')[0];
  var availCap = parseFloat(inp.available_capital || 0);
  var leverage = parseFloat(inp.custom_leverage_value || inp.max_leverage || 0.3);
  var enabledStrategies = [{ key: stratKey, maxInvestment: availCap, customLeverage: leverage }];
  var result = solveOptimalAllocation(inp, enabledStrategies, availCap, leverage, implDate);
  var fees = computeBrookhavenFees(implDate);
  var year = result.year || getSelectedTaxYear();
  var state = result.state || getSelectedState();
  var rp = 'BROOKHAVEN TAX STRATEGY REPORT\n';
  rp += '================================\n\n';
  rp += 'Tax Year: ' + year + '\n';
  rp += 'State: ' + state + '\n';
  rp += 'Filing Status: ' + (inp.filing_status || 'N/A') + '\n\n';
  rp += 'BASELINE (NO PLANNING)\n';
  rp += '----------------------\n';
  rp += 'Total Income: ' + formatCurrency(result.totalIncome) + '\n';
  rp += 'Baseline Tax: ' + formatCurrency(result.baselineTax) + '\n';
  rp += '  Federal: ' + formatCurrency(result.baselineFederalTax) + '\n';
  rp += '  State: ' + formatCurrency(result.baselineStateTax) + '\n\n';
  rp += 'WITH PLANNING\n';
  rp += '-------------\n';
  rp += 'Optimized Tax: ' + formatCurrency(result.optimizedTax) + '\n';
  rp += 'Tax Savings: ' + formatCurrency(result.savings) + '\n';
  rp += 'ROI: ' + result.roi + '\n\n';
  rp += 'FEES\n';
  rp += '----\n';
  rp += 'Flat Fee: ' + formatCurrency(fees.flatFee) + '\n';
  rp += 'Quarterly (pro-rata): ' + formatCurrency(fees.quarterlyFee) + '\n';
  rp += 'Total Fees: ' + formatCurrency(fees.totalFee) + '\n\n';
  rp += 'STRATEGIES APPLIED\n';
  rp += '------------------\n';
  result.allocation.forEach(function(alloc) {
    if (alloc.key) {
      var st = BROOKLYN_STRATEGIES[alloc.key];
      rp += '  Brooklyn: ' + (st ? st.name : alloc.key) + '\n';
      rp += '    Leverage: ' + getLeverageLabel(alloc.key, alloc.leverage) + '\n';
      rp += '    Investment: ' + formatCurrency(alloc.investment) + '\n';
      rp += '    Losses: ' + formatCurrency(alloc.losses) + '\n';
    }
    if (alloc.delphiInvestment > 0) {
      var df = DELPHI_STRATEGIES[alloc.delphiClass];
      rp += '  Delphi: ' + (df ? df.name : alloc.delphiClass) + '\n';
      rp += '    Investment: ' + formatCurrency(alloc.delphiInvestment) + '\n';
    }
    if (alloc.oilGasInvestment > 0) {
      rp += '  Oil & Gas Investment: ' + formatCurrency(alloc.oilGasInvestment) + '\n';
      rp += '    O&G Offset: ' + formatCurrency(alloc.oilGasOffset) + '\n';
    }
    rp += '\n';
  });
  var blob = new Blob([rp], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'brookhaven-tax-report-' + year + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function loadStrategies() {
  var paths = ['data/strategies.json', '../data/strategies.json', './data/strategies.json'];
  for (var i = 0; i < paths.length; i++) {
    try {
      var r = await fetch(paths[i]);
      if (r.ok) {
        var data = await r.json();
        strategiesData = data.strategies || data;
        console.log('Loaded', strategiesData.length, 'strategies');
        updateMatchCount();
        return;
      }
    } catch (e) {}
  }
  console.warn('Failed to load strategies.json');
}

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

function calc_AugustaRule(inputs, year) { var L = getLimits(year); var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); if (bizIncome <= 0) return { applicable: false }; var dailyRate = parseFloat(inputs.augusta_daily_rate || 0) || 2500; var days = Math.min(parseFloat(inputs.augusta_days || 0) || 12, L.augustaRule_maxDays); var deduction = dailyRate * days; return { applicable: true, deduction: deduction, credit: 0, category: 'Business Tax Planning', strategyId: 9, name: 'Augusta Rule (14-Day Rental)', description: days + ' days x $' + dailyRate.toLocaleString() + '/day = $' + deduction.toLocaleString() + ' (tax-free to owner)', inputsUsed: ['augusta_daily_rate', 'augusta_days'] }; }
function calc_AccountablePlan(inputs, year) { var L = getLimits(year); var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); if (bizIncome <= 0) return { applicable: false }; var expenses = parseFloat(inputs.accountable_plan_expenses || 0) || 15000; expenses = Math.min(expenses, bizIncome); return { applicable: true, deduction: expenses, credit: 0, payrollSavings: expenses * L.accountablePlan_ficaRate, category: 'Business Tax Planning', strategyId: 5, name: 'Accountable Plan', description: 'Reimburse $' + expenses.toLocaleString() + ' business expenses (saves income + payroll tax)', inputsUsed: ['accountable_plan_expenses'] }; }
function calc_BusinessVehicle(inputs, year) { var L = getLimits(year); var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); if (bizIncome <= 0) return { applicable: false }; var bizMiles = parseFloat(inputs.business_miles || 0); if (bizMiles <= 0) return { applicable: false }; var vehicleCost = parseFloat(inputs.vehicle_cost || 0); var vehicleWeight = parseFloat(inputs.vehicle_weight || 0); var mileageDeduction = bizMiles * L.standardMileageRate; var sec179Deduction = (vehicleWeight > L.heavyVehicle_gvwr && vehicleCost > 0) ? Math.min(vehicleCost, L.section179_limit) : 0; var deduction = Math.max(mileageDeduction, sec179Deduction); var method = sec179Deduction > mileageDeduction ? 'Section 179 (heavy vehicle)' : 'Standard mileage'; return { applicable: true, deduction: Math.min(deduction, bizIncome), credit: 0, category: 'Business Tax Planning', strategyId: 12, name: 'Business Vehicle Deduction', description: method + ': $' + deduction.toLocaleString(), inputsUsed: ['business_miles', 'vehicle_cost', 'vehicle_weight'] }; }
function calc_Sec127EducationAssistance(inputs, year) { var L = getLimits(year); var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); if (bizIncome <= 0) return { applicable: false }; var numEmployees = parseFloat(inputs.sec127_employees || 1); var amountPerEmployee = Math.min(parseFloat(inputs.sec127_amount || L.sec127_maxPerEmployee), L.sec127_maxPerEmployee); var deduction = numEmployees * amountPerEmployee; return { applicable: true, deduction: Math.min(deduction, bizIncome), credit: 0, payrollSavings: deduction * L.accountablePlan_ficaRate, category: 'Business Tax Planning', strategyId: 41, name: 'Education Assistance (Sec 127)', description: numEmployees + ' employees x $' + amountPerEmployee.toLocaleString(), inputsUsed: ['sec127_employees', 'sec127_amount'] }; }
function calc_EquipmentDepreciation(inputs, year) { var L = getLimits(year); var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); if (bizIncome <= 0) return { applicable: false }; var equipCost = parseFloat(inputs.equipment_cost || 0); if (equipCost <= 0) return { applicable: false }; var method = inputs.depreciation_method || '179'; var deduction; if (method === '179') { deduction = Math.min(equipCost, L.section179_limit); } else { deduction = equipCost * L.bonusDepreciation_pct; } var ebl = inputs.filing_status === 'Married Filing Jointly' ? L.excessBusinessLoss_mfj : L.excessBusinessLoss_single; deduction = Math.min(deduction, bizIncome + ebl); return { applicable: true, deduction: deduction, credit: 0, category: 'Depreciation', strategyId: 4, name: 'Accelerated Depreciation (Sec 179/Bonus)', description: (method === '179' ? 'Section 179' : 'Bonus ' + (L.bonusDepreciation_pct * 100) + '%') + ': $' + deduction.toLocaleString(), inputsUsed: ['equipment_cost', 'depreciation_method'] }; }
function calc_CostSegregation(inputs, year) { var L = getLimits(year); var buildingCost = parseFloat(inputs.building_cost || 0); if (buildingCost <= 0) return { applicable: false }; var buildingType = inputs.building_type || 'commercial'; var reclassPct = buildingType === 'residential' ? 0.25 : 0.30; var reclassAmount = buildingCost * reclassPct; var bonusAmount = reclassAmount * L.bonusDepreciation_pct; var regularAmount = (buildingCost - reclassAmount) / (buildingType === 'residential' ? 27.5 : 39); var totalYear1 = bonusAmount + regularAmount; return { applicable: true, deduction: totalYear1, credit: 0, category: 'Depreciation', strategyId: 33, name: 'Cost Segregation Study', description: (reclassPct * 100) + '% reclassified ($' + reclassAmount.toLocaleString() + ') with ' + (L.bonusDepreciation_pct * 100) + '% bonus = $' + bonusAmount.toLocaleString(), inputsUsed: ['building_cost', 'building_type'] }; }
function calc_EquipmentLeasing(inputs, year) { var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); var leasePayments = parseFloat(inputs.lease_payments || 0); if (bizIncome <= 0 || leasePayments <= 0) return { applicable: false }; return { applicable: true, deduction: Math.min(leasePayments, bizIncome), credit: 0, category: 'Business Tax Planning', strategyId: 48, name: 'Equipment Leasing Deduction', description: 'Annual lease payments: $' + leasePayments.toLocaleString(), inputsUsed: ['lease_payments'] }; }
function calc_CaptiveInsurance(inputs, year) { var L = getLimits(year); var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); if (bizIncome < 500000) return { applicable: false }; var premium = parseFloat(inputs.captive_premium || 0); if (premium <= 0) premium = Math.min(bizIncome * 0.20, L.captiveInsurance_831b_limit); premium = Math.min(premium, L.captiveInsurance_831b_limit, bizIncome); return { applicable: true, deduction: premium, credit: 0, category: 'Advanced Business Planning', strategyId: 18, name: 'Captive Insurance (831(b))', description: 'Premium deduction: $' + premium.toLocaleString(), inputsUsed: ['captive_premium'] }; }
function calc_DepletionDeduction(inputs, year) { var L = getLimits(year); var royaltyIncome = parseFloat(inputs.royalty_income || 0); if (royaltyIncome <= 0) return { applicable: false }; var depletion = royaltyIncome * L.oilGasDepletion_pct; return { applicable: true, deduction: depletion, credit: 0, category: 'Business Tax Planning', strategyId: 38, name: 'Depletion Deduction (Royalties)', description: (L.oilGasDepletion_pct * 100) + '% of $' + royaltyIncome.toLocaleString() + ' = $' + depletion.toLocaleString(), inputsUsed: ['royalty_income'] }; }
function calc_BusinessIncomeOptimization(inputs, year) { var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); if (bizIncome <= 0) return { applicable: false }; var additionalDeductions = parseFloat(inputs.additional_biz_deductions || 0); if (additionalDeductions <= 0) return { applicable: false }; return { applicable: true, deduction: Math.min(additionalDeductions, bizIncome), credit: 0, category: 'Business Tax Planning', strategyId: 11, name: 'Business Deduction Optimization', description: 'Additional deductions: $' + additionalDeductions.toLocaleString(), inputsUsed: ['additional_biz_deductions'] }; }

function calc_CharitableDonationAppreciatedAssets(inputs, year) { var L = getLimits(year); var assetFMV = parseFloat(inputs.charitable_asset_fmv || 0); var assetBasis = parseFloat(inputs.charitable_asset_basis || 0); if (assetFMV <= 0) return { applicable: false }; var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0) + parseFloat(inputs.rental_income || 0) + parseFloat(inputs.dividend_income || 0) + parseFloat(inputs.st_gains || 0) + parseFloat(inputs.lt_gains || 0); var deduction = Math.min(assetFMV, agi * L.charitableAppreciated_agiLimit); var gainsAvoided = Math.max(0, assetFMV - assetBasis); return { applicable: true, deduction: deduction, credit: 0, capitalGainsAvoided: gainsAvoided, category: 'Charitable Planning', strategyId: 19, name: 'Charitable Donation of Appreciated Assets', description: 'Donate $' + assetFMV.toLocaleString() + ' asset, deduction $' + deduction.toLocaleString() + ', avoid $' + gainsAvoided.toLocaleString() + ' gains', inputsUsed: ['charitable_asset_fmv', 'charitable_asset_basis'] }; }
function calc_DonorAdvisedFund(inputs, year) { var L = getLimits(year); var dafAmount = parseFloat(inputs.daf_contribution || 0); if (dafAmount <= 0) return { applicable: false }; var dafType = inputs.daf_type || 'cash'; var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0) + parseFloat(inputs.rental_income || 0) + parseFloat(inputs.dividend_income || 0) + parseFloat(inputs.st_gains || 0) + parseFloat(inputs.lt_gains || 0); var limit = dafType === 'appreciated' ? L.charitableAppreciated_agiLimit : L.charitableCash_agiLimit; var deduction = Math.min(dafAmount, agi * limit); return { applicable: true, deduction: deduction, credit: 0, category: 'Charitable Planning', strategyId: 40, name: 'Donor Advised Fund (DAF)', description: dafType + ' $' + dafAmount.toLocaleString() + ', deduction $' + deduction.toLocaleString(), inputsUsed: ['daf_contribution', 'daf_type'] }; }
function calc_CharitableRemainderTrust(inputs, year) { var L = getLimits(year); var crtFMV = parseFloat(inputs.crt_asset_fmv || 0); var crtBasis = parseFloat(inputs.crt_asset_basis || 0); var crtRate = parseFloat(inputs.crt_payout_rate || 0.05); var crtTerm = parseFloat(inputs.crt_term || 20); if (crtFMV <= 0) return { applicable: false }; var pvFactor = Math.pow(1 + L.section7520Rate, -crtTerm); var annuityFactor = (1 - pvFactor) / L.section7520Rate; var remainderFraction = Math.max(0.10, 1 - crtRate * annuityFactor); var deduction = crtFMV * remainderFraction; var gainsAvoided = Math.max(0, crtFMV - crtBasis); return { applicable: true, deduction: deduction, credit: 0, capitalGainsAvoided: gainsAvoided, category: 'Charitable Planning', strategyId: 23, name: 'Charitable Remainder Trust (CRT)', description: 'CRT $' + crtFMV.toLocaleString() + ', ' + (crtRate * 100) + '% payout, deduction $' + Math.round(deduction).toLocaleString(), inputsUsed: ['crt_asset_fmv', 'crt_asset_basis', 'crt_payout_rate', 'crt_term'] }; }
function calc_QualifiedCharitableDistribution(inputs, year) { var L = getLimits(year); var age = parseFloat(inputs.taxpayer_age || 0); if (age < L.qcd_minAge) return { applicable: false }; var qcdAmount = parseFloat(inputs.qcd_amount || 0); if (qcdAmount <= 0) return { applicable: false }; qcdAmount = Math.min(qcdAmount, L.qcd_maxAmount); return { applicable: true, deduction: 0, credit: 0, agiReduction: qcdAmount, category: 'Charitable Planning', strategyId: 22, name: 'Qualified Charitable Distribution (QCD)', description: 'QCD from IRA: $' + qcdAmount.toLocaleString() + ' (reduces AGI)', inputsUsed: ['qcd_amount'] }; }
function calc_CharitableGiftFinancing(inputs, year) { var L = getLimits(year); var giftAmount = parseFloat(inputs.charitable_financed_amount || 0); if (giftAmount <= 0) return { applicable: false }; var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0) + parseFloat(inputs.rental_income || 0) + parseFloat(inputs.dividend_income || 0); var deduction = Math.min(giftAmount, agi * L.charitableCash_agiLimit); return { applicable: true, deduction: deduction, credit: 0, category: 'Charitable Planning', strategyId: 20, name: 'Charitable Gift Financing', description: 'Financed gift $' + giftAmount.toLocaleString() + ', deduction $' + deduction.toLocaleString(), inputsUsed: ['charitable_financed_amount'] }; }
function calc_CharitableLLC(inputs, year) { var L = getLimits(year); var llcFMV = parseFloat(inputs.charitable_llc_fmv || 0); var llcBasis = parseFloat(inputs.charitable_llc_basis || 0); var llcPct = parseFloat(inputs.charitable_llc_pct || 1.0); if (llcFMV <= 0) return { applicable: false }; var donatedValue = llcFMV * llcPct; var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); var deduction = Math.min(donatedValue, agi * L.charitableAppreciated_agiLimit); var gainsAvoided = Math.max(0, (llcFMV - llcBasis) * llcPct); return { applicable: true, deduction: deduction, credit: 0, capitalGainsAvoided: gainsAvoided, category: 'Charitable Planning', strategyId: 21, name: 'Charitable LLC', description: 'Donate ' + (llcPct * 100) + '% of LLC, deduction $' + deduction.toLocaleString(), inputsUsed: ['charitable_llc_fmv', 'charitable_llc_basis', 'charitable_llc_pct'] }; }
function calc_GeneralCharitable(inputs, year) { var L = getLimits(year); var charitableAmt = parseFloat(inputs.charitable || 0); if (charitableAmt <= 0) return { applicable: false }; var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); var deduction = Math.min(charitableAmt, agi * L.charitableCash_agiLimit); return { applicable: true, deduction: deduction, credit: 0, category: 'Charitable Planning', strategyId: 22, name: 'Charitable Planning (General)', description: 'Cash charitable: $' + deduction.toLocaleString(), alreadyCaptured: true, inputsUsed: [] }; }
function calc_EducationCredits(inputs, year) { var L = getLimits(year); var filing = inputs.filing_status || 'Single'; var isMFJ = filing === 'Married Filing Jointly'; var numStudents = parseFloat(inputs.num_students || 0); var eduExpenses = parseFloat(inputs.education_expenses || 0); if (numStudents <= 0 || eduExpenses <= 0) return { applicable: false }; var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0) + parseFloat(inputs.rental_income || 0) + parseFloat(inputs.dividend_income || 0); var poStart = isMFJ ? L.aotc_phaseoutStart_mfj : L.aotc_phaseoutStart_single; var poEnd = isMFJ ? L.aotc_phaseoutEnd_mfj : L.aotc_phaseoutEnd_single; var factor = phaseoutFactor(agi, poStart, poEnd - poStart); if (factor <= 0) return { applicable: false }; var perStudent = Math.min(eduExpenses / numStudents, 4000); var aotcPerStudent = Math.min(2000, perStudent) + Math.max(0, Math.min(perStudent - 2000, 2000)) * 0.25; var totalAOTC = Math.min(aotcPerStudent * numStudents * factor, L.aotc_maxCredit * numStudents); var totalLLC = Math.min(Math.min(eduExpenses, 10000) * 0.20 * factor, L.llc_maxCredit); var bestCredit = Math.max(totalAOTC, totalLLC); var creditType = totalAOTC >= totalLLC ? 'AOTC' : 'LLC'; return { applicable: true, deduction: 0, credit: bestCredit, category: 'Education Planning', strategyId: 42, name: 'Education Credits (' + creditType + ')', description: creditType + ': $' + Math.round(bestCredit).toLocaleString() + ' for ' + numStudents + ' student(s)', refundablePortion: creditType === 'AOTC' ? bestCredit * 0.40 : 0, inputsUsed: ['num_students', 'education_expenses'] }; }
function calc_ChildDependentCareCredit(inputs, year) { var L = getLimits(year); var numDependents = parseFloat(inputs.num_care_dependents || 0); var careExpenses = parseFloat(inputs.dependent_care_expenses || 0); if (numDependents <= 0 || careExpenses <= 0) return { applicable: false }; var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); var maxExpenses = numDependents >= 2 ? L.childDependentCare_max2plus : L.childDependentCare_max1; var qualExpenses = Math.min(careExpenses, maxExpenses); var creditRate = Math.max(0.20, 0.35 - Math.max(0, agi - 15000) / 2000 * 0.01); var credit = qualExpenses * creditRate; return { applicable: true, deduction: 0, credit: credit, category: 'Personal Credits', strategyId: 24, name: 'Child & Dependent Care Credit', description: (creditRate * 100).toFixed(0) + '% of $' + qualExpenses.toLocaleString() + ' = $' + Math.round(credit).toLocaleString(), inputsUsed: ['num_care_dependents', 'dependent_care_expenses'] }; }
function calc_AdoptionCredit(inputs, year) { var L = getLimits(year); var adoptionExpenses = parseFloat(inputs.adoption_expenses || 0); var isSpecialNeeds = inputs.adoption_special_needs === 'yes'; if (adoptionExpenses <= 0 && !isSpecialNeeds) return { applicable: false }; var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); var rawCredit = isSpecialNeeds ? L.adoptionCredit_max : Math.min(adoptionExpenses, L.adoptionCredit_max); var factor = phaseoutFactor(agi, L.adoptionCredit_phaseoutStart, L.adoptionCredit_phaseoutRange); return { applicable: true, deduction: 0, credit: rawCredit * factor, category: 'Personal Credits', strategyId: 7, name: 'Adoption Tax Credit', description: 'Adoption credit: $' + Math.round(rawCredit * factor).toLocaleString(), inputsUsed: ['adoption_expenses', 'adoption_special_needs'] }; }
function calc_EVCredit(inputs, year) { var L = getLimits(year); var evType = inputs.ev_type || ''; if (!evType) return { applicable: false }; var evPrice = parseFloat(inputs.ev_price || 0); var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); var filing = inputs.filing_status || 'Single'; var incomeLimit = filing === 'Married Filing Jointly' ? L.evCredit_incomeLimit_mfj : L.evCredit_incomeLimit_single; if (agi > incomeLimit) return { applicable: false }; var credit = evType === 'new' ? L.evCredit_new_max : Math.min(evPrice * 0.30, L.evCredit_used_max); return { applicable: true, deduction: 0, credit: credit, category: 'Personal Credits', strategyId: 43, name: 'Electric Vehicle Credit', description: (evType === 'new' ? 'New' : 'Used') + ' EV credit: $' + credit.toLocaleString(), inputsUsed: ['ev_type', 'ev_price'] }; }
function calc_StudentLoanInterest(inputs, year) { var L = getLimits(year); var interest = parseFloat(inputs.student_loan_interest || 0); if (interest <= 0) return { applicable: false }; var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); var factor = phaseoutFactor(agi, L.studentLoanInterest_phaseoutStart_single, L.studentLoanInterest_phaseoutEnd_single - L.studentLoanInterest_phaseoutStart_single); var deduction = Math.min(interest, L.studentLoanInterest_max) * factor; return { applicable: true, deduction: deduction, credit: 0, isAboveLine: true, category: 'Education Planning', strategyId: 30, name: 'Student Loan Interest Deduction', description: 'Above-the-line: $' + Math.round(deduction).toLocaleString(), inputsUsed: ['student_loan_interest'] }; }
function calc_529Plan(inputs, year) { var L = getLimits(year); var contribution = parseFloat(inputs.plan529_contribution || 0); if (contribution <= 0) return { applicable: false }; var state = inputs.state || ''; var stateLimit = (L.plan529_maxStateDeduction[state] || L.plan529_maxStateDeduction['default'] || 0); if (stateLimit <= 0) return { applicable: false }; var deduction = Math.min(contribution, stateLimit); return { applicable: true, deduction: 0, credit: 0, stateDeduction: deduction, category: 'Education Planning', strategyId: 3, name: '529 Plan (State Deduction)', description: 'State deduction: $' + deduction.toLocaleString(), inputsUsed: ['plan529_contribution'] }; }

function calc_1031Exchange(inputs, year) { var salePrice = parseFloat(inputs.exchange1031_sale_price || 0); var basis = parseFloat(inputs.exchange1031_basis || 0); var replacementValue = parseFloat(inputs.exchange1031_replacement || 0); if (salePrice <= 0) return { applicable: false }; var gain = Math.max(0, salePrice - basis); var deferredGain = Math.min(gain, replacementValue); var boot = Math.max(0, salePrice - replacementValue); var taxableBoot = Math.min(boot, gain); return { applicable: true, deduction: 0, credit: 0, capitalGainsDeferred: deferredGain, category: 'Capital Gains Deferral', strategyId: 1, name: '1031 Exchange (Like-Kind)', description: 'Defer $' + deferredGain.toLocaleString() + ' in gains' + (taxableBoot > 0 ? ' (boot: $' + taxableBoot.toLocaleString() + ')' : ''), inputsUsed: ['exchange1031_sale_price', 'exchange1031_basis', 'exchange1031_replacement'] }; }
function calc_DeferredSalesTrust(inputs, year) { var salePrice = parseFloat(inputs.dst_sale_price || 0); var basis = parseFloat(inputs.dst_basis || 0); var noteTerm = parseFloat(inputs.dst_note_term || 20); var noteRate = parseFloat(inputs.dst_note_rate || 0.05); if (salePrice <= 0) return { applicable: false }; var gain = Math.max(0, salePrice - basis); var grossProfitRatio = salePrice > 0 ? gain / salePrice : 0; var annualPayment = salePrice / noteTerm; var year1Gain = annualPayment * grossProfitRatio; var deferredGain = gain - year1Gain; return { applicable: true, deduction: 0, credit: 0, capitalGainsDeferred: deferredGain, category: 'Capital Gains Deferral', strategyId: 36, name: 'Deferred Sales Trust (DST)', description: 'Defer $' + deferredGain.toLocaleString() + ' over ' + noteTerm + ' yrs', inputsUsed: ['dst_sale_price', 'dst_basis', 'dst_note_term', 'dst_note_rate'] }; }
function calc_CapitalLossHarvesting(inputs, year) { var L = getLimits(year); var stLosses = parseFloat(inputs.harvestable_st_losses || 0); var ltLosses = parseFloat(inputs.harvestable_lt_losses || 0); var stGains = parseFloat(inputs.st_gains || 0); var ltGains = parseFloat(inputs.lt_gains || 0); if (stLosses <= 0 && ltLosses <= 0) return { applicable: false }; var stOffset = Math.min(stLosses, stGains); var ltOffset = Math.min(ltLosses, ltGains); var totalNetLoss = Math.max(0, (stLosses - stGains) + (ltLosses - ltGains)); var excessDeduction = Math.min(totalNetLoss, L.capitalLoss_maxOrdinaryOffset); return { applicable: true, deduction: excessDeduction, credit: 0, stGainsReduction: stOffset, ltGainsReduction: ltOffset, category: 'Investment Tax Planning', strategyId: 17, name: 'Capital Loss Harvesting', description: 'Harvest $' + (stLosses + ltLosses).toLocaleString() + ' losses, offset gains + $' + excessDeduction.toLocaleString() + ' ordinary', inputsUsed: ['harvestable_st_losses', 'harvestable_lt_losses'] }; }
function calc_QSBS1202(inputs, year) { var L = getLimits(year); var qsbsGain = parseFloat(inputs.qsbs_gain || 0); var qsbsBasis = parseFloat(inputs.qsbs_basis || 0); var holdYears = parseFloat(inputs.qsbs_hold_years || 0); var corpAssets = parseFloat(inputs.qsbs_corp_assets || 0); if (qsbsGain <= 0 || holdYears < 5 || corpAssets > L.qsbs1202_maxCorpAssets) return { applicable: false }; var maxExclusion = Math.max(L.qsbs1202_maxExclusion, qsbsBasis * 10); var exclusion = Math.min(qsbsGain, maxExclusion) * L.qsbs1202_exclusionPct; return { applicable: true, deduction: 0, credit: 0, capitalGainsExcluded: exclusion, category: 'Capital Gains Deferral', strategyId: 14, name: 'QSBS Section 1202 Exclusion', description: 'Exclude $' + exclusion.toLocaleString() + ' QSBS gain (100%)', inputsUsed: ['qsbs_gain', 'qsbs_basis', 'qsbs_hold_years', 'qsbs_corp_assets'] }; }
function calc_CryptoOptimization(inputs, year) { var L = getLimits(year); var losses = parseFloat(inputs.crypto_unrealized_losses || 0); var gains = parseFloat(inputs.crypto_gains || 0); if (losses <= 0) return { applicable: false }; var offset = Math.min(losses, gains); var excess = Math.min(Math.max(0, losses - gains), L.capitalLoss_maxOrdinaryOffset); return { applicable: true, deduction: excess, credit: 0, stGainsReduction: offset, category: 'Investment Tax Planning', strategyId: 34, name: 'Crypto Tax-Loss Harvesting', description: 'Harvest $' + losses.toLocaleString() + ' crypto losses (no wash sale rule)', inputsUsed: ['crypto_unrealized_losses', 'crypto_gains'] }; }
function calc_Dividends(inputs, year) { var div = parseFloat(inputs.dividend_income || 0); if (div <= 0) return { applicable: false }; return { applicable: true, deduction: 0, credit: 0, category: 'Investment Tax Planning', strategyId: 39, name: 'Dividend Management', description: 'Qualified dividends taxed at LTCG rates. Consider tax-advantaged account placement.', isRecommendation: true, alreadyCaptured: true, inputsUsed: [] }; }
function calc_EmployeeStockOptions(inputs, year) { var type = inputs.stock_option_type || ''; var shares = parseFloat(inputs.stock_option_shares || 0); var exPrice = parseFloat(inputs.stock_option_exercise_price || 0); var fmv = parseFloat(inputs.stock_option_fmv || 0); if (!type || shares <= 0 || fmv <= 0) return { applicable: false }; var spread = (fmv - exPrice) * shares; if (type === 'NSO') return { applicable: true, deduction: 0, credit: 0, additionalOrdinaryIncome: spread, category: 'Investment Tax Planning', strategyId: 44, name: 'Stock Options (NSO)', description: 'NSO spread: $' + spread.toLocaleString() + ' ordinary income at exercise', isRecommendation: true, inputsUsed: ['stock_option_type', 'stock_option_shares', 'stock_option_exercise_price', 'stock_option_fmv'] }; return { applicable: true, deduction: 0, credit: 0, amtAdjustment: spread, category: 'Investment Tax Planning', strategyId: 44, name: 'Stock Options (ISO)', description: 'ISO spread: $' + spread.toLocaleString() + ' AMT adjustment. Hold 1yr+2yr for LTCG.', isRecommendation: true, inputsUsed: ['stock_option_type', 'stock_option_shares', 'stock_option_exercise_price', 'stock_option_fmv'] }; }
function calc_DayTraderTTS(inputs, year) { var losses = parseFloat(inputs.trading_losses || 0); var expenses = parseFloat(inputs.trading_expenses || 0); var numTrades = parseFloat(inputs.num_trades || 0); if (numTrades < 500 || (losses <= 0 && expenses <= 0)) return { applicable: false }; var L = getLimits(year); return { applicable: true, deduction: expenses + Math.max(0, losses - L.capitalLoss_maxOrdinaryOffset), credit: 0, category: 'Investment Tax Planning', strategyId: 35, name: 'Trader Tax Status (475 MTM)', description: 'TTS: losses fully deductible ($' + losses.toLocaleString() + ') + $' + expenses.toLocaleString() + ' expenses', inputsUsed: ['trading_losses', 'trading_expenses', 'num_trades'] }; }
function calc_ChoiceOfEntity(inputs, year) { var bizIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); if (bizIncome <= 0) return { applicable: false }; var L = getLimits(year); var filing = inputs.filing_status || 'Single'; var f = filing === 'Married Filing Jointly' ? 'married_joint' : 'single'; var margRate = getMarginalRate(bizIncome, f, year); var solePropTax = bizIncome * L.seTaxRate * 0.9235 + bizIncome * margRate; var salary = bizIncome * 0.60; var sCorpPayroll = salary * L.seTaxRate; var dist = bizIncome - salary; var qbiPOS = filing === 'Married Filing Jointly' ? L.qbiPhaseoutStart_mfj : L.qbiPhaseoutStart_single; var qbiPOE = filing === 'Married Filing Jointly' ? L.qbiPhaseoutEnd_mfj : L.qbiPhaseoutEnd_single; var qbiFactor = phaseoutFactor(bizIncome, qbiPOS, qbiPOE - qbiPOS); var qbiDed = dist * L.qbiDeduction_pct * qbiFactor; var sCorpTotal = sCorpPayroll + (bizIncome - qbiDed) * margRate; var cCorpTotal = bizIncome * 0.21 + bizIncome * 0.70 * 0.238; var seSavings = solePropTax - sCorpTotal; var bestEntity = 'S-Corp'; var bestSavings = seSavings; if (cCorpTotal < sCorpTotal && cCorpTotal < solePropTax) { bestEntity = 'C-Corp'; bestSavings = solePropTax - cCorpTotal; } return { applicable: seSavings > 0 || cCorpTotal < solePropTax, deduction: qbiDed, credit: 0, payrollSavings: bestEntity === 'S-Corp' ? (bizIncome - salary) * L.seTaxRate * 0.9235 : 0, category: 'Entity Planning', strategyId: 26, name: 'Choice of Entity Analysis', description: 'Recommended: ' + bestEntity + '. Savings vs sole prop: $' + Math.round(bestSavings).toLocaleString() + '/yr', entityComparison: { soleProprietor: Math.round(solePropTax), sCorp: Math.round(sCorpTotal), cCorp: Math.round(cCorpTotal) }, inputsUsed: [] }; }
function calc_CCorpDeductions(inputs, year) { if ((inputs.entity_type || '') !== 'c_corp') return { applicable: false }; var fringe = parseFloat(inputs.ccorp_fringe_benefits || 0); if (fringe <= 0) return { applicable: false }; var L = getLimits(year); return { applicable: true, deduction: fringe, credit: 0, payrollSavings: fringe * L.accountablePlan_ficaRate, category: 'Entity Planning', strategyId: 13, name: 'C Corp Fringe Benefits', description: 'Fringe benefits: $' + fringe.toLocaleString() + ' (deductible + excluded)', inputsUsed: ['entity_type', 'ccorp_fringe_benefits'] }; }
function calc_CCorpStateTax(inputs, year) { if ((inputs.entity_type || '') !== 'c_corp') return { applicable: false }; return { applicable: true, deduction: 0, credit: 0, category: 'Entity Planning', strategyId: 15, name: 'C Corp State Tax Planning', description: 'Consider state tax advantages of C-Corp structure.', isRecommendation: true, inputsUsed: ['entity_type'] }; }
function calc_ContentCreator(inputs, year) { var seIncome = parseFloat(inputs.se_income || 0); if (seIncome < 50000) return { applicable: false }; var result = calc_ChoiceOfEntity(inputs, year); if (!result.applicable) return { applicable: false }; result.strategyId = 31; result.name = 'Content Creator Optimization'; return result; }
function calc_ActiveRealEstateParticipation(inputs, year) { var L = getLimits(year); var rentalIncome = parseFloat(inputs.rental_income || 0); if (rentalIncome >= 0) return { applicable: false }; var rentalLoss = Math.abs(rentalIncome); var agi = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0) + parseFloat(inputs.dividend_income || 0); var isREPS = inputs.reps_status === 'yes'; var reHours = parseFloat(inputs.re_hours || 0); var allowableLoss; if (isREPS || reHours >= 750) { allowableLoss = rentalLoss; } else { var factor = phaseoutFactor(agi, 100000, 50000); allowableLoss = Math.min(25000, rentalLoss) * factor; } if (allowableLoss <= 0) return { applicable: false }; return { applicable: true, deduction: allowableLoss, credit: 0, category: 'Real Estate', strategyId: 6, name: (isREPS || reHours >= 750) ? 'RE Professional Status' : 'Active RE Participation', description: (isREPS || reHours >= 750) ? 'REPS: full $' + allowableLoss.toLocaleString() + ' loss deductible' : '$' + allowableLoss.toLocaleString() + ' of $' + rentalLoss.toLocaleString() + ' loss allowed', inputsUsed: ['reps_status', 're_hours'] }; }
function calc_EstatePlanning(inputs, year) { var L = getLimits(year); var netWorth = parseFloat(inputs.net_worth || 0); if (netWorth < L.lifetimeEstatExemption * 0.5) return { applicable: false }; var numBen = Math.max(1, parseFloat(inputs.num_beneficiaries || 2)); var annualGifts = numBen * L.annualGiftExclusion; var potentialTax = Math.max(0, netWorth - L.lifetimeEstatExemption) * L.estateGiftTaxRate; return { applicable: true, deduction: 0, credit: 0, category: 'Estate Planning', strategyId: 49, name: 'Estate Planning & Wealth Transfer', description: 'Estate exposure: $' + Math.round(potentialTax).toLocaleString() + '. Annual gifts: $' + annualGifts.toLocaleString() + '/yr.' + (year === '2026' ? ' Exemption drops to $7M in 2026!' : ''), isRecommendation: true, inputsUsed: ['net_worth', 'num_beneficiaries'] }; }
function calc_FamilyLimitedPartnership(inputs, year) { var L = getLimits(year); var netWorth = parseFloat(inputs.net_worth || 0); var flpAssets = parseFloat(inputs.flp_assets || 0); if (flpAssets <= 0 && netWorth < 2000000) return { applicable: false }; if (flpAssets <= 0) flpAssets = netWorth * 0.30; var discountedValue = flpAssets * 0.70; var estateSavings = (flpAssets - discountedValue) * L.estateGiftTaxRate; return { applicable: true, deduction: 0, credit: 0, category: 'Estate Planning', strategyId: 50, name: 'Family Limited Partnership (FLP)', description: 'FLP: $' + flpAssets.toLocaleString() + ' at 30% discount. Estate savings: $' + Math.round(estateSavings).toLocaleString(), isRecommendation: true, inputsUsed: ['flp_assets'] }; }
function calc_ESOP(inputs, year) { var L = getLimits(year); var bizValue = parseFloat(inputs.business_value || 0); var payroll = parseFloat(inputs.eligible_payroll || 0); if (bizValue <= 0) return { applicable: false }; var esopPct = parseFloat(inputs.esop_pct || 0.30); var saleAmount = bizValue * esopPct; var annualDed = Math.min(payroll * L.esop_maxContribPct, saleAmount / 10); return { applicable: true, deduction: annualDed, credit: 0, capitalGainsDeferred: saleAmount, category: 'Business Sale Planning', strategyId: 45, name: 'ESOP', description: 'Sell ' + (esopPct * 100) + '% to ESOP. Deduction: $' + annualDed.toLocaleString() + '/yr', inputsUsed: ['business_value', 'eligible_payroll', 'esop_pct'] }; }
function calc_CorporateVUL(inputs, year) { var totalIncome = parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0) + parseFloat(inputs.w2_wages || 0); if (totalIncome < 250000) return { applicable: false }; var premium = parseFloat(inputs.vul_premium || 0) || 50000; return { applicable: true, deduction: 0, credit: 0, category: 'Retirement Planning', strategyId: 32, name: 'Corporate VUL ("No-Limits Roth")', description: 'Tax-free growth + loans. Premium: $' + premium.toLocaleString() + '/yr. Consult licensed advisor.', isRecommendation: true, inputsUsed: ['vul_premium'] }; }
function calc_AmendedReturns(inputs, year) { var missed = parseFloat(inputs.missed_deductions || 0); if (missed <= 0) return { applicable: false }; var filing = inputs.filing_status || 'Single'; var income = parseFloat(inputs.w2_wages || 0) + parseFloat(inputs.se_income || 0) + parseFloat(inputs.biz_revenue || 0); var rate = getMarginalRate(income, filing === 'Married Filing Jointly' ? 'married_joint' : 'single', year); return { applicable: true, deduction: 0, credit: 0, category: 'Tax Filing', strategyId: 8, name: 'Amend Prior Year Returns', description: 'Potential refund: $' + Math.round(missed * rate).toLocaleString() + ' from $' + missed.toLocaleString() + ' missed deductions', isRecommendation: true, inputsUsed: ['missed_deductions'] }; }
function calc_CODIncome(inputs, year) { var debt = parseFloat(inputs.cancelled_debt || 0); if (debt <= 0) return { applicable: false }; var isInsolvent = inputs.is_insolvent === 'yes'; var insolvencyAmt = parseFloat(inputs.insolvency_amount || 0); var exclusion = isInsolvent ? Math.min(debt, insolvencyAmt) : 0; return { applicable: true, deduction: exclusion, credit: 0, category: 'Tax Filing', strategyId: 16, name: 'Cancellation of Debt Exclusion', description: exclusion > 0 ? 'Insolvency exclusion: $' + exclusion.toLocaleString() : 'COD $' + debt.toLocaleString() + ' taxable. Check insolvency.', inputsUsed: ['cancelled_debt', 'is_insolvent', 'insolvency_amount'] }; }

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



// --- Initialization ---
buildQuestions();
loadStrategies();
loadTaxBrackets();




