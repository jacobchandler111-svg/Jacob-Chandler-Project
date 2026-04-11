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

// Compute Delphi allocation for a given investment amount and class
// Returns an object with each tax character's dollar impact
// investmentDate is optional; if provided, time-weights the allocation
function computeDelphiAllocation(classKey, investmentAmount, investmentDate) {
  const fund = DELPHI_STRATEGIES[classKey];
  if (!fund) return null;
  const alloc = fund.allocations;

  // Time-weighting: fraction of the year remaining from investment date
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

// Get Delphi minimum investment for a given class
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
  return Math.max(lowerMin, upperMin);
}

// ============================================================
// SECTION 2: TAX CALCULATION ENGINE (Multi-Year + State)
// ============================================================

// Dynamic tax data loaded from taxBrackets.json
let TAX_DATA = null;

// Hardcoded fallback for 2026 federal (backwards compatibility)
const TAX_BRACKETS_2026_FALLBACK = {
  single: [[11600,0.10],[47150,0.12],[100525,0.22],[191950,0.24],[243725,0.32],[609350,0.35],[Infinity,0.37]],
  married_joint: [[23200,0.10],[94300,0.12],[201050,0.22],[383900,0.24],[487450,0.32],[731200,0.35],[Infinity,0.37]],
  married_separate: [[11600,0.10],[47150,0.12],[100525,0.22],[191950,0.24],[243725,0.32],[365600,0.35],[Infinity,0.37]],
  head_household: [[16550,0.10],[63100,0.12],[100500,0.22],[191950,0.24],[243700,0.32],[609350,0.35],[Infinity,0.37]]
};
const STANDARD_DEDUCTION_2026_FALLBACK = { single: 15000, married_joint: 30000, married_separate: 15000, head_household: 22500 };
const LTCG_RATES_FALLBACK = {
  single: [[47025,0],[518900,0.15],[Infinity,0.20]],
  married_joint: [[94050,0],[583750,0.15],[Infinity,0.20]]
};

// Load tax brackets from JSON file
async function loadTaxBrackets() {
  const paths = ['data/taxBrackets.json', '../data/taxBrackets.json', './data/taxBrackets.json'];
  for (const p of paths) {
    try {
      const r = await fetch(p);
      if (r.ok) {
        TAX_DATA = await r.json();
        // Convert 999999999 sentinel values to Infinity for bracket calculations
        convertSentinelsToInfinity(TAX_DATA);
        console.log('Tax brackets loaded for years:', Object.keys(TAX_DATA.federal));
        console.log('State tax data loaded for years:', Object.keys(TAX_DATA.state));
        return;
      }
    } catch (e) {}
  }
  console.warn('Failed to load taxBrackets.json - using hardcoded 2026 federal fallback');
}

// Convert 999999999 values to Infinity throughout the tax data
function convertSentinelsToInfinity(data) {
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 999999999) {
        data[i] = Infinity;
      } else if (typeof data[i] === 'object') {
        convertSentinelsToInfinity(data[i]);
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    for (const key of Object.keys(data)) {
      if (data[key] === 999999999) {
        data[key] = Infinity;
      } else if (typeof data[key] === 'object') {
        convertSentinelsToInfinity(data[key]);
      }
    }
  }
}

// Get the selected tax year (defaults to 2026)
function getSelectedTaxYear() {
  const el = document.getElementById('tax_year');
  return el ? el.value : '2026';
}

// Get the selected state code
function getSelectedState() {
  const el = document.getElementById('state');
  return el ? el.value : '';
}

// --- Tax Data Accessor Functions ---

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

// --- Federal Tax Calculations ---

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

// --- State Tax Calculation ---

function calculateStateTax(taxableIncome, stateCode, year, filing) {
  if (!TAX_DATA || !stateCode || stateCode === '' || stateCode === 'none') return 0;
  year = year || getSelectedTaxYear();
  filing = filing || 'single';
  const stateYearData = TAX_DATA.state[year];
  if (!stateYearData) return 0;
  const stateData = stateYearData[stateCode];
  if (!stateData || stateData.noIncomeTax) return 0;

  // Get the brackets for this filing status (fall back to single)
  const brackets = stateData.brackets ? (stateData.brackets[filing] || stateData.brackets.single) : null;
  if (!brackets || brackets.length === 0) return 0;

  // Apply state standard deduction if available
  const stateSD = stateData.standardDeduction ? (stateData.standardDeduction[filing] || stateData.standardDeduction.single || 0) : 0;
  const stateTaxable = Math.max(0, taxableIncome - stateSD);

  let tax = 0, prev = 0;
  for (const [limit, rate] of brackets) {
    if (stateTaxable <= prev) break;
    tax += (Math.min(stateTaxable, limit) - prev) * rate;
    prev = limit;
  }

  // Apply surcharges (CA Mental Health, MA Millionaire, etc.)
  if (stateData.mentalHealthSurcharge && taxableIncome > stateData.mentalHealthSurcharge.threshold) {
    tax += (taxableIncome - stateData.mentalHealthSurcharge.threshold) * stateData.mentalHealthSurcharge.rate;
  }
  if (stateData.millionaireSurcharge && taxableIncome > stateData.millionaireSurcharge.threshold) {
    tax += (taxableIncome - stateData.millionaireSurcharge.threshold) * stateData.millionaireSurcharge.rate;
  }

  return tax;
}

