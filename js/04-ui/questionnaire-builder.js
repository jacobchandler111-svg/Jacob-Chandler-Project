// FILE: js/04-ui/questionnaire-builder.js
// buildQuestions / buildSectionQuestions: walks the questions tree and produces conditional question containers

// --- Build Questions with Conditional Logic ---
function buildQuestions() {
  Object.keys(questions).forEach(function(section) {
    var container = document.getElementById(sectionMap[section]);
    if (!container) return;
    container.innerHTML = '';
    questions[section].forEach(function(q) {
      if (q.showWhen && !q.showWhen(userAnswers)) return;
      if (q.choiceType === 'select') { renderSelectQuestion(container, q, section); }
      else if (q.choiceType === 'leverage_preset') { renderPresetQuestion(container, q, section); }
      else { renderQuestion(container, q, section); }
    });
  });
  rebuildConditionalSections();
}

function buildSectionQuestions(section) {
  var container = document.getElementById(sectionMap[section]);
  if (!container) return;
  container.innerHTML = '';
  questions[section].forEach(function(q) {
    if (q.showWhen && !q.showWhen(userAnswers)) return;
    if (q.choiceType === 'select') { renderSelectQuestion(container, q, section); }
    else if (q.choiceType === 'leverage_preset') { renderPresetQuestion(container, q, section); }
    else { renderQuestion(container, q, section); }
  });
}

function renderQuestion(container, q, section) {
  var card = document.createElement('div');
