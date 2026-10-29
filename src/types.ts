export interface SavingsGoal {
  monthlyIncome: number;
  itemPrice: number;
  priceMultiplier: number;
  monthlySavings: number;
  savingsRatePercentage: number;
  monthsToGoal: number;
}

export interface InflationProjection {
  currentPrice: number;
  annualRate: number;
  months: number;
  futurePrice: number;
  adjustedMonthlySavingsNeeded: number;
}

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
}