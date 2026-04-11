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
// ================================================================

const questions = {
  income: [
    {
      id: 'w2_employee', text: 'Are you a W-2 employee?', trigger: 'w2_employee',
      followUp: [{
        id: 'w2_amount', text: 'How much do you earn from W-2 jobs?', trigger: 'w2_employee',
        inputField: { type: 'number', placeholder: 'e.g. 150,000', label: 'Annual W-2 Income ($)', mapTo: 'w2_wages' }
      }]
    },
    {
      id: 'multiple_income', text: 'Do you have multiple sources of income?', trigger: 'multiple_income',
      followUp: [
        { id: 'has_rental', text: 'Do you own rental properties?', trigger: 'rental_property',
          inputField: { type: 'number', placeholder: 'e.g. 50,000', label: 'Annual Rental Income ($)', mapTo: 'rental_income' } },
        { id: 'has_business', text: 'Do you own a business?', trigger: 'has_business',
          inputField: { type: 'number', placeholder: 'e.g. 100,000', label: 'Annual Business Distributions ($)', mapTo: 'biz_revenue' } },
        { id: 'has_self_employment', text: 'Do you have self-employment income?', trigger: 'self_employed',
          inputField: { type: 'number', placeholder: 'e.g. 75,000', label: 'Annual Self-Employment Income ($)', mapTo: 'se_income' } },
        { id: 'has_retirement_income', text: 'Are you receiving retirement benefits?', trigger: 'retirement_income',
          inputField: { type: 'number', placeholder: 'e.g. 40,000', label: 'Annual Retirement Income ($)', mapTo: 'retirement_distributions' } },
        { id: 'has_dividend_income', text: 'Do you receive significant dividend income?', trigger: 'dividend_income',
          inputField: { type: 'number', placeholder: 'e.g. 25,000', label: 'Annual Dividend Income ($)', mapTo: 'dividend_income' } }
      ]
    },
    { id: 'variable_income', text: 'Does your income vary significantly year to year?', trigger: 'variable_income' }
  ],
  investments: [
    { id: 'appreciated_asset', text: 'Do you have appreciated assets (stocks, property, etc.)?', trigger: 'appreciated_asset' },
    { id: 'stock_options', text: 'Do you have stock options (ISO or NSO)?', trigger: 'stock_options' }
  ],
  brooklyn: [
    { id: 'advisor_managed', text: 'Will your account be advisor managed or Brooklyn managed? (suggested: Brooklyn managed)', trigger: 'advisor_managed' },
    {
      id: 'beta_selection_q', text: 'What beta selection would you like?', trigger: 'beta_chosen',
      showWhen: function(a) { return a.advisor_managed === false; },
      choiceType: 'select',
      choices: [
        { label: 'Beta 1 (S&P 500)', value: '1' },
        { label: 'Beta 0.5 (CASH/S&P 500)', value: '0.5' },
        { label: 'Beta 0 (Zero Beta)', value: '0' }
      ]
    },
    { id: 'custom_leverage', text: 'Are you interested in a custom leverage structure?', trigger: 'custom_leverage' },
    {
      id: 'preset_leverage_q', text: 'Select a pre-set leverage strategy:', trigger: 'preset_chosen',
      showWhen: function(a) { return a.custom_leverage === false; },
      choiceType: 'leverage_preset'
    }
  ],
  oilgas: [
    { id: 'interested_oil_gas', text: 'Are you interested in oil & gas investments for income offset?', trigger: 'interested_oil_gas' }
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
  income: 'q-income', investments: 'q-investments', brooklyn: 'q-brooklyn',
  oilgas: 'q-oilgas', realestate: 'q-realestate', retirement: 'q-retirement', business: 'q-business'
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
    if (mapTo) syncToPage2(mapTo, raw);
  });
  input.addEventListener('focus', function() {
    var raw = parseCurrencyInput(this.value);
    if (raw && raw !== '0') this.value = raw;
  });
  input.addEventListener('input', function() {
    if (mapTo) syncToPage2(mapTo, parseCurrencyInput(this.value));
  });
}

// Setup currency formatting on Page 2 number inputs
function setupPage2CurrencyInputs() {
  var currencyFields = ['w2_wages','se_income','biz_revenue','rental_income','dividend_income',
    'retirement_distributions','st_gains','lt_gains','unrealized_losses','portfolio_value',
    'property_values','charitable','salt','retirement_contrib','available_capital','oil_gas_max'];
  currencyFields.forEach(function(fieldId) {
    var el = document.getElementById(fieldId);
    if (!el || el.dataset.currencySetup) return;
    el.dataset.currencySetup = 'true';
    el.type = 'text';
    el.addEventListener('blur', function() {
      var raw = parseCurrencyInput(this.value);
      var num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        this.value = formatCurrency(num);
      }
    });
    el.addEventListener('focus', function() {
      var raw = parseCurrencyInput(this.value);
      if (raw && raw !== '0') this.value = raw;
      else this.value = '';
    });
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
  if (fq.inputField) { renderInlineInput(card, fq); }
  container.appendChild(card);
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
  input.style.cssText = 'width:100%;padding:10px 12px;margin-top:4px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1628;color:#e0e0e0;font-size:1em;';
  if (q.inputField.mapTo) { setupCurrencyInput(input, q.inputField.mapTo); }
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
  sel.style.cssText = 'padding:10px 14px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1628;color:#e0e0e0;font-size:0.95em;min-width:200px;';
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
    // Auto-fill max leverage from strategy data
    autoFillLeverage();
    rebuildConditionalSections();
    buildSectionQuestions('brooklyn');
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
  sel.style.cssText = 'padding:10px 14px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1628;color:#e0e0e0;font-size:0.95em;min-width:200px;';
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
    // Auto-fill leverage on Page 2
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
    var levEl2 = document.getElementById('max_leverage');
    if (levEl2 && !levEl2.value) levEl2.value = strat.dataPoints[0].leverage;
  }
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
  if (section === 'brooklyn' || trigger === 'advisor_managed' || trigger === 'custom_leverage') {
    buildSectionQuestions('brooklyn');
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

function syncToPage2(fieldId, value) {
  var el = document.getElementById(fieldId);
  if (el) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function syncPage2Visibility() {
  var fieldVisibility = {
    w2_employee: ['w2_wages'],
    self_employed: ['se_income'],
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
    'dividend_income','retirement_distributions','st_gains','lt_gains','unrealized_losses','portfolio_value',
    'property_values','charitable','salt','retirement_contrib','taxpayer_age','state',
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

// --- Initialization ---
buildQuestions();
loadStrategies();
loadTaxBrackets();
