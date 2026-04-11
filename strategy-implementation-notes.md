# Strategy Implementation Notes
## Brookhaven Tax Strategy Planning Engine

**Date:** April 11, 2026
**Purpose:** Research and implementation plan for all 51 strategies in strategies.json
**Status:** 3 strategies currently have math/solver integration. This document covers the remaining 48.

---

## ALREADY IMPLEMENTED (Have Math in app.js)

### Brooklyn Strategies (Capital Loss Harvesting via Direct Indexing)
- **Status:** FULLY IMPLEMENTED with regression engine, leverage interpolation, min investment thresholds
- **Mechanism:** Invests in a direct-index portfolio that harvests short-term and long-term capital losses to offset gains and income
- **Data:** BROOKLYN_STRATEGIES object with beta1, beta05, beta0, advisorManaged; each has dataPoints with leverage, longPct, shortPct, lossRate, minInvestment
- **Solver:** Integrated into solveOptimalAllocation() with Delphi and Oil & Gas

### Delphi Fund (ID 51) - Ordinary Income Offset
- **Status:** FULLY IMPLEMENTED with regression engine
- **Mechanism:** Class A and Class B fund investments that produce ordinary loss deductions
- **Data:** DELPHI_STRATEGIES object with classA, classB; each has dataPoints with investment and ordinaryLossRate
- **Solver:** Integrated into solveOptimalAllocation() alongside Brooklyn

### Oil & Gas Direct Investment
- **Status:** FULLY IMPLEMENTED
- **Mechanism:** Dollar invested x offset rate (default 95%) = ordinary income deduction via IDC (intangible drilling costs)
- **Data:** User inputs max investment; rate stored as hidden field (0.95 default)
- **Solver:** Integrated into solveOptimalAllocation() with shared budget constraint

---

## STRATEGIES NEEDING IMPLEMENTATION

### Implementation Categories

Each unimplemented strategy falls into one of these implementation patterns:

1. **DOLLAR-IN / DEDUCTION-OUT** - Client invests or spends $X, gets $Y deduction or credit. Can be integrated into the solver with a formula.
2. **RESTRUCTURING** - Requires changing business entity, creating trusts, etc. No simple dollar-in formula. Implementation = flag it as recommended + estimate savings.
3. **CREDIT-BASED** - Produces a tax credit (dollar-for-dollar reduction in tax). Needs credit calculation logic.
4. **DEFERRAL** - Defers tax to a future year. Doesn't reduce current-year tax directly but shifts timing.
5. **INFORMATIONAL** - Strategy is about tax filing optimization or compliance. No investment needed. Implementation = recommendation only.

---

## CATEGORY 1: CAPITAL GAINS DEFERRAL (3 strategies)

---

### ID 1: 1031 Exchange on Real Estate (Like-Kind Exchange)
**Type:** Business - Other | **Complexity:** High | **Recurring:** Never
**Triggers:** long_term_capital_gains, real_estate_sale, investment_property

**What It Is:**
IRC Section 1031 allows deferral of capital gains tax when selling investment/business real estate by reinvesting proceeds into a "like-kind" replacement property within strict timelines (45 days to identify, 180 days to close).

**Tax Mechanism:**
- Defers 100% of capital gains (both short-term and long-term) on the relinquished property
- Does NOT eliminate the tax - it carries over as reduced basis in the replacement property
- Applies to real property held for investment or business use only (not primary residence)

**Inputs Needed:**
- Sale price of relinquished property
- Adjusted basis of relinquished property
- Depreciation recapture amount (taxed at 25% max rate under Section 1250)
- Value of replacement property

**Math/Formula:**
- Gain deferred = Sale Price - Adjusted Basis (up to the value reinvested)
- If boot received (cash not reinvested): Boot is taxable
- Current year tax savings = (LTCG deferred x LTCG rate) + (depreciation recapture deferred x 25%)

**Implementation Pattern:** DEFERRAL
**How to Integrate:**
- Input: property sale price, basis, replacement property value
- Calculate: deferred gain = min(sale price - basis, replacement value)
- If partial exchange (boot received): taxable gain = sale price - basis - (replacement value - mortgage)
- Reduce current-year LTCG by the deferred amount
- Flag: "Note: Gain is deferred, not eliminated. Basis in replacement property is reduced."

---

### ID 36: Deferred Sales Trust (DST)
**Type:** Business Sale | **Complexity:** High | **Recurring:** Never
**Triggers:** business_sale, capital_gains, real_estate_sale

**What It Is:**
An installment sale to a specially structured trust that defers capital gains recognition. The seller transfers an appreciated asset to a trust in exchange for an installment note. The trust then sells the asset and invests the proceeds, paying the seller over time.

**Tax Mechanism:**
- Defers capital gains under IRC Section 453 (installment sale rules)
- Seller recognizes gain proportionally as installment payments are received over the note term (often 10-30 years)
- Trust pays no tax on the sale (it purchased at fair market value)
- Seller receives interest income on the note (taxable as ordinary income)

**Inputs Needed:**
- Asset value (sale price)
- Adjusted basis in asset
- Installment note term (years)
- Interest rate on the note
- Annual payment amount

**Math/Formula:**
- Total gain = Sale Price - Adjusted Basis
- Gross profit ratio = Total Gain / Sale Price
- Annual gain recognized = Annual Payment x Gross Profit Ratio
- Annual interest income = Outstanding Note Balance x Interest Rate
- Current year tax saved = (Total Gain - Annual Gain Recognized in Year 1) x applicable cap gains rate

**Implementation Pattern:** DEFERRAL
**How to Integrate:**
- Input: sale price, basis, note term, interest rate
- Calculate annual installment gain recognition
- Reduce current-year capital gains by the deferred portion
- Add interest income to ordinary income
- Net tax impact = tax saved on deferred gains - tax on interest income

---

### ID 17: Capital Gain Offsets (Capital Loss Harvesting)
**Type:** Cap Gains | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** capital_gains, investment_losses
**Category:** Investment Tax Planning (but also serves capital gains deferral)

**What It Is:**
Systematically selling investments at a loss to offset realized capital gains. Losses offset gains dollar-for-dollar, and up to $3,000 of excess losses can offset ordinary income per year. Remaining losses carry forward.

**Tax Mechanism:**
- Short-term losses first offset short-term gains (taxed at ordinary rates)
- Long-term losses first offset long-term gains (taxed at preferential rates)
- Net losses of either type can offset the other
- Excess net loss up to $3,000/year offsets ordinary income
- Wash sale rule: cannot repurchase substantially identical security within 30 days

**Inputs Needed:**
- Unrealized losses available for harvesting (short-term and long-term separately)
- Current realized capital gains (short-term and long-term)

**Math/Formula:**
- Net ST result = ST gains - ST losses harvested
- Net LT result = LT gains - LT losses harvested
- If both negative: excess loss deduction = min(abs(total net loss), 3000)
- Tax saved = (ST losses used x marginal ordinary rate) + (LT losses used x LTCG rate) + (min(excess, 3000) x ordinary rate)

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT (but the "investment" is selling existing holdings)
**How to Integrate:**
- This is essentially what Brooklyn strategies already do via direct indexing
- For standalone implementation: input available unrealized losses
- Apply against current gains, then $3K against ordinary income
- Note: Brooklyn strategies are the systematic version of this

---

## CATEGORY 2: BUSINESS TAX PLANNING (9 strategies)

---

### ID 2: 401(h) Tax Trifecta
**Type:** Business - Other | **Complexity:** High | **Recurring:** Annually
**Triggers:** business_owner, high_income, medical_expenses

**What It Is:**
Combines a Defined Benefit pension plan with a 401(h) medical benefits account. The business gets a deduction for contributions to both. The 401(h) account can fund retiree medical expenses tax-free. Called "trifecta" because it provides: (1) current income tax deduction, (2) tax-free growth, (3) tax-free distribution for medical expenses.

**Tax Mechanism:**
- Business deducts contributions to the DB plan + 401(h) account
- 401(h) contributions are limited to 25% of total DB plan contributions
- Medical benefits distributions are tax-free to the recipient
- DB plan contributions follow actuarial limits based on age and target benefit