// Calculate WA capital gains tax (special case - no income tax but has cap gains tax)
function calculateWaCapGainsTax(ltGains, stateCode, year) {
  if (stateCode !== 'WA' || !TAX_DATA) return 0;
  year = year || getSelectedTaxYear();
  const stateYearData = TAX_DATA.state[year];
  if (!stateYearData || !stateYearData.WA || !stateYearData.WA.capitalGainsTax) return 0;
  const cgt = stateYearData.WA.capitalGainsTax;
  if (ltGains > cgt.threshold) {
    return (ltGains - cgt.threshold) * cgt.rate;
  }
  return 0;
}

// --- Baseline & Strategy Tax Computation ---

function computeBaselineTax(inputs) {
  const fm = {
    'Single': 'single', 'Married Filing Jointly': 'married_joint',
    'Married Filing Separately': 'married_separate', 'Head of Household': 'head_household'
  };
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

  // Federal tax
  let federalTax = calculateTax(taxableOrdinary, f, year);
  federalTax += calculateLtcgTax(ltg, taxableOrdinary, f, year);
  if (se > 0) federalTax += se * getSeTaxMultiplier(year) * getSeTaxRate(year);
  const niitThreshold = getNiitThreshold(year, f);
  if (totalIncome > niitThreshold) {
    federalTax += Math.min(div + ltg + stg + rent, totalIncome - niitThreshold) * 0.038;
  }

  // State tax
  let stateTax = calculateStateTax(ordinaryIncome, stateCode, year, f);
  stateTax += calculateWaCapGainsTax(ltg, stateCode, year);

  const totalTax = federalTax + stateTax;

  return {
    tax: Math.round(totalTax),
    federalTax: Math.round(federalTax),
    stateTax: Math.round(stateTax),
    totalIncome: Math.round(totalIncome),
    ordinaryIncome: Math.round(ordinaryIncome),
    taxableOrdinary: Math.round(taxableOrdinary),
    filing: f,
    year: year,
    state: stateCode
  };
}

function computeTaxAfterStrategies(inputs, totalSTLosses, oilGasOffset) {
  const fm = {
    'Single': 'single', 'Married Filing Jointly': 'married_joint',
    'Married Filing Separately': 'married_separate', 'Head of Household': 'head_household'
  };
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

  let remainingLoss = totalSTLosses;
  let adjStg = stg;
  let adjLtg = ltg;

  const stOffset = Math.min(remainingLoss, adjStg);
  adjStg -= stOffset;
  remainingLoss -= stOffset;

  const ltOffset = Math.min(remainingLoss, adjLtg);
  adjLtg -= ltOffset;
  remainingLoss -= ltOffset;

  const ordinaryOffset = Math.min(remainingLoss, 3000);
  remainingLoss -= ordinaryOffset;

  const ogOffset = oilGasOffset || 0;

  const ordinaryIncome = w2 + se + biz + rent + div + adjStg - ordinaryOffset - ogOffset;
  const totalIncome = ordinaryIncome + adjLtg;
  const sd = getStandardDeduction(year, f);
  const taxableOrdinary = Math.max(0, ordinaryIncome - sd);

  let federalTax = calculateTax(taxableOrdinary, f, year);
  federalTax += calculateLtcgTax(adjLtg, taxableOrdinary, f, year);
  if (se > 0) federalTax += se * getSeTaxMultiplier(year) * getSeTaxRate(year);
  const niitThreshold = getNiitThreshold(year, f);
  const niitIncome = ordinaryIncome + adjLtg;
  if (niitIncome > niitThreshold) {
    federalTax += Math.min(div + adjLtg + adjStg + rent, niitIncome - niitThreshold) * 0.038;
  }

  let stateTax = calculateStateTax(ordinaryIncome, stateCode, year, f);
  stateTax += calculateWaCapGainsTax(adjLtg, stateCode, year);

  const totalTax = federalTax + stateTax;

  return {
    tax: Math.round(totalTax),
    federalTax: Math.round(federalTax),
    stateTax: Math.round(stateTax),
    totalIncome: Math.round(totalIncome),
    carryForwardLoss: Math.round(remainingLoss)
  };
}
// ================================================================
// ================================================================

