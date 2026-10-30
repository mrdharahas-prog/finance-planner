import { useState, useEffect } from "react";
import { evaluateGoal, getMotivationalMessage } from "./calculator";
import type { SavingsGoalItem } from "./types";

const STORAGE_KEY = "finance_planner_goals_v1";
const SALARY_KEY = "finance_planner_salary_v1";

const DEFAULT_GOALS: SavingsGoalItem[] = [
  {
    id: "1",
    title: "Buy My Car",
    targetPrice: 1500000,
    currentSaved: 55000,
    monthlyAllocation: 15000,
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
];

export default function App() {
  const [monthlySalary, setMonthlySalary] = useState<number>(() => {
    const saved = localStorage.getItem(SALARY_KEY);
    return saved ? Number(saved) : 30000;
  });

  const [goals, setGoals] = useState<SavingsGoalItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_GOALS;
  });

  const [transactionGoalId, setTransactionGoalId] = useState<string>(goals[0]?.id || "");
  const [transactionAmount, setTransactionAmount] = useState<string>("");
  const [transactionType, setTransactionType] = useState<"deposit" | "withdraw">("deposit");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "warn" } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(SALARY_KEY, monthlySalary.toString());
  }, [monthlySalary]);

  const totalMonthlyCommitted = goals.reduce((acc, g) => acc + g.monthlyAllocation, 0);
  const remainingSalary = monthlySalary - totalMonthlyCommitted;

  const addNewGoal = () => {
    const newId = Date.now().toString();
    const newGoal: SavingsGoalItem = {
      id: newId,
      title: `Goal #${goals.length + 1}`,
      targetPrice: 500000,
      currentSaved: 0,
      monthlyAllocation: 5000,
      annualInflationRate: 5,
    };
    setGoals([...goals, newGoal]);
    if (!transactionGoalId) setTransactionGoalId(newId);
  };

  const updateGoal = (id: string, field: keyof SavingsGoalItem, value: string | number) => {
    setGoals(goals.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };

  const removeGoal = (id: string) => {
    if (goals.length <= 1) return;
    const remaining = goals.filter((g) => g.id !== id);
    setGoals(remaining);
    if (transactionGoalId === id) setTransactionGoalId(remaining[0]?.id || "");
  };

  const handleTransaction = () => {
    const val = Number(transactionAmount);
    if (!val || val <= 0) return;

    const targetGoal = goals.find((g) => g.id === transactionGoalId);
    if (!targetGoal) return;

    if (transactionType === "withdraw" && val > targetGoal.currentSaved) {
      setToastMessage({
        text: `Cannot withdraw ₹${val.toLocaleString()}. Maximum available in "${targetGoal.title}" is ₹${targetGoal.currentSaved.toLocaleString()}.`,
        type: "warn",
      });
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }

    setGoals(goals.map((g) => {
      if (g.id === transactionGoalId) {
        const delta = transactionType === "deposit" ? val : -val;
        const updatedSaved = Math.max(0, g.currentSaved + delta);
        const remainingToTarget = Math.max(0, g.targetPrice - updatedSaved);

        if (transactionType === "deposit") {
          setToastMessage({
            text: `Added ₹${val.toLocaleString()} to "${g.title}". Just ₹${remainingToTarget.toLocaleString()} left to base target!`,
            type: "success",
          });
        } else {
          setToastMessage({
            text: `Withdrew ₹${val.toLocaleString()} from "${g.title}". Current balance: ₹${updatedSaved.toLocaleString()}.`,
            type: "warn",
          });
        }
        setTimeout(() => setToastMessage(null), 5000);
        return { ...g, currentSaved: updatedSaved };
      }
      return g;
    }));

    setTransactionAmount("");
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
            Plan, deposit, or withdraw across multiple goals with inflation adjustments.
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
                {remainingSalary < 0 ? "Exceeds monthly income!" : `₹${remainingSalary.toLocaleString()} left for living expenses`}
              </div>
            </div>
          </div>
        </header>

        {/* Deposit / Withdraw Piggy Bank Section */}
        <section style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, color: "#f0f6fc", fontSize: "1.05rem" }}>
              Manage Piggy Bank Funds
            </h3>
            <div style={{ display: "flex", gap: "0.3rem", backgroundColor: "#0d1117", padding: "0.2rem", borderRadius: "6px", border: "1px solid #30363d" }}>
              <button
                onClick={() => setTransactionType("deposit")}
                style={{
                  background: transactionType === "deposit" ? "#238636" : "transparent",
                  color: "#f0f6fc",
                  border: "none",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: transactionType === "deposit" ? "bold" : "normal"
                }}
              >
                Deposit (+)
              </button>
              <button
                onClick={() => setTransactionType("withdraw")}
                style={{
                  background: transactionType === "withdraw" ? "#da3633" : "transparent",
                  color: "#f0f6fc",
                  border: "none",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: transactionType === "withdraw" ? "bold" : "normal"
                }}
              >
                Withdraw (−)
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <select
              value={transactionGoalId}
              onChange={(e) => setTransactionGoalId(e.target.value)}
              style={{ flex: 1.5, minWidth: "160px", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} (₹{g.currentSaved.toLocaleString()})
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder={`${transactionType === "deposit" ? "Deposit" : "Withdraw"} Amount (₹)`}
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              style={{ flex: 1, minWidth: "140px", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            />

            <button
              onClick={handleTransaction}
              style={{
                backgroundColor: transactionType === "deposit" ? "#238636" : "#da3633",
                color: "#fff",
                border: "none",
                padding: "0.6rem 1.4rem",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Confirm {transactionType === "deposit" ? "Deposit" : "Withdrawal"}
            </button>
          </div>

          {toastMessage && (
            <div style={{
              marginTop: "1rem",
              padding: "0.8rem",
              backgroundColor: toastMessage.type === "success" ? "rgba(56, 139, 253, 0.15)" : "rgba(218, 54, 51, 0.15)",
              border: `1px solid ${toastMessage.type === "success" ? "#388bfd" : "#da3633"}`,
              borderRadius: "6px",
              color: toastMessage.type === "success" ? "#58a6ff" : "#f85149",
              fontSize: "0.875rem"
            }}>
              {toastMessage.text}
            </div>
          )}
        </section>

        {/* Goal Cards */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
          {goals.map((goal) => {
            const result = evaluateGoal(goal);
            const quote = getMotivationalMessage(result.progressPercentage, result.remainingAmount);
            const isInfinitePacing = result.realMonthsToGoal >= 600;

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
                    <span style={{ color: "#8b949e" }}>Piggy Bank ({result.progressPercentage}%)</span>
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
                    <label style={{ fontSize: "0.75rem", color: "#8b949e" }}>Target Price Today (₹)</label>
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
                    <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>Timeline: </span>
                    {isInfinitePacing ? (
                      <span style={{ color: "#f85149", fontWeight: "bold" }}>
                        Allocation too low to outpace inflation (50+ years)
                      </span>
                    ) : (
                      <>
                        <strong style={{ fontSize: "1.2rem", color: "#58a6ff" }}>{result.realMonthsToGoal} months</strong>
                        <span style={{ fontSize: "0.8rem", color: "#8b949e" }}> ({(result.realMonthsToGoal / 12).toFixed(1)} yrs)</span>
                      </>
                    )}
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
            <span>+</span> Add Another Life Goal
          </button>
        </div>
      </div>
    </div>
  );
}