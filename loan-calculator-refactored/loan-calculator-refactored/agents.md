# Loan Calculator Agents & Architecture

## Overview

This Icelandic loan calculator application uses a modular architecture with specialized "agents" (modules) that handle different aspects of loan calculations, rental income analysis, and UI management.

## Architecture

### Core Modules (Agents)

The application is structured around independent, reusable modules that communicate through a main application controller:

```
┌─────────────────────────────────────────────────┐
│              LoanCalculatorApp                  │
│         (Main Application Controller)           │
└───────────┬─────────────────────────────────────┘
            │
    ┌───────┴────────┬──────────┬────────────┬─────────┐
    │                │          │            │         │
┌───▼────┐  ┌────────▼───┐  ┌───▼──────┐ ┌──▼──────┐ ┌▼────────┐
│ Loan   │  │  Rental    │  │  Chart   │ │   UI    │ │ Utils   │
│Calc.   │  │  Calc.     │  │  Manager │ │  State  │ │         │
└────────┘  └────────────┘  └──────────┘ └─────────┘ └─────────┘
```

## Module Details

### 1. LoanCalculator Agent (`js/loan-calculator.js`)

**Purpose**: Handles all loan amortization calculations for Icelandic mortgages.

**Key Features**:
- Supports three loan types:
  - `indexedAnnuity`: Verðtryggt (inflation-indexed annuity)
  - `nonIndexedAnnuity`: Óverðtryggt (standard fixed-rate annuity)
  - `nonIndexedEqualPrincipal`: Jafnar afborganir (equal principal payments)

**Main Methods**:
```javascript
// Calculate full amortization schedule
LoanCalculator.calculateSchedule(config)

// Calculate net rental income
LoanCalculator.calculateNetRent(rental, inflationFactor)

// Calculate investment metrics
LoanCalculator.calculateInvestmentMetrics(config)

// Compare multiple scenarios
LoanCalculator.compareScenarios(baseConfig, scenarios)
```

**How It Works**:
1. Applies inflation to indexed loan balances each month
2. Calculates interest on the inflated balance
3. Determines payment amount (grows with inflation for indexed loans)
4. Handles extra payments and rental income contributions
5. Updates balance and tracks totals

### 2. RentalCalculator Agent (`js/rental-calculator.js`)

**Purpose**: Manages rental income calculations and cashflow analysis.

**Key Features**:
- Monthly income/expense breakdown
- Cashflow analysis with loan integration
- Break-even rent calculation
- Cap rate and GRM calculations
- Multi-year rental projections

**Main Methods**:
```javascript
// Calculate monthly rental breakdown
RentalCalculator.calculateMonthlyBreakdown(config)

// Calculate cashflow vs loan payment
RentalCalculator.calculateCashflow(config)

// Find break-even rent amount
RentalCalculator.calculateBreakEvenRent(config)

// Multi-year projections
RentalCalculator.projectRentalIncome(config, years)
```

**Rental Income Flow**:
```
Gross Rent
  ├─ Taxes (22% of gross)
  ├─ Vacancy Loss (5% of gross)
  └─ Operating Costs
      ├─ Property Tax
      ├─ Insurance
      ├─ Maintenance
      ├─ HOA Fees
      └─ Custom Costs
  = Net Rental Income
```

### 3. ChartManager Agent (`js/charts.js`)

**Purpose**: Handles all Chart.js visualizations and chart state.

**Key Features**:
- Automatic dark/light mode adaptation
- Chart lifecycle management (create/update/destroy)
- Consistent theming across all charts

**Charts Managed**:
- Balance Chart: Loan balance over time comparison
- Payment Breakdown Chart: Principal vs interest pie chart
- Equity Chart: Property equity growth over time
- Cost Pie Chart: Total cost breakdown
- Cashflow Chart: Monthly cashflow with rental income

**Main Methods**:
```javascript
chartManager.setDarkMode(isDark)
chartManager.createBalanceChart(canvasId, data)
chartManager.createPaymentBreakdownChart(canvasId, data)
chartManager.createEquityChart(canvasId, metrics)
chartManager.createCostPieChart(canvasId, summary)
chartManager.createCashflowChart(canvasId, schedule, rental)
```

