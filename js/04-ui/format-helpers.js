// FILE: js/04-ui/format-helpers.js
// UI state vars (userAnswers, strategiesData) + currency formatting helpers (formatCurrency, parseCurrencyInput, setupCurrencyInput, setupPage2CurrencyInputs)

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

  // --- Reverse sync: Page 2 -> Page 1 ---
  var _page2ToPage1Map = {};

  function buildPage2ToPage1Map() {
        _page2ToPage1Map = {};
        function scanQuestions(arr) {
                if (!arr) return;
                arr.forEach(function(q) {
                          if (q.inputField && q.inputField.mapTo) {
                                      var page2Id = q.inputField.mapTo;
                                      if (!_page2ToPage1Map[page2Id]) _page2ToPage1Map[page2Id] = [];
                                      _page2ToPage1Map[page2Id].push({
                                                    inputId: 'inline-' + q.id,
                                                    answerKey: '_input_' + q.id
                                      });
                          }
                          if (q.followUp) scanQuestions(q.followUp);
                });
        }
        Object.keys(questions).forEach(function(section) {
                scanQuestions(questions[section]);
        });
  }

function setupPage2CurrencyInputs() {
  var currencyFields = ['w2_wages','se_income','biz_revenue','rental_income',
    'dividend_income','retirement_distributions','st_gains','lt_gains','portfolio_value',
    'cost_basis','charitable','salt','retirement_contrib','property_values',
    'available_capital','oil_gas_max'];
  currencyFields.forEach(function(id) {
    var el = document.getElementById(id);
      if (el) {
                setupCurrencyInput(el, null);
                // Reverse sync: Page 2 -> Page 1
                el.addEventListener('blur', function() {
                            var mappings = _page2ToPage1Map[id];
                            if (mappings) {
                                          mappings.forEach(function(m) {
                                                          var page1Input = document.getElementById(m.inputId);
                                                          if (page1Input) {
                                                                            page1Input.value = this.value;
                                                          }
                                                          userAnswers[m.answerKey] = this.value;
                                          }.bind(this));
                            }
                });
      }
  });
}

