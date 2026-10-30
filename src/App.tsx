import { useState, useEffect, useRef } from "react";
import { evaluateGoal, getMotivationalMessage, computeGoalBalance } from "./calculator";
import { safeLoad, safeSave } from "./storage";
import type { SavingsGoalItem, TransactionRecord, ExpenseItem } from "./types";

const STORAGE_GOALS = "fp_goals_v3";
const STORAGE_LOGS = "fp_logs_v3";
const STORAGE_EXPENSES = "fp_expenses_v3";
const STORAGE_SALARY = "fp_salary_v3";

const DEFAULT_GOALS: SavingsGoalItem[] = [
  {
    id: "g-1",
    title: "Buy My Car",
    targetPrice: 1500000,
    initialDeposit: 50000,
    mode: "bySavings",
    monthlyAllocation: 25000,
    targetMonths: 48,
    annualInflationRate: 5,
  },
  {
    id: "g-2",
    title: "Build My House",
    targetPrice: 2500000,
    initialDeposit: 100000,
    mode: "byDeadline",
    monthlyAllocation: 30000,
    targetMonths: 60,
    annualInflationRate: 6,
  },
];

const DEFAULT_EXPENSES: ExpenseItem[] = [
  { id: "e-1", category: "Rent & Housing", amount: 12000 },
  { id: "e-2", category: "Groceries & Utilities", amount: 8000 },
];

