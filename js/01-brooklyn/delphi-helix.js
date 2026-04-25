// FILE: js/01-brooklyn/delphi-helix.js
// Delphi & Helix oil/gas strategy data and per-class allocation calculators

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
    const now = parseLocalDate(investmentDate);
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


const HELIX_STRATEGIES = {
  standard: {
    id: 'helix_standard',
    name: 'TA Helix',
    minInvestment: 1000000,
    managementFee: 0.0285,
    liquidity: 'Monthly',
    liquidityNotice: '30 days',
    allocations: {
      shortTermCapitalGainLoss: -0.2390,
      ordinaryIncomeExpense: -0.1180,
      longTermCapitalGainLoss: 0.1150,
      qualifiedDividends: 0.0430,
      foreignTaxesPaid: -0.0050
    }
  }
};

function computeHelixAllocation(classKey, investmentAmount, investmentDate) {
  const fund = HELIX_STRATEGIES[classKey];
  if (!fund) return null;
  if (investmentAmount < fund.minInvestment) return null;

  const managementFee = investmentAmount * fund.managementFee;
  const netInvestment = investmentAmount - managementFee;

  // Time-weight by remaining fraction of the year
  let timeWeight = 1;
  if (investmentDate) {
    const d = parseLocalDate(investmentDate);
    const year = d.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    const msInYear = endOfYear - startOfYear;
    const remaining = endOfYear - d;
    timeWeight = Math.max(0, Math.min(1, remaining / msInYear));
  }

  const alloc = fund.allocations;
  return {
    shortTermCapitalGainLoss: netInvestment * alloc.shortTermCapitalGainLoss * timeWeight,
    ordinaryIncomeExpense: netInvestment * alloc.ordinaryIncomeExpense * timeWeight,
    longTermCapitalGainLoss: netInvestment * alloc.longTermCapitalGainLoss * timeWeight,
    qualifiedDividends: netInvestment * alloc.qualifiedDividends * timeWeight,
    foreignTaxesPaid: netInvestment * alloc.foreignTaxesPaid * timeWeight,
    netOrdinaryOffset: netInvestment * (alloc.ordinaryIncomeExpense + alloc.shortTermCapitalGainLoss) * timeWeight,
    netLTCG: netInvestment * alloc.longTermCapitalGainLoss * timeWeight,
    managementFee: managementFee,
    className: fund.name,
    liquidity: fund.liquidity,
    liquidityNotice: fund.liquidityNotice
  };
}

function getHelixMinInvestment(classKey) {
  return HELIX_STRATEGIES[classKey] ? HELIX_STRATEGIES[classKey].minInvestment : Infinity;
}

