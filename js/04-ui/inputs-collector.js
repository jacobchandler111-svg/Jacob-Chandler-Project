// FILE: js/04-ui/inputs-collector.js
// getFormInputs: aggregates all answered values into the inputs object consumed by evaluateAllStrategies

function getFormInputs() {
  var fields = ['w2_wages','se_income','biz_revenue','rental_income',
    'dividend_income','retirement_distributions','st_gains','lt_gains','portfolio_value',
    'cost_basis','charitable','salt','retirement_contrib','property_values','taxpayer_age','state',
    'implementation_date','available_capital','max_leverage','beta_selection',
    'leverage_preference','custom_leverage_value','filing_status','tax_year',
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

// Global state for strategy toggle feature
var _lastResult = null;
var _lastBaseline = null;
var _lastInputs = null;
var _lastAllocation = null;
var _lastEnabledStrategies = null;
var _lastAvailCap = 0;
var _lastLeverage = 0;
var _lastImplDate = null;
var _strategyToggles = { brooklyn: true, oilgas: true, delphi: true, helix: true };

