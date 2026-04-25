// FILE: js/04-ui/calculate-and-display.js
// Strategy calculation pipeline + results rendering: calculateStrategies, displayResults

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
  } else if (inp.leverage_preference !== undefined && inp.leverage_preference !== '') {
    var sliderVal = parseFloat(inp.leverage_preference) || 0;
    leverage = sliderVal / 100 * 2.25;
  }
  var enabledStrategies = [{ key: stratKey, maxInvestment: availCap, customLeverage: leverage }];
  var result = solveOptimalAllocation(inp, enabledStrategies, availCap, leverage, implDate);
  _lastResult = result;
  _lastBaseline = baseline;
  _lastInputs = inp;
  _lastAllocation = result.allocation && result.allocation.length > 0 ? result.allocation[0] : null;
    _lastEnabledStrategies = enabledStrategies;
    _lastAvailCap = availCap;
    _lastLeverage = leverage;
    _lastImplDate = implDate;
    if (!_lastResult) _strategyToggles = { brooklyn: true, oilgas: true, delphi: true, helix: true };
  displayResults(result, baseline, inp);
}

function displayResults(result, baseline, inputs) {
  var a = result.allocation.length > 0 ? result.allocation[0] : null;
  var strat = a && a.key ? BROOKLYN_STRATEGIES[a.key] : null;
  var effRate = result.totalIncome > 0 ? (result.baselineTax / result.totalIncome * 100).toFixed(1) : '0';
  var newRate = result.totalIncome > 0 ? (result.optimizedTax / result.totalIncome * 100).toFixed(1) : '0';
  var totalInvested = a ? (a.investment || 0) + (a.oilGasInvestment || 0) + (a.delphiInvestment || 0) + (a.helixInvestment || 0) : 0;

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
  var grossSalesProceeds = parseCurrencyInput(inputs.portfolio_value) || 0;
  var niit = 0;
  var agi = result.totalIncome || 0;
  var niitThreshold = getNiitThreshold(baseline.year || '2025', baseline.filing || 'single');
  if (agi > niitThreshold) {
    var investmentIncome = (parseCurrencyInput(inputs.lt_gains) || 0) + (parseCurrencyInput(inputs.st_gains) || 0) + (parseCurrencyInput(inputs.dividend_income) || 0) + (parseCurrencyInput(inputs.rental_income) || 0);
    niit = Math.round(Math.min(investmentIncome, agi - niitThreshold) * 0.038);
  }
  var totalTaxDue = result.baselineTax;
  var taxAsPctOfSale = grossSalesProceeds > 0 ? (totalTaxDue / grossSalesProceeds * 100).toFixed(1) : '0.0';
  var afterTaxIncome = agi - totalTaxDue;
  var effectiveTaxRate = agi > 0 ? (totalTaxDue / agi * 100).toFixed(1) : '0.0';
  var t1 = document.createElement('div');
  t1.className = 'results-table-section';
  t1.innerHTML = '<h3 class="table-title">Baseline \u2014 Without Tax Planning</h3>' +
    '<table class="results-table"><tbody>' +
    '<tr><td>Gross Sales Proceeds</td><td>' + formatCurrency(grossSalesProceeds) + '</td></tr>' +
    '<tr><td>Federal Tax Due</td><td>' + formatCurrency(result.baselineFederalTax) + '</td></tr>' +
    '<tr><td>State Tax Due</td><td>' + formatCurrency(result.baselineStateTax) + '</td></tr>' +
    '<tr><td>Net Investment Tax (NIIT)</td><td>' + formatCurrency(niit) + '</td></tr>' +
    '<tr class="total-row"><td>Total Tax Due</td><td>' + formatCurrency(totalTaxDue) + '</td></tr>' +
    '<tr><td>Tax as % of Sale</td><td>' + taxAsPctOfSale + '%</td></tr>' +
    '<tr><td>After-Tax Income</td><td>' + formatCurrency(afterTaxIncome) + '</td></tr>' +
    '<tr class="total-row"><td>Effective Tax Rate</td><td>' + effectiveTaxRate + '%</td></tr>' +
    '</tbody></table>';
  page3.appendChild(t1);

  // TABLE 2: WITH PLANNING
  var t2 = document.createElement('div');
  t2.className = 'results-table-section';
  var stratRows = '';

  if (a && a.key && strat && a.investment > 0) {
    var displayAlloc = a; // Use actual optimized allocation for consistent display
    var leverageLabel = getLeverageLabel(displayAlloc.key, displayAlloc.leverage);
    stratRows += '<tr class="strategy-header"><td colspan="2">Brooklyn Strategy: ' + strat.name + '</td></tr>';
    stratRows += '<tr><td>Leverage</td><td>' + leverageLabel + '</td></tr>';
    stratRows += '<tr><td>Investment</td><td>' + formatCurrency(a.investment) + '</td></tr>';
    stratRows += '<tr><td>Short-Term Losses Generated</td><td>' + formatCurrency(displayAlloc.losses) + '</td></tr>';
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

  if (a && (a.helixInvestment || 0) > 0 && a.helixClass) {
      var helixFund = HELIX_STRATEGIES[a.helixClass];
      var hxAlloc = a.helixAllocation;
      stratRows += '<tr class="strategy-header"><td colspan="2">Helix Strategy (' + (helixFund ? helixFund.name : a.helixClass) + ')</td></tr>';
      stratRows += '<tr><td>Investment</td><td>' + formatCurrency(a.helixInvestment) + '</td></tr>';
      if (hxAlloc) {
        stratRows += '<tr><td>Ordinary Income Offset</td><td>' + formatCurrency(Math.abs(hxAlloc.ordinaryIncomeExpense)) + '</td></tr>';
        stratRows += '<tr><td>ST Loss Generated</td><td>' + formatCurrency(Math.abs(hxAlloc.shortTermCapitalGainLoss)) + '</td></tr>';
        stratRows += '<tr><td>LT Capital Gain</td><td>' + formatCurrency(hxAlloc.longTermCapitalGainLoss) + '</td></tr>';
      }
    }

    if (a && a.oilGasInvestment > 0) {
    stratRows += '<tr class="strategy-header"><td colspan="2">Oil & Gas Strategy</td></tr>';
    stratRows += '<tr><td>Investment</td><td>' + formatCurrency(a.oilGasInvestment) + '</td></tr>';
    stratRows += '<tr><td>Ordinary Income Offset (' + (parseFloat(inputs.oil_gas_rate || 0.95) * 100).toFixed(0) + '%)</td><td>' + formatCurrency(a.oilGasOffset) + '</td></tr>';
  }



  t2.innerHTML = '<h3 class="table-title">With Tax Planning</h3>' +
    '<table class="results-table"><tbody>' +
    '<tr class="strategy-header"><td colspan="2">Strategies Applied</td></tr>' +
    stratRows +
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
  // Compute Delphi strategy fee
  var stratAlloc = result.allocation && result.allocation.length > 0 ? result.allocation[0] : null;
  var delphiFeeRate = 0;
  var delphiFeeAmount = 0;
  if (stratAlloc && stratAlloc.delphiInvestment > 0) {
    delphiFeeRate = (stratAlloc.delphiClass === 'A') ? 0.0175 : 0.02;
    delphiFeeAmount = stratAlloc.delphiInvestment * delphiFeeRate;
  }
  var brooklynFeeAmount = (stratAlloc && stratAlloc.brooklynFee) ? stratAlloc.brooklynFee : 0;
    var brooklynFeeRatePct = (stratAlloc && stratAlloc.brooklynFeeRate) ? (stratAlloc.brooklynFeeRate * 100).toFixed(2) + '%' : '0.00%';
  // Helix management fee
    var helixFeeRate = 0;
    var helixFeeAmount = 0;
    if (stratAlloc && (stratAlloc.helixInvestment || 0) > 0) {
      helixFeeRate = 0.0285;
      helixFeeAmount = stratAlloc.helixInvestment * helixFeeRate;
    }
    var strategyFeesTotal = delphiFeeAmount + brooklynFeeAmount + helixFeeAmount;
  totalFees = totalFees + strategyFeesTotal;
  var netSavings = result.savings - (totalFees - strategyFeesTotal);
  var roiPct = totalFees > 0 ? (netSavings / totalFees * 100).toFixed(1) : (result.savings > 0 ? '\u221e' : '0');

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
    '<tr class="strategy-header"><td colspan="2">Strategy Fees</td></tr>' +
    '<tr><td>Brooklyn Strategy Fee</td><td>' + formatCurrency(brooklynFeeAmount) + (brooklynFeeAmount > 0 ? ' (' + brooklynFeeRatePct + ')' : '') + '</td></tr>' +
    '<tr><td>Delphi Management Fee</td><td>' + formatCurrency(delphiFeeAmount) + (delphiFeeRate > 0 ? ' (' + (delphiFeeRate * 100) + '%)' : '') + '</td></tr>' +
    '<tr><td>Helix Management Fee</td><td>' + formatCurrency(helixFeeAmount) + (helixFeeRate > 0 ? ' (' + (helixFeeRate * 100).toFixed(2) + '%)' : '') + '</td></tr>' +
    '<tr class="spacer-row"><td colspan="2"></td></tr>' +
    '<tr class="spacer-row"><td colspan="2"></td></tr>' +
    '<tr class="savings-row"><td>Net Savings After Fees</td><td>' + formatCurrency(netSavings) + '</td></tr>' +
    '<tr class="total-row"><td>Return on Investment (Net Savings / Fees)</td><td>' + roiPct + '%</td></tr>' +
    '</tbody></table>';
  page3.appendChild(t3);

  // Buttons
  var btnDiv = document.createElement('div');
  btnDiv.style.cssText = 'margin-top:30px;display:flex;gap:15px;';
  btnDiv.innerHTML = '<button class="btn btn-primary" onclick="calculateStrategies()">Recalculate</button><button class="btn btn-secondary" onclick="exportResults()">Export Report</button>';

  // STRATEGY BREAKDOWN WITH TOGGLES
  var t4 = document.createElement('div');
  t4.className = 'results-table-section summary-section';
  t4.id = 'strategy-breakdown';
  
  var alloc = result.allocation && result.allocation.length > 0 ? result.allocation[0] : null;
  var strategies = [];
  
  if (alloc && alloc.key && alloc.investment > 0) {
    var bStrat = BROOKLYN_STRATEGIES[alloc.key] || {};
    strategies.push({
      id: 'brooklyn',
      name: 'Brooklyn Tax Loss Harvesting',
      detail: (bStrat.name || alloc.key) + ' | Leverage: ' + getLeverageLabel((alloc.minLeverageOption || alloc).key, (alloc.minLeverageOption || alloc).leverage),
      investment: alloc.investment,
      losses: alloc.losses || 0,
      active: _strategyToggles.brooklyn
    });
  }
  
  if (alloc && alloc.oilGasInvestment > 0) {
    strategies.push({
      id: 'oilgas',
      name: 'Oil & Gas',
      detail: 'Investment: ' + formatCurrency(alloc.oilGasInvestment) + ' | Offset: ' + formatCurrency(alloc.oilGasOffset || 0),
      investment: alloc.oilGasInvestment,
      losses: alloc.oilGasOffset || 0,
      active: _strategyToggles.oilgas
    });
  }
  
  if (alloc && alloc.delphiInvestment > 0) {
    var dFund = typeof DELPHI_STRATEGIES !== 'undefined' && alloc.delphiClass ? DELPHI_STRATEGIES[alloc.delphiClass] : null;
    strategies.push({
      id: 'delphi',
      name: 'Delphi Strategy',
      detail: (dFund ? dFund.name : alloc.delphiClass) + ' | Investment: ' + formatCurrency(alloc.delphiInvestment),
      investment: alloc.delphiInvestment,
      losses: 0,
      active: _strategyToggles.delphi
    });
  }
  
  if (alloc && (alloc.helixInvestment || 0) > 0) {
      var hFund = (typeof HELIX_STRATEGIES !== 'undefined' && alloc.helixClass) ? HELIX_STRATEGIES[alloc.helixClass] : null;
      strategies.push({
        id: 'helix',
        name: 'Helix Strategy',
        detail: (hFund ? hFund.name : alloc.helixClass) + ' | Investment: ' + formatCurrency(alloc.helixInvestment),
        investment: alloc.helixInvestment,
        losses: 0,
        active: _strategyToggles.helix
      });
    }

    { // Always show strategy breakdown with toggles
    var fullOptTax = result.pureTax !== undefined ? result.pureTax : result.optimizedTax;
    
    // Always show all 4 strategy types so user can toggle them back on
    var stratIds = strategies.map(function(s) { return s.id; });
    if (stratIds.indexOf('brooklyn') === -1) {
      strategies.push({
        id: 'brooklyn', name: 'Brooklyn Tax Loss Harvesting',
        detail: 'Not currently allocated',
        investment: 0, losses: 0, active: _strategyToggles.brooklyn
      });
    }
    if (stratIds.indexOf('oilgas') === -1) {
      strategies.push({
        id: 'oilgas', name: 'Oil & Gas',
        detail: 'Not currently allocated',
        investment: 0, losses: 0, active: _strategyToggles.oilgas
      });
    }
    if (stratIds.indexOf('delphi') === -1) {
      strategies.push({
        id: 'delphi', name: 'Delphi Strategy',
        detail: 'Not currently allocated',
        investment: 0, losses: 0, active: _strategyToggles.delphi
      });
    }
    if (stratIds.indexOf('helix') === -1) {
      strategies.push({
        id: 'helix', name: 'Helix Strategy',
        detail: 'Not currently allocated',
        investment: 0, losses: 0, active: _strategyToggles.helix
      });
    }

var activeLosses = _strategyToggles.brooklyn ? (result.totalLosses || 0) : 0;
    var activeOG = _strategyToggles.oilgas ? (result.totalOilGasOffset || 0) : 0;
    var activeDelphi = _strategyToggles.delphi ? (result.totalDelphiAlloc || null) : null;
      var activeHelix = _strategyToggles.helix ? (result.totalHelixAlloc || null) : null;
    strategies.forEach(function(s) {
      if (!s.active) {
        var testLosses = activeLosses;
        var testOG = activeOG;
        var testDelphi = activeDelphi;
        if (s.id === 'brooklyn') testLosses = (_lastAllocation && _lastAllocation.losses) ? _lastAllocation.losses : 0;
        if (s.id === 'oilgas') testOG = (_lastAllocation && _lastAllocation.oilGasOffset) ? _lastAllocation.oilGasOffset : 0;
        if (s.id === 'delphi') testDelphi = (_lastAllocation && _lastAllocation.delphiAllocation) ? _lastAllocation.delphiAllocation : null;
        var testHelix = activeHelix;
        if (s.id === 'helix') testHelix = (_lastAllocation && _lastAllocation.helixAllocation) ? _lastAllocation.helixAllocation : null;
        var taxWith = computeTaxAfterStrategies(inputs, testLosses, testOG, testDelphi, testHelix);
        s.savings = fullOptTax - taxWith.tax;
      } else {
        var testLosses = activeLosses;
        var testOG = activeOG;
        var testDelphi = activeDelphi;
        if (s.id === 'brooklyn') testLosses = 0;
        if (s.id === 'oilgas') testOG = 0;
        if (s.id === 'delphi') testDelphi = null;
        var testHelix = activeHelix;
        if (s.id === 'helix') testHelix = null;
        var taxWithout = computeTaxAfterStrategies(inputs, testLosses, testOG, testDelphi, testHelix);
        s.savings = taxWithout.tax - fullOptTax;
      }
    });
    
    var cardsHtml = '<h3 class="table-title" style="margin-bottom:12px;">Strategy Breakdown</h3>';
    cardsHtml += '<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">';
    
    strategies.forEach(function(s) {
      var opacity = s.active ? '1' : '0.5';
      var toggleChecked = s.active ? 'checked' : '';
      cardsHtml += '<div class="strategy-toggle-card" data-strategy-id="' + s.id + '" style="' +
        'flex:1;min-width:220px;max-width:340px;background:rgba(21,101,192,0.15);border:1px solid rgba(66,165,245,0.3);' +
        'border-radius:10px;padding:16px;text-align:center;opacity:' + opacity + ';transition:opacity 0.3s;">' +
        '<div style="font-weight:700;font-size:1.05em;color:#90caf9;margin-bottom:6px;">' + s.name + '</div>' +
        '<div style="font-size:0.85em;color:#b0bec5;margin-bottom:10px;">' + s.detail + '</div>' +
        '<div style="font-size:1.3em;font-weight:700;color:#4fc3f7;margin-bottom:10px;">' + (s.active ? (formatCurrency(Math.abs(s.savings)) + ' saved') : 'Disabled') + '</div>' +
        '<label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">' +
        '<span style="font-size:0.85em;color:#b0bec5;">Enable</span>' +
        '<input type="checkbox" class="strategy-toggle-checkbox" data-strat="' + s.id + '" ' + toggleChecked + 
        ' style="width:18px;height:18px;accent-color:#42a5f5;cursor:pointer;">' +
        '</label></div>';
    });
    
    cardsHtml += '</div>';
    t4.innerHTML = cardsHtml;
    page3.appendChild(t4);
    
    var toggleCheckboxes = t4.querySelectorAll('.strategy-toggle-checkbox');
    toggleCheckboxes.forEach(function(cb) {
      cb.addEventListener('change', function() {
        var stratId = this.getAttribute('data-strat');
        _strategyToggles[stratId] = this.checked;
        recalculateWithToggles();
      });
    });
  }


  page3.appendChild(btnDiv);
}