**Inputs Needed:**
- Business owner's age
- Desired retirement benefit level
- Annual medical expense estimate
- Business net income (to verify deduction doesn't exceed income)

**Math/Formula:**
- Max DB contribution = actuarially determined (age-based, typically $50K-$300K+ for older owners)
- 401(h) contribution = up to 25% of DB contribution
- Total deduction = DB contribution + 401(h) contribution
- Tax saved = Total deduction x marginal business tax rate

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: owner age, target annual benefit, business income
- Use age-based DB contribution limits (lookup table)
- Calculate 401(h) add-on (25% of DB amount)
- Deduction reduces business income (self-employment or pass-through)
- Constraint: only for business owners with employees (can be owner-only if sole prop or partnership)

---

### ID 5: Accountable Plan
**Type:** Fringe Benefit | **Complexity:** Low | **Recurring:** Annually
**Triggers:** business_owner, employee_expenses

**What It Is:**
An IRS-compliant expense reimbursement arrangement where a business reimburses employees (including owner-employees) for legitimate business expenses. Reimbursements are tax-free to the employee and deductible by the business.

**Tax Mechanism:**
- Reimbursements are excluded from employee's W-2 income
- Business deducts the reimbursement as a business expense
- Must meet three requirements: business connection, substantiation, return of excess
- Saves both income tax AND payroll taxes (FICA 15.3%)

**Inputs Needed:**
- Annual business expenses eligible for reimbursement (home office, mileage, phone, internet, travel, etc.)
- Owner's marginal tax rate
- Whether owner is W-2 employee of own business (S-Corp or C-Corp)

**Math/Formula:**
- Tax savings = Reimbursable Expenses x (marginal income tax rate + FICA rate)
- FICA rate = 15.3% (7.65% employee + 7.65% employer) up to Social Security wage base
- Example: $20,000 expenses x (32% + 15.3%) = $9,460 saved

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: estimated reimbursable business expenses
- Deduction: dollar-for-dollar deduction from business income
- Bonus: also saves payroll taxes (add FICA savings calculation)
- Constraint: must be S-Corp or C-Corp owner-employee (not sole prop)

---

### ID 9: Augusta Rule
**Type:** Income Shifting | **Complexity:** Low | **Recurring:** Annually
**Triggers:** business_owner, home_rental

**What It Is:**
IRC Section 280A(g) allows a homeowner to rent their personal residence for up to 14 days per year without reporting the rental income. Combined with business use, a business owner can rent their home to their own business for meetings/events and deduct the rent as a business expense while the owner receives the income tax-free.

**Tax Mechanism:**
- Business deducts rent paid (reduces business taxable income)
- Owner receives rent income TAX-FREE (excluded under 14-day rule)
- Creates a net tax arbitrage: deduction at business level, no income at personal level
- Must charge fair market rental rates and have legitimate business purpose

**Inputs Needed:**
- Number of rental days (max 14)
- Fair market daily rental rate for the home
- Business marginal tax rate

**Math/Formula:**
- Annual rent = Days x Daily Rate (must be FMV-supportable)
- Business deduction = Annual rent amount
- Tax saved = Annual rent x marginal business tax rate
- Owner income = Annual rent (tax-free, not reported)
- Typical range: $5,000-$50,000 depending on home value and local rates

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT (but the "dollar in" is rent paid by the business)
**How to Integrate:**
- Input: fair market daily rental rate, number of days (max 14)
- Deduction = days x rate, reduces business income
- Income is not added to personal income (tax-free)
- Constraint: max 14 days, must document business purpose

---

### ID 11: Business Income & Deduction Optimization
**Type:** Business - Other | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** business_owner, deductions

**What It Is:**
Comprehensive review of business deductions to ensure all legitimate expenses are captured: home office, vehicle, travel, meals, professional development, insurance, retirement contributions, etc. Includes timing strategies (accelerating deductions, deferring income).

**Tax Mechanism:**
- Identifies missed or underutilized deductions
- Timing optimization: accelerate expenses into current year or defer income to next year
- Can include Section 179 expensing, bonus depreciation, prepaid expenses (12-month rule)

**Inputs Needed:**
- Current business gross income
- Current claimed deductions by category
- List of potential additional deductions not yet claimed

**Math/Formula:**
- Tax saved = Additional deductions identified x marginal tax rate
- This is more of a checklist/audit than a formula

**Implementation Pattern:** INFORMATIONAL (recommendation-based)
**How to Integrate:**
- This is a consulting service rather than a calculable strategy
- Implementation: generate a checklist of common missed deductions
- Could estimate: "If you have $X in unclaimed deductions, potential savings = $X x marginal rate"
- Simplest: input "estimated additional deductions available" and calculate impact

---

### ID 12: Business Vehicle Usage
**Type:** Fringe Benefit | **Complexity:** Low | **Recurring:** Annually
**Triggers:** business_owner, vehicle_expenses

**What It Is:**
Deducting vehicle expenses for business use via either the standard mileage rate (67 cents/mile for 2024, typically adjusted annually) or actual expenses (gas, insurance, depreciation, maintenance) prorated by business use percentage.

**Tax Mechanism:**
- Standard mileage: business miles x IRS rate
- Actual expenses: total vehicle costs x business use percentage
- If vehicle is owned by the business: 100% of business-use costs deductible
- Heavy vehicles (over 6,000 lbs GVWR) qualify for Section 179 deduction up to the full cost

**Inputs Needed:**
- Annual business miles driven
- Total annual miles driven
- Vehicle cost (if using actual method or Section 179)
- Vehicle weight (for Section 179 SUV/truck deduction)
- Annual vehicle expenses (gas, insurance, repairs, etc.)

**Math/Formula:**
- Standard mileage deduction = Business miles x $0.67 (2024 rate)
- Actual method deduction = Total vehicle costs x (business miles / total miles)
- Section 179 for heavy vehicle: up to full cost of vehicle in year 1
- Tax saved = deduction x marginal tax rate

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: business miles, total miles, vehicle cost, vehicle weight
- Calculate both methods, recommend higher deduction
- For heavy vehicle: Section 179 first-year deduction = min(vehicle cost, Section 179 limit)
- Deduction reduces business income

---

### ID 38: Depletion Deduction for Royalties
**Type:** Business - Other | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** royalty_income, natural_resources

**What It Is:**
Owners of economic interests in natural resources (oil, gas, minerals, timber) can claim a depletion deduction, similar to depreciation for physical assets. Two methods: cost depletion (basis-based) or percentage depletion (percentage of gross income, up to 15% for oil & gas).

**Tax Mechanism:**
- Percentage depletion: 15% of gross royalty income (for oil & gas small producers/royalty owners)
- Cannot exceed 100% of net income from the property
- Cannot exceed 65% of total taxable income (aggregated across all properties)
- Percentage depletion can exceed adjusted basis (unlike cost depletion)
- Reduces ordinary income

**Inputs Needed:**
- Annual gross royalty income
- Type of natural resource (oil/gas, coal, metals, etc.)
- Net income from the property
- Adjusted basis in the property (for cost depletion comparison)

**Math/Formula:**
- Percentage depletion = Gross royalty income x depletion rate (15% for oil & gas)
- Limited to 100% of net income from property
- Limited to 65% of total taxable income before depletion
- Tax saved = depletion deduction x marginal tax rate

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT (based on existing royalty income)
**How to Integrate:**
- Input: gross royalty income, resource type
- Calculate: depletion = gross income x applicable rate (15% for oil/gas)
- Apply limitations
- Deduction reduces ordinary income

---

### ID 41: Education Assistance Program (Section 127 Plan)
**Type:** Income Shifting | **Complexity:** Low | **Recurring:** Annually
**Triggers:** business_owner, education_expenses

**What It Is:**
Employer-provided educational assistance program under IRC Section 127. Business can provide up to $5,250/year per employee tax-free for education expenses (tuition, fees, books). Deductible by the business, excluded from employee income.

**Tax Mechanism:**
- Business deducts up to $5,250 per employee per year
- Employee excludes from income (not on W-2)
- Saves both income tax and payroll taxes
- Education does not need to be job-related (unlike working condition fringe benefit)

**Inputs Needed:**
- Number of eligible employees (including owner-employees)
- Amount per employee (max $5,250)

**Math/Formula:**
- Business deduction = Number of employees x min(amount per employee, $5,250)
- Employee tax savings = $5,250 x marginal personal rate (per employee)
- Payroll tax savings = $5,250 x 15.3% (per employee, up to SS wage base)
- For owner-employee: combined savings = $5,250 x (marginal rate + 15.3%)

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: number of eligible employees, amount per employee
- Max deduction = employees x $5,250
- Reduces business income + saves payroll taxes
- Simple cap-based calculation

---

### ID 47: Equipment Financing
**Type:** Business - Other | **Complexity:** Low | **Recurring:** As Needed
**Triggers:** business_owner, equipment_purchase

**What It Is:**
Financing business equipment purchases to preserve cash flow while still claiming Section 179 or bonus depreciation deductions in the year the equipment is placed in service, even though payments are spread over time.

**Tax Mechanism:**
- Section 179 allows immediate expensing of equipment cost (up to $1,220,000 for 2024, phases out above $3,050,000)
- Bonus depreciation: 60% for 2024 (was 100% through 2022, decreasing 20% per year under TCJA)
- OBBBA may have updated these figures
- Deduction is based on the FULL cost, not just the down payment
- Interest on the loan is also deductible as a business expense

**Inputs Needed:**
- Equipment cost
- Loan terms (interest rate, term)
- Whether Section 179 or bonus depreciation applies
- Year placed in service

**Math/Formula:**
- Year 1 deduction = min(equipment cost, Section 179 limit) OR equipment cost x bonus depreciation %
- Interest deduction = annual interest paid
- Total year 1 tax savings = (equipment deduction + interest) x marginal rate
- Cash flow benefit: only paid down payment but got deduction for full cost

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: equipment cost, depreciation method (179 vs bonus), placed-in-service year
- Calculate first-year deduction (full cost if 179, or cost x bonus %)
- Add interest deduction if financed
- Reduces business income

---

### ID 48: Equipment Leasing
**Type:** Business - Other | **Complexity:** Low | **Recurring:** Annually
**Triggers:** business_owner, equipment_purchase

**What It Is:**
Leasing equipment instead of purchasing. Operating lease payments are fully deductible as business expenses. Finance/capital leases may allow depreciation deductions similar to ownership.

**Tax Mechanism:**
- Operating lease: full lease payment is deductible in the year paid
- No depreciation tracking needed (lessor owns the equipment)
- Avoids obsolescence risk
- May be more beneficial than ownership if Section 179/bonus depreciation is limited

**Inputs Needed:**
- Annual lease payments
- Lease term
- Type of lease (operating vs finance)

**Math/Formula:**
- Deduction = Annual lease payments (for operating lease)
- Tax saved = Annual lease payments x marginal tax rate
- Compare to: buy + depreciate + interest deduction

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: annual lease payments
- Deduction = lease payments (reduces business income)
- Simple: deduction x marginal rate = savings

---

## CATEGORY 3: CHARITABLE PLANNING (6 strategies)

---

### ID 19: Charitable Donation of Appreciated Assets
**Type:** Itemized Deduction | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** charitable_giving, appreciated_assets, capital_gains

**What It Is:**
Donating appreciated assets (stocks, real estate, etc.) directly to charity instead of selling and donating cash. The donor gets a charitable deduction for the full fair market value AND avoids paying capital gains tax on the appreciation.

**Tax Mechanism:**
- Deduction = Fair Market Value of donated asset (if held > 1 year)
- Capital gains on appreciation are never taxed (neither donor nor charity pays)
- Deduction limited to 30% of AGI for appreciated property (vs 60% for cash donations)
- Excess carries forward 5 years

**Inputs Needed:**
- Fair market value of asset to donate
- Adjusted basis of asset
- Holding period (must be > 1 year for FMV deduction)
- Donor's AGI (for limitation calculation)

**Math/Formula:**
- Charitable deduction = FMV of asset (limited to 30% of AGI)
- Capital gains avoided = (FMV - Basis) x applicable cap gains rate
- Income tax savings = min(FMV, 30% x AGI) x marginal income tax rate
- Total tax benefit = income tax savings + capital gains avoided
- If FMV > 30% AGI: carryforward = FMV - (30% x AGI)

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: asset FMV, basis, holding period
- Calculate: deduction (capped at 30% AGI), gains avoided
- Reduce taxable income by deduction amount
- Reduce capital gains by appreciation amount
- This is a dual benefit strategy (income deduction + gains elimination)

---

### ID 20: Charitable Gift Financing
**Type:** Itemized Deduction | **Complexity:** High | **Recurring:** As Needed
**Triggers:** charitable_giving, high_income

**What It Is:**
Using financing (loans or lines of credit) to make larger charitable contributions upfront, accelerating the tax deduction into the current year. Often used with charitable remainder trusts or donor advised funds to "bunch" multiple years of giving.

**Tax Mechanism:**
- Accelerates charitable deduction into high-income year
- Interest on loan may or may not be deductible (depends on loan type)
- Often combined with bunching strategy to exceed standard deduction threshold
- Can create large deduction in year 1, then repay loan over time

**Inputs Needed:**
- Amount of charitable gift (financed)
- Loan interest rate and term
- Current year income (to assess benefit of bunching)
- Standard deduction vs. itemized deduction comparison

**Math/Formula:**
- Year 1 deduction = full gift amount (subject to AGI limits: 60% for cash, 30% for appreciated property)
- Tax savings = deduction x marginal rate
- Cost = loan interest over term
- Net benefit = tax savings - total interest paid
- Compare: bunching into 1 year vs. spreading over multiple years

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: gift amount, financing terms
- Calculate: immediate deduction (subject to AGI caps)
- Calculate: interest cost over loan term
- Net benefit = tax savings - financing costs

---

### ID 21: Charitable LLC (CHC Charitable Planning)
**Type:** Itemized Deduction | **Complexity:** High | **Recurring:** Never
**Triggers:** charitable_giving, high_income

**What It Is:**
Creating an LLC structure for charitable giving that allows the donor to maintain investment control while claiming charitable deductions. Often involves contributing appreciated assets to an LLC, then donating LLC interests to charity. May involve a Charitable LLC (CHCLLC) structure specific to certain planning firms.

**Tax Mechanism:**
- Donor contributes assets to LLC
- LLC interests are donated to qualifying charity
- Deduction for FMV of donated interest
- Donor may retain some control or management role
- Complex: must comply with IRS rules on partial interest donations and valuation

**Inputs Needed:**
- Value of assets contributed to LLC
- Percentage of LLC donated to charity
- Basis in assets

**Math/Formula:**
- Charitable deduction = FMV of donated LLC interest
- Capital gains avoided on appreciated assets
- Deduction subject to 30% AGI limitation (appreciated property)
- Tax saved = deduction x marginal rate + gains avoided x cap gains rate

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Similar to donated appreciated assets but through LLC wrapper
- Input: asset value, basis, % donated
- Calculate deduction and avoided gains

---

### ID 22: Charitable Planning (General)
**Type:** Itemized Deduction | **Complexity:** Low | **Recurring:** Annually
**Triggers:** charitable_giving

**What It Is:**
General charitable giving strategy encompassing cash donations, in-kind contributions, and bunching strategies. Includes timing optimization to maximize the benefit of itemizing vs. standard deduction.

**Tax Mechanism:**
- Cash donations: deductible up to 60% of AGI
- Standard deduction bunching: alternate years between itemizing and standard deduction
- QCD (Qualified Charitable Distribution) for those 70.5+: up to $105,000 from IRA directly to charity, excluded from income

**Inputs Needed:**
- Annual charitable giving amount
- Type (cash, property, QCD)
- AGI
- Other itemized deductions (to determine if bunching helps)
- Age (for QCD eligibility)

**Math/Formula:**
- Deduction = charitable contributions (subject to AGI limits)
- Tax saved = deduction x marginal rate (only if itemizing)
- Bunching analysis: compare 2-year total tax with (a) standard deduction both years vs (b) bunch + itemize year 1, standard deduction year 2
- QCD: reduces AGI dollar-for-dollar (better than deduction for those who don't itemize)

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: annual giving amount, type
- Calculate deduction (check AGI limits)
- Compare: itemize vs standard deduction
- For QCD: reduce AGI directly (if age 70.5+)

---

### ID 23: Charitable Remainder Trust (CRT)
**Type:** Itemized Deduction | **Complexity:** High | **Recurring:** Never
**Triggers:** charitable_giving, capital_gains, retirement_planning

**What It Is:**
An irrevocable trust that provides income to the donor (or other beneficiaries) for life or a term of years, with the remainder going to charity. Avoids immediate capital gains on contributed appreciated assets and provides a partial charitable deduction upfront.

**Tax Mechanism:**
- Donor gets immediate partial charitable deduction (present value of remainder interest)
- Trust sells appreciated assets with NO capital gains tax
- Trust distributes income to beneficiaries annually (taxable, with a 4-tier system)
- Remainder goes to charity at trust termination
- Two types: CRAT (fixed annuity) and CRUT (unitrust, % of value annually)

**Inputs Needed:**
- FMV of assets contributed
- Basis in assets
- Payout rate (5-50%, but 10% remainder test must pass)
- Trust term or beneficiary age (for life CRTs)
- IRS Section 7520 rate (for calculating charitable deduction)

**Math/Formula:**
- Charitable deduction = PV of remainder interest (complex IRS actuarial calculation using Section 7520 rate)
- Capital gains avoided = (FMV - Basis) x cap gains rate
- Annual income to beneficiary = Trust value x payout rate (CRUT) or fixed amount (CRAT)
- Distributions are taxed under 4-tier system: ordinary income first, then capital gains, then other income, then corpus
- Approximate deduction: for a 5% CRUT with 20-year term, deduction is roughly 30-40% of contributed value

**Implementation Pattern:** DEFERRAL + DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: asset FMV, basis, payout rate, term/age, Section 7520 rate
- Calculate: approximate charitable deduction (simplified formula or lookup table)
- Reduce current-year income by charitable deduction
- Eliminate current-year capital gains on contributed assets
- Add: annual trust distributions as income in future years (informational)

---

### ID 40: Donor Advised Fund (DAF)
**Type:** Itemized Deduction | **Complexity:** Low | **Recurring:** Annually
**Triggers:** charitable_giving

**What It Is:**
A charitable giving account (like a "charitable savings account") held by a sponsoring organization. Donor contributes cash or appreciated assets, receives an immediate tax deduction, then recommends grants to charities over time. Ideal for bunching strategy.

**Tax Mechanism:**
- Immediate deduction in year of contribution (even though grants happen later)
- Cash: deductible up to 60% of AGI
- Appreciated assets (held > 1 year): deductible at FMV, up to 30% of AGI
- No capital gains on appreciated asset contributions
- Assets grow tax-free inside DAF

**Inputs Needed:**
- Contribution amount
- Type (cash or appreciated property)
- If property: FMV and basis
- AGI (for limitation purposes)

**Math/Formula:**
- Deduction = contribution amount (cash) or FMV (appreciated property)
- AGI limit = 60% (cash) or 30% (appreciated property)
- Tax saved = min(contribution, AGI limit) x marginal rate
- If appreciated property: additional savings = (FMV - basis) x cap gains rate

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: contribution amount, type (cash/property), FMV, basis
- Calculate deduction (subject to AGI limits)
- Reduce taxable income by deduction
- If appreciated property: also eliminate capital gains
- Flag as bunching opportunity

---

## CATEGORY 4: DEPRECIATION (3 strategies)

---

### ID 4: Accelerated Depreciation Strategy (Updated for OBBBA)
**Type:** Depreciation | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** business_owner, business_assets, equipment_purchase

**What It Is:**
Using Section 179 expensing and bonus depreciation to deduct the full cost of business assets in the year placed in service rather than spreading over the asset's useful life. Under TCJA, bonus depreciation was 100% through 2022, then phases down 20% per year. OBBBA may have extended or modified these provisions.

**Tax Mechanism:**
- Section 179: immediate expensing up to annual limit (approximately $1.2M, phaseout at $3M+)
- Bonus depreciation: percentage of cost deductible in year 1 (60% for 2024 under phase-down)
- Applies to tangible personal property, certain real property improvements, and some software
- Can create business losses that offset other income (subject to excess business loss limitations)

**Inputs Needed:**
- Cost of assets placed in service
- Type of asset (equipment, vehicles, software, improvements)
- Year placed in service
- Whether Section 179 or bonus depreciation is elected

**Math/Formula:**
- Section 179 deduction = min(asset cost, annual limit)
- Bonus depreciation = (asset cost - Section 179 amount) x bonus %
- Regular depreciation on remainder = (asset cost - 179 - bonus) / useful life (MACRS)
- Total year 1 deduction = 179 + bonus + first-year MACRS
- Tax saved = total deduction x marginal rate

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: asset cost, asset type, depreciation method
- Calculate: first-year deduction under chosen method
- Reduce business income by deduction amount
- Note: subject to excess business loss limitation ($289,000 single / $578,000 MFJ for 2024)

---

### ID 33: Cost Segregation (Updated for OBBBA)
**Type:** Depreciation | **Complexity:** High | **Recurring:** Never
**Triggers:** real_estate_purchase, building_owner, depreciation

**What It Is:**
An engineering-based study that reclassifies components of commercial real property from 27.5-year (residential) or 39-year (commercial) depreciation to 5, 7, or 15-year property. This accelerates depreciation deductions into earlier years.

**Tax Mechanism:**
- Building components (electrical, plumbing, cabinetry, flooring, landscaping) reclassified to shorter lives
- Typically 15-40% of building cost can be reclassified
- Reclassified property may qualify for bonus depreciation
- Massive first-year deduction on building purchase
- Can be applied retroactively via "look-back" study with a Section 481(a) catch-up adjustment

**Inputs Needed:**
- Building purchase price (excluding land)
- Building type (residential rental, commercial, mixed-use)
- Year acquired
- Whether bonus depreciation is available

**Math/Formula:**
- Estimated reclassifiable amount = Building cost x reclassification percentage (typically 20-35%)
- Year 1 accelerated deduction = reclassifiable amount x bonus depreciation %
- Remaining amount depreciated over 5/7/15 years (MACRS)
- Non-reclassified amount continues at 27.5 or 39 years
- Tax saved (year 1) = accelerated deduction x marginal rate
- Typical example: $1M building, 30% reclassified = $300K; bonus at 60% = $180K deduction year 1

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: building cost, building type, year acquired
- Apply default reclassification % (25% residential, 30% commercial as estimates)
- Calculate accelerated depreciation with bonus %
- Reduce rental/business income by accelerated amount
- Very powerful for real estate investors

---

### ID 49: Estate Planning and Wealth Transfer
**Type:** Personal - Other | **Complexity:** High | **Recurring:** Never
**Triggers:** high_net_worth, estate_planning
**Category:** Estate Planning (not Depreciation - mislisted in strategies.json)

**What It Is:**
Comprehensive strategies to minimize estate and gift taxes and efficiently transfer wealth to heirs. Includes annual gift exclusions ($18,000/person for 2024), lifetime exemption ($13.61M for 2024, set to sunset to ~$7M in 2026 under TCJA unless extended by OBBBA), and various trust structures.

**Tax Mechanism:**
- Annual exclusion gifts: $18,000/person/year (no gift tax, no use of lifetime exemption)
- Lifetime exemption: up to $13.61M can be transferred gift/estate tax free (2024)
- Gift/estate tax rate: 40% on amounts above exemption
- Strategies: GRATs, IDGTs, QPRTs, family LLCs, dynasty trusts, life insurance trusts

**Inputs Needed:**
- Net worth / estate value
- Number of beneficiaries
- Annual gifting capacity
- Whether they have existing trusts

**Math/Formula:**
- Annual gift tax savings = gifts x 40% estate tax rate (if estate exceeds exemption)
- Lifetime exemption planning: transfer up to exemption amount now while it's high
- GRAT: transfer appreciation above hurdle rate (Section 7520 rate) to beneficiaries free of gift/estate tax

**Implementation Pattern:** INFORMATIONAL / RECOMMENDATION
**How to Integrate:**
- This is more of a planning recommendation than a current-year tax calculation
- Could estimate: if estate exceeds exemption, potential estate tax = (estate - exemption) x 40%
- Annual gifting: show potential estate tax savings per year of gifting
- Flag if net worth approaches exemption amount

---

## CATEGORY 5: EDUCATION PLANNING (3 strategies)

---

### ID 3: 529 Savings Plan (Updated for OBBBA)
**Type:** Personal - Other | **Complexity:** Low | **Recurring:** Annually
**Triggers:** children, education_expenses, college_planning

**What It Is:**
Tax-advantaged savings accounts for education expenses. Contributions grow tax-free, and withdrawals for qualified education expenses are tax-free. Some states offer a state income tax deduction for contributions. Under SECURE Act 2.0, unused 529 funds can be rolled into a Roth IRA (up to $35,000 lifetime, subject to annual Roth contribution limits).

**Tax Mechanism:**
- No federal income tax deduction for contributions (unlike some state plans)
- State tax deduction: varies by state ($0-$20,000+ depending on state)
- Tax-free growth on investments
- Tax-free withdrawals for qualified expenses (tuition, room & board, books, K-12 tuition up to $10,000/year)
- OBBBA may have expanded eligible expenses

**Inputs Needed:**
- Annual contribution amount
- State of residence (for state deduction)
- Number of beneficiaries
- Time horizon (years until use)

**Math/Formula:**
- State tax savings = min(contribution, state deduction limit) x state marginal tax rate
- Tax-free growth benefit (long-term) = estimated growth x (federal + state tax rate) [avoided]
- Current year benefit = state deduction only (no federal deduction)

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT (state level only)
**How to Integrate:**
- Input: contribution amount, state
- Look up state deduction limit
- Calculate: state tax savings = min(contribution, state limit) x state rate
- No federal income reduction
- Flag as long-term tax-free growth benefit

---

### ID 30: College Student Strategies
**Type:** Personal - Other | **Complexity:** Low | **Recurring:** Annually
**Triggers:** dependents, education_expenses, college

**What It Is:**
Collection of tax benefits for families with college students: American Opportunity Tax Credit (AOTC), Lifetime Learning Credit, student loan interest deduction, and tuition/fees deductions.

**Tax Mechanism:**
- AOTC: up to $2,500 credit per student (first 4 years of college), 40% refundable
- Lifetime Learning Credit: up to $2,000 per return (no limit on years)
- Student loan interest deduction: up to $2,500 above-the-line deduction
- Income phase-outs apply to all

**Inputs Needed:**
- Number of qualifying students
- Qualified education expenses per student
- Student loan interest paid
- AGI (for phase-out calculation)

**Math/Formula:**
- AOTC = 100% of first $2,000 + 25% of next $2,000 = $2,500 max
- Phase-out: single $80K-$90K, MFJ $160K-$180K
- LLC = 20% of first $10,000 qualified expenses = $2,000 max
- Phase-out: single $80K-$90K, MFJ $160K-$180K
- Student loan interest: min($2,500, interest paid), phase-out single $75K-$90K
- Can't claim AOTC and LLC for same student

**Implementation Pattern:** CREDIT-BASED
**How to Integrate:**
- Input: number of students, expenses per student, loan interest, AGI
- Calculate AOTC per student (with phase-out)
- Calculate LLC alternative (with phase-out)
- Choose better credit per student
- Credits directly reduce tax (not just deduction)
- Student loan interest reduces AGI

---

### ID 42: Education Credits
**Type:** Personal - Other | **Complexity:** Low | **Recurring:** Annually
**Triggers:** education_expenses

**What It Is:**
Umbrella for AOTC and Lifetime Learning Credit (same as College Student Strategies but broader - includes non-traditional students, graduate school, and professional development courses).

**Tax Mechanism:**
- Same as College Student Strategies above
- LLC also applies to graduate students and professional development
- No limit on number of years for LLC

**Implementation Pattern:** CREDIT-BASED (same formulas as ID 30)
**How to Integrate:**
- Consolidate with ID 30 into a single education credit calculator
- Input: student type, expenses, AGI
- Calculate applicable credit

---

## CATEGORY 6: ENTITY PLANNING (7 strategies)

---

### ID 13: C Corp: Misc Deductions
**Type:** C Corp | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** c_corp, business_deductions

**What It Is:**
C Corporations have unique deduction opportunities not available to pass-through entities: accumulated earnings up to $250,000 without penalty, fringe benefits (health insurance, group term life) deductible without income inclusion to shareholders, and a flat 21% corporate tax rate.

**Tax Mechanism:**
- C Corp flat 21% rate vs. individual rates up to 37%
- Fringe benefits deductible by corp, excluded from shareholder income
- Key deductions: health insurance premiums, group term life up to $50K, disability insurance, dependent care assistance

**Inputs Needed:**
- Annual fringe benefit costs
- Corporate taxable income
- Owner's personal marginal rate

**Math/Formula:**
- Tax arbitrage = fringe benefits x (personal marginal rate - 0%) = fringe benefits x personal rate
- Because: corp deducts (saves 21%) AND owner excludes from income (saves personal rate)
- Total system savings = benefits x personal marginal rate (income exclusion) + benefits x 15.3% (payroll tax savings)

**Implementation Pattern:** RESTRUCTURING + DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: fringe benefit costs, owner's marginal rate
- Calculate: personal tax savings from excluded benefits
- Calculate: payroll tax savings
- Prerequisite: must be a C Corporation

---

### ID 14: C Corp: Section 1202 Exclusion (OBBBA Update)
**Type:** C Corp | **Complexity:** High | **Recurring:** Never
**Triggers:** c_corp, business_sale, qualified_small_business

**What It Is:**
IRC Section 1202 allows exclusion of gain on sale of Qualified Small Business Stock (QSBS). If requirements are met, up to 100% of gain (up to the greater of $10M or 10x basis) is excluded from federal tax. Stock must be held > 5 years, C Corp must have < $50M in assets, and must be in a qualified active business.

**Tax Mechanism:**
- 100% gain exclusion for QSBS acquired after 9/27/2010 (75% for 2/18/2009-9/27/2010, 50% before)
- Max exclusion: greater of $10M or 10x adjusted basis
- Excluded gain is also excluded from the 3.8% NIIT
- OBBBA may have modified eligibility or limits

**Inputs Needed:**
- Date stock was acquired
- Adjusted basis in stock
- Expected sale price
- C Corp gross assets at time of stock issuance

**Math/Formula:**
- Eligible gain = Sale Price - Basis
- Exclusion = min(eligible gain, max($10M, 10 x basis))
- Tax saved = excluded gain x (LTCG rate + 3.8% NIIT + state rate)
- At 23.8% federal + ~5% state: saving ~$2.88M on $10M excluded gain

**Implementation Pattern:** DEFERRAL / ELIMINATION
**How to Integrate:**
- Input: basis, expected sale price, acquisition date, corp asset size
- Verify eligibility (> 5 year hold, < $50M assets, qualified business)
- Calculate exclusion amount
- Reduce capital gains by excluded amount
- This is a massive benefit - flag prominently when applicable

---

### ID 15: C Corp: State Tax Savings
**Type:** C Corp | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** c_corp, state_taxes, multi_state

**What It Is:**
Leveraging C Corp structure for state tax advantages: income splitting between states, choosing favorable filing jurisdictions, and using the C Corp as a blocker entity for state tax purposes.

**Tax Mechanism:**
- Some states have lower corporate tax rates than individual rates
- C Corp income is taxed at entity level (state corp rate), not passed through to individual (state individual rate)
- Nexus planning: structure operations to minimize state tax exposure
- State-specific credits and incentives available to corporations

**Inputs Needed:**
- State(s) of operation
- Corporate taxable income
- Owner's state individual rate vs. corporate rate

**Math/Formula:**
- State tax savings = corporate income x (individual state rate - corporate state rate)
- Must also consider double taxation risk (corp tax + dividend tax)
- Net benefit = state savings - additional federal tax from double taxation

**Implementation Pattern:** RESTRUCTURING
**How to Integrate:**
- Input: state, corporate income
- Compare: individual state rate vs corporate state rate
- Calculate potential savings
- Flag double taxation consideration

---

### ID 25: Choice of Entity - C Corp
### ID 26: Choice of Entity - Overview & Analysis
### ID 27: Choice of Entity - Partnership 1065
### ID 28: Choice of Entity - S Corporation 1120S
### ID 29: Choice of Entity - Sole Proprietor Sch C

**Type:** Various | **Complexity:** High | **Recurring:** Never
**Triggers:** business_owner, entity_selection, new_business

**What These Are:**
Entity selection analysis comparing the tax implications of operating as a sole proprietorship, partnership, S-Corp, or C-Corp. Each has different treatment for self-employment tax, pass-through income, employment tax, and distribution of profits.

**Tax Mechanisms by Entity:**
- **Sole Prop (Sch C):** All net income subject to SE tax (15.3%). Simplest. All income on personal return.
- **Partnership (1065):** Pass-through; partners pay SE tax on guaranteed payments and distributive share. Flexible allocation.
- **S-Corp (1120S):** Pass-through income only taxed at income tax rates (no SE tax on distributions). Owner must take "reasonable salary" (subject to payroll tax). QBI deduction (20%) may apply.
- **C-Corp:** Flat 21% rate. Double taxation on dividends. But fringe benefits are deductible. Best for retaining earnings.

**Inputs Needed:**
- Business net income
- Owner's salary expectation (for S-Corp reasonable compensation)
- Number of owners
- Whether profits will be distributed or retained
- State of formation

**Math/Formula:**
- Sole Prop total tax = net income x (marginal income rate + 15.3% SE tax)
- S-Corp total tax = salary x 15.3% payroll + (net income - salary) x marginal rate - QBI deduction
- C-Corp total tax = net income x 21% + distributions x (dividend rate + 3.8% NIIT)
- Partnership: similar to sole prop but with allocation flexibility
- S-Corp SE tax savings = (net income - reasonable salary) x 15.3%

**Implementation Pattern:** RESTRUCTURING (comparative analysis)
**How to Integrate:**
- Input: business net income, desired salary, number of owners
- Run parallel calculations for each entity type
- Show comparison table: total tax burden under each entity
- Highlight recommended entity and annual savings vs current structure
- This would be a powerful comparative analysis tool

---

## CATEGORY 7: INVESTMENT TAX PLANNING (5 strategies)

---

### ID 34: Crypto Tax Optimization
**Type:** Personal investment | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** cryptocurrency, capital_gains, digital_assets

**What It Is:**
Tax-loss harvesting and gain management for cryptocurrency holdings. Unlike stocks, the wash sale rule traditionally has NOT applied to crypto (though this may change under OBBBA or IRS guidance). This means you can sell crypto at a loss and immediately repurchase without the 30-day waiting period.

**Tax Mechanism:**
- Capital gains/losses on crypto sales (short-term if held < 1 year, long-term if > 1 year)
- No wash sale rule (historically) - can harvest losses and rebuy immediately
- Specific identification of lots for optimal tax treatment
- DeFi, staking, mining income may be ordinary income

**Inputs Needed:**
- Crypto portfolio value
- Unrealized gains/losses by holding period
- Realized gains/losses YTD
- Whether engaged in DeFi/staking/mining

**Math/Formula:**
- Same as capital loss harvesting: losses offset gains, $3K excess against ordinary income
- Special advantage: no wash sale = harvest losses without losing position
- Tax saved = harvested losses x applicable rate

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT (similar to capital loss harvesting)
**How to Integrate:**
- Input: unrealized crypto losses available, current crypto gains
- Apply losses against gains
- Up to $3K excess against ordinary income
- Note: check if OBBBA imposed wash sale rules on crypto

---

### ID 35: Day Trader Tax Status (TTS) with Section 475 MTM Election
**Type:** Personal investment | **Complexity:** High | **Recurring:** Annually
**Triggers:** day_trading, frequent_trading, mark_to_market

**What It Is:**
Qualifying for Trader Tax Status allows traders to deduct business expenses (software, data feeds, home office) and, with a Section 475(f) mark-to-market election, convert capital gains/losses to ordinary income/losses. This eliminates the $3,000 capital loss limitation and wash sale rule.

**Tax Mechanism:**
- TTS allows Schedule C deductions for trading expenses
- 475 MTM election: all positions marked to market at year-end; gains/losses are ordinary (not capital)
- Ordinary losses are fully deductible (no $3K cap)
- Wash sale rule does not apply under 475
- Must meet IRS criteria: substantial trading activity, frequency, and profit motive

**Inputs Needed:**
- Annual trading frequency (number of trades)
- Trading revenue/losses
- Trading-related expenses (software, data, equipment)
- Whether currently filing as investor vs. trader

**Math/Formula:**
- If large losses: 475 MTM saves = (losses beyond $3K) x marginal rate (since ordinary losses fully deductible)
- Business expense deduction = trading expenses x marginal rate
- SE tax consideration: MTM income may be subject to SE tax (case law varies)

**Implementation Pattern:** RESTRUCTURING + INFORMATIONAL
**How to Integrate:**
- Input: trading income/loss, trading expenses, number of trades
- Calculate: tax difference between investor status (capital gains/losses + $3K limit) vs TTS + 475 (ordinary income/losses, unlimited)
- Most valuable when trader has significant losses

---

### ID 39: Dividends
**Type:** Personal investment | **Complexity:** Low | **Recurring:** Annually
**Triggers:** dividend_income, investments

**What It Is:**
Tax management of dividend income. Qualified dividends are taxed at preferential long-term capital gains rates (0%, 15%, or 20% depending on income). Non-qualified (ordinary) dividends are taxed at ordinary rates.

**Tax Mechanism:**
- Qualified dividends: 0% rate for income up to $47,025 (single) / $94,050 (MFJ) in 2024
- 15% rate for most taxpayers
- 20% rate for income above $518,900 (single) / $583,750 (MFJ) in 2024
- 3.8% NIIT may apply above $200K/$250K thresholds
- Strategy: hold dividend-paying investments in tax-advantaged accounts, or manage income to stay in 0% bracket

**Inputs Needed:**
- Qualified dividend income
- Non-qualified dividend income
- Total taxable income (for rate determination)

**Math/Formula:**
- Qualified dividends taxed at LTCG rates (already handled in tax engine)
- Planning opportunity: if near 0% bracket threshold, manage income to keep qualified dividends tax-free
- Tax saved = qualified dividends in 0% bracket x 15% (rate they would have been taxed at)

**Implementation Pattern:** INFORMATIONAL (tax engine already handles dividend taxation)
**How to Integrate:**
- Already partially handled: dividend income is an input on Page 2
- Enhancement: flag when income management could push qualified dividends into 0% bracket
- Show: "If you reduce ordinary income by $X, your dividends would be taxed at 0% instead of 15%"

---

### ID 44: Employee Stock Options
**Type:** Investment | **Complexity:** High | **Recurring:** As Needed
**Triggers:** stock_options, iso, nso, employee_compensation

**What It Is:**
Tax planning for employees with stock options. Two main types: Incentive Stock Options (ISOs) and Non-Qualified Stock Options (NQSOs/NSOs). Each has very different tax treatment at exercise and sale.

**Tax Mechanism:**
- **ISO:** No ordinary income at exercise (but AMT adjustment). If held 1 year after exercise + 2 years after grant: gain taxed as LTCG. If disqualifying disposition: spread taxed as ordinary income.
- **NSO:** Spread (FMV - exercise price) taxed as ordinary income at exercise, plus payroll taxes. Subsequent gain/loss is capital gain/loss.
- **AMT trap:** ISO exercise can trigger AMT on the spread even though no cash received

**Inputs Needed:**
- Option type (ISO or NSO)
- Number of shares
- Exercise price
- Current FMV per share
- Grant date and planned exercise date
- Plans to hold or sell immediately

**Math/Formula:**
- NSO: Ordinary income at exercise = (FMV - Exercise Price) x Shares; Tax = spread x (marginal rate + FICA)
- ISO (qualifying): LTCG at sale = (Sale Price - Exercise Price) x Shares; Tax = gain x LTCG rate
- ISO (disqualifying): Ordinary income = (FMV at exercise - Exercise Price) x Shares
- AMT adjustment (ISO) = spread x AMT rate (26-28%)
- Planning: exercise ISOs in low-income years to minimize AMT impact

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT (for employer) + INCOME SHIFT (for employee)
**How to Integrate:**
- Input: option type, shares, exercise price, FMV, holding plans
- Calculate tax at exercise under each scenario
- For ISOs: calculate AMT exposure
- Compare: exercise and hold vs. exercise and sell vs. wait
- Show optimal exercise strategy

---

### ID 45: Employee Stock Ownership Plan (ESOP)
**Type:** Retirement | **Complexity:** High | **Recurring:** Annually
**Triggers:** business_owner, business_sale, employee_retention

**What It Is:**
A qualified retirement plan that invests primarily in employer stock. The company contributes shares (or cash to buy shares) to the ESOP trust. For C-Corp owners selling at least 30% to the ESOP, Section 1042 allows tax-free rollover of proceeds into qualified replacement property.

**Tax Mechanism:**
- Company gets deduction for contributions to ESOP (up to 25% of eligible payroll for stock contributions)
- S-Corp ESOP: portion of income attributable to ESOP ownership is exempt from federal income tax
- C-Corp Section 1042 rollover: seller defers capital gains by reinvesting in qualified replacement property within 12 months
- Dividends paid on ESOP stock are deductible by C-Corp

**Inputs Needed:**
- Business value
- Percentage being sold to ESOP
- Annual eligible payroll
- Entity type (S-Corp vs C-Corp)
- Seller's basis in shares

**Math/Formula:**
- C-Corp 1042: Capital gains deferred = (sale price to ESOP - basis) (if 30%+ sold and reinvested)
- S-Corp ESOP exemption: ESOP ownership % x S-Corp income = income exempt from federal tax
- Company deduction = contribution to ESOP (up to 25% of payroll)
- Tax savings = deduction x marginal rate + deferred/exempt income x applicable rate

**Implementation Pattern:** DEFERRAL + RESTRUCTURING
**How to Integrate:**
- Input: business value, ESOP ownership %, payroll, entity type
- Calculate: annual deduction from ESOP contributions
- For C-Corp: calculate 1042 rollover savings
- For S-Corp: calculate exempt income
- Flag: requires ESOP setup ($20K-$100K+ in costs)

---

## CATEGORY 8: RETIREMENT PLANNING (3 strategies)

---

### ID 10: Backdoor Roth
**Type:** Retirement | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** high_income, retirement_planning, roth_ira

**What It Is:**
A strategy for high-income earners who exceed Roth IRA income limits. Make a non-deductible contribution to a Traditional IRA, then convert it to a Roth IRA. The conversion of after-tax contributions has no tax consequence (only earnings between contribution and conversion are taxable, which is minimal if done quickly).

**Tax Mechanism:**
- Contribution to Traditional IRA: $7,000/year ($8,000 if 50+) for 2024 - non-deductible
- Conversion to Roth: taxable only on earnings (minimal if converted quickly)
- Pro-rata rule: if you have pre-tax IRA balances, the conversion is partially taxable
- Roth grows tax-free forever, no RMDs

**Inputs Needed:**
- Annual contribution amount ($7,000 or $8,000)
- Existing pre-tax IRA balances (for pro-rata calculation)
- Age (for catch-up eligibility)
- Income (to confirm above Roth direct contribution limit)

**Math/Formula:**
- If no pre-tax IRA balances: conversion tax = minimal (earnings only)
- If pre-tax balances exist: taxable portion = conversion amount x (pre-tax balance / total IRA balance)
- Long-term benefit: Roth growth tax-free (not a current-year deduction)
- Current year impact: small or zero tax increase if done properly

**Implementation Pattern:** INFORMATIONAL (no current-year deduction, but long-term benefit)
**How to Integrate:**
- Input: age, pre-tax IRA balance, contribution amount
- Calculate: taxable portion of conversion (pro-rata)
- Flag if pre-tax balance creates tax issue
- Note: not a current-year tax reduction strategy, but important for long-term planning
- Show: "Recommend Backdoor Roth - $7,000/year into tax-free growth"

---

### ID 37: Defined Benefit Plan / Cash Balance Plan
**Type:** Retirement | **Complexity:** High | **Recurring:** Annually
**Triggers:** business_owner, high_income, retirement_planning

**What It Is:**
Employer-sponsored pension plans that allow significantly higher tax-deductible contributions than 401(k) plans. DB plans promise a specific retirement benefit; Cash Balance plans are a hybrid DB plan with individual account balances. Ideal for high-income business owners (especially those 50+) who want to shelter large amounts of income.

**Tax Mechanism:**
- Contributions are tax-deductible by the business
- Annual contribution limits are actuarially determined based on age and target benefit
- Much higher limits than 401(k): often $100K-$300K+ per year for older owners
- Combined with 401(k) profit sharing, can shelter even more
- Funds grow tax-deferred

**Inputs Needed:**
- Business owner's age
- Current compensation
- Desired retirement age
- Number of employees (funding for employees may be required)
- Business net income

**Math/Formula:**
- Approximate max contribution by age (DB plan):
  - Age 40: ~$80,000-$120,000/year
  - Age 50: ~$150,000-$220,000/year
  - Age 55: ~$200,000-$280,000/year
  - Age 60: ~$250,000-$350,000/year
  (These are rough estimates; actual amounts depend on actuarial calculations)
- Add 401(k): $23,000 employee deferral + $7,500 catch-up (50+) + employer profit sharing
- Total shelter = DB contribution + 401(k) total
- Tax saved = total contributions x marginal rate

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: owner age, compensation, desired retirement age
- Look up approximate DB max contribution (age-based table)
- Add 401(k) amounts
- Deduction reduces business income
- Very high impact for high-income, older business owners
- Constraint: must be funded annually (mandatory contributions)

---

### ID 46: Employer Retirement Plan
**Type:** Retirement | **Complexity:** Low | **Recurring:** Annually
**Triggers:** business_owner, employees, retirement_planning

**What It Is:**
Standard employer-sponsored retirement plans: 401(k), SEP-IRA, SIMPLE IRA. Provides tax-deductible contributions for the business and tax-deferred growth for participants.

**Tax Mechanism:**
- 401(k): $23,000 employee deferral ($30,500 with catch-up for 50+) + employer match/profit sharing up to $69,000 total ($76,500 with catch-up) for 2024
- SEP-IRA: up to 25% of compensation or $69,000 (whichever is less)
- SIMPLE IRA: $16,000 employee deferral ($19,500 with catch-up) + 2-3% employer match
- All contributions reduce taxable income

**Inputs Needed:**
- Plan type (401k, SEP, SIMPLE)
- Owner's compensation
- Age (for catch-up contributions)
- Number of employees and their compensation (for employer contribution obligations)

**Math/Formula:**
- 401(k) max = $23,000 + $7,500 catch-up + employer contribution (up to $69,000 - $76,500 total)
- SEP max = min(25% x compensation, $69,000)
- SIMPLE max = $16,000 + $3,500 catch-up + employer match
- Tax saved = total contributions x marginal rate

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Input: plan type, compensation, age
- Calculate max contribution
- Deduction reduces taxable income
- This is the most common retirement strategy

---

## CATEGORY 9: PERSONAL CREDITS (3 strategies)

---

### ID 7: Adoption Incentives
**Type:** Personal - Other | **Complexity:** Medium | **Recurring:** Never
**Triggers:** adoption, family_planning

**What It Is:**
The Adoption Tax Credit provides a credit for qualified adoption expenses. For 2024, the maximum credit is $16,810 per child. The credit is non-refundable but can be carried forward for up to 5 years.

**Tax Mechanism:**
- Credit of up to $16,810 per child (2024, indexed for inflation)
- Qualified expenses: court costs, attorney fees, travel, adoption fees
- For employer-provided adoption assistance: up to $16,810 exclusion from income
- Phase-out: MAGI $252,150-$292,150 (2024)
- Special needs adoption: full credit regardless of actual expenses

**Inputs Needed:**
- Qualified adoption expenses
- Whether special needs adoption
- MAGI (for phase-out)

**Math/Formula:**
- Credit = min(qualified expenses, $16,810) x phase-out factor
- Phase-out factor = 1 - (MAGI - $252,150) / $40,000 (if MAGI in phase-out range)
- Tax reduction = credit amount (dollar-for-dollar, non-refundable)
- Can carry forward unused credit up to 5 years

**Implementation Pattern:** CREDIT-BASED
**How to Integrate:**
- Input: adoption expenses, special needs flag, MAGI
- Calculate credit with phase-out
- Reduce tax liability by credit amount
- If credit exceeds tax: carry forward

---

### ID 24: Child and Dependent Care Credit
**Type:** Credit/Payment | **Complexity:** Low | **Recurring:** Annually
**Triggers:** dependents, childcare, care_expenses

**What It Is:**
Tax credit for expenses paid for care of qualifying children (under 13) or disabled dependents while the taxpayer works. Credit is 20-35% of qualifying expenses (up to $3,000 for one dependent, $6,000 for two or more).

**Tax Mechanism:**
- Max qualifying expenses: $3,000 (1 dependent) or $6,000 (2+ dependents)
- Credit rate: 35% for AGI up to $15,000, decreasing to 20% for AGI over $43,000
- For most middle/high-income filers: 20% credit rate
- Non-refundable
- Cannot use expenses already excluded under DCFSA

**Inputs Needed:**
- Number of qualifying dependents
- Annual child/dependent care expenses
- AGI (for credit rate determination)
- DCFSA usage (to avoid double-counting)

**Math/Formula:**
- Qualifying expenses = min(actual expenses, $3,000 or $6,000) - DCFSA exclusion
- Credit rate = max(20%, 35% - (AGI - $15,000) / $2,000 x 1%)
- Credit = qualifying expenses x credit rate
- Max credit: $1,050 (1 dependent) or $2,100 (2 dependents) at 35% rate
- For higher earners: $600 (1) or $1,200 (2) at 20% rate

**Implementation Pattern:** CREDIT-BASED
**How to Integrate:**
- Input: number of dependents, care expenses, AGI
- Calculate credit rate based on AGI
- Calculate credit amount
- Reduce tax liability by credit

---

### ID 43: Electric Vehicle Credits (Sunsetting Under OBBBA)
**Type:** Credit/Payment | **Complexity:** Low | **Recurring:** Never
**Triggers:** vehicle_purchase, electric_vehicle

**What It Is:**
Tax credits for purchasing new or used clean vehicles. Under the Inflation Reduction Act, the new vehicle credit is up to $7,500, and the used vehicle credit is up to $4,000. OBBBA may modify or sunset these credits.

**Tax Mechanism:**
- New EV credit: up to $7,500 ($3,750 for battery minerals + $3,750 for battery components - must meet sourcing requirements)
- Used EV credit: 30% of sale price, up to $4,000
- Income limits: $150K single / $300K MFJ (new), $75K single / $150K MFJ (used)
- Vehicle MSRP limits: $55K cars / $80K SUVs/trucks (new), $25K (used)
- Can be transferred to dealer at point of sale (immediate discount)

**Inputs Needed:**
- Vehicle type (new/used)
- Vehicle price
- Whether vehicle meets sourcing requirements
- Taxpayer's MAGI

**Math/Formula:**
- New EV credit = up to $7,500 (check sourcing compliance)
- Used EV credit = min(30% x price, $4,000)
- Phase-out: binary (above income limit = no credit)
- Tax reduction = credit amount

**Implementation Pattern:** CREDIT-BASED
**How to Integrate:**
- Input: new/used, vehicle price, MAGI
- Check income and price limits
- Calculate credit amount
- Non-refundable (reduces tax liability)
- Flag if sunsetting under OBBBA

---

## CATEGORY 10: REAL ESTATE (1 strategy)

---

### ID 6: Active Participation in Real Estate
**Type:** Business - Other | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** rental_income, real_estate

**What It Is:**
Taxpayers who "actively participate" in rental real estate can deduct up to $25,000 of rental losses against non-passive income (wages, business income). Without active participation, rental losses are passive and can only offset passive income. Real Estate Professional Status (REPS) eliminates the $25K cap entirely.

**Tax Mechanism:**
- Active participation: $25,000 rental loss allowance phases out between $100K-$150K MAGI
- Real Estate Professional Status (REPS): ALL rental losses are non-passive (unlimited deduction against any income)
- REPS requires: 750+ hours in real estate activities AND more than half of personal service time in real estate
- Material participation in each rental property also required for REPS

**Inputs Needed:**
- Rental property income/losses
- MAGI (for $25K allowance phase-out)
- Hours spent in real estate activities
- Total hours in all work activities
- Whether filing jointly (spouse can qualify for REPS)

**Math/Formula:**
- Active participation allowance = min($25,000, rental losses) x phase-out factor
- Phase-out = 1 - (MAGI - $100,000) / $50,000
- If REPS: full rental losses deductible against all income
- Tax saved = deductible rental losses x marginal rate
- Example: $50K rental loss with REPS status x 37% = $18,500 saved

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT (based on existing rental losses)
**How to Integrate:**
- Input: rental losses, MAGI, REPS status (yes/no), hours in RE activities
- If REPS: full losses deductible against ordinary income
- If active participant: up to $25K (with MAGI phase-out)
- Otherwise: losses are passive (carry forward)
- Reduce ordinary income by allowable rental losses

---

## CATEGORY 11: ADVANCED BUSINESS PLANNING (2 strategies)

---

### ID 18: Captive Insurance
**Type:** Income Shifting | **Complexity:** High | **Recurring:** Annually
**Triggers:** business_owner, high_income, risk_management

**What It Is:**
Business forms its own insurance company (captive) to insure business risks. Premiums paid to the captive are deductible by the operating business. The captive, if a small insurance company under Section 831(b), can elect to be taxed only on investment income (not premium income), effectively shifting income to a lower-taxed entity.

**Tax Mechanism:**
- Operating company deducts insurance premiums paid to captive
- 831(b) captive: premiums up to $2.65M/year (2024) taxed only on investment income
- Premium income accumulates in captive largely tax-free
- Captive can pay claims back to operating company or distribute profits to shareholders
- Must insure genuine business risks at arm's length rates

**Inputs Needed:**
- Business revenue (to determine reasonable premium level)
- Types of business risks to insure
- Desired premium amount (must be commercially reasonable)
- Captive formation and management costs ($15K-$50K/year)

**Math/Formula:**
- Business deduction = premiums paid (up to $2.65M under 831(b))
- Tax saved = premiums x marginal business tax rate
- Captive tax = investment income only x corporate rate (21%)
- Net savings = business deduction savings - captive operating costs - captive investment income tax
- Typical: $500K premium = $500K deduction = ~$185K tax savings (at 37%) - ~$30K captive costs = ~$155K net benefit

**Implementation Pattern:** DOLLAR-IN / DEDUCTION-OUT (but requires entity setup)
**How to Integrate:**
- Input: desired premium level, business income
- Calculate: business tax deduction = premium amount
- Deduct from business income
- Subtract: estimated captive operating costs
- Net benefit = tax savings - operating costs
- Constraint: premiums must be commercially reasonable, insuring real risks

---

### ID 50: Family Limited Partnership (FLP)
**Type:** Income Shifting | **Complexity:** High | **Recurring:** Annually
**Triggers:** high_net_worth, estate_planning, family_business
**Category:** Estate Planning

**What It Is:**
A partnership where family members are limited partners and senior family members are general partners. Used for asset protection, income splitting among family members, and estate planning with valuation discounts.

**Tax Mechanism:**
- Income allocated to family members (potentially in lower tax brackets)
- Valuation discounts: limited partnership interests are valued at 20-35% discount for gift/estate purposes (lack of marketability + lack of control)
- Example: $1M asset in FLP, 30% discount = gift value of $700K
- Income shifting: children/trusts as limited partners receive income allocations

**Inputs Needed:**
- Assets to contribute to FLP
- Number of family members / partnership allocation
- Family members' tax brackets
- Estate planning goals

**Math/Formula:**
- Income shifting savings = allocated income x (parent's marginal rate - child's marginal rate)
- Estate/gift tax savings = asset value x discount percentage x 40% estate tax rate
- Example: $2M in FLP, 30% discount, 40% estate tax rate = $240K estate tax saved
- Ongoing income tax savings = annual income x bracket differential

**Implementation Pattern:** RESTRUCTURING + INCOME SHIFTING
**How to Integrate:**
- Input: asset value, number of family members, their income/brackets
- Calculate: income splitting benefit
- Calculate: estate valuation discount benefit
- Show: annual income tax savings + one-time estate tax savings

---

## CATEGORY 12: TAX FILING (2 strategies)

---

### ID 8: Amendment for Missed Deductions on Prior Year Return
**Type:** Personal - Other | **Complexity:** Low | **Recurring:** Never
**Triggers:** prior_year, missed_deductions, amended_return

**What It Is:**
Filing amended returns (Form 1040-X) for up to 3 prior years to claim deductions, credits, or adjustments that were missed on the original return. Common items: home office deduction, depreciation, charitable contributions, education credits, retirement contributions.

**Tax Mechanism:**
- Claim missed deductions/credits on prior returns
- Statute of limitations: generally 3 years from filing date or 2 years from payment date
- Can result in a refund of taxes already paid
- No penalty for filing an amendment (unless it triggers an audit)

**Inputs Needed:**
- Which prior year(s) to amend
- Estimated missed deductions/credits
- Tax rate in those years

**Math/Formula:**
- Refund = missed deductions x marginal rate in that year
- Or: missed credits = dollar-for-dollar refund
- Simple: estimated additional deduction x prior year marginal rate = refund

**Implementation Pattern:** INFORMATIONAL
**How to Integrate:**
- Input: estimated missed deductions, prior year marginal rate
- Calculate: potential refund
- Flag as action item: "Consider amending prior 3 years"
- This is a consulting recommendation, not a current-year strategy

---

### ID 16: Cancellation of Debt Income (COD)
**Type:** Personal - Other | **Complexity:** Medium | **Recurring:** Never
**Triggers:** debt_cancellation

**What It Is:**
When debt is cancelled or forgiven, the cancelled amount is generally taxable as ordinary income (Form 1099-C). However, several exclusions exist: insolvency, bankruptcy, qualified principal residence indebtedness, qualified farm debt, and qualified real property business debt.

**Tax Mechanism:**
- General rule: cancelled debt = ordinary income
- Insolvency exclusion: if liabilities exceed assets at time of cancellation, excluded up to insolvency amount
- Bankruptcy exclusion: debt cancelled in Title 11 bankruptcy is excluded
- Must reduce tax attributes (NOLs, credits, basis) by excluded amount

**Inputs Needed:**
- Amount of cancelled debt
- Reason for cancellation
- Taxpayer's solvency status (assets vs. liabilities)
- Whether in bankruptcy

**Math/Formula:**
- If insolvent: exclusion = min(cancelled debt, insolvency amount)
- Insolvency amount = total liabilities - total assets (at time of cancellation)
- Taxable COD income = cancelled debt - applicable exclusion
- Tax impact = taxable COD x marginal ordinary income rate

**Implementation Pattern:** INFORMATIONAL / DEDUCTION (exclusion reduces income)
**How to Integrate:**
- Input: cancelled debt amount, insolvency status
- Calculate: exclusion amount
- If partially/fully taxable: add to ordinary income
- If excluded: note tax attribute reduction requirements

---

## CATEGORY 13: REMAINING STRATEGIES

---

### ID 31: Content Creator and Influencer Income Optimization
**Type:** Self-Employment Tax | **Complexity:** Medium | **Recurring:** Annually
**Triggers:** content_creator, self_employment, social_media

**What It Is:**
Tax optimization for content creators, influencers, and gig workers. Includes entity selection (S-Corp to reduce SE tax), home office deductions, equipment/software depreciation, travel for content creation, and business meal deductions.

**Tax Mechanism:**
- S-Corp election to split income between salary (payroll taxed) and distributions (no SE tax)
- Schedule C deductions: equipment, software subscriptions, home office, travel, meals (50%), professional development
- QBI deduction (20% of qualified business income) if income below thresholds
- Estimated tax planning for irregular income

**Inputs Needed:**
- Total content creation income
- Business expenses by category
- Current entity structure
- Home office square footage

**Math/Formula:**
- S-Corp SE tax savings = (total income - reasonable salary) x 15.3%
- Business deductions = sum of all qualifying expenses
- QBI deduction = 20% x (net business income - 50% of SE tax) [simplified]
- Tax saved = S-Corp savings + deductions x marginal rate + QBI deduction x marginal rate

**Implementation Pattern:** RESTRUCTURING + DOLLAR-IN / DEDUCTION-OUT
**How to Integrate:**
- Similar to Choice of Entity (S-Corp) analysis
- Input: content income, expenses, current structure
- Calculate: S-Corp savings + deduction optimization

---

### ID 32: Corporate-Owned Variable Universal Life (No-Limits Roth IRA)
**Type:** Investment | **Complexity:** High | **Recurring:** Annually
**Triggers:** business_owner, high_income, retirement_planning, life_insurance

**What It Is:**
Using a corporate-owned variable universal life (VUL) insurance policy as a tax-advantaged investment vehicle. The business pays premiums (not deductible), but the cash value grows tax-free. Policy loans can provide tax-free "income" in retirement. Called "No-Limits Roth" because there's no contribution limit like a Roth IRA.

**Tax Mechanism:**
- Premiums are NOT tax-deductible (paid with after-tax dollars by the corp)
- Cash value grows tax-free inside the policy
- Policy loans are tax-free (not treated as income if policy stays in force)
- Death benefit is income tax-free to beneficiaries
- No contribution limits (unlike Roth IRA at $7,000/year)
- Must be properly structured to avoid Modified Endowment Contract (MEC) rules

**Inputs Needed:**
- Annual premium amount
- Expected rate of return (inside policy)
- Policy term / duration
- Death benefit level
- Owner's current marginal rate

**Math/Formula:**
- No current-year tax deduction (premiums not deductible)
- Long-term benefit: cash value at retirement = premiums x compounded growth (tax-free)
- Tax-free income: annual policy loans in retirement
- Compare to: investing same amount in taxable account (pay gains tax annually)
- Break-even: typically 10-15+ years before VUL outperforms taxable investing (due to insurance costs)

**Implementation Pattern:** INFORMATIONAL / LONG-TERM (no current-year tax impact)
**How to Integrate:**
- Input: proposed annual premium, expected holding period
- Calculate: projected tax-free retirement income
- Compare: VUL vs taxable investment vs Roth IRA
- Note: this is a PRODUCT recommendation, not a tax deduction strategy
- Flag: "Insurance product - consult licensed advisor"

---

### ID 36: Deferred Sales Trust (DST)
**(Already covered under Capital Gains Deferral above)**

---

### ID 49: Estate Planning and Wealth Transfer
**(Already covered under Depreciation category - note: should be in Estate Planning)**

---

### ID 50: Family Limited Partnership (FLP)
**(Already covered under Advanced Business Planning above)**

---

## IMPLEMENTATION PRIORITY MATRIX

Based on complexity, tax impact, and feasibility of integration into the solver:

### TIER 1: HIGH PRIORITY (High tax impact, calculable formula, integrates into solver)
These should be built next. They have clear dollar-in/dollar-out formulas.

| ID | Strategy | Pattern | Est. Development |
|----|----------|---------|-----------------|
| 37 | Defined Benefit / Cash Balance Plan | DOLLAR-IN/DEDUCTION-OUT | Medium - age-based lookup table for max contributions |
| 46 | Employer Retirement Plan (401k/SEP/SIMPLE) | DOLLAR-IN/DEDUCTION-OUT | Easy - cap-based max contribution calculation |
| 33 | Cost Segregation | DOLLAR-IN/DEDUCTION-OUT | Medium - building cost x reclassification % x bonus depreciation % |
| 4  | Accelerated Depreciation (179/Bonus) | DOLLAR-IN/DEDUCTION-OUT | Easy - min(cost, 179 limit) or cost x bonus % |
| 19 | Charitable Donation of Appreciated Assets | DOLLAR-IN/DEDUCTION-OUT | Medium - dual benefit (deduction + gains avoidance), AGI limits |
| 40 | Donor Advised Fund | DOLLAR-IN/DEDUCTION-OUT | Easy - same as charitable with bunching analysis |
| 6  | Active Participation in Real Estate | DOLLAR-IN/DEDUCTION-OUT | Medium - rental loss allowance with MAGI phase-out |
| 18 | Captive Insurance | DOLLAR-IN/DEDUCTION-OUT | Medium - premium deduction with 831(b) limit |
| 9  | Augusta Rule | DOLLAR-IN/DEDUCTION-OUT | Easy - days x rate, max 14 days |
| 5  | Accountable Plan | DOLLAR-IN/DEDUCTION-OUT | Easy - expenses x (marginal rate + FICA) |

### TIER 2: MEDIUM PRIORITY (Moderate tax impact or more complex integration)

| ID | Strategy | Pattern | Notes |
|----|----------|---------|-------|
| 1  | 1031 Exchange | DEFERRAL | Needs property value inputs, depreciation recapture |
| 23 | Charitable Remainder Trust | DEFERRAL + DEDUCTION | Complex actuarial calculation for deduction |
| 14 | C Corp Section 1202 | ELIMINATION | Massive benefit but narrow eligibility |
| 25-29 | Choice of Entity (5 strategies) | RESTRUCTURING | Comparative analysis tool - high value |
| 44 | Employee Stock Options | INCOME PLANNING | ISO vs NSO analysis |
| 2  | 401(h) Tax Trifecta | DOLLAR-IN/DEDUCTION-OUT | Needs actuarial DB component |
| 45 | ESOP | DEFERRAL + RESTRUCTURING | Complex, business-sale focused |
| 17 | Capital Loss Harvesting | DOLLAR-IN/DEDUCTION-OUT | Partially implemented via Brooklyn |

### TIER 3: LOWER PRIORITY (Simpler credits, informational, or narrow applicability)

| ID | Strategy | Pattern | Notes |
|----|----------|---------|-------|
| 30/42 | Education Credits (AOTC/LLC) | CREDIT-BASED | Fixed formulas with phase-outs |
| 24 | Child/Dependent Care Credit | CREDIT-BASED | Small dollar amounts |
| 43 | EV Credits | CREDIT-BASED | May sunset under OBBBA |
| 7  | Adoption Incentives | CREDIT-BASED | Narrow applicability |
| 3  | 529 Plan | STATE DEDUCTION | State-specific, no federal deduction |
| 10 | Backdoor Roth | INFORMATIONAL | No current-year tax impact |
| 32 | Corporate VUL | INFORMATIONAL/PRODUCT | Insurance product, no deduction |
| 8  | Amended Returns | INFORMATIONAL | Consulting recommendation |
| 16 | COD Income | INFORMATIONAL | Exclusion calculation |
| 11 | Business Income Optimization | INFORMATIONAL | Checklist/audit |
| 12 | Business Vehicle | DOLLAR-IN/DEDUCTION-OUT | Standard mileage or actual method |
| 38 | Depletion Deduction | DOLLAR-IN/DEDUCTION-OUT | Narrow (royalty owners only) |
| 41 | Education Assistance (Sec 127) | DOLLAR-IN/DEDUCTION-OUT | Simple $5,250 cap |
| 47/48 | Equipment Financing/Leasing | DOLLAR-IN/DEDUCTION-OUT | Overlaps with depreciation |
| 20/21 | Charitable Gift Financing/LLC | DOLLAR-IN/DEDUCTION-OUT | Complex structures |
| 22 | Charitable Planning (General) | DOLLAR-IN/DEDUCTION-OUT | Overlaps with other charitable |
| 31 | Content Creator Optimization | RESTRUCTURING | Subset of entity planning |
| 34 | Crypto Tax Optimization | DOLLAR-IN/DEDUCTION-OUT | Similar to cap loss harvesting |
| 35 | Day Trader TTS/475 | RESTRUCTURING | Narrow applicability |
| 36 | Deferred Sales Trust | DEFERRAL | Complex installment sale |
| 39 | Dividends | INFORMATIONAL | Already in tax engine |
| 13/15 | C Corp Deductions/State Tax | RESTRUCTURING | Requires C Corp structure |
| 49 | Estate Planning | INFORMATIONAL | Long-term, not current-year |
| 50 | Family Limited Partnership | RESTRUCTURING | Estate + income shifting |

---

## RECOMMENDED IMPLEMENTATION APPROACH

### Phase 1: Quick Wins (Tier 1 - Easy)
Build these first because they have simple formulas and high impact:
1. **Employer Retirement Plan** - cap-based calculation, universally applicable
2. **Augusta Rule** - simple: days x rate, very popular strategy
3. **Accountable Plan** - simple: expenses x rate, saves payroll tax too
4. **Accelerated Depreciation** - min(cost, limit) formula
5. **Donor Advised Fund** - standard charitable deduction with AGI cap

### Phase 2: High-Impact Complex (Tier 1 - Medium)
These have bigger dollar impacts but need more logic:
6. **Defined Benefit / Cash Balance Plan** - age-based lookup table, huge deductions
7. **Cost Segregation** - building cost x reclassification %, very powerful for RE investors
8. **Active Participation in Real Estate** - rental loss allowance with MAGI phase-out
9. **Captive Insurance** - premium deduction calculation
10. **Charitable Donation of Appreciated Assets** - dual benefit calculation

### Phase 3: Comparative Analysis Tools (Tier 2)
These are more like analysis modes than solver inputs:
11. **Choice of Entity Analysis** (IDs 25-29) - compare tax across entity types
12. **Employee Stock Options** - ISO vs NSO analysis
13. **1031 Exchange** - property swap tax deferral calculation
14. **CRT** - actuarial charitable deduction

### Phase 4: Credits (Tier 3)
Simple formula-based credits:
15. **Education Credits** - AOTC/LLC with phase-outs
16. **Child & Dependent Care Credit**
17. **EV Credits** (if still available)
18. **Adoption Credit**

### Phase 5: Informational Strategies
These generate recommendations rather than calculations:
19. **Backdoor Roth** - flag as recommendation
20. **Business Income Optimization** - checklist
21. **Corporate VUL** - product recommendation
22. **Amended Returns** - action item

---

## SOLVER INTEGRATION NOTES

For strategies that produce a deduction or credit, they can be integrated into the existing solver framework:

**Current solver structure:**
- Brooklyn allocation -> produces capital losses (short-term + long-term)
- Delphi allocation -> produces ordinary loss deduction
- Oil & Gas allocation -> produces ordinary income offset (95%)
- All share a budget constraint (available_capital)

**New strategy types to add:**

1. **Deduction strategies** (retirement, depreciation, charitable, etc.):
   - These reduce taxable income directly
   - They have their OWN budget constraints (e.g., retirement has contribution limits, not capital limits)
   - Some use available_capital (e.g., charitable donation of appreciated stock)
   - Some are independent of capital (e.g., Augusta Rule, Accountable Plan)

2. **Credit strategies** (education, childcare, EV, adoption):
   - These reduce TAX, not income
   - Need to be applied AFTER tax calculation
   - Credits cannot reduce tax below zero (non-refundable) or have special refundable rules (AOTC 40%)

3. **Entity restructuring** (Choice of Entity, S-Corp, etc.):
   - These change HOW income is taxed, not the amount
   - Best implemented as a separate analysis mode, not part of the main solver
   - Show comparison table rather than optimal allocation

**Recommended approach:**
- Add each new strategy as a module with:
  - `calculateBenefit(inputs)` - returns { deduction, credit, incomeReduction }
  - `getConstraints(inputs)` - returns { maxAmount, requiresCapital, annualLimit }
  - `isEligible(inputs)` - returns boolean based on triggers/criteria
- Solver can then iterate over all eligible strategies and find optimal combination

---

*End of Implementation Notes*
*This document is for internal review. Verify all figures against current IRS publications and OBBBA provisions before implementing.*