// ================================================================
// SECTION 3: SOLVER FRAMEWORK (Brooklyn + Oil & Gas)
// ================================================================

function solveOptimalAllocation(inputs, enabledStrategies, availableCapital, maxLeverage, implementationDate) {
  const baseline = computeBaselineTax(inputs);
  let bestTax = baseline.tax;
  let bestAllocation = [];
  let bestLosses = 0;
  let bestOilGasOffset = 0;

  const ogMaxInvest = parseFloat(inputs.oil_gas_max || 0);
  const ogRate = parseFloat(inputs.oil_gas_rate || 0.95);

  const strategies = enabledStrategies.filter(s => {
    const strat = BROOKLYN_STRATEGIES[s.key];
    return strat != null;
  });

  const steps = 20;
  const ogSteps = 10;

  for (const s of strategies) {
    const strat = BROOKLYN_STRATEGIES[s.key];
    if (!strat) continue;
    const maxBrooklyn = Math.min(availableCapital, s.maxInvestment || availableCapital);

    for (let bStep = 0; bStep <= steps; bStep++) {
      const brooklynInvest = (maxBrooklyn / steps) * bStep;
      const lev = s.customLeverage || maxLeverage || 0.3;
      const leverageMinInvestment = getMinInvestmentForLeverage(s.key, lev);
      if (brooklynInvest > 0 && brooklynInvest < leverageMinInvestment) continue;

      const losses = computeBrooklynLoss(s.key, lev, brooklynInvest, implementationDate);

      const remainingForOG = Math.min(ogMaxInvest, availableCapital - brooklynInvest);
      const ogMax = Math.max(0, remainingForOG);
      const ogStepSize = ogMax > 0 ? ogMax / ogSteps : 0;

      for (let ogStep = 0; ogStep <= (ogMax > 0 ? ogSteps : 0); ogStep++) {
        const ogInvest = ogStepSize * ogStep;
        const ogOffset = ogInvest * ogRate;

        const result = computeTaxAfterStrategies(inputs, losses, ogOffset);
        if (result.tax < bestTax) {
          bestTax = result.tax;
          bestAllocation = [{
            key: s.key, leverage: lev, investment: brooklynInvest,
            losses: losses, oilGasInvestment: ogInvest, oilGasOffset: ogOffset
          }];
          bestLosses = losses;
          bestOilGasOffset = ogOffset;
        }
      }
    }
  }

  // Oil & Gas only (no Brooklyn)
  if (ogMaxInvest > 0) {
    const ogOnlyMax = Math.min(ogMaxInvest, availableCapital);
    const ogOnlyStep = ogOnlyMax / ogSteps;
    for (let ogStep = 1; ogStep <= ogSteps; ogStep++) {
      const ogInvest = ogOnlyStep * ogStep;
      const ogOffset = ogInvest * ogRate;
      const result = computeTaxAfterStrategies(inputs, 0, ogOffset);
      if (result.tax < bestTax) {
        bestTax = result.tax;
        bestAllocation = [{
          key: null, leverage: 0, investment: 0, losses: 0,
          oilGasInvestment: ogInvest, oilGasOffset: ogOffset
        }];
        bestLosses = 0;
        bestOilGasOffset = ogOffset;
      }
    }
  }

  // Minimum Leverage Optimization
  if (bestAllocation.length > 0 && bestAllocation[0].key) {
    const bestEntry = bestAllocation[0];
    const targetTax = bestTax;
    let minLev = bestEntry.leverage;
    let minLevAllocation = bestEntry;
    const leverageStep = 0.05;
    for (let tryLev = bestEntry.leverage - leverageStep; tryLev >= 0; tryLev = Math.round((tryLev - leverageStep) * 100) / 100) {
      const leverageMinInvestment = getMinInvestmentForLeverage(bestEntry.key, tryLev);
      if (bestEntry.investment > 0 && bestEntry.investment < leverageMinInvestment) continue;
      const losses = computeBrooklynLoss(bestEntry.key, tryLev, bestEntry.investment, implementationDate);
      const result = computeTaxAfterStrategies(inputs, losses, bestEntry.oilGasOffset || 0);
      if (result.tax <= targetTax + 100) {
        minLev = tryLev;
        minLevAllocation = {
          key: bestEntry.key, leverage: tryLev, investment: bestEntry.investment,
          losses: losses, oilGasInvestment: bestEntry.oilGasInvestment || 0, oilGasOffset: bestEntry.oilGasOffset || 0
        };
      } else {
        break;
      }
    }
    if (minLev < bestEntry.leverage) {
      bestAllocation[0].minLeverageOption = minLevAllocation;
    }
  }

  const totalInvestment = bestAllocation.length > 0
    ? (bestAllocation[0].investment || 0) + (bestAllocation[0].oilGasInvestment || 0)
    : 0;

  return {
    baselineTax: baseline.tax,
    baselineFederalTax: baseline.federalTax,
    baselineStateTax: baseline.stateTax,
    optimizedTax: bestTax,
    savings: baseline.tax - bestTax,
    allocation: bestAllocation,
    totalLosses: bestLosses,
    totalOilGasOffset: bestOilGasOffset,
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
      id: 'w2_employee',
      text: 'Are you a W-2 employee?',
      trigger: 'w2_employee',
      followUp: [
        {
          id: 'w2_amount',
          text: 'How much do you earn from W-2 jobs?',
          trigger: 'w2_employee',
          inputField: { type: 'number', placeholder: 'e.g. 150000', label: 'Annual W-2 Income ($)', mapTo: 'w2_wages' }
        }
      ]
    },
    {
      id: 'multiple_income',
      text: 'Do you have multiple sources of income?',
      trigger: 'multiple_income',
      followUp: [
        { id: 'has_rental', text: 'Do you own rental properties?', trigger: 'rental_property' },
        { id: 'has_business', text: 'Do you own a business?', trigger: 'has_business' },
        { id: 'has_self_employment', text: 'Do you have self-employment income?', trigger: 'self_employed' },
        { id: 'has_retirement_income', text: 'Are you receiving retirement benefits or distributions?', trigger: 'retirement_income' },
        { id: 'has_dividend_income', text: 'Do you receive significant dividend income?', trigger: 'dividend_income' }
      ]
    },
    { id: 'high_income', text: 'Is your annual income above $250,000?', trigger: 'high_income' },
    { id: 'variable_income', text: 'Does your income vary significantly year to year?', trigger: 'variable_income' }
  ],
  investments: [
    { id: 'appreciated_asset', text: 'Do you have appreciated assets (stocks, property, etc.)?', trigger: 'appreciated_asset' },
    { id: 'stock_options', text: 'Do you have stock options (ISO or NSO)?', trigger: 'stock_options' }
  ],
  brooklyn: [
    { id: 'advisor_managed', text: 'Do you want an advisor-managed strategy?', trigger: 'advisor_managed' },
    { id: 'custom_leverage', text: 'Do you want to set a custom leverage level?', trigger: 'custom_leverage' }
  ],
  oilgas: [
    { id: 'interested_oil_gas', text: 'Are you interested in oil & gas investments for income offset?', trigger: 'interested_oil_gas' }
  ],
  realestate: [
    { id: 'real_estate_sale', text: 'Are you planning to sell real estate this year?', trigger: 'real_estate_sale' },
    {
      id: 'cost_segregation', text: 'Have you considered cost segregation for rental properties?',
      trigger: 'cost_segregation',
      showWhen: function(answers) { return answers.rental_property === true; }
    },
    { id: 'opportunity_zone', text: 'Are you interested in Opportunity Zone investments?', trigger: 'opportunity_zone' }
  ],
  retirement: [
    { id: 'retirement_planning', text: 'Are you actively planning for retirement?', trigger: 'retirement_planning' },
    { id: 'over_50', text: 'Are you over 50 years old?', trigger: 'over_50' },
    { id: 'max_401k', text: 'Are you maximizing your 401(k) contributions?', trigger: 'max_401k' }
  ],
  business: [
    {
      id: 'business_owner', text: 'Do you own or operate a business?', trigger: 'has_business',
      followUp: [
        { id: 'is_s_corp', text: 'Is your business an S Corporation?', trigger: 's_corp' },
        { id: 'is_partnership', text: 'Are you in a partnership or LLC?', trigger: 'partnership' }
      ]
    },
    { id: 's_corp', text: 'Is your business an S Corporation?', trigger: 's_corp', showWhen: function(answers) { return answers.has_business === true; } },
    { id: 'partnership', text: 'Are you in a partnership or LLC?', trigger: 'partnership', showWhen: function(answers) { return answers.has_business === true; } }
  ]
};

