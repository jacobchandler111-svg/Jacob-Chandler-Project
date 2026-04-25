// FILE: js/01-brooklyn/date-utils.js
// Date parsing helpers used across Brooklyn/Delphi/Helix engines

function parseLocalDate(dateStr) {
  // Parse YYYY-MM-DD as local time to avoid UTC timezone offset issues
  if (!dateStr) return new Date();
  const parts = String(dateStr).split(/[-/T]/);
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]) || 1);
}

