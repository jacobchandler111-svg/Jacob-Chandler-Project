// FILE: js/01-brooklyn/brooklyn-regression.js
// Brooklyn loss/fee interpolation, time-weighting, and key/label lookups

function interpolateBrooklyn(strategyKey, leverage) {
  const strat = BROOKLYN_STRATEGIES[strategyKey];
  if (!strat) return { lossRate: 0, feeRate: 0 };
  const pts = strat.dataPoints;
  if (!pts.length) return { lossRate: 0, feeRate: 0 };
  if (leverage <= pts[0].leverage) return { lossRate: pts[0].lossRate, feeRate: pts[0].feeRate || 0 };
  if (leverage >= pts[pts.length - 1].leverage) return { lossRate: pts[pts.length - 1].lossRate, feeRate: pts[pts.length - 1].feeRate || 0 };
  for (let i = 1; i < pts.length; i++) {
    if (leverage <= pts[i].leverage) {
      const t = (leverage - pts[i - 1].leverage) / (pts[i].leverage - pts[i - 1].leverage);
      return {
        lossRate: pts[i - 1].lossRate + t * (pts[i].lossRate - pts[i - 1].lossRate),
        feeRate: (pts[i - 1].feeRate || 0) + t * ((pts[i].feeRate || 0) - (pts[i - 1].feeRate || 0))
      };
    }
  }
  return { lossRate: pts[pts.length - 1].lossRate, feeRate: pts[pts.length - 1].feeRate || 0 };
}

function interpolateLossRate(strategyKey, leverage) {
  return interpolateBrooklyn(strategyKey, leverage).lossRate;
}

function timeWeightedLoss(annualLossRate, implementationDate) {
  // Parse date parts to avoid UTC vs local timezone issues
  const parts = implementationDate.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  const implDate = new Date(year, month, day);
  const yearEnd = new Date(year, 11, 31);
  if (implDate >= yearEnd) return 0;
  const yearStart = new Date(year, 0, 1);
  const msInYear = yearEnd - yearStart;
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

