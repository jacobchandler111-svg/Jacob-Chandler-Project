// FILE: js/04-ui/questionnaire-render.js
// Question rendering: renderQuestion, renderFollowUpQuestion, renderInlineInput, renderSelectQuestion, renderPresetQuestion

function renderQuestion(container, q, section) {
  var card = document.createElement('div');
  card.className = 'question-card';
  card.setAttribute('data-question', q.id);
  var textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = q.text;
  card.appendChild(textDiv);
  if (!q.inputOnly) {
    var toggleDiv = document.createElement('div');
    toggleDiv.className = 'toggle-group';
    var yesBtn = document.createElement('button');
    yesBtn.className = 'toggle-btn yes' + (userAnswers[q.trigger] === true ? ' selected' : '');
    yesBtn.textContent = 'Yes';
    yesBtn.onclick = function() { setAnswer(q.id, q.trigger, true, this, q, section); };
    var noBtn = document.createElement('button');
    noBtn.className = 'toggle-btn no' + (userAnswers[q.trigger] === false ? ' selected' : '');
    noBtn.textContent = 'No';
    noBtn.onclick = function() { setAnswer(q.id, q.trigger, false, this, q, section); };
    toggleDiv.appendChild(yesBtn);
    toggleDiv.appendChild(noBtn);
    card.appendChild(toggleDiv);
  }
  container.appendChild(card);
  // Render inline input if this question has one (for non-followUp questions like sector investment)
  if (q.inputField) {
    if (q.inputOnly) {
      userAnswers[q.trigger] = true;
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'space-between';
      card.style.gap = '20px';
      textDiv.style.flex = '1';
      textDiv.style.minWidth = '0';
    }
    renderInlineInput(card, q);
  }
  // Render follow-up questions if answered yes
  if (q.followUp && userAnswers[q.trigger] === true) {
    var fc = document.createElement('div');
    fc.className = 'follow-up-container';
    fc.id = 'followup-' + q.id;
    q.followUp.forEach(function(fq) { renderFollowUpQuestion(fc, fq, section, q.trigger); });
    container.appendChild(fc);
  }
}

function renderFollowUpQuestion(container, fq, section, parentTrigger) {
  if (fq.showWhen && !fq.showWhen(userAnswers)) return;
  var card = document.createElement('div');
  card.className = 'follow-up-question';
  card.setAttribute('data-question', fq.id);
  var textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = fq.text;
  card.appendChild(textDiv);
  if (fq.trigger !== parentTrigger) {
    var toggleDiv = document.createElement('div');
    toggleDiv.className = 'toggle-group';
    var yesBtn = document.createElement('button');
    yesBtn.className = 'toggle-btn yes' + (userAnswers[fq.trigger] === true ? ' selected' : '');
    yesBtn.textContent = 'Yes';
    yesBtn.onclick = function() { setAnswer(fq.id, fq.trigger, true, this, fq, section); };
    var noBtn = document.createElement('button');
    noBtn.className = 'toggle-btn no' + (userAnswers[fq.trigger] === false ? ' selected' : '');
    noBtn.textContent = 'No';
    noBtn.onclick = function() { setAnswer(fq.id, fq.trigger, false, this, fq, section); };
    toggleDiv.appendChild(yesBtn);
    toggleDiv.appendChild(noBtn);
    card.appendChild(toggleDiv);
  }
  if (fq.inputField) { renderInlineInput(card, fq); }
  container.appendChild(card);
  // Handle nested follow-ups (e.g., W-2 amount after W-2 employee Yes)
  if (fq.followUp && userAnswers[fq.trigger] === true) {
    var nestedFc = document.createElement('div');
    nestedFc.className = 'follow-up-container';
    nestedFc.id = 'followup-' + fq.id;
    fq.followUp.forEach(function(nfq) { renderFollowUpQuestion(nestedFc, nfq, section, fq.trigger); });
    container.appendChild(nestedFc);
  }
}

