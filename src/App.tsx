import { useState, useEffect, useRef } from "react";
import { evaluateGoal, getMotivationalMessage } from "./calculator";
import type { SavingsGoalItem, TransactionRecord } from "./types";

const STORAGE_GOALS_KEY = "finance_planner_goals_v2";
const STORAGE_LOGS_KEY = "finance_planner_logs_v2";
const STORAGE_SALARY_KEY = "finance_planner_salary_v2";

const INITIAL_GOALS: SavingsGoalItem[] = [
  {
    id: "1",
    title: "Buy My Car",
    targetPrice: 1500000,
    currentSaved: 55000,
    monthlyAllocation: 25000,
    annualInflationRate: 5,
  },
  {
    id: "2",
    title: "Build My House",
    targetPrice: 2500000,
    currentSaved: 100000,
    monthlyAllocation: 35000,
    annualInflationRate: 6,
  },
];

export default function App() {
  const [monthlySalary, setMonthlySalary] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_SALARY_KEY);
    return saved !== null ? Number(saved) : 75000;
  });

  const [goals, setGoals] = useState<SavingsGoalItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_GOALS_KEY);
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_LOGS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [transactionGoalId, setTransactionGoalId] = useState<string>(() => goals[0]?.id || "");
  const [transactionAmount, setTransactionAmount] = useState<string>("");
  const [transactionType, setTransactionType] = useState<"deposit" | "withdraw">("deposit");
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_GOALS_KEY, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SALARY_KEY, monthlySalary.toString());
  }, [monthlySalary]);

  // Keep transactionGoalId aligned if goals change
  useEffect(() => {
    if (!goals.some((g) => g.id === transactionGoalId) && goals.length > 0) {
      setTransactionGoalId(goals[0].id);
    }
  }, [goals, transactionGoalId]);

  const showNotification = (message: string, isError = false) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, isError });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4500);
  };

  const totalCommitted = goals.reduce((sum, g) => sum + (Number(g.monthlyAllocation) || 0), 0);
  const remainingDisposable = monthlySalary - totalCommitted;

  const addNewGoal = () => {
    const newId = Date.now().toString();
    const newGoal: SavingsGoalItem = {
      id: newId,
      title: `Goal #${goals.length + 1}`,
      targetPrice: 200000,
      currentSaved: 0,
      monthlyAllocation: 5000,
      annualInflationRate: 5,
    };
    setGoals([...goals, newGoal]);
    setTransactionGoalId(newId);
  };

  const updateGoal = <K extends keyof SavingsGoalItem>(
    id: string,
    field: K,
    value: SavingsGoalItem[K]
  ) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const removeGoal = (id: string) => {
    if (goals.length <= 1) return;
    const remaining = goals.filter((g) => g.id !== id);
    setGoals(remaining);
    if (transactionGoalId === id) {
      setTransactionGoalId(remaining[0].id);
    }
  };

  const handleTransactionSubmit = () => {
    const amount = Number(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification("Please enter a valid amount greater than ₹0", true);
      return;
    }

    const target = goals.find((g) => g.id === transactionGoalId);
    if (!target) {
      showNotification("Selected goal was not found", true);
      return;
    }

    if (transactionType === "withdraw" && amount > target.currentSaved) {
      showNotification(
        `Cannot withdraw ₹${amount.toLocaleString()}. Maximum available in "${target.title}" is ₹${target.currentSaved.toLocaleString()}`,
        true
      );
      return;
    }

    // Update Goal Balance
    const delta = transactionType === "deposit" ? amount : -amount;
    const updatedBalance = Math.max(0, target.currentSaved + delta);

    setGoals((prev) =>
      prev.map((g) =>
        g.id === transactionGoalId ? { ...g, currentSaved: updatedBalance } : g
      )
    );

    // Record Audit Log Entry
    const record: TransactionRecord = {
      id: Date.now().toString(),
      goalId: target.id,
      goalTitle: target.title,
      type: transactionType,
      amount,
      timestamp: new Date().toLocaleString(),
    };
    setTransactions((prev) => [record, ...prev]);

    const remainingToTodayTarget = Math.max(0, target.targetPrice - updatedBalance);
    showNotification(
      transactionType === "deposit"
        ? `Added ₹${amount.toLocaleString()} to "${target.title}". ₹${remainingToTodayTarget.toLocaleString()} left to base price!`
        : `Withdrew ₹${amount.toLocaleString()} from "${target.title}". New balance: ₹${updatedBalance.toLocaleString()}.`
    );

    setTransactionAmount("");
  };

  const clearLog = () => {
    setTransactions([]);
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
      <div style={{ maxWidth: "820px", width: "100%" }}>
        
        {/* Header & Income Profile */}
        <header style={{ borderBottom: "1px solid #30363d", paddingBottom: "1.2rem", marginBottom: "1.5rem" }}>
          <h1 style={{ color: "#f0f6fc", fontSize: "1.6rem", margin: 0 }}>Target Purchase & Multi-Goal Planner</h1>
          <p style={{ color: "#8b949e", fontSize: "0.875rem", margin: "0.4rem 0 1rem" }}>
            Real geometric inflation and depreciation calculations with live piggy-bank tracking.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", backgroundColor: "#161b22", padding: "1rem", borderRadius: "8px", border: "1px solid #30363d" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#8b949e" }}>Monthly Salary (₹)</label>
              <input
                type="number"
                value={monthlySalary || ""}
                onChange={(e) => setMonthlySalary(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                style={{ backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#58a6ff", fontSize: "1.1rem", fontWeight: "bold", padding: "0.4rem 0.8rem", borderRadius: "6px" }}
              />
            </div>

            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: "0.8rem", color: "#8b949e" }}>Total Committed for Goals</div>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: remainingDisposable < 0 ? "#f85149" : "#3fb950" }}>
                ₹{totalCommitted.toLocaleString()} / mo
              </div>
              <div style={{ fontSize: "0.75rem", color: remainingDisposable < 0 ? "#f85149" : "#8b949e" }}>
                {remainingDisposable < 0
                  ? "⚠ Monthly allocations exceed income!"
                  : `₹${remainingDisposable.toLocaleString()} remaining for other expenses`}
              </div>
            </div>
          </div>
        </header>

        {/* Deposit / Withdraw Action Box */}
        <section style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, color: "#f0f6fc", fontSize: "1rem" }}>Deposit or Withdraw Savings</h3>
            
            <div style={{ display: "flex", gap: "0.3rem", backgroundColor: "#0d1117", padding: "0.2rem", borderRadius: "6px", border: "1px solid #30363d" }}>
              <button
                type="button"
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
                type="button"
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
              style={{ flex: 1.5, minWidth: "180px", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} (₹{(Number(g.currentSaved) || 0).toLocaleString()})
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Amount (₹)"
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              style={{ flex: 1, minWidth: "140px", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            />

            <button
              type="button"
              onClick={handleTransactionSubmit}
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

          {toast && (
            <div style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              backgroundColor: toast.isError ? "rgba(218, 54, 51, 0.15)" : "rgba(56, 139, 253, 0.15)",
              border: `1px solid ${toast.isError ? "#da3633" : "#388bfd"}`,
              borderRadius: "6px",
              color: toast.isError ? "#f85149" : "#58a6ff",
              fontSize: "0.85rem"
            }}>
              {toast.message}
            </div>
          )}
        </section>

        {/* Goal Cards */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
          {goals.map((goal) => {
            const result = evaluateGoal(goal);
            const quote = getMotivationalMessage(result.progressPercentage, result.todayRemainingAmount);

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
                      type="button"
                      onClick={() => removeGoal(goal.id)}
                      style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", fontSize: "0.85rem" }}
                    >
                      Delete Goal ✕
                    </button>
                  )}
                </div>

                {/* Progress Visual */}
                <div style={{ marginBottom: "1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                    <span style={{ color: "#8b949e" }}>Current Progress ({result.progressPercentage}%)</span>
                    <span style={{ color: "#3fb950", fontWeight: "bold" }}>
                      ₹{(Number(goal.currentSaved) || 0).toLocaleString()} / ₹{(Number(goal.targetPrice) || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "12px", backgroundColor: "#0d1117", borderRadius: "6px", overflow: "hidden", border: "1px solid #30363d" }}>
                    <div style={{
                      width: `${result.progressPercentage}%`,
                      height: "100%",
                      backgroundColor: result.progressPercentage >= 100 ? "#3fb950" : "#238636",
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                </div>

                {/* Motivational Quote */}
                <div style={{ backgroundColor: "#0d1117", padding: "0.6rem 0.8rem", borderRadius: "6px", fontSize: "0.85rem", color: "#e3b341", marginBottom: "1.2rem", borderLeft: "3px solid #e3b341" }}>
                  {quote}
                </div>

                {/* Inputs for this Goal */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#8b949e" }}>Target Price Today (₹)</label>
                    <input
                      type="number"
                      value={goal.targetPrice || ""}
                      onChange={(e) => updateGoal(goal.id, "targetPrice", Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#8b949e" }}>Monthly Savings Allocated (₹)</label>
                    <input
                      type="number"
                      value={goal.monthlyAllocation || ""}
                      onChange={(e) => updateGoal(goal.id, "monthlyAllocation", Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#3fb950", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#8b949e" }}>
                      Annual Price Shift (%) <span style={{ color: "#6e7681" }}>(-% for depreciation)</span>
                    </label>
                    <input
                      type="number"
                      value={goal.annualInflationRate}
                      onChange={(e) => updateGoal(goal.id, "annualInflationRate", Number(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* Projections Snapshot */}
                <div style={{ marginTop: "1.2rem", paddingTop: "1rem", borderTop: "1px solid #21262d", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>Timeline: </span>
                    {result.isUnreachable ? (
                      <span style={{ color: "#f85149", fontWeight: "bold", fontSize: "0.95rem" }}>
                        {goal.monthlyAllocation <= 0 ? "Allocation is ₹0 (Will not complete)" : "Allocation too low to beat price growth (50+ yrs)"}
                      </span>
                    ) : (
                      <>
                        <strong style={{ fontSize: "1.2rem", color: "#58a6ff" }}>{result.realMonthsToGoal} months</strong>
                        <span style={{ fontSize: "0.8rem", color: "#8b949e" }}> ({(result.realMonthsToGoal / 12).toFixed(1)} yrs)</span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#8b949e" }}>
                    Future estimated price:{" "}
                    <strong style={{ color: goal.annualInflationRate < 0 ? "#3fb950" : "#f85149" }}>
                      ₹{result.realFuturePrice.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Add Goal Button */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <button
            type="button"
            onClick={addNewGoal}
            style={{
              backgroundColor: "transparent",
              border: "2px dashed #30363d",
              color: "#58a6ff",
              padding: "0.8rem 2rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: "bold"
            }}
          >
            + Add Another Goal
          </button>
        </div>

        {/* Transaction History Audit Log */}
        <section style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, color: "#f0f6fc", fontSize: "1rem" }}>Savings Activity Log</h3>
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={clearLog}
                style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: "0.75rem" }}
              >
                Clear History
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div style={{ color: "#6e7681", fontSize: "0.85rem", fontStyle: "italic" }}>
              No deposits or withdrawals recorded yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "240px", overflowY: "auto" }}>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#0d1117",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    border: "1px solid #21262d",
                    fontSize: "0.85rem"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: "#f0f6fc", fontWeight: "bold" }}>{tx.goalTitle}</span>
                    <span style={{ color: "#6e7681", fontSize: "0.75rem" }}>{tx.timestamp}</span>
                  </div>

                  <span style={{
                    color: tx.type === "deposit" ? "#3fb950" : "#f85149",
                    fontWeight: "bold",
                    fontSize: "0.95rem"
                  }}>
                    {tx.type === "deposit" ? "+" : "−"}₹{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}