import { useState } from "react";
import { calculateTargetGoal, assessFeasibility } from "./calculator";
import type { ExpenseItem } from "./types";

export default function App() {
  const [income, setIncome] = useState<number>(50000);
  const [multiplier, setMultiplier] = useState<number>(3);
  const [savingsPercent, setSavingsPercent] = useState<number>(25);
  const [inflationRate, setInflationRate] = useState<number>(6);

  // Expense Ledger State
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: "1", category: "Rent & Utilities", amount: 15000 },
    { id: "2", category: "Food & Groceries", amount: 10000 },
    { id: "3", category: "Transport & Misc", amount: 5000 },
  ]);
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const goal = calculateTargetGoal(income, multiplier, savingsPercent, inflationRate);
  const feasibility = assessFeasibility(income, goal.monthlySavings, expenses);

  const addExpense = () => {
    if (!newCategory || !newAmount) return;
    setExpenses([...expenses, { id: Date.now().toString(), category: newCategory, amount: Number(newAmount) }]);
    setNewCategory("");
    setNewAmount("");
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0d1117",
      color: "#c9d1d9",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "2rem 1rem",
      display: "flex",
      justifyContent: "center"
    }}>
      <div style={{ maxWidth: "760px", width: "100%" }}>
        <header style={{ borderBottom: "1px solid #30363d", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <h1 style={{ color: "#f0f6fc", fontSize: "1.5rem", margin: 0 }}>Target Purchase & Price Projection Engine</h1>
          <p style={{ color: "#8b949e", fontSize: "0.875rem", margin: "0.5rem 0 0" }}>
            Dynamic pursuit solver: accounts for actual compounding inflation and disposable income limits.
          </p>
        </header>

        {/* Primary Sliders & Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#8b949e" }}>Monthly Salary (₹)</label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              style={{ backgroundColor: "#161b22", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#8b949e" }}>Target Price Multiplier ({multiplier}x)</label>
            <input
              type="range"
              min="0.5"
              max="15"
              step="0.5"
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              style={{ accentColor: "#238636" }}
            />
            <span style={{ fontSize: "0.75rem", color: "#58a6ff" }}>Base Price: ₹{goal.itemPrice.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#8b949e" }}>Savings Allocation ({savingsPercent}%)</label>
            <input
              type="range"
              min="5"
              max="80"
              step="5"
              value={savingsPercent}
              onChange={(e) => setSavingsPercent(Number(e.target.value))}
              style={{ accentColor: "#238636" }}
            />
            <span style={{ fontSize: "0.75rem", color: "#3fb950" }}>Saving ₹{goal.monthlySavings.toLocaleString()} / mo</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#8b949e" }}>Annual Inflation / Price Drift ({inflationRate}%)</label>
            <input
              type="number"
              value={inflationRate}
              onChange={(e) => setInflationRate(Number(e.target.value))}
              style={{ backgroundColor: "#161b22", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            />
          </div>
        </div>

        {/* Real Dynamic Headline Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#8b949e", textTransform: "uppercase" }}>Real Months to Goal (Inflation-Adjusted)</div>
            <div style={{ fontSize: "2.2rem", fontWeight: "bold", color: "#58a6ff", marginTop: "0.4rem" }}>
              {goal.realMonthsToGoal} <span style={{ fontSize: "1rem", color: "#8b949e" }}>months</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#8b949e", marginTop: "0.4rem" }}>
              Static answer was {goal.staticMonthsToGoal} months (ignoring price growth)
            </div>
          </div>

          <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#8b949e", textTransform: "uppercase" }}>Price at Purchase Month</div>
            <div style={{ fontSize: "2.2rem", fontWeight: "bold", color: "#f85149", marginTop: "0.4rem" }}>
              ₹{goal.realFuturePrice.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#8b949e", marginTop: "0.4rem" }}>
              Saved ₹{goal.totalSavedAtGoal.toLocaleString()} (surplus: ₹{(goal.totalSavedAtGoal - goal.realFuturePrice).toLocaleString()})
            </div>
          </div>
        </div>

        {/* Feasibility Alert */}
        <div style={{
          backgroundColor: feasibility.isFeasible ? "#161b22" : "rgba(248, 81, 73, 0.1)",
          border: `1px solid ${feasibility.isFeasible ? "#30363d" : "#f85149"}`,
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1.5rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ color: feasibility.isFeasible ? "#3fb950" : "#f85149" }}>
                {feasibility.isFeasible ? "✓ Feasible Budget Plan" : "⚠ Deficit Warning: Exceeds Disposable Income"}
              </strong>
              <div style={{ fontSize: "0.8rem", color: "#8b949e", marginTop: "0.2rem" }}>
                Total Expenses: ₹{feasibility.totalExpenses.toLocaleString()} | Disposable: ₹{feasibility.disposableIncome.toLocaleString()} | Maximum Safe Savings Rate: {feasibility.maxFeasibleSavingsRate}%
              </div>
            </div>
          </div>
        </div>

        {/* Expense Ledger */}
        <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#f0f6fc" }}>Monthly Expense Ledger</h3>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="Category (e.g. Rent)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ flex: 2, backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "4px" }}
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              style={{ flex: 1, backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "4px" }}
            />
            <button
              onClick={addExpense}
              style={{ backgroundColor: "#238636", color: "#fff", border: "none", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
            >
              Add
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {expenses.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", backgroundColor: "#0d1117", borderRadius: "4px", border: "1px solid #21262d" }}>
                <span>{item.category}</span>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span style={{ color: "#f0f6fc" }}>₹{item.amount.toLocaleString()}</span>
                  <button onClick={() => removeExpense(item.id)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}