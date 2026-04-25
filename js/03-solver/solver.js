// FILE: js/03-solver/solver.js
// Optimal allocation solver across Brooklyn / Delphi / Helix / Oil & Gas. Tries combinations and picks the lowest-tax outcome respecting min-investment thresholds and available capital.

function solveOptimalAllocation(inputs, enabledStrategies, availableCapital, maxLeverage, implementationDate, disabledMap) {
  disabledMap = disabledMap || {};
  const baseline = computeBaselineTax(inputs);
  let bestTax = baseline.tax;
  let bestPureTax = baseline.tax;
  let bestTotalCost = baseline.tax; // total bill: tax + all strategy fees
  let bestAllocation = [];
  let bestLosses = 0;
  let bestOilGasOffset = 0;
  let bestDelphiAlloc = null;
  let bestHelixAlloc = null;

  const ogMaxInvest = disabledMap.oilgas ? 0 : (parseFloat(inputs.oil_gas_max || 0));
  const ogRate = parseFloat(inputs.oil_gas_rate || 0.95);

  const strategies = disabledMap.brooklyn ? [] : enabledStrategies.filter(function(s) {
    return BROOKLYN_STRATEGIES[s.key] != null;
  });

  const steps = 20;
  const ogSteps = 10;
  const delphiSteps = 5;
  const helixSteps = 5;

  // Determine eligible Delphi classes
  var delphiClasses = [];
  var helixClasses = [];
  if (!disabledMap.delphi && availableCapital >= 5000000) delphiClasses.push('classA');
  if (!disabledMap.delphi && availableCapital >= 1000000) delphiClasses.push('classB');
  if (!disabledMap.helix && availableCapital >= 1000000) helixClasses.push('standard');

  // Helper to try a combination and track the best
  function tryCombo(brooklynKey, brooklynInvest, lev, ogInvest, delphiClass, delphiInvest, helixClass, helixInvest) {
      var totalUsed = brooklynInvest + ogInvest + delphiInvest + (helixInvest || 0);
      if (totalUsed > availableCapital * 1.001) return; // tolerance
      var losses = (brooklynInvest && brooklynKey) ? computeBrooklynLoss(brooklynKey, lev, brooklynInvest, implementationDate) : 0;
      var ogOffset = ogInvest * ogRate;
      var dAlloc = (delphiInvest && delphiClass) ? computeDelphiAllocation(delphiClass, delphiInvest, implementationDate) : null;
      var hAlloc = (helixInvest && helixClass) ? computeHelixAllocation(helixClass, helixInvest, implementationDate) : null;
      var result = computeTaxAfterStrategies(inputs, losses, ogOffset, dAlloc, hAlloc);
      // Compute Brooklyn strategy fee using interpolated feeRate
      var brooklynFeeRate = 0;
      var brooklynFee = 0;
      if (brooklynInvest && brooklynKey) {
        var interp = interpolateBrooklyn(brooklynKey, lev);
        brooklynFeeRate = interp.feeRate;
        brooklynFee = brooklynInvest * brooklynFeeRate;
      }
      // Compare total bill: tax + ALL strategy fees (Brooklyn + Delphi + Helix)
      var delphiFee = dAlloc ? dAlloc.managementFee : 0;
      var helixFee = hAlloc ? hAlloc.managementFee : 0;
      var totalCost = result.tax + brooklynFee + delphiFee + helixFee;
      if (totalCost < bestTotalCost) {
        bestTotalCost = totalCost;
        bestTax = totalCost; // total bill: tax + all strategy fees
        bestPureTax = result.tax; // pure tax without fees (for per-strategy comparison)
        if (!bestAllocation.length) bestAllocation.push({});
        bestAllocation[0] = {
          key: brooklynKey, leverage: lev, investment: brooklynInvest,
          losses: losses, brooklynFeeRate: brooklynFeeRate, brooklynFee: brooklynFee,
          oilGasInvestment: ogInvest, oilGasOffset: ogOffset,
          delphiClass: delphiClass, delphiInvestment: delphiInvest, delphiAllocation: dAlloc,
            helixClass: helixClass || null, helixInvestment: helixInvest || 0, helixAllocation: hAlloc
        };
        bestLosses = losses;
        bestOilGasOffset = ogOffset;
        bestDelphiAlloc = dAlloc;
        bestHelixAlloc = hAlloc;
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

        // Try without Delphi or Helix
        tryCombo(s.key, brooklynInvest, lev, ogInvest, null, 0, null, 0);
        // Try with Helix only (no Delphi)
        for (var hi = 0; hi < helixClasses.length; hi++) {
          var hc = helixClasses[hi];
          var helixMin = getHelixMinInvestment(hc);
          var helixMax = Math.max(0, remainingAfterBoth);
          if (helixMax < helixMin) continue;
          var hStepSize = (helixMax - helixMin) / helixSteps;
          for (var hStep = 0; hStep <= helixSteps; hStep++) {
            var hInvest = helixMin + hStepSize * hStep;
            tryCombo(s.key, brooklynInvest, lev, ogInvest, null, 0, hc, hInvest);
          }
        }

        // Try with Delphi
        for (var di = 0; di < delphiClasses.length; di++) {
          var dc = delphiClasses[di];
          var delphiMin = getDelphiMinInvestment(dc);
          var delphiMax = Math.max(0, remainingAfterBoth);
          if (delphiMax < delphiMin) continue;

          var dStepSize = (delphiMax - delphiMin) / delphiSteps;
          for (var dStep = 0; dStep <= delphiSteps; dStep++) {
            var dInvest = delphiMin + dStepSize * dStep;
            tryCombo(s.key, brooklynInvest, lev, ogInvest, dc, dInvest, null, 0);
              // Also try Delphi + Helix
              for (var hi2 = 0; hi2 < helixClasses.length; hi2++) {
                var hc2 = helixClasses[hi2];
                var hMin2 = getHelixMinInvestment(hc2);
                var hMax2 = Math.max(0, remainingAfterBoth - dInvest);
                if (hMax2 < hMin2) continue;
                var hStep2 = (hMax2 - hMin2) / helixSteps;
                for (var hs2 = 0; hs2 <= helixSteps; hs2++) {
                  tryCombo(s.key, brooklynInvest, lev, ogInvest, dc, dInvest, hc2, hMin2 + hStep2 * hs2);
                }
              }
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
      tryCombo(null, 0, 0, ogInvest2, null, 0, null, 0);
          // O&G + Helix only
          for (var hi3 = 0; hi3 < helixClasses.length; hi3++) {
            var hc3 = helixClasses[hi3];
            var hMin3 = getHelixMinInvestment(hc3);
            var hMax3 = Math.max(0, remainOG);
            if (hMax3 < hMin3) continue;
            var hStep3 = (hMax3 - hMin3) / helixSteps;
            for (var hs3 = 0; hs3 <= helixSteps; hs3++) {
              tryCombo(null, 0, 0, ogInvest2, null, 0, hc3, hMin3 + hStep3 * hs3);
            }
          }

      // O&G + Delphi
      for (var di2 = 0; di2 < delphiClasses.length; di2++) {
        var dc2 = delphiClasses[di2];
        var dMin2 = getDelphiMinInvestment(dc2);
        var dMax2 = Math.max(0, remainOG);
        if (dMax2 < dMin2) continue;
        var dStep2 = (dMax2 - dMin2) / delphiSteps;
        for (var ds2 = 0; ds2 <= delphiSteps; ds2++) {
          tryCombo(null, 0, 0, ogInvest2, dc2, dMin2 + dStep2 * ds2, null, 0);
                // O&G + Delphi + Helix
                for (var hi4 = 0; hi4 < helixClasses.length; hi4++) {
                  var hc4 = helixClasses[hi4];
                  var hMin4 = getHelixMinInvestment(hc4);
                  var hMax4 = Math.max(0, remainOG - (dMin2 + dStep2 * ds2));
                  if (hMax4 < hMin4) continue;
                  var hStep4 = (hMax4 - hMin4) / helixSteps;
                  for (var hs4 = 0; hs4 <= helixSteps; hs4++) {
                    tryCombo(null, 0, 0, ogInvest2, dc2, dMin2 + dStep2 * ds2, hc4, hMin4 + hStep4 * hs4);
                  }
                }
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
      tryCombo(null, 0, 0, 0, dc3, dMin3 + dStep3 * ds3, null, 0);
            // Delphi + Helix
            for (var hi5 = 0; hi5 < helixClasses.length; hi5++) {
              var hc5 = helixClasses[hi5];
              var hMin5 = getHelixMinInvestment(hc5);
              var hMax5 = Math.max(0, availableCapital - (dMin3 + dStep3 * ds3));
              if (hMax5 < hMin5) continue;
              var hStep5 = (hMax5 - hMin5) / helixSteps;
              for (var hs5 = 0; hs5 <= helixSteps; hs5++) {
                tryCombo(null, 0, 0, 0, dc3, dMin3 + dStep3 * ds3, hc5, hMin5 + hStep5 * hs5);
              }
            }
    }
  }

  // Helix only (no Brooklyn, no O&G, no Delphi)
  for (var hi6 = 0; hi6 < helixClasses.length; hi6++) {
    var hc6 = helixClasses[hi6];
    var hMin6 = getHelixMinInvestment(hc6);
    var hMax6 = availableCapital;
    if (hMax6 < hMin6) continue;
    var hStep6 = (hMax6 - hMin6) / helixSteps;
    for (var hs6 = 0; hs6 <= helixSteps; hs6++) {
      tryCombo(null, 0, 0, 0, null, 0, hc6, hMin6 + hStep6 * hs6);
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
      var result2 = computeTaxAfterStrategies(inputs, losses2, bestEntry.oilGasOffset || 0, bestEntry.delphiAllocation || null, bestEntry.helixAllocation || null);
      var interp2 = interpolateBrooklyn(bestEntry.key, tryLev);
      var bkFee2 = bestEntry.investment * (interp2.feeRate || 0);
      var dFee2 = bestEntry.delphiAllocation ? bestEntry.delphiAllocation.managementFee || 0 : 0;
      var hFee2 = bestEntry.helixAllocation ? bestEntry.helixAllocation.managementFee || 0 : 0;
      var totalCost2 = result2.tax + bkFee2 + dFee2 + hFee2;
      if (totalCost2 <= bestTotalCost + 100) {
        minLev = tryLev;
        minLevAllocation = {
          key: bestEntry.key, leverage: tryLev, investment: bestEntry.investment,
          losses: losses2, oilGasInvestment: bestEntry.oilGasInvestment || 0,
          oilGasOffset: bestEntry.oilGasOffset || 0,
          delphiClass: bestEntry.delphiClass, delphiInvestment: bestEntry.delphiInvestment || 0,
          delphiAllocation: bestEntry.delphiAllocation,
          helixClass: bestEntry.helixClass || null, helixInvestment: bestEntry.helixInvestment || 0,
          helixAllocation: bestEntry.helixAllocation || null
        };
      } else { break; }
    }
    if (minLev < bestEntry.leverage) {
      bestAllocation[0].minLeverageOption = minLevAllocation;
    }
  }

  var a0 = bestAllocation.length > 0 ? bestAllocation[0] : null;
  var totalInvestment = a0 ? (a0.investment || 0) + (a0.oilGasInvestment || 0) + (a0.delphiInvestment || 0) + (a0.helixInvestment || 0) : 0;

  return {
    baselineTax: baseline.tax,
    baselineFederalTax: baseline.federalTax,
    baselineStateTax: baseline.stateTax,
    optimizedTax: bestTax, pureTax: bestPureTax,
    savings: baseline.tax - bestTax,
    allocation: bestAllocation,
    totalLosses: bestLosses,
    totalOilGasOffset: bestOilGasOffset,
    totalDelphiAlloc: bestDelphiAlloc,
    totalHelixAlloc: bestHelixAlloc,
    totalIncome: baseline.totalIncome,
    year: baseline.year,
    state: baseline.state,
    roi: (function() { var grossSav = baseline.tax - bestTax; var implDate = (typeof inputs !== "undefined" && inputs.implementation_date) || new Date().toISOString().split("T")[0]; var f = computeBrookhavenFees(implDate); var stratFees = 0; if (bestAllocation.length > 0) { var ba = bestAllocation[0]; stratFees += ba.brooklynFee || 0; if (ba.delphiAllocation) stratFees += ba.delphiAllocation.managementFee || 0; if (ba.helixAllocation) stratFees += ba.helixAllocation.managementFee || 0; } var totalFees = f.totalFee + stratFees; var netSav = grossSav - (totalFees - stratFees); return totalFees > 0 ? (netSav / totalFees * 100).toFixed(1) + "%" : (grossSav > 0 ? "\u221e" : "0"); })()
  };
}