const sectionMap = {
  income: 'q-income', investments: 'q-investments', brooklyn: 'q-brooklyn',
  oilgas: 'q-oilgas', realestate: 'q-realestate', retirement: 'q-retirement', business: 'q-business'
};

let userAnswers = {};
let strategiesData = [];
// --- Build Questions with Conditional Logic ---
function buildQuestions() {
  Object.keys(questions).forEach(section => {
    const container = document.getElementById(sectionMap[section]);
    if (!container) return;
    container.innerHTML = '';
    questions[section].forEach(q => {
      if (q.showWhen && !q.showWhen(userAnswers)) return;
      renderQuestion(container, q, section);
    });
  });
}

function renderQuestion(container, q, section) {
  const card = document.createElement('div');
  card.className = 'question-card';
  card.setAttribute('data-question', q.id);
  const textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = q.text;
  card.appendChild(textDiv);
  const toggleDiv = document.createElement('div');
  toggleDiv.className = 'toggle-group';
  const yesBtn = document.createElement('button');
  yesBtn.className = 'toggle-btn yes' + (userAnswers[q.trigger] === true ? ' selected' : '');
  yesBtn.textContent = 'Yes';
  yesBtn.onclick = function() { setAnswer(q.id, q.trigger, true, this, q, section); };
  const noBtn = document.createElement('button');
  noBtn.className = 'toggle-btn no' + (userAnswers[q.trigger] === false ? ' selected' : '');
  noBtn.textContent = 'No';
  noBtn.onclick = function() { setAnswer(q.id, q.trigger, false, this, q, section); };
  toggleDiv.appendChild(yesBtn);
  toggleDiv.appendChild(noBtn);
  card.appendChild(toggleDiv);
  container.appendChild(card);
  if (q.followUp && userAnswers[q.trigger] === true) {
    const followContainer = document.createElement('div');
    followContainer.className = 'follow-up-container';
    followContainer.id = 'followup-' + q.id;
    q.followUp.forEach(fq => { renderFollowUpQuestion(followContainer, fq, section); });
    container.appendChild(followContainer);
  }
}

