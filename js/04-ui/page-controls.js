// FILE: js/04-ui/page-controls.js
// Page-level UI controls + initialization: recalculateWithToggles, showPage, exportResults, leverage slider setup, DOMContentLoaded init

function recalculateWithToggles() {
  if (!_lastResult || !_lastInputs || !_lastEnabledStrategies) return;

  // Build disabledMap from toggle state
  var disabledMap = {
    brooklyn: !_strategyToggles.brooklyn,
    oilgas:   !_strategyToggles.oilgas,
    delphi:   !_strategyToggles.delphi,
    helix:    !_strategyToggles.helix
  };

  // Check if ALL strategies are disabled
  var allDisabled = disabledMap.brooklyn && disabledMap.oilgas && disabledMap.delphi && disabledMap.helix;

  if (allDisabled) {
    var baseResult = {};
    for (var k in _lastResult) baseResult[k] = _lastResult[k];
    baseResult.optimizedTax = _lastBaseline.tax;
      baseResult.pureTax = _lastBaseline.tax;
    baseResult.savings = 0;
    baseResult.allocation = [];
    baseResult.totalLosses = 0;
    baseResult.totalOilGasOffset = 0;
    baseResult.totalDelphiAlloc = null;
    baseResult.totalHelixAlloc = null;
    displayResults(baseResult, _lastBaseline, _lastInputs);
    return;
  }

  // Re-run the solver with only enabled strategies
  var newResult = solveOptimalAllocation(
    _lastInputs,
    _lastEnabledStrategies,
    _lastAvailCap,
    _lastLeverage,
    _lastImplDate,
    disabledMap
  );

  // Update stored result for subsequent toggles
  _lastResult = newResult;
  _lastAllocation = newResult.allocation && newResult.allocation.length > 0 ? newResult.allocation[0] : null;

  displayResults(newResult, _lastBaseline, _lastInputs);
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
    // Auto-populate Max Sector Investment from Strategy Selector
    var sectorVal = document.getElementById('inline-sector_allocation');
    var ogMaxEl = document.getElementById('oil_gas_max');
    if (sectorVal && ogMaxEl && sectorVal.value && !ogMaxEl.value) {
      ogMaxEl.value = sectorVal.value;
      ogMaxEl.dispatchEvent(new Event('input', {bubbles: true}));
    }
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
    var exportBrooklynFee = 0;
    var exportBrooklynFeeRate = 0;
    if (result.allocation && result.allocation.length && result.allocation[0].brooklynFee) {
      exportBrooklynFee = result.allocation[0].brooklynFee;
      exportBrooklynFeeRate = result.allocation[0].brooklynFeeRate;
    }
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
  rp += 'STRATEGY FEES\n' +
    '  Brooklyn Strategy Fee: ' + formatCurrency(exportBrooklynFee) + (exportBrooklynFeeRate ? ' (' + (exportBrooklynFeeRate * 100).toFixed(2) + '%)' : '') + '\n' +
    '  Delphi Management Fee: ' + (result.allocation && result.allocation[0] && result.allocation[0].delphiAllocation ? formatCurrency(result.allocation[0].delphiAllocation.managementFee || 0) : '$0') + '\n' +
    '  Helix Management Fee: ' + (result.allocation && result.allocation[0] && result.allocation[0].helixAllocation ? formatCurrency(result.allocation[0].helixAllocation.managementFee || 0) : '$0') + '\n' +
    '  Total Strategy Fees: ' + formatCurrency(exportBrooklynFee + (result.allocation && result.allocation[0] && result.allocation[0].delphiAllocation ? (result.allocation[0].delphiAllocation.managementFee || 0) : 0) + (result.allocation && result.allocation[0] && result.allocation[0].helixAllocation ? (result.allocation[0].helixAllocation.managementFee || 0) : 0)) + '\n\n  STRATEGIES APPLIED\n';
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
    if ((alloc.helixInvestment || 0) > 0) {
      var hf = HELIX_STRATEGIES[alloc.helixClass];
      rp += '  Helix: ' + (hf ? hf.name : alloc.helixClass) + '\n';
      rp += '    Investment: ' + formatCurrency(alloc.helixInvestment) + '\n';
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

// --- Leverage Preference Slider ---
function updateLeverageSliderLabel(pct) {
  var label = document.getElementById('leverage_pref_label');
  if (!label) return;
  var leverage = (pct / 100 * 2.25);
  var desc = '';
  if (pct <= 0) desc = 'Conservative';
  else if (pct <= 15) desc = 'Conservative';
  else if (pct <= 25) desc = 'Moderate-Conservative';
  else if (pct <= 50) desc = 'Moderate';
  else if (pct <= 70) desc = 'Moderate-Aggressive';
  else desc = 'Aggressive';
  label.textContent = desc + ' \u2014 Leverage: ' + leverage.toFixed(2);
}

function setupLeverageSlider() {
  var slider = document.getElementById('leverage_preference');
  if (!slider) return;
  slider.addEventListener('input', function() {
    var pct = parseInt(this.value);
    updateLeverageSliderLabel(pct);
    var leverage = (pct / 100 * 2.25);
    var levEl = document.getElementById('max_leverage');
    if (levEl) levEl.value = leverage;
    var customEl = document.getElementById('custom_leverage_value');
    if (customEl) customEl.value = leverage;
  });
  updateLeverageSliderLabel(0);
}

// --- Initialization ---
buildQuestions();
  buildPage2ToPage1Map();
loadStrategies();
loadTaxBrackets();
setupLeverageSlider();