### 4. UIState Agent (`js/ui-state.js`)

**Purpose**: Manages form state and reactive UI updates.

**Key Features**:
- Automatic form value tracking
- Input type handling (number, checkbox, select, percent, etc.)
- Slider synchronization
- State change notifications
- Reactive listeners

**Example Usage**:
```javascript
const uiState = new UIState();

// Initialize with configuration
uiState.init({
  propertyPrice: {
    elementId: 'propertyPrice',
    type: 'number',
    defaultValue: 60000000,
    slider: 'propertyPriceSlider'
  }
});

// Listen to changes
uiState.onChange('propertyPrice', (newVal, oldVal) => {
  // Recalculate loan
});
```

### 5. Utils Agent (`js/utils.js`)

**Purpose**: Common utility functions for formatting and data manipulation.

**Key Functions**:
- `formatISK(num)`: Format as Icelandic currency (e.g., "1.234.567 kr.")
- `formatCompact(num)`: Compact format (e.g., "1.5M", "500k")
- `formatPercent(num)`: Format as percentage
- `formatDate(date)`: Format in Icelandic format (DD.MM.YYYY)
- `formatDuration(months)`: Convert months to "X ár Y mán."
- `generateCSV(schedule)`: Export schedule to CSV
- `downloadFile(content, filename)`: Trigger file download
- `storage.*`: LocalStorage helpers

## Data Flow

### Calculation Pipeline

```
User Input → App.getParams() → LoanCalculator.calculateSchedule()
                                      ↓
                              schedule + summary
                                      ↓
                   ┌─────────────────┴─────────────────┐
                   ↓                                   ↓
         App.updateDisplays()              App.updateCharts()
                   ↓                                   ↓
         Update Hero Metrics              ChartManager.create*()
         Update Summary Cards
         Update Tables
```

### State Management Flow

```
DOM Input Change → UIState.handleInput()
                          ↓
                  State Updated
                          ↓
                  Notify Listeners
                          ↓
              App.debouncedCalculate()
                          ↓
                  Full Recalculation
```

## Key Workflows

### 1. Standard Loan Calculation

```javascript
// Get parameters from form
const params = app.getParams();

// Calculate standard schedule
const standard = LoanCalculator.calculateSchedule({
  loanAmount: params.loanAmount,
  annualInterestRate: params.annualInterestRate,
  annualInflationRate: params.annualInflationRate,
  loanTermYears: params.loanTermYears,
  loanType: params.loanType
});

// Display results
app.updateDisplays(params);
app.updateCharts();
```

### 2. Loan with Rental Income

```javascript
// Build rental configuration
const rentalIncome = {
  grossRent: params.grossRent,
  taxRate: params.taxRate,
  vacancyRate: params.vacancyRate,
  operatingCosts: params.propertyTax + params.insurance + ...,
  indexed: params.indexRent,
  applyToLoan: params.applyRentToLoan
};

// Calculate with rental
const schedule = LoanCalculator.calculateSchedule({
  ...loanConfig,
  rentalIncome: rentalIncome
});

// Shows rental contribution in each payment
schedule.forEach(month => {
  console.log(`Month ${month.month}:`);
  console.log(`  Required: ${month.requiredPayment}`);
  console.log(`  Rental: ${month.rentalContribution}`);
  console.log(`  User pays: ${month.userOutOfPocket}`);
});
```

### 3. Investment Analysis

```javascript
// Calculate investment metrics
const metrics = LoanCalculator.calculateInvestmentMetrics({
  propertyPrice: params.propertyPrice,
  downPaymentPercent: params.downPaymentPercent,
  loanFee: params.loanFee,
  schedule: activeSchedule.schedule,
  holdingYears: params.holdingPeriod,
  appreciationRate: params.appreciationRate,
  sellingCostRate: params.sellingCostRate,
  rentalIncome: rentalConfig
});

// Shows:
// - Future property value
// - Equity at sale
// - Cash-on-cash return
// - Total ROI
// - Yearly breakdown
```

## Scenario Management

