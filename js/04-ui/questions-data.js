// FILE: js/04-ui/questions-data.js
// Questionnaire definition: questions tree (income/assets/strategy/business sections) + sectionMap

const questions = {
  income: [
    {
      id: 'earned_income', text: 'Do you have earned income?', trigger: 'earned_income',
      followUp: [
        {
          id: 'w2_employee', text: 'Are you a W-2 employee?', trigger: 'w2_employee',
          followUp: [{
            id: 'w2_amount', text: 'How much did you earn from W-2 jobs?', trigger: 'w2_employee',
            inputField: { type: 'number', placeholder: 'e.g. 150,000', label: 'Annual W-2 Income', mapTo: 'w2_wages' }
          }]
        },
        {
          id: 'not_w2_business', text: 'Do you own your own business?', trigger: 'has_business',
          showWhen: function(a) { return a.w2_employee === false; },
          inputField: { type: 'number', placeholder: 'e.g. 100,000', label: 'Annual Business Income', mapTo: 'biz_revenue' }
        },
        {
          id: 'not_w2_retirement', text: 'Do you receive retirement benefits?', trigger: 'retirement_income',
          showWhen: function(a) { return a.w2_employee === false; },
          inputField: { type: 'number', placeholder: 'e.g. 40,000', label: 'Annual Retirement Distributions', mapTo: 'retirement_distributions' }
        },
        {
          id: 'multiple_income', text: 'Do you have multiple sources of income?', trigger: 'multiple_income',
          followUp: [
            { id: 'has_rental', text: 'Do you own rental properties?', trigger: 'rental_property',
              inputField: { type: 'number', placeholder: 'e.g. 50,000', label: 'Annual Rental Income', mapTo: 'rental_income' } },
            { id: 'has_business', text: 'Do you own a business?', trigger: 'has_business',
              inputField: { type: 'number', placeholder: 'e.g. 100,000', label: 'Annual Business Income', mapTo: 'biz_revenue' } },
            { id: 'has_self_employment', text: 'Do you have self-employment income?', trigger: 'self_employed',
              inputField: { type: 'number', placeholder: 'e.g. 75,000', label: 'Annual Self-Employment Income', mapTo: 'se_income' } },
            { id: 'has_retirement_income', text: 'Are you receiving retirement benefits?', trigger: 'retirement_income',
              inputField: { type: 'number', placeholder: 'e.g. 40,000', label: 'Annual Retirement Distributions', mapTo: 'retirement_distributions' } },
            { id: 'has_dividend_income', text: 'Do you receive significant dividend income?', trigger: 'dividend_income',
              inputField: { type: 'number', placeholder: 'e.g. 25,000', label: 'Annual Dividend Income', mapTo: 'dividend_income' } }
          ]
        }
      ]
    }
  ],

  assets: [
    {
      id: 'appreciated_asset', text: 'Do you have appreciated assets you are looking to sell?', trigger: 'appreciated_asset',
      followUp: [
        { id: 'asset_value', text: 'What is the total value of assets?', trigger: 'appreciated_asset',
          inputField: { type: 'number', placeholder: 'e.g. 500,000', label: 'Portfolio Value of Sale', mapTo: 'portfolio_value' } },
        { id: 'cost_basis_amt', text: 'What is your cost basis?', trigger: 'appreciated_asset',
          inputField: { type: 'number', placeholder: 'e.g. 200,000', label: 'Cost Basis', mapTo: 'cost_basis' } },
        { id: 'lt_gains_amt', text: 'Amount that is long-term capital gains?', trigger: 'appreciated_asset',
          inputField: { type: 'number', placeholder: 'e.g. 200,000', label: 'Long-Term Capital Gains', mapTo: 'lt_gains' } },
        { id: 'st_gains_amt', text: 'Amount that is short-term capital gains?', trigger: 'appreciated_asset',
          inputField: { type: 'number', placeholder: 'e.g. 50,000', label: 'Short-Term Capital Gains', mapTo: 'st_gains' } }
      ]
    },
    { id: 'stock_options', text: 'Do you have stock options (ISO or NSO)?', trigger: 'stock_options' }
  ],

  strategy: [
    {
      id: 'sector_allocation', text: 'What is your max allocation for a given sector?', trigger: 'sector_allocation', inputOnly: true,
      inputField: { type: 'number', placeholder: 'e.g. 100,000', label: 'Max Allocation', mapTo: 'oil_gas_max' }
    }
  ],

  business: [
    { id: 'is_s_corp', text: 'Is your business an S Corporation?', trigger: 's_corp',
      showWhen: function(a) { return a.has_business === true; } },
    { id: 'is_partnership', text: 'Are you in a partnership or LLC?', trigger: 'partnership',
      showWhen: function(a) { return a.has_business === true; } }
  ]
};

const sectionMap = {
  income: 'q-income', assets: 'q-assets', strategy: 'q-strategy',
  business: 'q-business'
};