function renderFollowUpQuestion(container, fq, section) {
  const card = document.createElement('div');
  card.className = 'follow-up-question';
  card.setAttribute('data-question', fq.id);
  const textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = fq.text;
  card.appendChild(textDiv);
  const toggleDiv = document.createElement('div');
  toggleDiv.className = 'toggle-group';
  const yesBtn = document.createElement('button');
  yesBtn.className = 'toggle-btn yes' + (userAnswers[fq.trigger] === true ? ' selected' : '');
  yesBtn.textContent = 'Yes';
  yesBtn.onclick = function() { setAnswer(fq.id, fq.trigger, true, this, fq, section); };
  const noBtn = document.createElement('button');
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
  const inputDiv = document.createElement('div');
  inputDiv.className = 'inline-input-container';
  inputDiv.id = 'input-wrap-' + q.id;
  inputDiv.style.display = userAnswers[q.trigger] === true ? 'block' : 'none';
  inputDiv.style.marginTop = '10px';
  const label = document.createElement('label');
  label.textContent = q.inputField.label;
  label.style.color = '#b0bec5';
  label.style.fontSize = '0.9em';
  const input = document.createElement('input');
  input.type = q.inputField.type || 'text';
  input.placeholder = q.inputField.placeholder || '';
  input.id = 'inline-' + q.id;
  input.style.cssText = 'width:100%;padding:8px;margin-top:4px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1628;color:#e0e0e0;';
  if (q.inputField.mapTo) {
    input.addEventListener('input', function() { syncToPage2(q.inputField.mapTo, this.value); });
  }
  inputDiv.appendChild(label);
  inputDiv.appendChild(input);
  card.appendChild(inputDiv);
}
function setAnswer(questionId, trigger, value, btn, questionObj, section) {
  userAnswers[trigger] = value;
  const card = btn.closest('.question-card') || btn.closest('.follow-up-question');
  if (card) {
    card.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }
  const inputWrap = document.getElementById('input-wrap-' + questionId);
  if (inputWrap) { inputWrap.style.display = value ? 'block' : 'none'; }
  if (questionObj && questionObj.followUp) {
    const existingFollowUp = document.getElementById('followup-' + questionId);
    if (value && !existingFollowUp) {
      const container = document.getElementById(sectionMap[section]);
      if (container) {
        container.innerHTML = '';
        questions[section].forEach(q => {
          if (q.showWhen && !q.showWhen(userAnswers)) return;
          renderQuestion(container, q, section);
        });
      }
    } else if (!value && existingFollowUp) { existingFollowUp.remove(); }
  }
  rebuildConditionalSections();
  syncPage2Visibility();
  updateProgress();
  updateMatchCount();
  updateBrooklynUI();
}

function rebuildConditionalSections() {
  ['business', 'realestate'].forEach(section => {
    const container = document.getElementById(sectionMap[section]);
    if (!container) return;
    container.innerHTML = '';
    questions[section].forEach(q => {
      if (q.showWhen && !q.showWhen(userAnswers)) return;
      renderQuestion(container, q, section);
    });
  });
}