The app includes a scenario manager for saving/loading different calculation sets:

```javascript
// Save current parameters
scenarioManager.add('Conservative Estimate', params);

// Load saved scenario
const scenario = scenarioManager.get(index);
app.loadScenario(index);

// Stored in localStorage automatically
```

## Custom Costs Management

Track additional rental property expenses:

```javascript
// Add custom cost
customCostsManager.add('Pool Maintenance', 5000);

// Get total
const total = customCostsManager.getTotal();

// Remove cost
customCostsManager.remove(index);
```

## Dark Mode Integration

The app supports automatic dark mode with localStorage persistence:

```javascript
// Initialize (defaults to dark mode)
app.initDarkMode();

// Toggle
app.toggleDarkMode();

// Updates:
// - Document class (.dark)
// - Chart themes
// - All Tailwind dark: variants
```

## Performance Optimizations

1. **Debounced Calculations**: Input changes trigger calculations after 150ms delay
2. **Chart Reuse**: Charts are destroyed and recreated to prevent memory leaks
3. **Lazy Updates**: Only visible tabs are updated
4. **Conditional Rendering**: Large tables support pagination (12/60/120/all rows)

## Testing Scenarios

### Test Case 1: Standard Indexed Loan
```javascript
{
  loanAmount: 48000000,
  annualInterestRate: 0.0445,
  annualInflationRate: 0.0416,
  loanTermYears: 30,
  loanType: 'indexedAnnuity'
}
// Expected: ~370k ISK first payment
```

### Test Case 2: With Extra Payment
```javascript
{
  ...standardLoan,
  extraPayment: 50000
}
// Expected: Saves ~5-7 years, millions in interest
```

### Test Case 3: With Rental Income
```javascript
{
  ...standardLoan,
  rentalIncome: {
    grossRent: 250000,
    taxRate: 0.22,
    vacancyRate: 0.05,
    operatingCosts: 45000,
    applyToLoan: true
  }
}
// Expected: User pays <200k/month out of pocket
```

## Extension Points

### Adding New Loan Types

1. Add type to `loanType` enum in `calculateSchedule()`
2. Implement calculation logic in the main loop
3. Add UI selector option in index.html
4. Update summary card rendering

### Adding New Charts

1. Create method in ChartManager: `create*Chart()`
2. Add canvas element to HTML
3. Call from `app.updateCharts()`
4. Ensure dark mode support

### Adding New Tabs

1. Add tab button with `data-tab="name"` in HTML
2. Add tab content with `id="tab-name"`
3. Register in `app.switchTab()` listeners
4. Populate data in `app.calculate()`

## File Structure

```
loan-calculator-refactored/
├── index.html              # Main HTML with UI structure
├── css/
│   └── styles.css         # Custom styles (Tailwind extensions)
├── js/
│   ├── app.js             # Main application controller
│   ├── loan-calculator.js # Loan calculation engine
│   ├── rental-calculator.js # Rental income engine
│   ├── charts.js          # Chart management
│   ├── ui-state.js        # State management
│   └── utils.js           # Utility functions
└── agents.md              # This file
```

## Dependencies

- **Tailwind CSS** (CDN): Utility-first CSS framework
- **Chart.js** (CDN): Charting library
- **Inter Font** (Google Fonts): Typography
- **Modern Browser**: ES6+ module support required

## Module Loading

All JavaScript files are loaded as ES6 modules:

```html
<script type="module" src="js/utils.js"></script>
<script type="module" src="js/loan-calculator.js"></script>
<!-- etc -->
```

Each module exports classes/functions and imports dependencies as needed.

## Browser Compatibility

- Chrome/Edge: 61+
- Firefox: 60+
- Safari: 11+
- Opera: 48+

ES6 modules and modern JavaScript features are used throughout.

## Summary

This application follows a clean separation of concerns:

- **LoanCalculator**: Pure calculation logic, no DOM
- **RentalCalculator**: Rental-specific calculations
- **ChartManager**: Visualization management
- **UIState**: Form state and reactivity
- **Utils**: Shared utilities
- **App**: Orchestrates everything, handles UI updates

Each agent can be tested independently and reused in other projects.
