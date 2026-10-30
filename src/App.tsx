import { useState, useEffect, useRef } from "react";
import { evaluateGoal, getMotivationalMessage, computeGoalBalance } from "./calculator";
import { safeLoad, safeSave } from "./storage";
import type { SavingsGoalItem, TransactionRecord, ExpenseItem } from "./types";

const STORAGE_GOALS = "fp_goals_v3";
const STORAGE_LOGS = "fp_logs_v3";
const STORAGE_EXPENSES = "fp_expenses_v3";
const STORAGE_SALARY = "fp_salary_v3";
const STORAGE_THEME = "fp_theme_v1";

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
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    safeLoad(STORAGE_THEME, "dark", (t) => t === "dark" || t === "light")
  );

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

  // Sync state
  useEffect(() => safeSave(STORAGE_THEME, theme), [theme]);
  useEffect(() => safeSave(STORAGE_GOALS, goals), [goals]);
  useEffect(() => safeSave(STORAGE_LOGS, transactions), [transactions]);
  useEffect(() => safeSave(STORAGE_EXPENSES, expenses), [expenses]);
  useEffect(() => safeSave(STORAGE_SALARY, monthlySalary), [monthlySalary]);

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

  // Color Palette Definitions (Spotify Dark / Clean Contrast Light)
 const isDark = theme === "dark";
 const colors = {
    bg: isDark ? "#121212" : "#f5f7fb",
    surface: isDark ? "#181818" : "#ffffff",
    surfaceHover: isDark ? "#282828" : "#eef2f8",
    inputBg: isDark ? "#242424" : "#edf2f9",
    border: isDark ? "#2a2a2a" : "#dbe3ef",
    textPrimary: isDark ? "#ffffff" : "#1e293b",
    textSecondary: isDark ? "#b3b3b3" : "#64748b",
    accent: isDark ? "#1ed760" : "#3b82f6",
    accentText: isDark ? "#000000" : "#ffffff",
    accentHover: isDark ? "#1fdf64" : "#2563eb",
    danger: "#f15e6c",
    blue: "#3b82f6",
    gold: "#d97706",
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
      notify("Keep at least one active goal.", true);
      return;
    }
    if (!window.confirm(`Delete "${title}"? All associated transaction records will be removed.`)) {
      return;
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setTransactions((prev) => prev.filter((t) => t.goalId !== id));
    notify(`Deleted goal "${title}".`);
  };

  const handleTransaction = () => {
    const amt = Number(txAmount);
    if (isNaN(amt) || amt <= 0) {
      notify("Enter a valid amount greater than ₹0", true);
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
        ? `Deposited ₹${amt.toLocaleString()} to "${target.title}". ₹${remainingToTarget.toLocaleString()} left!`
        : `Withdrew ₹${amt.toLocaleString()} from "${target.title}". Current balance: ₹${newBalance.toLocaleString()}`
    );
  };

  const clearHistory = () => {
    if (!window.confirm("Clear all transaction logs?")) return;
    setTransactions([]);
    notify("Activity log cleared.");
  };

  const addExpense = () => {
    const amt = Number(expenseAmount);
    if (!expenseCategory.trim() || isNaN(amt) || amt <= 0) {
      notify("Enter a valid category and amount.", true);
      return;
    }
    setExpenses((prev) => [...prev, { id: `e-${Date.now()}`, category: expenseCategory.trim(), amount: amt }]);
    setExpenseCategory("");
    setExpenseAmount("");
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

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
    notify("Backup downloaded.");
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
          notify("Data restored successfully.");
        } else {
          notify("Invalid backup format.", true);
        }
      } catch {
        notify("Failed to parse backup JSON file.", true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: colors.bg,
      color: colors.textPrimary,
      fontFamily: "'Circular', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      padding: "2.5rem 1rem",
      display: "flex",
      justifyContent: "center",
      transition: "background-color 0.25s ease, color 0.25s ease"
    }}>
      <div style={{ maxWidth: "880px", width: "100%" }}>
        
        {/* Top App Bar */}
        <header style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.8rem" }}>💸</span>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
                  Finance Planner
                </h1>
              </div>
              <p style={{ color: colors.textSecondary, fontSize: "0.9rem", margin: "0.3rem 0 0" }}>
                Multi-goal tracking with true compounding and disposable budget checks.
              </p>
            </div>

            {/* Actions & Theme Switch */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label="Toggle Theme"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                  borderRadius: "500px",
                  padding: "0.45rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <span>{isDark ? "☀️ Light" : "🌙 Dark"}</span>
              </button>

              <button
                type="button"
                onClick={exportBackupJSON}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                  borderRadius: "500px",
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Export
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  color: colors.textPrimary,
                  borderRadius: "500px",
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Import
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={importBackupJSON} style={{ display: "none" }} />
            </div>
          </div>

          {/* Spotify-style Stats Dashboard Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginTop: "1.5rem"
          }}>
            <div style={{
              backgroundColor: colors.surface,
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.06)"
            }}>
              <label htmlFor="salaryInput" style={{ fontSize: "0.8rem", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                Monthly Salary
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.4rem" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: 700, color: colors.accent }}>₹</span>
                <input
                  id="salaryInput"
                  type="number"
                  value={monthlySalary || ""}
                  onChange={(e) => setMonthlySalary(Math.max(0, Number(e.target.value)))}
                  style={{
                    backgroundColor: colors.inputBg,
                    border: "none",
                    color: colors.textPrimary,
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    padding: "0.4rem 0.6rem",
                    borderRadius: "6px",
                    width: "100%"
                  }}
                />
              </div>
            </div>

            <div style={{
              backgroundColor: colors.surface,
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.06)"
            }}>
              <div style={{ fontSize: "0.8rem", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                Living Expenses
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "0.4rem" }}>
                ₹{totalExpenses.toLocaleString()} <span style={{ fontSize: "0.8rem", color: colors.textSecondary, fontWeight: 400 }}>/ mo</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginTop: "0.2rem" }}>
                Disposable: <strong style={{ color: colors.textPrimary }}>₹{disposableIncome.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{
              backgroundColor: colors.surface,
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.06)"
            }}>
              <div style={{ fontSize: "0.8rem", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                Committed to Goals
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: remainingAfterCommitments < 0 ? colors.danger : colors.accent, marginTop: "0.4rem" }}>
                ₹{totalMonthlyCommitted.toLocaleString()} <span style={{ fontSize: "0.8rem", color: colors.textSecondary, fontWeight: 400 }}>/ mo</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: remainingAfterCommitments < 0 ? colors.danger : colors.textSecondary, marginTop: "0.2rem" }}>
                {remainingAfterCommitments < 0 ? "⚠ Exceeds disposable balance!" : `₹${remainingAfterCommitments.toLocaleString()} buffer unallocated`}
              </div>
            </div>
          </div>
        </header>

        {/* Transaction Action Panel */}
        <section style={{
          backgroundColor: colors.surface,
          borderRadius: "12px",
          padding: "1.4rem",
          marginBottom: "2rem",
          boxShadow: isDark ? "0 6px 16px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.8rem" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Piggy Bank Transactions</h2>
              <p style={{ fontSize: "0.8rem", color: colors.textSecondary, margin: "0.2rem 0 0" }}>Update your tangible savings progress.</p>
            </div>

            {/* Pill Toggle Button */}
            <div style={{ display: "flex", backgroundColor: colors.inputBg, padding: "3px", borderRadius: "500px" }}>
              <button
                type="button"
                onClick={() => setTxType("deposit")}
                style={{
                  background: txType === "deposit" ? colors.accent : "transparent",
                  color: txType === "deposit" ? "#000000" : colors.textSecondary,
                  border: "none",
                  padding: "0.35rem 1rem",
                  borderRadius: "500px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  transition: "all 0.2s ease"
                }}
              >
                + Deposit
              </button>
              <button
                type="button"
                onClick={() => setTxType("withdraw")}
                style={{
                  background: txType === "withdraw" ? colors.danger : "transparent",
                  color: txType === "withdraw" ? "#ffffff" : colors.textSecondary,
                  border: "none",
                  padding: "0.35rem 1rem",
                  borderRadius: "500px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  transition: "all 0.2s ease"
                }}
              >
                − Withdraw
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <select
              value={txGoalId}
              onChange={(e) => setTxGoalId(e.target.value)}
              style={{
                flex: 1.5,
                minWidth: "180px",
                backgroundColor: colors.inputBg,
                border: "none",
                color: colors.textPrimary,
                padding: "0.7rem 1rem",
                borderRadius: "8px",
                fontWeight: 600
              }}
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

            <input
              type="number"
              placeholder="Amount (₹)"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              style={{
                flex: 1,
                minWidth: "140px",
                backgroundColor: colors.inputBg,
                border: "none",
                color: colors.textPrimary,
                padding: "0.7rem 1rem",
                borderRadius: "8px",
                fontWeight: 600
              }}
            />

            <button
              type="button"
              onClick={handleTransaction}
              style={{
                backgroundColor: txType === "deposit" ? colors.accent : colors.danger,
                color: txType === "deposit" ? "#000000" : "#ffffff",
                border: "none",
                padding: "0.7rem 1.6rem",
                borderRadius: "500px",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
                letterSpacing: "0.02em"
              }}
            >
              Confirm {txType === "deposit" ? "Deposit" : "Withdrawal"}
            </button>
          </div>

          {toast && (
            <div style={{
              marginTop: "1rem",
              padding: "0.8rem 1rem",
              backgroundColor: toast.isError ? "rgba(241, 94, 108, 0.15)" : "rgba(30, 215, 96, 0.15)",
              border: `1px solid ${toast.isError ? colors.danger : colors.accent}`,
              borderRadius: "8px",
              color: toast.isError ? colors.danger : colors.accent,
              fontSize: "0.85rem",
              fontWeight: 600
            }}>
              {toast.msg}
            </div>
          )}
        </section>

        {/* Goal Cards */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2.5rem" }}>
          {goals.map((goal) => {
            const currentBalance = computeGoalBalance(goal, transactions);
            const result = evaluateGoal(goal, currentBalance);
            const quote = getMotivationalMessage(result.progressPercentage, result.todayRemaining);

            return (
              <div
                key={goal.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: "14px",
                  padding: "1.5rem",
                  boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.4)" : "0 4px 14px rgba(0,0,0,0.06)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease"
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <input
                    aria-label="Goal Title"
                    type="text"
                    value={goal.title}
                    onChange={(e) => updateGoal(goal.id, "title", e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: `1px dashed ${colors.border}`,
                      color: colors.textPrimary,
                      fontSize: "1.3rem",
                      fontWeight: 800,
                      padding: "0.2rem 0"
                    }}
                  />

                  {/* Mode Pill Switch & Delete */}
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <div style={{ display: "flex", backgroundColor: colors.inputBg, padding: "2px", borderRadius: "500px" }}>
                      <button
                        type="button"
                        onClick={() => updateGoal(goal.id, "mode", "bySavings")}
                        style={{
                          background: goal.mode === "bySavings" ? colors.accent : "transparent",
                          color: goal.mode === "bySavings" ? "#000000" : colors.textSecondary,
                          border: "none",
                          padding: "0.25rem 0.7rem",
                          borderRadius: "500px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        By Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => updateGoal(goal.id, "mode", "byDeadline")}
                        style={{
                          background: goal.mode === "byDeadline" ? colors.accent : "transparent",
                          color: goal.mode === "byDeadline" ? "#000000" : colors.textSecondary,
                          border: "none",
                          padding: "0.25rem 0.7rem",
                          borderRadius: "500px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        By Deadline
                      </button>
                    </div>

                    {goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id, goal.title)}
                        aria-label="Delete Goal"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: colors.textSecondary,
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          padding: "0.3rem"
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Spotify-style Track Progress Bar */}
                <div style={{ marginBottom: "1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                    <span style={{ color: colors.textSecondary }}>Progress ({result.progressPercentage}%)</span>
                    <span style={{ color: colors.accent, fontWeight: 700 }}>
                      ₹{currentBalance.toLocaleString()} / ₹{goal.targetPrice.toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    width: "100%",
                    height: "8px",
                    backgroundColor: colors.inputBg,
                    borderRadius: "500px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${result.progressPercentage}%`,
                      height: "100%",
                      backgroundColor: colors.accent,
                      borderRadius: "500px",
                      transition: "width 0.4s ease"
                    }} />
                  </div>
                </div>

                {/* Motivational Milestone Callout */}
                <div style={{
                  backgroundColor: colors.inputBg,
                  padding: "0.6rem 0.9rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: colors.textPrimary,
                  marginBottom: "1.2rem",
                  borderLeft: `3px solid ${colors.gold}`
                }}>
                  {quote}
                </div>

                {/* Goal Parameters Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem" }}>
                  <div>
                    <label htmlFor={`target-${goal.id}`} style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600 }}>
                      Target Cost Today (₹)
                    </label>
                    <input
                      id={`target-${goal.id}`}
                      type="number"
                      value={goal.targetPrice || ""}
                      onChange={(e) => updateGoal(goal.id, "targetPrice", Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      style={{
                        width: "100%",
                        backgroundColor: colors.inputBg,
                        border: "none",
                        color: colors.textPrimary,
                        padding: "0.55rem 0.75rem",
                        borderRadius: "6px",
                        fontWeight: 600,
                        marginTop: "0.3rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor={`deposit-${goal.id}`} style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600 }}>
                      Opening Base (₹)
                    </label>
                    <input
                      id={`deposit-${goal.id}`}
                      type="number"
                      value={goal.initialDeposit || ""}
                      onChange={(e) => updateGoal(goal.id, "initialDeposit", Math.max(0, Number(e.target.value)))}
                      placeholder="0"
                      style={{
                        width: "100%",
                        backgroundColor: colors.inputBg,
                        border: "none",
                        color: colors.textPrimary,
                        padding: "0.55rem 0.75rem",
                        borderRadius: "6px",
                        fontWeight: 600,
                        marginTop: "0.3rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {goal.mode === "bySavings" ? (
                    <div>
                      <label htmlFor={`alloc-${goal.id}`} style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600 }}>
                        Monthly Savings (₹)
                      </label>
                      <input
                        id={`alloc-${goal.id}`}
                        type="number"
                        value={goal.monthlyAllocation || ""}
                        onChange={(e) => updateGoal(goal.id, "monthlyAllocation", Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        style={{
                          width: "100%",
                          backgroundColor: colors.inputBg,
                          border: "none",
                          color: colors.accent,
                          padding: "0.55rem 0.75rem",
                          borderRadius: "6px",
                          fontWeight: 700,
                          marginTop: "0.3rem",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor={`deadline-${goal.id}`} style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600 }}>
                        Deadline (Months)
                      </label>
                      <input
                        id={`deadline-${goal.id}`}
                        type="number"
                        value={goal.targetMonths || ""}
                        onChange={(e) => updateGoal(goal.id, "targetMonths", Math.max(1, Number(e.target.value)))}
                        placeholder="12"
                        style={{
                          width: "100%",
                          backgroundColor: colors.inputBg,
                          border: "none",
                          color: colors.blue,
                          padding: "0.55rem 0.75rem",
                          borderRadius: "6px",
                          fontWeight: 700,
                          marginTop: "0.3rem",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor={`inflation-${goal.id}`} style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: 600 }}>
                      Annual Drift (%)
                    </label>
                    <input
                      id={`inflation-${goal.id}`}
                      type="number"
                      value={goal.annualInflationRate}
                      onChange={(e) => updateGoal(goal.id, "annualInflationRate", Number(e.target.value))}
                      style={{
                        width: "100%",
                        backgroundColor: colors.inputBg,
                        border: "none",
                        color: colors.textPrimary,
                        padding: "0.55rem 0.75rem",
                        borderRadius: "6px",
                        fontWeight: 600,
                        marginTop: "0.3rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                {/* Results Snapshot */}
                <div style={{
                  marginTop: "1.4rem",
                  paddingTop: "1rem",
                  borderTop: `1px solid ${colors.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  gap: "0.5rem"
                }}>
                  <div>
                    {goal.mode === "bySavings" ? (
                      <>
                        <span style={{ fontSize: "0.8rem", color: colors.textSecondary }}>Timeline: </span>
                        {result.isUnreachable ? (
                          <div style={{ color: colors.danger, fontSize: "0.85rem", marginTop: "0.2rem" }}>
                            <strong>Allocation cannot outpace inflation.</strong>
                            <div style={{ color: colors.textSecondary, fontSize: "0.8rem", marginTop: "0.2rem" }}>
                              Suggested: Save <strong>₹{result.minMonthlyFor5Years.toLocaleString()} / mo</strong> to complete in 5 years.
                            </div>
                          </div>
                        ) : (
                          <>
                            <strong style={{ fontSize: "1.25rem", color: colors.accent, fontWeight: 800 }}>
                              {result.realMonthsToGoal} months
                            </strong>
                            <span style={{ fontSize: "0.8rem", color: colors.textSecondary }}> ({(result.realMonthsToGoal / 12).toFixed(1)} yrs)</span>
                          </>
                        )}
                      </>
                    ) : (
                      <div>
                        <span style={{ fontSize: "0.8rem", color: colors.textSecondary }}>Required Monthly Allocation: </span>
                        <strong style={{ fontSize: "1.25rem", color: colors.accent, fontWeight: 800 }}>
                          ₹{result.requiredMonthlyForDeadline.toLocaleString()} / mo
                        </strong>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: "0.8rem", color: colors.textSecondary }}>
                    Future estimated cost:{" "}
                    <strong style={{ color: goal.annualInflationRate < 0 ? colors.accent : colors.danger }}>
                      ₹{result.realFuturePrice.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Add Goal Button */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <button
            type="button"
            onClick={addGoal}
            style={{
              backgroundColor: "transparent",
              border: `2px dashed ${colors.border}`,
              color: colors.accent,
              padding: "0.8rem 2.2rem",
              borderRadius: "500px",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: 700,
              letterSpacing: "0.02em"
            }}
          >
            + Add Another Goal
          </button>
        </div>

        {/* Expense Ledger */}
        <section style={{
          backgroundColor: colors.surface,
          borderRadius: "14px",
          padding: "1.4rem",
          marginBottom: "2rem",
          boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.4)" : "0 4px 14px rgba(0,0,0,0.06)"
        }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.3rem" }}>Monthly Living Expenses</h2>
          <p style={{ fontSize: "0.8rem", color: colors.textSecondary, margin: "0 0 1rem" }}>
            Track recurring bills so savings targets stay within actual cashflow limits.
          </p>

          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Expense Category (e.g. Rent, EMI)"
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              style={{
                flex: 2,
                minWidth: "160px",
                backgroundColor: colors.inputBg,
                border: "none",
                color: colors.textPrimary,
                padding: "0.6rem 0.9rem",
                borderRadius: "8px",
                fontWeight: 600
              }}
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              style={{
                flex: 1,
                minWidth: "120px",
                backgroundColor: colors.inputBg,
                border: "none",
                color: colors.textPrimary,
                padding: "0.6rem 0.9rem",
                borderRadius: "8px",
                fontWeight: 600
              }}
            />
            <button
              type="button"
              onClick={addExpense}
              style={{
                backgroundColor: colors.accent,
                color: "#000000",
                border: "none",
                padding: "0.6rem 1.4rem",
                borderRadius: "500px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "0.85rem"
              }}
            >
              Add Expense
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {expenses.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.9rem",
                  backgroundColor: colors.inputBg,
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600
                }}
              >
                <span>{e.category}</span>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span>₹{e.amount.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => removeExpense(e.id)}
                    style={{ background: "none", border: "none", color: colors.danger, cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Transaction History Activity Log */}
        <section style={{
          backgroundColor: colors.surface,
          borderRadius: "14px",
          padding: "1.4rem",
          marginBottom: "2.5rem",
          boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.4)" : "0 4px 14px rgba(0,0,0,0.06)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Savings Activity Log</h2>
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.textSecondary,
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 600
                }}
              >
                Clear History
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div style={{ color: colors.textSecondary, fontSize: "0.85rem", fontStyle: "italic" }}>
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
                    backgroundColor: colors.inputBg,
                    padding: "0.65rem 0.9rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 700 }}>{tx.goalTitle}</span>
                    <span style={{ color: colors.textSecondary, fontSize: "0.75rem" }}>
                      {new Date(tx.isoTimestamp).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  <span style={{
                    color: tx.type === "deposit" ? colors.accent : colors.danger,
                    fontWeight: 800,
                    fontSize: "0.95rem"
                  }}>
                    {tx.type === "deposit" ? "+" : "−"}₹{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: "1.2rem",
          textAlign: "center",
          fontSize: "0.75rem",
          color: colors.textSecondary,
          lineHeight: 1.6
        }}>
          <p style={{ margin: "0 0 0.3rem" }}>
            <strong>Local Storage:</strong> All plans and logs are stored privately inside your browser. Export JSON backups regularly to keep your milestones secure.
          </p>
          <p style={{ margin: 0, fontStyle: "italic" }}>
            Educational tool only; calculations do not constitute professional financial advice.
          </p>
        </footer>

      </div>
    </div>
  );
}