function syncToPage2(fieldId, value) {
  const el = document.getElementById(fieldId);
  if (el) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function syncPage2Visibility() {
  const fieldVisibility = {
    w2_employee: ['w2_wages'],
    self_employed: ['se_income'],
    has_business: ['biz_revenue'],
    rental_property: ['rental_income'],
    dividend_income: ['dividend_income']
  };
  Object.entries(fieldVisibility).forEach(([trigger, fieldIds]) => {
    const answered = userAnswers[trigger];
    fieldIds.forEach(fieldId => {
      const inputEl = document.getElementById(fieldId);
      if (!inputEl) return;
      const group = inputEl.closest('.input-group');
      if (group) {
        if (answered === false) { group.style.display = 'none'; inputEl.value = ''; }
        else { group.style.display = ''; }
      }
    });
  });
  const ogField = document.getElementById('oil_gas_max');
  if (ogField) {
    const ogGroup = ogField.closest('.input-group');
    if (ogGroup) { ogGroup.style.display = userAnswers.interested_oil_gas === true ? '' : 'none'; }
  }
}

function updateProgress() {
  let total = 0, answered = 0;
  Object.values(questions).forEach(arr => {
    arr.forEach(q => {
      if (q.showWhen && !q.showWhen(userAnswers)) return;
      total++;
      if (userAnswers[q.trigger] !== undefined) answered++;
    });
  });
  const pct = total > 0 ? Math.round(answered / total * 100) : 0;
  const bar = document.getElementById('progress-fill');
  if (bar) bar.style.width = pct + '%';
  const label = document.getElementById('progress-pct');
  if (label) label.textContent = pct + '%';
}

function updateMatchCount() {
  if (!strategiesData.length) return;
  let count = 0;
  strategiesData.forEach(s => {
    if (!s.triggers) return;
    const matched = s.triggers.every(t => userAnswers[t] === true);
    if (matched) count++;
  });
  const el = document.getElementById('match-count');
  if (el) el.textContent = count;
}

function updateBrooklynUI() {
  const customLev = userAnswers.custom_leverage;
  const section = document.getElementById('custom-leverage-section');
  if (section) { section.classList.toggle('hidden', !customLev); }
}
function getFormInputs() {
  const fields = ['w2_wages','se_income','biz_revenue','rental_income',
    'dividend_income','st_gains','lt_gains','unrealized_losses','portfolio_value',
    'property_values','charitable','salt','retirement_contrib','taxpayer_age','state',
    'implementation_date','available_capital','max_leverage','beta_selection',
    'brooklyn_preset','custom_leverage_value','filing_status','tax_year',
    'oil_gas_max','oil_gas_rate'];
  const inp = {};
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) inp[f] = el.value;
  });
  return inp;
}

function getSelectedTaxYear() {
  const el = document.getElementById('tax_year');
  return el ? el.value : '2026';
}

function getSelectedState() {
  const el = document.getElementById('state');
  return el ? el.value : '';
}

