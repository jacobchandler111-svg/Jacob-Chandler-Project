// FILE: js/04-ui/answer-state.js
// Answer state management: autoFillLeverage, setAnswer, rebuildConditionalSections, syncPage2Visibility, updateProgress

function autoFillLeverage() {
  var beta = userAnswers['_select_beta_selection_q'] || '1';
  var isAdvisor = userAnswers.advisor_managed === true;
  var stratKey = getBrooklynStrategyKey(isAdvisor, parseFloat(beta));
  var strat = BROOKLYN_STRATEGIES[stratKey];

  if (userAnswers.custom_leverage === true) return; // User wants custom

  var presetLabel = userAnswers['_preset_leverage'];
  if (presetLabel && strat) {
    var dp = strat.dataPoints.find(function(p) { return p.label === presetLabel; });
    if (dp) {
      var levEl = document.getElementById('max_leverage');
      if (levEl) levEl.value = dp.leverage;
      var customEl = document.getElementById('custom_leverage_value');
      if (customEl) customEl.value = dp.leverage;
      var slider = document.getElementById('leverage_preference');
      if (slider) { var pct = Math.round((dp.leverage / 2.25) * 100); slider.value = pct; if (typeof updateLeverageSliderLabel === 'function') updateLeverageSliderLabel(pct); }
    }
  } else if (strat && strat.dataPoints.length > 0) {
    var dp = strat.dataPoints[0];
    var levEl = document.getElementById('max_leverage');
    if (levEl) levEl.value = dp.leverage;
    var customEl = document.getElementById('custom_leverage_value');
    if (customEl) customEl.value = dp.leverage;
    var slider = document.getElementById('leverage_preference');
    if (slider) { var pct = Math.round((dp.leverage / 2.25) * 100); slider.value = pct; if (typeof updateLeverageSliderLabel === 'function') updateLeverageSliderLabel(pct); }
  }
}

function setAnswer(questionId, trigger, value, btn, questionObj, section) {
  userAnswers[trigger] = value;
  var card = btn.closest('.question-card') || btn.closest('.follow-up-question');
  if (card) {
    card.querySelectorAll('.toggle-btn').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
  }
  var inputWrap = document.getElementById('input-wrap-' + questionId);
  if (inputWrap) { inputWrap.style.display = value ? 'block' : 'none'; }
  if (questionObj && questionObj.followUp) {
    var existingFollowUp = document.getElementById('followup-' + questionId);
    if (value && !existingFollowUp) { buildSectionQuestions(section); }
    else if (!value && existingFollowUp) { existingFollowUp.remove(); }
  }
  rebuildConditionalSections();
  if (trigger === 'w2_employee') {
    buildSectionQuestions('income');
  }
  if (section === 'strategy' || trigger === 'advisor_managed') {
    buildSectionQuestions('strategy');
  }
  syncPage2Visibility();
  updateProgress();
  updateMatchCount();
  updateBrooklynUI();
}

function rebuildConditionalSections() {
  var bizContainer = document.getElementById('q-business');
  if (bizContainer) {
    var showBiz = userAnswers.has_business === true;
    bizContainer.style.display = showBiz ? 'block' : 'none';
    var bizH = bizContainer.previousElementSibling;
    if (bizH && bizH.tagName === 'H3') { bizH.style.display = showBiz ? 'block' : 'none'; }
  }

  ['business'].forEach(function(section) {
    var container = document.getElementById(sectionMap[section]);
    if (!container) return;
    container.innerHTML = '';
    questions[section].forEach(function(q) {
      if (q.showWhen && !q.showWhen(userAnswers)) return;
      renderQuestion(container, q, section);
    });
  });
}

function syncPage2Visibility() {
  var fieldVisibility = {
    has_business: ['biz_revenue'],
    rental_property: ['rental_income'],
    dividend_income: ['dividend_income'],
    self_employed: ['se_income']
  };
  Object.entries(fieldVisibility).forEach(function(entry) {
    var trigger = entry[0], fieldIds = entry[1];
    var answered = userAnswers[trigger];
    fieldIds.forEach(function(fieldId) {
      var inputEl = document.getElementById(fieldId);
      if (!inputEl) return;
      var group = inputEl.closest('.input-group');
      if (group) {
        if (answered === false) { group.style.display = 'none'; inputEl.value = ''; }
        else { group.style.display = ''; }
      }
    });
  });
  var ogField = document.getElementById('oil_gas_max');
  if (ogField) {
    var ogGroup = ogField.closest('.input-group');
    if (ogGroup) { ogGroup.style.display = userAnswers.sector_allocation === true ? '' : 'none'; }
  }
}

