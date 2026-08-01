import React, { useEffect, useState } from 'react';
import './personalFinanceWorkspace.css';
import {
  BILL_CATEGORIES,
  BILL_FREQUENCIES,
  DEBT_STATUSES,
  PAYMENT_FREQUENCIES,
  SAVINGS_GOAL_TYPES,
  SAVINGS_PRIORITIES,
  SAVINGS_STATUSES,
  billSummary,
  createBillOccurrence,
  debtSummary,
  monthForDate,
  occurrenceId,
  savingsSummary,
} from './summaryModels.js';

const number = value => Number(value || 0);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number(value));
const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => today().slice(0, 7);
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled';
const PAYMENT_METHODS = ['Not specified', 'Cash', 'Check', 'Credit card', 'Debit card', 'Bank transfer', 'Money order', 'Other'];

function SummaryCard({ label, value, note, accent = '' }) {
  return <article className={`district-summary-card ${accent}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Progress({ value, label }) {
  const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return <div className="summary-progress"><div><span>{label}</span><strong>{Math.round(percent)}%</strong></div><progress max="100" value={percent}>{Math.round(percent)}%</progress></div>;
}

function Empty({ title, text }) {
  return <div className="district-empty"><span aria-hidden="true">❦</span><strong>{title}</strong><p>{text}</p></div>;
}

function DebtWorkspace({ data, setData }) {
  const blank = { creditorName: '', accountNickname: '', originalBalance: '', currentBalance: '', minimumPayment: '', interestRate: '', dueDate: '', paymentFrequency: 'Monthly', status: 'Current', pastDueAmount: '', notes: '' };
  const [form, setForm] = useState(blank);
  const [payment, setPayment] = useState({ debtId: '', amount: '', paymentDate: today(), paymentMethod: 'Not specified', notes: '' });
  const [showArchived, setShowArchived] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [message, setMessage] = useState('');
  const summary = debtSummary(data.personalDebts);
  const visible = data.personalDebts.filter(item => showArchived ? item.archived : !item.archived);

  const add = event => {
    event.preventDefault();
    if (!form.creditorName.trim()) return;
    if (form.status === 'Paid Off' && !confirm(`Create ${form.creditorName.trim()} as a Paid Off debt?`)) return;
    const debtId = uid('debt');
    const currentBalance = Math.max(0, number(form.currentBalance || form.originalBalance));
    const dueDate = event.currentTarget.elements.debtDueDate?.value || form.dueDate;
    const record = { ...form, dueDate, id: debtId, debtId, creditorName: form.creditorName.trim(), originalBalance: Math.max(currentBalance, number(form.originalBalance)), currentBalance, minimumPayment: Math.max(0, number(form.minimumPayment)), pastDueAmount: Math.max(0, number(form.pastDueAmount)), archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setData(current => ({ ...current, personalDebts: [record, ...current.personalDebts] }));
    setForm(blank);
  };

  const addPayment = event => {
    event.preventDefault();
    const debt = data.personalDebts.find(item => item.debtId === payment.debtId);
    const amount = number(payment.amount);
    if (!debt || amount <= 0) return;
    if (amount > number(debt.currentBalance)) {
      setMessage(`Payment cannot exceed the current balance of ${money(debt.currentBalance)}.`);
      return;
    }
    const nextBalance = Math.max(0, number(debt.currentBalance) - amount);
    const markPaidOff = nextBalance === 0 ? confirm(`This payment brings ${debt.creditorName} to $0. Mark this debt Paid Off?`) : false;
    const debtPaymentId = uid('debt-payment');
    setData(current => ({
      ...current,
      personalDebts: current.personalDebts.map(item => item.debtId === debt.debtId ? { ...item, currentBalance: nextBalance, status: markPaidOff ? 'Paid Off' : item.status, pastDueAmount: Math.min(number(item.pastDueAmount), nextBalance), updatedAt: new Date().toISOString() } : item),
      debtPayments: [{ ...payment, id: debtPaymentId, debtPaymentId, amount, createdAt: new Date().toISOString(), archived: false }, ...current.debtPayments],
    }));
    setPayment({ debtId: '', amount: '', paymentDate: today(), paymentMethod: 'Not specified', notes: '' });
    setMessage(markPaidOff ? 'Payment saved and debt marked Paid Off.' : 'Payment saved. The balance and summary were updated.');
  };

  const patch = (debtId, changes) => {
    if (changes.status === 'Paid Off') {
      const debt = data.personalDebts.find(item => item.debtId === debtId);
      if (!confirm(`Mark ${debt.creditorName} Paid Off${number(debt?.currentBalance) > 0 ? ` with a remaining balance of ${money(debt.currentBalance)}` : ''}?`)) return;
    }
    setData(current => ({ ...current, personalDebts: current.personalDebts.map(item => item.debtId === debtId ? { ...item, ...changes, archived: changes.status === 'Archived' ? true : changes.archived ?? item.archived, updatedAt: new Date().toISOString() } : item) }));
  };
  const remove = debtId => {
    if (pendingDeleteId !== debtId) { setPendingDeleteId(debtId); return; }
    setData(current => ({
      ...current,
      personalDebts: current.personalDebts.filter(item => item.debtId !== debtId),
      debtPayments: current.debtPayments.filter(item => item.debtId !== debtId),
    }));
    setPendingDeleteId('');
  };

  return <div className="summary-workspace">
    <div className="finance-summary-grid expanded-summary">
      <SummaryCard label="Total current debt" value={money(summary.current)} note={`${summary.activeCount} active debts`} accent="rose" />
      <SummaryCard label="Original total debt" value={money(summary.original)} note="Across active records" />
      <SummaryCard label="Total paid" value={money(summary.paid)} note="Original minus remaining" accent="olive" />
      <SummaryCard label="Remaining balance" value={money(summary.current)} note="Never below zero" accent="gold" />
      <SummaryCard label="Monthly required" value={money(summary.monthlyPayments)} note="Minimum payments" />
      <SummaryCard label="Past-due amount" value={money(summary.pastDue)} note={`${summary.pastDueCount} past-due debts`} accent="rose" />
      <SummaryCard label="Next payment due" value={dateLabel(summary.nextDue)} note="Earliest active due date" />
      <SummaryCard label="Active debts" value={summary.activeCount} note={`${summary.pastDueCount} need past-due attention`} />
    </div>
    <section className="panel glass summary-progress-card"><div><span className="district-eyebrow">Debt payoff progress</span><h3>A steady path toward zero</h3></div><Progress value={summary.progress} label="Overall payoff" /></section>
    <div className="district-two-column finance-entry-grid">
      <form className="panel glass district-form" onSubmit={add}><span className="district-eyebrow">Debt record</span><h3>Add a debt</h3>
        <label>Creditor name<input required value={form.creditorName} onChange={event => setForm({ ...form, creditorName: event.target.value })} /></label>
        <label>Account nickname<input value={form.accountNickname} onChange={event => setForm({ ...form, accountNickname: event.target.value })} /></label>
        <div className="split-fields"><label>Original balance<input type="number" min="0" step="0.01" value={form.originalBalance} onChange={event => setForm({ ...form, originalBalance: event.target.value })} /></label><label>Current balance<input type="number" min="0" step="0.01" value={form.currentBalance} onChange={event => setForm({ ...form, currentBalance: event.target.value })} /></label></div>
        <div className="split-fields"><label>Minimum payment<input type="number" min="0" step="0.01" value={form.minimumPayment} onChange={event => setForm({ ...form, minimumPayment: event.target.value })} /></label><label>Interest rate %<input type="number" min="0" step="0.01" value={form.interestRate} onChange={event => setForm({ ...form, interestRate: event.target.value })} /></label></div>
        <label>Due date<input name="debtDueDate" type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label>
        <div className="split-fields"><label>Payment frequency<select value={form.paymentFrequency} onChange={event => setForm({ ...form, paymentFrequency: event.target.value })}>{PAYMENT_FREQUENCIES.map(item => <option key={item}>{item}</option>)}</select></label><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{DEBT_STATUSES.filter(item => item !== 'Archived').map(item => <option key={item}>{item}</option>)}</select></label></div>
        <label>Past-due amount<input type="number" min="0" step="0.01" value={form.pastDueAmount} onChange={event => setForm({ ...form, pastDueAmount: event.target.value })} /></label>
        <label>Notes<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
        <button className="primary">Save debt</button>
      </form>
      <form className="panel glass district-form" onSubmit={addPayment}><span className="district-eyebrow">Payment history</span><h3>Add a payment</h3>
        <label>Debt<select required value={payment.debtId} onChange={event => setPayment({ ...payment, debtId: event.target.value })}><option value="">Choose active debt</option>{data.personalDebts.filter(item => !item.archived && item.status !== 'Paid Off').map(item => <option key={item.debtId} value={item.debtId}>{item.creditorName} · {money(item.currentBalance)}</option>)}</select></label>
        <label>Payment amount<input required type="number" min="0.01" step="0.01" value={payment.amount} onChange={event => setPayment({ ...payment, amount: event.target.value })} /></label>
        <label>Payment date<input type="date" value={payment.paymentDate} onChange={event => setPayment({ ...payment, paymentDate: event.target.value })} /></label>
        <label>Payment method<select value={payment.paymentMethod} onChange={event => setPayment({ ...payment, paymentMethod: event.target.value })}>{PAYMENT_METHODS.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Notes<textarea value={payment.notes} onChange={event => setPayment({ ...payment, notes: event.target.value })} /></label>
        <button className="primary">Record payment</button>{message && <p className="summary-message" role="status">{message}</p>}
      </form>
    </div>
    <section className="panel glass"><div className="district-list-toolbar"><div><span className="district-eyebrow">Debt portfolio</span><h3>{showArchived ? 'Archived debts' : 'Active debts'}</h3></div><button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : 'View archived'}</button></div>
      <div className="summary-card-list">{visible.map(debt => {
        const payments = data.debtPayments.filter(item => item.debtId === debt.debtId && !item.archived);
        const progress = number(debt.originalBalance) ? (number(debt.originalBalance) - number(debt.currentBalance)) / number(debt.originalBalance) * 100 : 0;
        return <article className={`glass summary-record-card${debt.status === 'Past Due' ? ' overdue' : ''}`} key={debt.debtId}><div className="summary-record-head"><div><span>{debt.status} · {debt.paymentFrequency}</span><h4>{debt.creditorName}</h4><p>{debt.accountNickname || 'Account nickname not added'}</p></div><strong>{money(debt.currentBalance)}</strong></div><Progress value={progress} label="Paid" /><dl><div><dt>Original</dt><dd>{money(debt.originalBalance)}</dd></div><div><dt>Minimum</dt><dd>{money(debt.minimumPayment)}</dd></div><div><dt>Due</dt><dd>{dateLabel(debt.dueDate)}</dd></div><div><dt>Past due</dt><dd>{money(debt.pastDueAmount)}</dd></div></dl>{debt.notes && <p>{debt.notes}</p>}<details><summary>{payments.length} recorded payments</summary>{payments.map(item => <div className="history-row" key={item.debtPaymentId}><span>{dateLabel(item.paymentDate)}</span><strong>{money(item.amount)}</strong><small>{item.paymentMethod} · {item.notes || 'No note'}</small></div>)}</details><div className="summary-record-actions">{debt.archived ? <><button onClick={() => { setPendingDeleteId(''); patch(debt.debtId, { archived: false, status: debt.currentBalance === 0 ? 'Paid Off' : 'Current' }); }}>Restore</button><button className="danger" onClick={() => remove(debt.debtId)}>{pendingDeleteId === debt.debtId ? 'Confirm permanent delete' : 'Delete archived debt'}</button></> : <><label>Status<select value={debt.status} onChange={event => patch(debt.debtId, { status: event.target.value })}>{DEBT_STATUSES.filter(item => item !== 'Archived').map(item => <option key={item}>{item}</option>)}</select></label><button onClick={() => patch(debt.debtId, { archived: true, status: 'Archived' })}>Archive</button></>}</div></article>;
      })}{!visible.length && <Empty title={showArchived ? 'No archived debts' : 'No debts saved'} text="Debt records appear as calm, progress-focused cards." />}</div>
    </section>
  </div>;
}

function SavingsWorkspace({ data, setData }) {
  const blank = { name: '', goalType: 'Emergency Fund', targetAmount: '', currentAmount: '', targetDate: '', contributionAmount: '', contributionFrequency: 'Monthly', priority: 'Medium', notes: '', status: 'Not Started' };
  const [form, setForm] = useState(blank);
  const [transaction, setTransaction] = useState({ savingsGoalId: '', type: 'Deposit', amount: '', date: today(), notes: '' });
  const [showArchived, setShowArchived] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingWithdrawal, setPendingWithdrawal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const summary = savingsSummary(data.personalSavingsGoals, data.savingsTransactions);
  const visible = data.personalSavingsGoals.filter(item => showArchived ? item.archived : !item.archived);

  const add = event => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const savingsGoalId = uid('savings-goal');
    const currentAmount = Math.max(0, number(form.currentAmount));
    const targetDate = event.currentTarget.elements.savingsTargetDate?.value || form.targetDate;
    setData(current => ({ ...current, personalSavingsGoals: [{ ...form, targetDate, id: savingsGoalId, savingsGoalId, name: form.name.trim(), targetAmount: Math.max(0, number(form.targetAmount)), currentAmount, contributionAmount: Math.max(0, number(form.contributionAmount)), status: form.status === 'Not Started' && currentAmount > 0 ? 'In Progress' : form.status, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...current.personalSavingsGoals] }));
    setForm(blank);
  };
  const applyTransaction = event => {
    event.preventDefault();
    const goal = data.personalSavingsGoals.find(item => item.savingsGoalId === transaction.savingsGoalId);
    const amount = number(transaction.amount);
    if (!goal || amount <= 0) return;
    if (transaction.type === 'Withdrawal') {
      if (amount > number(goal.currentAmount)) { setMessage(`Withdrawal cannot exceed ${money(goal.currentAmount)}.`); return; }
      if (!pendingWithdrawal) {
        setPendingWithdrawal(true);
        setMessage(`Confirm the ${money(amount)} withdrawal from ${goal.name}.`);
        return;
      }
    }
    const nextAmount = transaction.type === 'Withdrawal' ? number(goal.currentAmount) - amount : number(goal.currentAmount) + amount;
    const savingsTransactionId = uid('savings-transaction');
    setData(current => ({
      ...current,
      personalSavingsGoals: current.personalSavingsGoals.map(item => item.savingsGoalId === goal.savingsGoalId ? { ...item, currentAmount: Math.max(0, nextAmount), status: item.status === 'Not Started' && nextAmount > 0 ? 'In Progress' : item.status, updatedAt: new Date().toISOString() } : item),
      savingsTransactions: [{ ...transaction, id: savingsTransactionId, savingsTransactionId, amount, createdAt: new Date().toISOString(), archived: false }, ...current.savingsTransactions],
    }));
    setTransaction({ savingsGoalId: '', type: 'Deposit', amount: '', date: today(), notes: '' });
    setPendingWithdrawal(false);
    setMessage(`${transaction.type} saved. The goal balance and summary were updated.`);
  };
  const patch = (savingsGoalId, changes) => setData(current => ({ ...current, personalSavingsGoals: current.personalSavingsGoals.map(item => item.savingsGoalId === savingsGoalId ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item) }));
  const updateTransaction = changes => { setTransaction(current => ({ ...current, ...changes })); setPendingWithdrawal(false); };
  const remove = savingsGoalId => {
    if (pendingDeleteId !== savingsGoalId) { setPendingDeleteId(savingsGoalId); return; }
    setData(current => ({
      ...current,
      personalSavingsGoals: current.personalSavingsGoals.filter(item => item.savingsGoalId !== savingsGoalId),
      savingsTransactions: current.savingsTransactions.filter(item => item.savingsGoalId !== savingsGoalId),
    }));
    setPendingDeleteId('');
  };

  return <div className="summary-workspace">
    <div className="finance-summary-grid expanded-summary"><SummaryCard label="Total savings" value={money(summary.total)} note="Personal goals only" accent="olive" /><SummaryCard label="Emergency fund" value={money(summary.emergency)} note="Emergency Fund goals" accent="gold" /><SummaryCard label="Savings goals" value={summary.goalCount} note="Active goal records" /><SummaryCard label="Amount remaining" value={money(summary.remaining)} note="Across target amounts" /><SummaryCard label="Monthly contributions" value={money(summary.monthlyContributions)} note={currentMonth()} accent="olive" /><SummaryCard label="Goals completed" value={summary.completed} note="Confirmed status" /><SummaryCard label="Goals in progress" value={summary.inProgress} note="Currently growing" /></div>
    <div className="district-two-column finance-entry-grid">
      <form className="panel glass district-form" onSubmit={add}><span className="district-eyebrow">Personal savings</span><h3>Add a savings goal</h3>
        <label>Goal name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label>Goal type<select value={form.goalType} onChange={event => setForm({ ...form, goalType: event.target.value })}>{SAVINGS_GOAL_TYPES.map(item => <option key={item}>{item}</option>)}</select></label>
        <div className="split-fields"><label>Target amount<input type="number" min="0" step="0.01" value={form.targetAmount} onChange={event => setForm({ ...form, targetAmount: event.target.value })} /></label><label>Current amount<input type="number" min="0" step="0.01" value={form.currentAmount} onChange={event => setForm({ ...form, currentAmount: event.target.value })} /></label></div>
        <label>Target date<input name="savingsTargetDate" type="date" value={form.targetDate} onChange={event => setForm({ ...form, targetDate: event.target.value })} /></label>
        <div className="split-fields"><label>Contribution amount<input type="number" min="0" step="0.01" value={form.contributionAmount} onChange={event => setForm({ ...form, contributionAmount: event.target.value })} /></label><label>Frequency<select value={form.contributionFrequency} onChange={event => setForm({ ...form, contributionFrequency: event.target.value })}>{PAYMENT_FREQUENCIES.map(item => <option key={item}>{item}</option>)}</select></label></div>
        <div className="split-fields"><label>Priority<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}>{SAVINGS_PRIORITIES.map(item => <option key={item}>{item}</option>)}</select></label><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{SAVINGS_STATUSES.filter(item => item !== 'Archived').map(item => <option key={item}>{item}</option>)}</select></label></div>
        <label>Notes<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label><button className="primary">Save savings goal</button>
      </form>
      <form className="panel glass district-form" onSubmit={applyTransaction}><span className="district-eyebrow">Balance activity</span><h3>Deposit or withdraw</h3>
        <label>Goal<select required value={transaction.savingsGoalId} onChange={event => updateTransaction({ savingsGoalId: event.target.value })}><option value="">Choose a savings goal</option>{data.personalSavingsGoals.filter(item => !item.archived).map(item => <option key={item.savingsGoalId} value={item.savingsGoalId}>{item.name} · {money(item.currentAmount)}</option>)}</select></label>
        <label>Activity<select value={transaction.type} onChange={event => updateTransaction({ type: event.target.value })}><option>Deposit</option><option>Withdrawal</option></select></label>
        <label>Amount<input required type="number" min="0.01" step="0.01" value={transaction.amount} onChange={event => updateTransaction({ amount: event.target.value })} /></label><label>Date<input type="date" value={transaction.date} onChange={event => updateTransaction({ date: event.target.value })} /></label>
        <label>Notes<textarea value={transaction.notes} onChange={event => updateTransaction({ notes: event.target.value })} /></label><button className="primary">{transaction.type === 'Withdrawal' && pendingWithdrawal ? 'Confirm withdrawal' : `Save ${transaction.type.toLowerCase()}`}</button>{message && <p className="summary-message" role="status">{message}</p>}
      </form>
    </div>
    <section className="panel glass"><div className="district-list-toolbar"><div><span className="district-eyebrow">Savings garden</span><h3>{showArchived ? 'Archived goals' : 'Personal savings goals'}</h3></div><button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : 'View archived'}</button></div><div className="summary-card-list">{visible.map(goal => {
      const history = data.savingsTransactions.filter(item => item.savingsGoalId === goal.savingsGoalId && !item.archived);
      const progress = number(goal.targetAmount) ? number(goal.currentAmount) / number(goal.targetAmount) * 100 : 0;
      return <article className="glass summary-record-card" key={goal.savingsGoalId}><div className="summary-record-head"><div><span>{goal.goalType} · {goal.priority} priority</span><h4>{goal.name}</h4><p>{goal.status} · target {dateLabel(goal.targetDate)}</p></div><strong>{money(goal.currentAmount)}</strong></div><Progress value={progress} label={`${money(goal.currentAmount)} of ${money(goal.targetAmount)}`} /><p>{goal.notes || 'No notes added.'}</p><details><summary>{history.length} deposits and withdrawals</summary>{history.map(item => <div className="history-row" key={item.savingsTransactionId}><span>{dateLabel(item.date)} · {item.type}</span><strong>{item.type === 'Withdrawal' ? '−' : '+'}{money(item.amount)}</strong><small>{item.notes || 'No note'}</small></div>)}</details><div className="summary-record-actions">{goal.archived ? <><button onClick={() => { setPendingDeleteId(''); patch(goal.savingsGoalId, { archived: false, status: goal.currentAmount > 0 ? 'In Progress' : 'Not Started' }); }}>Restore</button><button className="danger" onClick={() => remove(goal.savingsGoalId)}>{pendingDeleteId === goal.savingsGoalId ? 'Confirm permanent delete' : 'Delete archived goal'}</button></> : <><label>Status<select value={goal.status} onChange={event => patch(goal.savingsGoalId, { status: event.target.value })}>{SAVINGS_STATUSES.filter(item => item !== 'Archived').map(item => <option key={item}>{item}</option>)}</select></label><button onClick={() => patch(goal.savingsGoalId, { archived: true, status: 'Archived' })}>Archive</button></>}</div></article>;
    })}{!visible.length && <Empty title={showArchived ? 'No archived goals' : 'No savings goals'} text="Emergency funds and personal goals remain separate from Tierra Fleur business finances." />}</div></section>
  </div>;
}

function BillsWorkspace({ data, setData }) {
  const blank = { name: '', category: 'Rent', expectedAmount: '', dueDate: today(), recurring: true, frequency: 'Monthly', autopay: false, notes: '' };
  const [form, setForm] = useState(blank);
  const [month, setMonth] = useState(currentMonth());
  const [showArchived, setShowArchived] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const summary = billSummary(data.personalBills, data.billOccurrences, month);
  const bills = data.personalBills.filter(item => showArchived ? item.archived : !item.archived);
  const occurrences = data.billOccurrences.filter(item => !item.archived && item.month === month);

  useEffect(() => {
    const existing = new Set(data.billOccurrences.map(item => item.billOccurrenceId));
    const missing = data.personalBills.filter(item => !item.archived && item.recurring && item.frequency === 'Monthly' && monthForDate(item.dueDate) <= month && !existing.has(occurrenceId(item.billId, month))).map(item => createBillOccurrence(item, month));
    if (missing.length) setData(current => ({ ...current, billOccurrences: [...missing, ...current.billOccurrences] }));
  }, [data.personalBills, data.billOccurrences, month, setData]);

  const add = event => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const billId = uid('bill');
    const dueDate = event.currentTarget.elements.billDueDate?.value || form.dueDate;
    const bill = { ...form, dueDate, id: billId, billId, name: form.name.trim(), expectedAmount: Math.max(0, number(form.expectedAmount)), archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const occurrence = createBillOccurrence(bill, monthForDate(dueDate));
    setData(current => ({ ...current, personalBills: [bill, ...current.personalBills], billOccurrences: [occurrence, ...current.billOccurrences] }));
    setForm(blank);
  };
  const patchBill = (billId, changes) => setData(current => ({ ...current, personalBills: current.personalBills.map(item => item.billId === billId ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item) }));
  const patchOccurrence = (billOccurrenceId, changes) => setData(current => ({ ...current, billOccurrences: current.billOccurrences.map(item => item.billOccurrenceId === billOccurrenceId ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item) }));
  const markPaid = occurrence => patchOccurrence(occurrence.billOccurrenceId, { status: 'Paid', actualAmount: occurrence.actualAmount === '' ? occurrence.expectedAmount : Math.max(0, number(occurrence.actualAmount)), paymentDate: occurrence.paymentDate || today() });
  const remove = billId => {
    if (pendingDeleteId !== billId) { setPendingDeleteId(billId); return; }
    setData(current => ({
      ...current,
      personalBills: current.personalBills.filter(item => item.billId !== billId),
      billOccurrences: current.billOccurrences.filter(item => item.billId !== billId),
    }));
    setPendingDeleteId('');
  };

  return <div className="summary-workspace">
    <div className="finance-summary-grid expanded-summary"><SummaryCard label="Bills due this month" value={money(summary.due)} note={month} /><SummaryCard label="Paid this month" value={money(summary.paid)} note="Actual amounts" accent="olive" /><SummaryCard label="Remaining unpaid" value={money(summary.remaining)} note="Expected amounts" accent="gold" /><SummaryCard label="Past-due total" value={money(summary.pastDue)} note="Unpaid and overdue" accent="rose" /><SummaryCard label="Due in seven days" value={money(summary.nextSevenDays)} note="Upcoming window" /><SummaryCard label="Recurring bills" value={summary.recurringCount} note="Active templates" /><SummaryCard label="Estimated monthly" value={money(summary.estimatedMonthly)} note="Frequency-adjusted obligations" /></div>
    <div className="district-two-column finance-entry-grid"><form className="panel glass district-form" onSubmit={add}><span className="district-eyebrow">Monthly obligations</span><h3>Add a bill</h3>
      <label>Bill name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{BILL_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label><label>Expected amount<input required type="number" min="0" step="0.01" value={form.expectedAmount} onChange={event => setForm({ ...form, expectedAmount: event.target.value })} /></label>
      <label>Due date<input name="billDueDate" type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label><label className="check-line"><input type="checkbox" checked={form.recurring} onChange={event => setForm({ ...form, recurring: event.target.checked })} /> Recurring bill</label><label>Frequency<select value={form.frequency} onChange={event => setForm({ ...form, frequency: event.target.value })}>{BILL_FREQUENCIES.map(item => <option key={item}>{item}</option>)}</select></label><label className="check-line"><input type="checkbox" checked={form.autopay} onChange={event => setForm({ ...form, autopay: event.target.checked })} /> Autopay</label><label>Notes<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label><button className="primary">Save bill</button>
    </form><section className="panel glass"><div className="district-panel-title"><div><span className="district-eyebrow">Occurrence calendar</span><h3>Payment history by month</h3></div><label>Month<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label></div><p>Recurring monthly occurrences use stable bill-and-month IDs, so refreshes never create duplicates or overwrite prior payments.</p><div className="bill-occurrence-list">{occurrences.map(item => {
      const bill = data.personalBills.find(record => record.billId === item.billId);
      if (!bill) return null;
      const overdue = item.status !== 'Paid' && item.dueDate < today();
      return <article className={overdue ? 'overdue' : ''} key={item.billOccurrenceId}><div><span>{bill.category} · {item.status}{overdue ? ' · Overdue' : ''}</span><h4>{bill.name}</h4><p>Due {dateLabel(item.dueDate)}{bill.autopay ? ' · Autopay' : ''}</p></div><label>Expected<input type="number" readOnly value={item.expectedAmount} /></label><label>Actual<input type="number" min="0" step="0.01" value={item.actualAmount} onChange={event => patchOccurrence(item.billOccurrenceId, { actualAmount: event.target.value })} /></label><label>Payment date<input type="date" value={item.paymentDate} onChange={event => patchOccurrence(item.billOccurrenceId, { paymentDate: event.target.value })} /></label><label>Method<select value={item.paymentMethod} onChange={event => patchOccurrence(item.billOccurrenceId, { paymentMethod: event.target.value })}>{PAYMENT_METHODS.map(option => <option key={option}>{option}</option>)}</select></label><label className="bill-note">Occurrence notes<input value={item.notes} onChange={event => patchOccurrence(item.billOccurrenceId, { notes: event.target.value })} /></label>{item.status === 'Paid' ? <button onClick={() => patchOccurrence(item.billOccurrenceId, { status: 'Unpaid', paymentDate: '' })}>Mark unpaid</button> : <button className="primary" onClick={() => markPaid(item)}>Mark paid</button>}</article>;
    })}{!occurrences.length && <Empty title="No bills in this month" text="Add a bill or choose a month with saved occurrences." />}</div></section></div>
    <section className="panel glass"><div className="district-list-toolbar"><div><span className="district-eyebrow">Bill library</span><h3>{showArchived ? 'Archived bills' : 'Active bill templates'}</h3></div><button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : 'View archived'}</button></div><div className="summary-card-list compact">{bills.map(bill => <article className="glass summary-record-card" key={bill.billId}><div className="summary-record-head"><div><span>{bill.category} · {bill.recurring ? bill.frequency : 'One time'}</span><h4>{bill.name}</h4><p>{bill.autopay ? 'Autopay' : 'Manual payment'} · due day {String(bill.dueDate).slice(8, 10)}</p></div><strong>{money(bill.expectedAmount)}</strong></div><p>{bill.notes || 'No notes added.'}</p><div className="summary-record-actions">{bill.archived ? <><button onClick={() => { setPendingDeleteId(''); patchBill(bill.billId, { archived: false }); }}>Restore</button><button className="danger" onClick={() => remove(bill.billId)}>{pendingDeleteId === bill.billId ? 'Confirm permanent delete' : 'Delete archived bill'}</button></> : <button onClick={() => patchBill(bill.billId, { archived: true })}>Archive</button>}</div></article>)}{!bills.length && <Empty title={showArchived ? 'No archived bills' : 'No bills saved'} text="Bill templates create durable monthly occurrences without changing prior months." />}</div></section>
  </div>;
}

function MonthlyPlan({ data, setData }) {
  const [month, setMonth] = useState(currentMonth());
  const transactions = data.personalTransactions.filter(item => !item.archived && String(item.date || item.dueDate).slice(0, 7) === month);
  const income = transactions.filter(item => item.type === 'Income' && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
  const expenses = transactions.filter(item => item.type === 'Expense' && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
  const savings = transactions.filter(item => item.type === 'Savings' && item.status !== 'Unpaid').reduce((sum, item) => sum + number(item.amount), 0);
  const budget = number(data.personalBudget.monthly);
  return <div className="summary-workspace"><div className="finance-summary-grid"><SummaryCard label="Monthly income" value={money(income)} note={month} accent="olive" /><SummaryCard label="Monthly expenses" value={money(expenses)} note="Paid ledger entries" accent="rose" /><SummaryCard label="Remaining balance" value={money(income - expenses - savings)} note="After expenses and savings" accent="gold" /><SummaryCard label="Monthly savings" value={money(savings)} note="Legacy ledger contributions" /></div><section className="panel glass monthly-plan-card"><div><span className="district-eyebrow">Private monthly plan</span><h3>Budget and remaining balance</h3><label>Month<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label><label>Monthly spending budget<input type="number" min="0" step="0.01" value={data.personalBudget.monthly} onChange={event => setData(current => ({ ...current, personalBudget: { ...current.personalBudget, monthly: event.target.value } }))} /></label></div><Progress value={budget ? expenses / budget * 100 : 0} label={`${money(expenses)} of ${money(budget)}`} /></section></div>;
}

function Transactions({ data, setData }) {
  const blank = { type: 'Expense', category: 'Rent', source: '', amount: '', date: today(), dueDate: '', recurring: false, status: 'Unpaid', paymentMethod: 'Not specified', debtId: '', savingsGoalId: '', notes: '', archived: false };
  const [form, setForm] = useState(blank);
  const [showArchived, setShowArchived] = useState(false);
  const categoryOptions = form.type === 'Income' ? ['Job Income', 'Other Income'] : form.type === 'Savings' ? ['Savings'] : BILL_CATEGORIES;
  const visible = data.personalTransactions.filter(item => showArchived ? item.archived : !item.archived);
  const add = event => { event.preventDefault(); if (!form.amount) return; const transactionId = uid('txn-personal'); setData(current => ({ ...current, personalTransactions: [{ ...form, id: transactionId, transactionId }, ...current.personalTransactions] })); setForm(blank); };
  return <div className="district-two-column finance-entry-grid"><form className="panel glass district-form" onSubmit={add}><span className="district-eyebrow">Manual personal entry</span><h3>Add income, expense, or savings</h3><div className="split-fields"><label>Entry type<select value={form.type} onChange={event => { const type = event.target.value; setForm({ ...form, type, category: type === 'Income' ? 'Job Income' : type === 'Savings' ? 'Savings' : 'Rent', status: type === 'Expense' ? 'Unpaid' : 'Paid' }); }}>{['Income', 'Expense', 'Savings'].map(item => <option key={item}>{item}</option>)}</select></label><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categoryOptions.map(item => <option key={item}>{item}</option>)}</select></label></div><label>Source or biller<input value={form.source} onChange={event => setForm({ ...form, source: event.target.value })} /></label><label>Amount<input required type="number" min="0" step="0.01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label><div className="split-fields"><label>Entry date<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Due date<input type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label></div><div className="split-fields"><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option>Paid</option><option>Unpaid</option></select></label><label>Payment method<select value={form.paymentMethod} onChange={event => setForm({ ...form, paymentMethod: event.target.value })}>{PAYMENT_METHODS.map(item => <option key={item}>{item}</option>)}</select></label></div><label>Notes<textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label><button className="primary">Save personal entry</button></form><section className="panel glass"><div className="district-list-toolbar"><div><span className="district-eyebrow">Personal ledger</span><h3>{showArchived ? 'Archived entries' : 'Existing transactions'}</h3></div><button onClick={() => setShowArchived(value => !value)}>{showArchived ? 'View active' : 'View archived'}</button></div><div className="district-record-list">{visible.map(item => <article key={item.transactionId}><div><span>{item.type} · {item.status}</span><h4>{item.source || item.category}</h4><p>{dateLabel(item.date || item.dueDate)} · {item.paymentMethod}</p><small>{item.notes}</small></div><strong>{money(item.amount)}</strong><button onClick={() => setData(current => ({ ...current, personalTransactions: current.personalTransactions.map(record => record.transactionId === item.transactionId ? { ...record, archived: !record.archived } : record) }))}>{item.archived ? 'Restore' : 'Archive'}</button></article>)}{!visible.length && <Empty title="No personal entries" text="Existing manual transaction records remain available here." />}</div></section></div>;
}

export function PersonalFinanceWorkspace({ data, setData }) {
  const [section, setSection] = useState('Monthly Plan');
  const sections = ['Monthly Plan', 'Transactions', 'Debt Summary', 'Savings Summary', 'Monthly Bills'];
  return <div className="finance-destination personal-finance-workspace"><div className="finance-view-tabs">{sections.map(item => <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{item}</button>)}</div>{section === 'Monthly Plan' && <MonthlyPlan data={data} setData={setData} />}{section === 'Transactions' && <Transactions data={data} setData={setData} />}{section === 'Debt Summary' && <DebtWorkspace data={data} setData={setData} />}{section === 'Savings Summary' && <SavingsWorkspace data={data} setData={setData} />}{section === 'Monthly Bills' && <BillsWorkspace data={data} setData={setData} />}</div>;
}
