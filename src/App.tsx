import { useState } from "react";
import { evaluateGoal, getMotivationalMessage } from "./calculator";
import type { SavingsGoalItem } from "./types";

export default function App() {
  const [monthlySalary, setMonthlySalary] = useState<number>(30000);
  const [goals, setGoals] = useState<SavingsGoalItem[]>([
    {
      id: "1",
      title: "Buy My Car",
      targetPrice: 1500000,
      currentSaved: 50000,
      monthlyAllocation: 7000,
      annualInflationRate: 5,
    },
    {
      id: "2",
      title: "Build My House",
      targetPrice: 2500000,
      currentSaved: 100000,
      monthlyAllocation: 10000,
      annualInflationRate: 6,
    },
  ]);

  const [depositGoalId, setDepositGoalId] = useState<string>(goals[0]?.id || "");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalMonthlyCommitted = goals.reduce((acc, g) => acc + g.monthlyAllocation, 0);
  const remainingSalary = monthlySalary - totalMonthlyCommitted;

  const addNewGoal = () => {
    const newId = Date.now().toString();
    const newGoal: SavingsGoalItem = {
      id: newId,
      title: `New Goal #${goals.length + 1}`,
      targetPrice: 500000,
      currentSaved: 0,
      monthlyAllocation: 3000,
      annualInflationRate: 6,
    };
    setGoals([...goals, newGoal]);
  };

  const updateGoal = (id: string, field: keyof SavingsGoalItem, value: any) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };

  const removeGoal = (id: string) => {
    if (goals.length <= 1) return;
    setGoals(goals.filter((g) => g.id !== id));
  };

  const handleDeposit = () => {
    const val = Number(depositAmount);
    if (!val || val <= 0) return;

    setGoals(goals.map((g) => {
      if (g.id === depositGoalId) {
        const updatedSaved = g.currentSaved + val;
        const remaining = Math.max(0, g.targetPrice - updatedSaved);
        setToastMessage(`💰 Awesome! Added ₹${val.toLocaleString()} to "${g.title}". Just ₹${remaining.toLocaleString()} left!`);
        setTimeout(() => setToastMessage(null), 5000);
        return { ...g, currentSaved: updatedSaved };
      }
      return g;
    }));
    setDepositAmount("");
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
      <div style={{ maxWidth: "800px", width: "100%" }}>
        
        {/* Header & Income Profile */}
        <header style={{ borderBottom: "1px solid #30363d", paddingBottom: "1.2rem", marginBottom: "1.5rem" }}>
          <h1 style={{ color: "#f0f6fc", fontSize: "1.6rem", margin: 0 }}>Smart Multi-Goal Life Planner</h1>
          <p style={{ color: "#8b949e", fontSize: "0.9rem", margin: "0.4rem 0 1rem" }}>
            Turn big life dreams into achievable monthly milestones—no complex finance jargon required.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", backgroundColor: "#161b22", padding: "1rem", borderRadius: "8px", border: "1px solid #30363d" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#8b949e" }}>Your Monthly Income (₹)</label>
              <input
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(Number(e.target.value))}
                style={{ backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#58a6ff", fontSize: "1.1rem", fontWeight: "bold", padding: "0.4rem 0.8rem", borderRadius: "6px" }}
              />
            </div>

            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: "0.8rem", color: "#8b949e" }}>Total Committed for Goals</div>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: remainingSalary < 0 ? "#f85149" : "#3fb950" }}>
                ₹{totalMonthlyCommitted.toLocaleString()} / mo
              </div>
              <div style={{ fontSize: "0.75rem", color: remainingSalary < 0 ? "#f85149" : "#8b949e" }}>
                {remainingSalary < 0 ? "⚠ Exceeds monthly income!" : `₹${remainingSalary.toLocaleString()} left for daily living`}
              </div>
            </div>
          </div>
        </header>

        {/* Deposit to Piggy Bank Section */}
        <section style={{ backgroundColor: "#161b22", border: "1px solid #238636", borderRadius: "8px", padding: "1.2rem", marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", color: "#3fb950", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🪙</span> Update Piggy Bank (Record a Monthly Deposit)
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#8b949e", margin: "0 0 1rem" }}>
            Put real cash into your tracker each month and watch your progress bar fill up.
          </p>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <select
              value={depositGoalId}
              onChange={(e) => setDepositGoalId(e.target.value)}
              style={{ flex: 1.5, backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Deposit Amount (₹)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              style={{ flex: 1, backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            />

            <button
              onClick={handleDeposit}
              style={{ backgroundColor: "#238636", color: "#fff", border: "none", padding: "0.6rem 1.2rem", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
            >
              Deposit ₹
            </button>
          </div>

          {toastMessage && (
            <div style={{ marginTop: "1rem", padding: "0.8rem", backgroundColor: "rgba(56, 139, 253, 0.15)", border: "1px solid #388bfd", borderRadius: "6px", color: "#58a6ff", fontSize: "0.9rem", animation: "fadeIn 0.3s ease" }}>
              {toastMessage}
            </div>
          )}
        </section>

        {/* Goal Cards */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
          {goals.map((goal) => {
            const result = evaluateGoal(goal);
            const quote = getMotivationalMessage(result.progressPercentage, result.remainingAmount);

            return (
              <div key={goal.id} style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "10px", padding: "1.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <input
                    type="text"
                    value={goal.title}
                    onChange={(e) => updateGoal(goal.id, "title", e.target.value)}
                    style={{ background: "transparent", border: "none", borderBottom: "1px dashed #30363d", color: "#f0f6fc", fontSize: "1.2rem", fontWeight: "bold", padding: "0.2rem" }}
                  />
                  {goals.length > 1 && (
                    <button
                      onClick={() => removeGoal(goal.id)}
                      style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", fontSize: "0.9rem" }}
                    >
                      Delete Goal ✕
                    </button>
                  )}
                </div>

                {/* Piggy Bank Visual Bar */}
                <div style={{ marginBottom: "1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                    <span style={{ color: "#8b949e" }}>Piggy Bank Progress ({result.progressPercentage}%)</span>
                    <span style={{ color: "#3fb950", fontWeight: "bold" }}>₹{goal.currentSaved.toLocaleString()} / ₹{goal.targetPrice.toLocaleString()}</span>
                  </div>
                  <div style={{ width: "100%", height: "14px", backgroundColor: "#0d1117", borderRadius: "7px", overflow: "hidden", border: "1px solid #30363d" }}>
                    <div style={{
                      width: `${result.progressPercentage}%`,
                      height: "100%",
                      backgroundColor: result.progressPercentage >= 100 ? "#3fb950" : "#238636",
                      transition: "width 0.4s ease-in-out"
                    }} />
                  </div>
                </div>

                {/* Motivational Quote */}
                <div style={{ backgroundColor: "#0d1117", padding: "0.6rem 0.8rem", borderRadius: "6px", fontSize: "0.85rem", color: "#e3b341", marginBottom: "1.2rem", borderLeft: "3px solid #e3b341" }}>
                  {quote}
                </div>

                {/* Inputs for this goal */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#8b949e" }}>Current Cost (₹)</label>
                    <input
                      type="number"
                      value={goal.targetPrice}
                      onChange={(e) => updateGoal(goal.id, "targetPrice", Number(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#8b949e" }}>Monthly Savings Allocated (₹)</label>
                    <input
                      type="number"
                      value={goal.monthlyAllocation}
                      onChange={(e) => updateGoal(goal.id, "monthlyAllocation", Number(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#3fb950", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#8b949e" }}>Expected Annual Price Rise (%)</label>
                    <input
                      type="number"
                      value={goal.annualInflationRate}
                      onChange={(e) => updateGoal(goal.id, "annualInflationRate", Number(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* Calculation Snapshot */}
                <div style={{ marginTop: "1.2rem", paddingTop: "1rem", borderTop: "1px solid #21262d", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>Estimated time to reach goal: </span>
                    <strong style={{ fontSize: "1.2rem", color: "#58a6ff" }}>{result.realMonthsToGoal} months</strong>
                    <span style={{ fontSize: "0.8rem", color: "#8b949e" }}> ({(result.realMonthsToGoal / 12).toFixed(1)} yrs)</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#8b949e" }}>
                    Future estimated price: <strong style={{ color: "#f85149" }}>₹{result.realFuturePrice.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Plus Button to Add New Goal */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <button
            onClick={addNewGoal}
            style={{
              backgroundColor: "transparent",
              border: "2px dashed #30363d",
              color: "#58a6ff",
              padding: "0.8rem 2rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "bold",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            <span>+</span> Add Another Life Goal (e.g. Wedding, Travel, Gadget)
          </button>
        </div>
      </div>
    </div>
  );
}