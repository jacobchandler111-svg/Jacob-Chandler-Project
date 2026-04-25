// FILE: js/03-solver/fees.js
// Brookhaven fee schedule and per-implementation fee calculator

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