function calculateStrategies() {
  const inp = getFormInputs();
  const baseline = computeBaselineTax(inp);
  const advisorManaged = userAnswers.advisor_managed === true;
  const beta = parseFloat(inp.beta_selection || '1');
  const stratKey = getBrooklynStrategyKey(advisorManaged, beta);
  const implDate = inp.implementation_date || new Date().toISOString().split('T')[0];
  const availCap = parseFloat(inp.available_capital || 0);
  const customLev = userAnswers.custom_leverage;
  let leverage = 0.3;
  if (customLev && inp.custom_leverage_value) {
    leverage = parseFloat(inp.custom_leverage_value);
  } else if (inp.brooklyn_preset) {
    const presetMap = {
      'Long-Only': 0, '100/100': 1.0, '130/30': 0.3, '145/45': 0.45,
      '160/60': 0.6, '200/100': 1.0, '225/125': 1.25,
      '250/150': 1.5, '275/275': 2.75, '325/225': 2.25
    };
    leverage = presetMap[inp.brooklyn_preset] || 0.3;
  }
  const enabledStrategies = [{ key: stratKey, maxInvestment: availCap, customLeverage: leverage }];
  const result = solveOptimalAllocation(inp, enabledStrategies, availCap, leverage, implDate);
  displayResults(result, baseline, inp);
}
function displayResults(result, baseline, inputs) {
  const te = document.getElementById('total-strategies');
  if (te) te.textContent = result.allocation.length;
  const se = document.getElementById('est-savings');
  if (se) se.textContent = '$' + result.savings.toLocaleString();
  const ie = document.getElementById('total-income');
  if (ie) ie.textContent = '$' + result.totalIncome.toLocaleString();
  const be = document.getElementById('baseline-tax');
  if (be) be.textContent = '$' + result.baselineTax.toLocaleString();
  const oe = document.getElementById('optimized-tax');
  if (oe) oe.textContent = '$' + result.optimizedTax.toLocaleString();
  const re = document.getElementById('roi-display');
  if (re) re.textContent = result.roi;

  const fbe = document.getElementById('federal-tax-display');
  if (fbe) fbe.textContent = '$' + (result.baselineFederalTax || 0).toLocaleString();
  const ste = document.getElementById('state-tax-display');
  if (ste) ste.textContent = '$' + (result.baselineStateTax || 0).toLocaleString();
  const yde = document.getElementById('tax-year-display');
  if (yde) yde.textContent = result.year || getSelectedTaxYear();
  const sde = document.getElementById('state-display');
  if (sde) sde.textContent = result.state || getSelectedState() || 'N/A';

  const effRate = result.totalIncome > 0 ? (result.baselineTax / result.totalIncome * 100).toFixed(1) : '0';
  const newRate = result.totalIncome > 0 ? (result.optimizedTax / result.totalIncome * 100).toFixed(1) : '0';
  const er = document.getElementById('effective-rate');
  if (er) er.textContent = effRate + '%';
  const nr = document.getElementById('new-rate');
  if (nr) nr.textContent = newRate + '%';

  const co = document.getElementById('results-container');
  if (co) {
    co.innerHTML = '';
    result.allocation.forEach(a => {
      const strat = a.key ? BROOKLYN_STRATEGIES[a.key] : null;
      const cd = document.createElement('div');
      cd.style.cssText = 'background:#111d35;border:1px solid #1a3a6e;border-radius:10px;padding:18px;margin-bottom:12px;';
      let html = '';

      if (a.key && strat) {
        const dp = strat.dataPoints ? strat.dataPoints.find(dp => dp.leverage === a.leverage) : null;
        const longPct = dp ? dp.longPct : '';
        const shortPct = dp ? dp.shortPct : '';
        html += '<h5 style="color:#f0a500;margin-bottom:8px;">' + (strat ? strat.name : a.key) + '</h5>';
        html += '<span class="type-badge badge-type">Brooklyn Strategy</span>';
        html += '<span class="type-badge badge-medium">Leverage: ' + longPct + '/' + shortPct + '</span>';
        html += '<p style="color:#c0c0c0;margin:8px 0;">Investment: $' + Math.round(a.investment).toLocaleString() + '</p>';
        html += '<p style="color:#c0c0c0;margin:4px 0;">Short-term losses generated: $' + Math.round(a.losses).toLocaleString() + '</p>';
      }

      if (a.oilGasInvestment > 0) {
        html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid #1a3a6e;">';
        html += '<h5 style="color:#4caf50;margin-bottom:8px;">Oil & Gas Strategy</h5>';
        html += '<span class="type-badge" style="background:#1b5e20;color:#a5d6a7;">Ordinary Income Offset</span>';
        html += '<p style="color:#c0c0c0;margin:8px 0;">Investment: $' + Math.round(a.oilGasInvestment).toLocaleString() + '</p>';
        html += '<p style="color:#c0c0c0;margin:4px 0;">Ordinary income offset: $' + Math.round(a.oilGasOffset).toLocaleString() + '</p>';
        html += '<p style="color:#c0c0c0;margin:4px 0;">Offset rate: ' + (parseFloat(inputs.oil_gas_rate || 0.95) * 100).toFixed(0) + '%</p>';
        html += '</div>';
      }

      const totalInvested = (a.investment || 0) + (a.oilGasInvestment || 0);
      html += '<p style="color:#4caf50;margin:8px 0;font-weight:bold;">Total investment: $' + Math.round(totalInvested).toLocaleString() + '</p>';
      html += '<p style="color:#4caf50;margin:4px 0;font-weight:bold;">Tax savings: $' + result.savings.toLocaleString() + '</p>';

      if (a.minLeverageOption) {
        const mlo = a.minLeverageOption;
        html += '<div style="margin-top:12px;padding:12px;background:#0d1526;border-radius:8px;border:1px solid #2a4a8e;">';
        html += '<p style="color:#f59e0b;font-weight:bold;margin-bottom:6px;">Lower Leverage Alternative</p>';
        html += '<p style="color:#c0c0c0;margin:2px 0;">Brooklyn leverage: ' + (mlo.leverage * 100).toFixed(0) + '% (vs ' + (a.leverage * 100).toFixed(0) + '%)</p>';
        html += '<p style="color:#c0c0c0;margin:2px 0;">Brooklyn losses: $' + Math.round(mlo.losses).toLocaleString() + '</p>';
        html += '<p style="color:#c0c0c0;margin:2px 0;">Same tax result within $100</p>';
        html += '</div>';
      }

      cd.innerHTML = html;
      co.appendChild(cd);
    });
  }
}
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const pg = document.getElementById(pageId);
  if (pg) pg.classList.add('active');
  const ti = pageId === 'page1' ? 0 : pageId === 'page2' ? 1 : 2;
  const tabs = document.querySelectorAll('.nav-tab');
  if (tabs[ti]) tabs[ti].classList.add('active');
  if (pageId === 'page2') { syncPage2Visibility(); }
  if (pageId === 'page3') calculateStrategies();
}