function renderInlineInput(card, q) {
  var inputDiv = document.createElement('div');
  inputDiv.className = 'inline-input-container';
  inputDiv.id = 'input-wrap-' + q.id;
  inputDiv.style.display = userAnswers[q.trigger] === true ? 'block' : 'none';
  if (q.inputOnly) {
    inputDiv.style.marginTop = '0';
    inputDiv.style.width = '300px';
    inputDiv.style.maxWidth = '300px';
    inputDiv.style.flexBasis = '300px';
    inputDiv.style.flexShrink = '0';
  } else {
    inputDiv.style.marginTop = '10px';
  }
  var label = document.createElement('label');
  label.textContent = q.inputField.label;
  label.style.color = '#b0bec5';
  label.style.fontSize = '0.9em';
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = q.inputField.placeholder || '';
  input.id = 'inline-' + q.id;
  input.className = 'currency-input';
  input.style.cssText = 'width:100%;padding:10px 12px;margin-top:4px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1626;color:#e0e6ed;font-size:1em;';
  if (q.inputField.mapTo) { setupCurrencyInput(input, q.inputField.mapTo); }
  // Restore saved value
  var savedKey = '_input_' + q.id;
  if (userAnswers[savedKey]) { var restoredNum = parseFloat(String(userAnswers[savedKey]).replace(/[^0-9.]/g, '')); input.value = (!isNaN(restoredNum) && restoredNum > 0) ? formatCurrency(restoredNum) : userAnswers[savedKey]; }
  input.addEventListener('input', function() { userAnswers['_input_' + q.id] = this.value; });
  inputDiv.appendChild(label);
  inputDiv.appendChild(input);
  card.appendChild(inputDiv);
}

function renderSelectQuestion(container, q, section) {
  var card = document.createElement('div');
  card.className = 'question-card';
  card.setAttribute('data-question', q.id);
  var textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = q.text;
  card.appendChild(textDiv);
  var sel = document.createElement('select');
  sel.className = 'strategy-select';
  sel.style.cssText = 'padding:10px 14px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1626;color:#e0e6ed;font-size:1em;width:100%;margin-top:8px;';
  var defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Select --';
  sel.appendChild(defaultOpt);
  q.choices.forEach(function(c) {
    var opt = document.createElement('option');
    opt.value = c.value;
    opt.textContent = c.label;
    sel.appendChild(opt);
  });
  var savedVal = userAnswers['_select_' + q.id];
  if (savedVal) sel.value = savedVal;
  sel.onchange = function() {
    userAnswers['_select_' + q.id] = this.value;
    userAnswers[q.trigger] = !!this.value;
    var betaEl = document.getElementById('beta_selection');
    if (betaEl && this.value) betaEl.value = this.value;
    autoFillLeverage();
    rebuildConditionalSections();
    buildSectionQuestions('strategy');
    updateProgress();
  };
  card.appendChild(sel);
  container.appendChild(card);
}

function renderPresetQuestion(container, q, section) {
  var card = document.createElement('div');
  card.className = 'question-card';
  card.setAttribute('data-question', q.id);
  var textDiv = document.createElement('div');
  textDiv.className = 'question-text';
  textDiv.textContent = q.text;
  card.appendChild(textDiv);
  var sel = document.createElement('select');
  sel.className = 'strategy-select';
  sel.style.cssText = 'padding:10px 14px;border-radius:6px;border:1px solid #2a4a8e;background:#0a1626;color:#e0e6ed;font-size:1em;width:100%;margin-top:8px;';
  var defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Select Leverage --';
  sel.appendChild(defaultOpt);
  var beta = userAnswers['_select_beta_selection_q'] || '1';
  var isAdvisor = userAnswers.advisor_managed === true;
  var stratKey = getBrooklynStrategyKey(isAdvisor, parseFloat(beta));
  var strat = BROOKLYN_STRATEGIES[stratKey];
  if (strat && strat.dataPoints) {
    strat.dataPoints.forEach(function(dp) {
      var opt = document.createElement('option');
      opt.value = dp.label;
      opt.textContent = dp.label + ' (' + dp.longPct + '/' + dp.shortPct + ')';
      sel.appendChild(opt);
    });
  }
  var savedPreset = userAnswers['_preset_leverage'];
  if (savedPreset) sel.value = savedPreset;
  sel.onchange = function() {
    userAnswers['_preset_leverage'] = this.value;
    userAnswers[q.trigger] = !!this.value;
    var stratForSlider = BROOKLYN_STRATEGIES[getBrooklynStrategyKey(userAnswers.advisor_managed === true, parseFloat(userAnswers['_select_beta_selection_q'] || '1'))];
    if (stratForSlider) {
      var dpMatch = stratForSlider.dataPoints.find(function(p) { return p.label === this.value; }.bind(this));
      if (dpMatch) {
        var slider = document.getElementById('leverage_preference');
        if (slider) { var pct = Math.round((dpMatch.leverage / 2.25) * 100); slider.value = pct; if (typeof updateLeverageSliderLabel === 'function') updateLeverageSliderLabel(pct); }
      }
    }
    autoFillLeverage();
    updateProgress();
  };
  card.appendChild(sel);
  container.appendChild(card);
}

// Auto-fill leverage on Page 2 based on strategy selections
