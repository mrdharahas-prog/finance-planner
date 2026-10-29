import { useState } from "react";
import { calculateTargetGoal, projectFuturePrice } from "./calculator";

export default function App() {
  const [income, setIncome] = useState<number>(50000);
  const [multiplier, setMultiplier] = useState<number>(3);
  const [savingsPercent, setSavingsPercent] = useState<number>(25);
  const [inflationRate, setInflationRate] = useState<number>(6);

  const goal = calculateTargetGoal(income, multiplier, savingsPercent);
  const projection = projectFuturePrice(goal.itemPrice, inflationRate, goal.monthsToGoal);

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
      <div style={{ maxWidth: "680px", width: "100%" }}>
        <header style={{ borderBottom: "1px solid #30363d", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <h1 style={{ color: "#f0f6fc", fontSize: "1.5rem", margin: 0 }}>Target Purchase & Price Projection Planner</h1>
          <p style={{ color: "#8b949e", fontSize: "0.875rem", margin: "0.5rem 0 0" }}>
            Calculate required savings duration relative to monthly income multiples and project future price inflation.
          </p>
        </header>

        {/* Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#8b949e" }}>Monthly Salary (₹)</label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              style={{
                backgroundColor: "#161b22",
                border: "1px solid #30363d",
                color: "#f0f6fc",
                padding: "0.6rem",
                borderRadius: "6px"
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#8b949e" }}>Item Price Multiplier ({multiplier}x)</label>
            <input
              type="range"
              min="0.5"
              max="15"
              step="0.5"
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              style={{ accentColor: "#238636" }}
            />
            <span style={{ fontSize: "0.75rem", color: "#58a6ff" }}>Target Price: ₹{goal.itemPrice.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#8b949e" }}>Monthly Savings Allocation ({savingsPercent}%)</label>
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
              style={{
                backgroundColor: "#161b22",
                border: "1px solid #30363d",
                color: "#f0f6fc",
                padding: "0.6rem",
                borderRadius: "6px"
              }}
            />
          </div>
        </div>

        {/* Results Overview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#8b949e", textTransform: "uppercase" }}>Time to Reach Target</div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#58a6ff", marginTop: "0.4rem" }}>
              {goal.monthsToGoal} <span style={{ fontSize: "1rem", color: "#8b949e" }}>months</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#8b949e", marginTop: "0.4rem" }}>
              {(goal.monthsToGoal / 12).toFixed(1)} years at static current price
            </div>
          </div>

          <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#8b949e", textTransform: "uppercase" }}>Projected Future Price</div>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f85149", marginTop: "0.4rem" }}>
              ₹{projection.futurePrice.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#8b949e", marginTop: "0.4rem" }}>
              +₹{(projection.futurePrice - goal.itemPrice).toLocaleString()} inflation impact
            </div>
          </div>
        </div>

        {/* Strategy Insight */}
        <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#f0f6fc" }}>Inflation-Adjusted Strategy</h3>
          <p style={{ fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>
            To compensate for an expected annual drift of <strong>{inflationRate}%</strong> over the {goal.monthsToGoal}-month window, your adjusted monthly savings target increases from <strong>₹{goal.monthlySavings.toLocaleString()}</strong> to <strong>₹{projection.adjustedMonthlySavingsNeeded.toLocaleString()}</strong> per month.
          </p>
        </div>
      </div>
    </div>
  );
}