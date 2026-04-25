// FILE: js/04-ui/progress-and-brooklyn-ui.js
// Progress + match-count + Brooklyn-UI helpers: updateProgress, updateMatchCount, updateBrooklynUI

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
    if (!strategiesData || !strategiesData.length) return;
    var triggerMap = {};
    if (userAnswers.earned_income) triggerMap.high_income = true;
    if (userAnswers.w2_employee) { triggerMap.employee_compensation = true; triggerMap.retirement_planning = true; }
    if (userAnswers.has_business) { triggerMap.business_owner = true; triggerMap.entity_selection = true; triggerMap.employee_expenses = true; triggerMap.vehicle_expense = true; triggerMap.equipment_purchase = true; }
    if (userAnswers.has_self_employment) { triggerMap.self_employed = true; triggerMap.sole_proprietor = true; triggerMap.business_owner = true; }
    if (userAnswers.has_rental) { triggerMap.rental_property = true; triggerMap.real_estate = true; triggerMap.investment_property = true; triggerMap.property_purchase = true; }
    if (userAnswers.appreciated_asset) { triggerMap.appreciated_assets = true; triggerMap.capital_gains = true; triggerMap.long_term_capital_gains = true; triggerMap.investments = true; }
    if (userAnswers.stock_options) { triggerMap.stock_options = true; triggerMap.employee_compensation = true; }
    if (userAnswers.has_dividend_income) { triggerMap.dividend_income = true; triggerMap.investments = true; }
    if (userAnswers.has_retirement_income) { triggerMap.retirement_planning = true; }
    if (userAnswers.is_s_corp) { triggerMap.s_corp = true; triggerMap.entity_selection = true; }
    if (userAnswers.is_partnership) { triggerMap.partnership = true; triggerMap.entity_selection = true; }
    if (userAnswers.sector_allocation) { triggerMap.natural_resources = true; }
    var count = 0;
    strategiesData.forEach(function(s) {
      if (!s.triggers || !s.triggers.length) return;
      var matched = s.triggers.every(function(t) { return triggerMap[t] === true; });
      if (matched) count++;
    });
    var el = document.getElementById("match-count");
    if (el) el.textContent = count;
  }

function updateBrooklynUI() {
  var customLev = userAnswers.custom_leverage;
  var section = document.getElementById('custom-leverage-section');
  if (section) { section.classList.toggle('hidden', !customLev); }
}

