// FILE: js/02-tax-engine/tax-data.js
// Tax bracket / standard deduction / LTCG fallback constants. TAX_DATA holds the loaded JSON when available.

let TAX_DATA = null;

const TAX_BRACKETS_2026_FALLBACK = {
  single: [[11600,0.10],[47150,0.12],[100525,0.22],[191950,0.24],[243725,0.32],[609350,0.35],[Infinity,0.37]],
  married_joint: [[23200,0.10],[94300,0.12],[201050,0.22],[383900,0.24],[487450,0.32],[731200,0.35],[Infinity,0.37]],
  married_separate: [[11600,0.10],[47150,0.12],[100525,0.22],[191950,0.24],[243725,0.32],[365600,0.35],[Infinity,0.37]],
  head_household: [[16550,0.10],[63100,0.12],[100500,0.22],[191950,0.24],[243700,0.32],[609350,0.35],[Infinity,0.37]]
};

const STANDARD_DEDUCTION_2026_FALLBACK = {
  single: 15000, married_joint: 30000, married_separate: 15000, head_household: 22500
};

const LTCG_RATES_FALLBACK = {
  single: [[47025,0],[518900,0.15],[Infinity,0.20]],
  married_joint: [[94050,0],[583750,0.15],[Infinity,0.20]]
};
