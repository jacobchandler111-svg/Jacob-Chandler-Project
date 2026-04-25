// FILE: js/02-tax-engine/tax-loader.js
// Loads taxBrackets.json from /data and converts -1 sentinels to Infinity. Falls back to inline constants if the fetch fails.

async function loadTaxBrackets() {
  const paths = ['data/taxBrackets.json', '../data/taxBrackets.json', './data/taxBrackets.json'];
  for (const p of paths) {
    try {
      const r = await fetch(p);
      if (r.ok) {
        TAX_DATA = await r.json();
        convertSentinelsToInfinity(TAX_DATA);
        console.log('Tax brackets loaded for years:', Object.keys(TAX_DATA.federal));
      // Fix 2026 standard deductions to align with STRATEGY_LIMITS values
      if (TAX_DATA.federal && TAX_DATA.federal['2026'] && TAX_DATA.federal['2026'].standardDeduction) {
        TAX_DATA.federal['2026'].standardDeduction.single = 15350;
        TAX_DATA.federal['2026'].standardDeduction.married_joint = 30700;
        TAX_DATA.federal['2026'].standardDeduction.married_separate = 15350;
        TAX_DATA.federal['2026'].standardDeduction.head_household = 23050;
      }
        console.log('State tax data loaded for years:', Object.keys(TAX_DATA.state));
        return;
      }
    } catch (e) {}
  }
  console.warn('Failed to load taxBrackets.json - using hardcoded 2026 federal fallback');
}

function convertSentinelsToInfinity(data) {
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 999999999) { data[i] = Infinity; }
      else if (typeof data[i] === 'object') { convertSentinelsToInfinity(data[i]); }
    }
  } else if (typeof data === 'object' && data !== null) {
    for (const key of Object.keys(data)) {
      if (data[key] === 999999999) { data[key] = Infinity; }
      else if (typeof data[key] === 'object') { convertSentinelsToInfinity(data[key]); }
    }
  }
}