function exportResults() {
  const inp = getFormInputs();
  const baseline = computeBaselineTax(inp);
  const advisorManaged = userAnswers.advisor_managed === true;
  const beta = parseFloat(inp.beta_selection || '1');
  const stratKey = getBrooklynStrategyKey(advisorManaged, beta);
  const implDate = inp.implementation_date || new Date().toISOString().split('T')[0];
  const availCap = parseFloat(inp.available_capital || 0);
  const leverage = parseFloat(inp.custom_leverage_value || inp.max_leverage || 0.3);
  const enabledStrategies = [{ key: stratKey, maxInvestment: availCap, customLeverage: leverage }];
  const result = solveOptimalAllocation(inp, enabledStrategies, availCap, leverage, implDate);

  const year = result.year || getSelectedTaxYear();
  const state = result.state || getSelectedState();
  let rp = 'BROOKHAVEN TAX STRATEGY REPORT\n';
  rp += '================================\n\n';
  rp += 'Tax Year: ' + year + '\n';
  rp += 'State: ' + state + '\n';
  rp += 'Filing Status: ' + (inp.filing_status || 'N/A') + '\n\n';
  rp += 'INCOME SUMMARY\n';
  rp += '--------------\n';
  rp += 'Total Income: $' + result.totalIncome.toLocaleString() + '\n';
  rp += 'W-2 Wages: $' + (parseFloat(inp.w2_wages || 0)).toLocaleString() + '\n';
  if (parseFloat(inp.se_income || 0) > 0) rp += 'Self-Employment: $' + (parseFloat(inp.se_income)).toLocaleString() + '\n';
  if (parseFloat(inp.biz_revenue || 0) > 0) rp += 'Business Revenue: $' + (parseFloat(inp.biz_revenue)).toLocaleString() + '\n';
  if (parseFloat(inp.rental_income || 0) > 0) rp += 'Rental Income: $' + (parseFloat(inp.rental_income)).toLocaleString() + '\n';
  rp += '\n';
  rp += 'TAX ANALYSIS\n';
  rp += '------------\n';
  rp += 'Baseline Tax: $' + result.baselineTax.toLocaleString() + '\n';
  rp += '  Federal: $' + (result.baselineFederalTax || 0).toLocaleString() + '\n';
  rp += '  State: $' + (result.baselineStateTax || 0).toLocaleString() + '\n';
  rp += 'Optimized Tax: $' + result.optimizedTax.toLocaleString() + '\n';
  rp += 'Total Savings: $' + result.savings.toLocaleString() + '\n';
  rp += 'ROI: ' + result.roi + '\n\n';
  rp += 'STRATEGIES APPLIED\n';
  rp += '------------------\n';
  result.allocation.forEach(a => {
    if (a.key) {
      const strat = BROOKLYN_STRATEGIES[a.key];
      rp += '  Strategy: ' + (strat ? strat.name : a.key) + '\n';
      rp += '  Leverage: ' + (a.leverage * 100).toFixed(0) + '%\n';
      rp += '  Investment: $' + Math.round(a.investment).toLocaleString() + '\n';
      rp += '  Short-term losses: $' + Math.round(a.losses).toLocaleString() + '\n';
    }
    if (a.oilGasInvestment > 0) {
      rp += '  Oil & Gas Investment: $' + Math.round(a.oilGasInvestment).toLocaleString() + '\n';
      rp += '  Oil & Gas Offset: $' + Math.round(a.oilGasOffset).toLocaleString() + '\n';
    }
    const mlo = a.minLeverageOption;
    if (mlo) {
      rp += '  Min Leverage Alternative: ' + (mlo.leverage * 100).toFixed(0) + '% => losses $' + Math.round(mlo.losses).toLocaleString() + ' (in carryover)\n';
    }
    rp += '\n';
  });

  const blob = new Blob([rp], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'brookhaven-tax-report-' + year + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function loadStrategies() {
  const paths = ['data/strategies.json', '../data/strategies.json', './data/strategies.json'];
  for (const p of paths) {
    try {
      const r = await fetch(p);
      if (r.ok) {
        const data = await r.json();
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