export default function App() {
  const [monthlySalary, setMonthlySalary] = useState<number>(() =>
    safeLoad(STORAGE_SALARY, 50000, (d) => typeof d === "number")
  );

  const [goals, setGoals] = useState<SavingsGoalItem[]>(() =>
    safeLoad(STORAGE_GOALS, DEFAULT_GOALS, (d) => Array.isArray(d))
  );

  const [transactions, setTransactions] = useState<TransactionRecord[]>(() =>
    safeLoad(STORAGE_LOGS, [], (d) => Array.isArray(d))
  );

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() =>
    safeLoad(STORAGE_EXPENSES, DEFAULT_EXPENSES, (d) => Array.isArray(d))
  );

  // Transaction Inputs
  const [txGoalId, setTxGoalId] = useState<string>(() => goals[0]?.id || "");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");

  // Expense Inputs
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const [toast, setToast] = useState<{ msg: string; isError: boolean } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync to localStorage
  useEffect(() => safeSave(STORAGE_GOALS, goals), [goals]);
  useEffect(() => safeSave(STORAGE_LOGS, transactions), [transactions]);
  useEffect(() => safeSave(STORAGE_EXPENSES, expenses), [expenses]);
  useEffect(() => safeSave(STORAGE_SALARY, monthlySalary), [monthlySalary]);

  // Sync selected transaction goal
  useEffect(() => {
    if (!goals.some((g) => g.id === txGoalId) && goals.length > 0) {
      setTxGoalId(goals[0].id);
    }
  }, [goals, txGoalId]);

  const notify = (msg: string, isError = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, isError });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4500);
  };

  // Financial aggregates
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const disposableIncome = Math.max(0, monthlySalary - totalExpenses);

  const totalMonthlyCommitted = goals.reduce((sum, g) => {
    const balance = computeGoalBalance(g, transactions);
    const res = evaluateGoal(g, balance);
    return sum + (g.mode === "bySavings" ? g.monthlyAllocation : res.requiredMonthlyForDeadline);
  }, 0);

  const remainingAfterCommitments = disposableIncome - totalMonthlyCommitted;

  // Goal Handlers
  const addGoal = () => {
    const id = `g-${Date.now()}`;
    const newGoal: SavingsGoalItem = {
      id,
      title: `Goal #${goals.length + 1}`,
      targetPrice: 300000,
      initialDeposit: 0,
      mode: "bySavings",
      monthlyAllocation: 5000,
      targetMonths: 36,
      annualInflationRate: 5,
    };
    setGoals((prev) => [...prev, newGoal]);
    setTxGoalId(id);
  };

  const updateGoal = <K extends keyof SavingsGoalItem>(id: string, field: K, val: SavingsGoalItem[K]) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: val } : g)));
  };

  const removeGoal = (id: string, title: string) => {
    if (goals.length <= 1) {
      notify("You must keep at least one active goal.", true);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${title}"? All associated transaction records will be removed.`)) {
      return;
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setTransactions((prev) => prev.filter((t) => t.goalId !== id));
    notify(`Deleted goal "${title}" and its transactions.`);
  };

  // Transaction Handler
  const handleTransaction = () => {
    const amt = Number(txAmount);
    if (isNaN(amt) || amt <= 0) {
      notify("Please enter a valid amount greater than ₹0", true);
      return;
    }
    const target = goals.find((g) => g.id === txGoalId);
    if (!target) return;

    const currentBalance = computeGoalBalance(target, transactions);
    if (txType === "withdraw" && amt > currentBalance) {
      notify(`Cannot withdraw ₹${amt.toLocaleString()}. Available: ₹${currentBalance.toLocaleString()}`, true);
      return;
    }

    const record: TransactionRecord = {
      id: `tx-${Date.now()}`,
      goalId: target.id,
      goalTitle: target.title,
      type: txType,
      amount: amt,
      isoTimestamp: new Date().toISOString(),
    };

    setTransactions((prev) => [record, ...prev]);
    setTxAmount("");

    const newBalance = txType === "deposit" ? currentBalance + amt : currentBalance - amt;
    const remainingToTarget = Math.max(0, target.targetPrice - newBalance);

    notify(
      txType === "deposit"
        ? `Added ₹${amt.toLocaleString()} to "${target.title}". ₹${remainingToTarget.toLocaleString()} left to base price!`
        : `Withdrew ₹${amt.toLocaleString()} from "${target.title}". Current balance: ₹${newBalance.toLocaleString()}`
    );
  };

  const clearHistory = () => {
    if (!window.confirm("Clear all transaction logs? Note: Base opening deposits configured inside goals will remain.")) {
      return;
    }
    setTransactions([]);
    notify("Transaction activity log cleared.");
  };

  // Expense Handlers
  const addExpense = () => {
    const amt = Number(expenseAmount);
    if (!expenseCategory.trim() || isNaN(amt) || amt <= 0) {
      notify("Enter a valid expense category and amount.", true);
      return;
    }
    setExpenses((prev) => [...prev, { id: `e-${Date.now()}`, category: expenseCategory.trim(), amount: amt }]);
    setExpenseCategory("");
    setExpenseAmount("");
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // JSON Import / Export
  const exportBackupJSON = () => {
    const backupData = {
      version: 3,
      salary: monthlySalary,
      goals,
      transactions,
      expenses,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance_planner_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Backup downloaded successfully.");
  };

  const importBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data.goals) && Array.isArray(data.transactions)) {
          setMonthlySalary(Number(data.salary) || 50000);
          setGoals(data.goals);
          setTransactions(data.transactions);
          if (Array.isArray(data.expenses)) setExpenses(data.expenses);
          notify("Data restored from backup successfully.");
        } else {
          notify("Invalid backup format.", true);
        }
      } catch {
        notify("Failed to parse the backup JSON file.", true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      <div style={{ maxWidth: "860px", width: "100%" }}>
        
        {/* Header */}
        <header style={{ borderBottom: "1px solid #30363d", paddingBottom: "1.2rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ color: "#f0f6fc", fontSize: "1.6rem", margin: 0 }}>Smart Multi-Goal Life Planner</h1>
              <p style={{ color: "#8b949e", fontSize: "0.875rem", margin: "0.4rem 0 0" }}>
                Solve for exact timelines, deadlined goals, and true disposable income feasibility.
              </p>
            </div>

            {/* Backup actions */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={exportBackupJSON}
                style={{ backgroundColor: "#21262d", border: "1px solid #30363d", color: "#c9d1d9", padding: "0.4rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}
              >
                Export JSON ⤓
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ backgroundColor: "#21262d", border: "1px solid #30363d", color: "#c9d1d9", padding: "0.4rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}
              >
                Import JSON ⤒
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={importBackupJSON} style={{ display: "none" }} />
            </div>
          </div>

          {/* Income & Disposable Sanity Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", backgroundColor: "#161b22", padding: "1rem", borderRadius: "8px", border: "1px solid #30363d", marginTop: "1.2rem" }}>
            <div>
              <label htmlFor="salaryInput" style={{ fontSize: "0.8rem", color: "#8b949e" }}>Monthly Salary (₹)</label>
              <input
                id="salaryInput"
                type="number"
                value={monthlySalary || ""}
                onChange={(e) => setMonthlySalary(Math.max(0, Number(e.target.value)))}
                style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#58a6ff", fontSize: "1.1rem", fontWeight: "bold", padding: "0.4rem", borderRadius: "6px", boxSizing: "border-box", marginTop: "0.2rem" }}
              />
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", color: "#8b949e" }}>Living Expenses</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#f0f6fc", marginTop: "0.3rem" }}>
                ₹{totalExpenses.toLocaleString()} / mo
              </div>
              <div style={{ fontSize: "0.75rem", color: "#8b949e" }}>Disposable: ₹{disposableIncome.toLocaleString()}</div>
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", color: "#8b949e" }}>Total Committed for Goals</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: remainingAfterCommitments < 0 ? "#f85149" : "#3fb950", marginTop: "0.3rem" }}>
                ₹{totalMonthlyCommitted.toLocaleString()} / mo
              </div>
              <div style={{ fontSize: "0.75rem", color: remainingAfterCommitments < 0 ? "#f85149" : "#8b949e" }}>
                {remainingAfterCommitments < 0 ? "Exceeds disposable income!" : `₹${remainingAfterCommitments.toLocaleString()} safety buffer`}
              </div>
            </div>
          </div>
        </header>

        {/* Deposit / Withdraw Activity Panel */}
        <section style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, color: "#f0f6fc", fontSize: "1rem" }}>Piggy Bank Transactions</h3>
            
            <div style={{ display: "flex", gap: "0.3rem", backgroundColor: "#0d1117", padding: "0.2rem", borderRadius: "6px", border: "1px solid #30363d" }}>
              <button
                type="button"
                onClick={() => setTxType("deposit")}
                style={{
                  background: txType === "deposit" ? "#238636" : "transparent",
                  color: "#f0f6fc",
                  border: "none",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: txType === "deposit" ? "bold" : "normal"
                }}
              >
                Deposit (+)
              </button>
              <button
                type="button"
                onClick={() => setTxType("withdraw")}
                style={{
                  background: txType === "withdraw" ? "#da3633" : "transparent",
                  color: "#f0f6fc",
                  border: "none",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: txType === "withdraw" ? "bold" : "normal"
                }}
              >
                Withdraw (−)
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <label htmlFor="txGoalSelect" style={{ display: "none" }}>Select Goal</label>
            <select
              id="txGoalSelect"
              value={txGoalId}
              onChange={(e) => setTxGoalId(e.target.value)}
              style={{ flex: 1.5, minWidth: "180px", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            >
              {goals.map((g) => {
                const bal = computeGoalBalance(g, transactions);
                return (
                  <option key={g.id} value={g.id}>
                    {g.title} (₹{bal.toLocaleString()})
                  </option>
                );
              })}
            </select>

            <label htmlFor="txAmountInput" style={{ display: "none" }}>Transaction Amount</label>
            <input
              id="txAmountInput"
              type="number"
              placeholder="Amount (₹)"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              style={{ flex: 1, minWidth: "140px", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.6rem", borderRadius: "6px" }}
            />

            <button
              type="button"
              onClick={handleTransaction}
              style={{
                backgroundColor: txType === "deposit" ? "#238636" : "#da3633",
                color: "#fff",
                border: "none",
                padding: "0.6rem 1.4rem",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Confirm {txType === "deposit" ? "Deposit" : "Withdrawal"}
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
              {toast.msg}
            </div>
          )}
        </section>

        {/* Goal Cards */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
          {goals.map((goal) => {
            const currentBalance = computeGoalBalance(goal, transactions);
            const result = evaluateGoal(goal, currentBalance);
            const quote = getMotivationalMessage(result.progressPercentage, result.todayRemaining);

            return (
              <div key={goal.id} style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "10px", padding: "1.4rem" }}>
                
                {/* Goal Title & Delete */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <input
                    aria-label="Goal Title"
                    type="text"
                    value={goal.title}
                    onChange={(e) => updateGoal(goal.id, "title", e.target.value)}
                    style={{ background: "transparent", border: "none", borderBottom: "1px dashed #30363d", color: "#f0f6fc", fontSize: "1.2rem", fontWeight: "bold", padding: "0.2rem" }}
                  />

                  {/* Mode Selector */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <div style={{ display: "flex", backgroundColor: "#0d1117", border: "1px solid #30363d", borderRadius: "6px", padding: "0.2rem" }}>
                      <button
                        type="button"
                        onClick={() => updateGoal(goal.id, "mode", "bySavings")}
                        style={{
                          background: goal.mode === "bySavings" ? "#388bfd" : "transparent",
                          color: "#f0f6fc",
                          border: "none",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          cursor: "pointer"
                        }}
                      >
                        By Monthly Allocation
                      </button>
                      <button
                        type="button"
                        onClick={() => updateGoal(goal.id, "mode", "byDeadline")}
                        style={{
                          background: goal.mode === "byDeadline" ? "#388bfd" : "transparent",
                          color: "#f0f6fc",
                          border: "none",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          cursor: "pointer"
                        }}
                      >
                        By Target Deadline
                      </button>
                    </div>

                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id, goal.title)}
                        style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        Delete Goal ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Single-Source Balance Visual */}
                <div style={{ marginBottom: "1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                    <span style={{ color: "#8b949e" }}>Saved ({result.progressPercentage}%)</span>
                    <span style={{ color: "#3fb950", fontWeight: "bold" }}>
                      ₹{currentBalance.toLocaleString()} / ₹{goal.targetPrice.toLocaleString()}
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

                {/* Interactive Inputs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label htmlFor={`target-${goal.id}`} style={{ fontSize: "0.75rem", color: "#8b949e" }}>Current Cost (₹)</label>
                    <input
                      id={`target-${goal.id}`}
                      type="number"
                      value={goal.targetPrice || ""}
                      onChange={(e) => updateGoal(goal.id, "targetPrice", Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label htmlFor={`deposit-${goal.id}`} style={{ fontSize: "0.75rem", color: "#8b949e" }}>Opening Balance (₹)</label>
                    <input
                      id={`deposit-${goal.id}`}
                      type="number"
                      value={goal.initialDeposit || ""}
                      onChange={(e) => updateGoal(goal.id, "initialDeposit", Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                    />
                  </div>

                  {goal.mode === "bySavings" ? (
                    <div>
                      <label htmlFor={`alloc-${goal.id}`} style={{ fontSize: "0.75rem", color: "#8b949e" }}>Monthly Savings (₹)</label>
                      <input
                        id={`alloc-${goal.id}`}
                        type="number"
                        value={goal.monthlyAllocation || ""}
                        onChange={(e) => updateGoal(goal.id, "monthlyAllocation", Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#3fb950", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor={`deadline-${goal.id}`} style={{ fontSize: "0.75rem", color: "#8b949e" }}>Target Deadline (Months)</label>
                      <input
                        id={`deadline-${goal.id}`}
                        type="number"
                        value={goal.targetMonths || ""}
                        onChange={(e) => updateGoal(goal.id, "targetMonths", Math.max(1, Number(e.target.value)))}
                        placeholder="12"
                        style={{ width: "100%", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#58a6ff", padding: "0.5rem", borderRadius: "6px", boxSizing: "border-box" }}
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor={`inflation-${goal.id}`} style={{ fontSize: "0.75rem", color: "#8b949e" }}>
                      Annual Price Shift (%)
                    </label>
                    <input
                      id={`inflation-${goal.id}`}
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
                    {goal.mode === "bySavings" ? (
                      <>
                        <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>Timeline: </span>
                        {result.isUnreachable ? (
                          <div style={{ color: "#f85149", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                            <strong>Allocation too low to beat inflation.</strong>
                            <div style={{ color: "#8b949e", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                              Suggested: Save <strong>₹{result.minMonthlyFor5Years.toLocaleString()} / mo</strong> to finish in 5 years.
                            </div>
                          </div>
                        ) : (
                          <>
                            <strong style={{ fontSize: "1.2rem", color: "#58a6ff" }}>{result.realMonthsToGoal} months</strong>
                            <span style={{ fontSize: "0.8rem", color: "#8b949e" }}> ({(result.realMonthsToGoal / 12).toFixed(1)} yrs)</span>
                          </>
                        )}
                      </>
                    ) : (
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>Required Monthly Savings: </span>
                        <strong style={{ fontSize: "1.2rem", color: "#3fb950" }}>₹{result.requiredMonthlyForDeadline.toLocaleString()} / mo</strong>
                        <span style={{ fontSize: "0.8rem", color: "#8b949e" }}> (to hit {goal.targetMonths} months)</span>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#8b949e" }}>
                    Future estimated cost:{" "}
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
            onClick={addGoal}
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

        {/* Expense Ledger */}
        <section style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem", marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", color: "#f0f6fc", fontSize: "1rem" }}>Monthly Living Expenses</h3>
          <p style={{ fontSize: "0.8rem", color: "#8b949e", margin: "0 0 1rem" }}>
            Track regular outgoings so savings targets reflect actual disposable income.
          </p>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <label htmlFor="expenseCategoryInput" style={{ display: "none" }}>Category</label>
            <input
              id="expenseCategoryInput"
              type="text"
              placeholder="Category (e.g. Rent, Groceries)"
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              style={{ flex: 2, minWidth: "160px", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "4px" }}
            />
            <label htmlFor="expenseAmountInput" style={{ display: "none" }}>Amount</label>
            <input
              id="expenseAmountInput"
              type="number"
              placeholder="Amount (₹)"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              style={{ flex: 1, minWidth: "120px", backgroundColor: "#0d1117", border: "1px solid #30363d", color: "#f0f6fc", padding: "0.5rem", borderRadius: "4px" }}
            />
            <button
              type="button"
              onClick={addExpense}
              style={{ backgroundColor: "#238636", color: "#fff", border: "none", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
            >
              Add Expense
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {expenses.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.8rem", backgroundColor: "#0d1117", borderRadius: "4px", border: "1px solid #21262d" }}>
                <span>{e.category}</span>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span style={{ color: "#f0f6fc" }}>₹{e.amount.toLocaleString()}</span>
                  <button type="button" onClick={() => removeExpense(e.id)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Transaction History Audit Log */}
        <section style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "1.2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, color: "#f0f6fc", fontSize: "1rem" }}>Savings Activity Log</h3>
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
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
                    <span style={{ color: "#6e7681", fontSize: "0.75rem" }}>
                      {new Date(tx.isoTimestamp).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
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

        {/* Footer Disclaimers & Storage Notes */}
        <footer style={{ borderTop: "1px solid #30363d", paddingTop: "1.2rem", textAlign: "center", fontSize: "0.8rem", color: "#8b949e", lineHeight: 1.6 }}>
          <p style={{ margin: "0 0 0.4rem" }}>
            <strong>Local Storage Notice:</strong> All plans and transactions are saved entirely inside this browser. No personal data is transmitted to an external server. Export a JSON backup periodically to protect your records.
          </p>
          <p style={{ margin: 0, fontStyle: "italic" }}>
            <strong>Disclaimer:</strong> Mathematical projections assume continuous compounding rates. These models are educational estimators and do not constitute financial advice.
          </p>
        </footer>

      </div>
    </div>
  );
}