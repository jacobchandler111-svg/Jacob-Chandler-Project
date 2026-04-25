// FILE: js/02-tax-engine/tax-lookups.js
// Year-aware lookups for federal brackets / standard deduction / LTCG / NIIT / SE tax. UI calls getSelectedTaxYear/getSelectedState; engine functions accept year explicitly.

function getSelectedTaxYear() {
  var el = document.getElementById('tax_year');
  return el ? el.value : '2026';
}

function getSelectedState() {
  var el = document.getElementById('state');
  return el ? el.value : '';
}

function getFederalBrackets(year, filing) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return TAX_BRACKETS_2026_FALLBACK[filing] || TAX_BRACKETS_2026_FALLBACK.single;
  const yearData = TAX_DATA.federal[year];
  return yearData.brackets[filing] || yearData.brackets.single;
}

function getStandardDeduction(year, filing) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return STANDARD_DEDUCTION_2026_FALLBACK[filing] || 15000;
  return TAX_DATA.federal[year].standardDeduction[filing] || 15000;
}

function getLtcgRates(year, filing) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return LTCG_RATES_FALLBACK[filing] || LTCG_RATES_FALLBACK.single;
  return TAX_DATA.federal[year].ltcgRates[filing] || TAX_DATA.federal[year].ltcgRates.single;
}

function getNiitThreshold(year, filing) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return filing === 'single' ? 200000 : 250000;
  return TAX_DATA.federal[year].niitThreshold[filing] || 200000;
}

function getSeTaxRate(year) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return 0.153;
  return TAX_DATA.federal[year].seTaxRate || 0.153;
}

function getSeTaxMultiplier(year) {
  if (!TAX_DATA || !TAX_DATA.federal[year]) return 0.9235;
  return TAX_DATA.federal[year].seTaxMultiplier || 0.9235;
}
