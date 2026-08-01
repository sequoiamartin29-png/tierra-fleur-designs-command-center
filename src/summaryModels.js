const records = value => Array.isArray(value) ? value : [];
const number = value => Number(value || 0);
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const today = () => new Date().toISOString().slice(0, 10);

export const DEBT_STATUSES = ['Current', 'Past Due', 'Payment Arrangement', 'Paid Off', 'On Hold', 'Archived'];
export const PAYMENT_FREQUENCIES = ['Monthly', 'Twice monthly', 'Every two weeks', 'Weekly', 'Quarterly', 'Other'];
export const SAVINGS_GOAL_TYPES = ['Emergency Fund', 'Business Reserve', 'Vacation', 'Home', 'Vehicle', 'Education', 'Equipment', 'Debt Payoff', 'Other'];
export const SAVINGS_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Paused', 'Archived'];
export const SAVINGS_PRIORITIES = ['High', 'Medium', 'Low'];
export const BILL_CATEGORIES = ['Rent', 'Electric', 'Water', 'Internet', 'Phone', 'Car Insurance', 'Laptop Payment', 'Groceries', 'Fuel', 'Household', 'Subscription', 'Debt Payment', 'Other'];
export const BILL_FREQUENCIES = ['Monthly', 'Weekly', 'Every two weeks', 'Quarterly', 'Yearly', 'One time'];
export const LESSON_TOPICS = ['Horticulture', 'Edible Landscape Design', 'Fruit Trees', 'Herbs and Tea', 'Plant Care', 'Landscape Design', 'Client Consultations', 'Pricing', 'Finance', 'Plant Sourcing', 'Project Management', 'Marketing', 'Business Operations', 'Other'];
export const LESSON_LEVELS = ['Foundation', 'Growing', 'Advanced'];

export function createFeaturePackStarter() {
  return {
    featurePackSchemaVersion: 1,
    independentDesigns: [],
    debtPayments: [],
    savingsTransactions: [],
    personalBills: [],
    billOccurrences: [],
  };
}

function normalizeIndependentDesign(item = {}) {
  const independentDesignId = item.independentDesignId || item.id || uid('independent-design');
  return {
    ...item,
    id: item.id || independentDesignId,
    independentDesignId,
    designId: item.designId || item.conceptId || '',
    name: item.name || 'Untitled independent design',
    clientId: item.clientId || '',
    projectId: item.projectId || '',
    linkedAt: item.linkedAt || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    archived: Boolean(item.archived),
  };
}

function normalizeDebts(saved = {}, personalTransactions = []) {
  return records(saved.personalDebts).map(item => {
    const debtId = item.debtId || item.id || uid('debt');
    const legacyPayments = !item.debtId && item.currentBalance == null
      ? personalTransactions.filter(transaction => transaction.debtId === (item.id || debtId) && transaction.status !== 'Unpaid' && !transaction.archived).reduce((sum, transaction) => sum + number(transaction.amount), 0)
      : 0;
    const originalBalance = Math.max(0, number(item.originalBalance ?? item.balance));
    const currentBalance = Math.max(0, number(item.currentBalance ?? item.balance) - legacyPayments);
    return {
      ...item,
      id: item.id || debtId,
      debtId,
      creditorName: item.creditorName || item.name || 'Unnamed creditor',
      accountNickname: item.accountNickname || item.nickname || '',
      originalBalance: originalBalance || currentBalance,
      currentBalance,
      minimumPayment: Math.max(0, number(item.minimumPayment)),
      interestRate: item.interestRate ?? item.apr ?? '',
      dueDate: item.dueDate || '',
      paymentFrequency: item.paymentFrequency || 'Monthly',
      status: DEBT_STATUSES.includes(item.status) ? item.status : item.archived ? 'Archived' : currentBalance === 0 && originalBalance > 0 ? 'Current' : 'Current',
      pastDueAmount: Math.max(0, number(item.pastDueAmount)),
      notes: item.notes || '',
      archived: Boolean(item.archived || item.status === 'Archived'),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    };
  });
}

function normalizeSavingsGoals(saved = {}, personalTransactions = []) {
  return records(saved.personalSavingsGoals).map(item => {
    const savingsGoalId = item.savingsGoalId || item.id || uid('savings-goal');
    const legacyContributions = !item.savingsGoalId && item.currentAmount == null
      ? personalTransactions.filter(transaction => transaction.savingsGoalId === (item.id || savingsGoalId) && transaction.status !== 'Unpaid' && !transaction.archived).reduce((sum, transaction) => sum + number(transaction.amount), 0)
      : 0;
    const currentAmount = Math.max(0, number(item.currentAmount ?? item.current) + legacyContributions);
    const targetAmount = Math.max(0, number(item.targetAmount ?? item.target));
    return {
      ...item,
      id: item.id || savingsGoalId,
      savingsGoalId,
      name: item.name || 'Untitled savings goal',
      goalType: item.goalType || (item.kind === 'Emergency Fund' ? 'Emergency Fund' : 'Other'),
      targetAmount,
      currentAmount,
      targetDate: item.targetDate || '',
      contributionAmount: Math.max(0, number(item.contributionAmount)),
      contributionFrequency: item.contributionFrequency || 'Monthly',
      priority: SAVINGS_PRIORITIES.includes(item.priority) ? item.priority : 'Medium',
      notes: item.notes || '',
      status: SAVINGS_STATUSES.includes(item.status) ? item.status : currentAmount > 0 ? 'In Progress' : 'Not Started',
      archived: Boolean(item.archived || item.status === 'Archived'),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    };
  });
}

function normalizeBill(item = {}) {
  const billId = item.billId || item.id || uid('bill');
  return {
    ...item,
    id: item.id || billId,
    billId,
    name: item.name || 'Untitled bill',
    category: BILL_CATEGORIES.includes(item.category) ? item.category : 'Other',
    expectedAmount: Math.max(0, number(item.expectedAmount ?? item.amount)),
    dueDate: item.dueDate || today(),
    recurring: Boolean(item.recurring),
    frequency: item.frequency || (item.recurring ? 'Monthly' : 'One time'),
    autopay: Boolean(item.autopay),
    notes: item.notes || '',
    archived: Boolean(item.archived),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

function normalizeOccurrence(item = {}) {
  const billOccurrenceId = item.billOccurrenceId || item.id || uid('bill-occurrence');
  return {
    ...item,
    id: item.id || billOccurrenceId,
    billOccurrenceId,
    billId: item.billId || '',
    month: item.month || String(item.dueDate || '').slice(0, 7),
    expectedAmount: Math.max(0, number(item.expectedAmount)),
    actualAmount: item.actualAmount === '' || item.actualAmount == null ? '' : Math.max(0, number(item.actualAmount)),
    dueDate: item.dueDate || '',
    status: item.status === 'Paid' ? 'Paid' : 'Unpaid',
    paymentDate: item.paymentDate || '',
    paymentMethod: item.paymentMethod || 'Not specified',
    notes: item.notes || '',
    archived: Boolean(item.archived),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

function normalizeLearning(learning = {}) {
  return {
    ...learning,
    history: records(learning.history),
    completed: records(learning.completed),
    preferences: { level: 'Growing', focus: 'Business + Design', ...(learning.preferences || {}) },
    myLessons: records(learning.myLessons).map(item => {
      const lessonId = item.lessonId || item.id || uid('lesson');
      return {
        ...item,
        id: item.id || lessonId,
        lessonId,
        title: item.title || 'Untitled lesson',
        topic: item.topic || item.district || 'Other',
        skillLevel: item.skillLevel || item.level || 'Growing',
        estimatedTime: item.estimatedTime || '',
        introduction: item.introduction || '',
        content: item.content || item.mainLessonContent || '',
        keyTerms: Array.isArray(item.keyTerms) ? item.keyTerms : String(item.keyTerms || '').split(',').map(value => value.trim()).filter(Boolean),
        steps: Array.isArray(item.steps) ? item.steps : String(item.steps || '').split('\n').map(value => value.trim()).filter(Boolean),
        tierraFleurExample: item.tierraFleurExample || '',
        assignment: item.assignment || item.actionAssignment || '',
        questions: Array.isArray(item.questions) ? item.questions : [],
        references: item.references || item.sourceNotes || '',
        personalNotes: item.personalNotes || '',
        favorite: Boolean(item.favorite),
        completed: Boolean(item.completed),
        archived: Boolean(item.archived),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      };
    }),
  };
}

export function migrateFeaturePackData(saved = {}, related = {}) {
  const personalTransactions = records(related.personalTransactions || saved.personalTransactions);
  return {
    featurePackSchemaVersion: 1,
    independentDesigns: records(saved.independentDesigns).map(normalizeIndependentDesign),
    personalDebts: normalizeDebts(saved, personalTransactions),
    debtPayments: records(saved.debtPayments).map(item => {
      const debtPaymentId = item.debtPaymentId || item.id || uid('debt-payment');
      return { ...item, id: item.id || debtPaymentId, debtPaymentId, debtId: item.debtId || '', amount: Math.max(0, number(item.amount)), paymentDate: item.paymentDate || today(), paymentMethod: item.paymentMethod || 'Not specified', notes: item.notes || '', createdAt: item.createdAt || new Date().toISOString(), archived: Boolean(item.archived) };
    }),
    personalSavingsGoals: normalizeSavingsGoals(saved, personalTransactions),
    savingsTransactions: records(saved.savingsTransactions).map(item => {
      const savingsTransactionId = item.savingsTransactionId || item.id || uid('savings-transaction');
      return { ...item, id: item.id || savingsTransactionId, savingsTransactionId, savingsGoalId: item.savingsGoalId || '', type: item.type === 'Withdrawal' ? 'Withdrawal' : 'Deposit', amount: Math.max(0, number(item.amount)), date: item.date || today(), notes: item.notes || '', createdAt: item.createdAt || new Date().toISOString(), archived: Boolean(item.archived) };
    }),
    personalBills: records(saved.personalBills).map(normalizeBill),
    billOccurrences: records(saved.billOccurrences).map(normalizeOccurrence),
    learning: normalizeLearning(saved.learning),
  };
}

export function monthForDate(value = today()) {
  return String(value).slice(0, 7);
}

export function occurrenceId(billId, month) {
  return `bill-occurrence-${billId}-${month}`;
}

export function dueDateForMonth(dueDate, month) {
  const day = Math.max(1, Number(String(dueDate || '').slice(8, 10)) || 1);
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function createBillOccurrence(bill, month = monthForDate()) {
  const billOccurrenceId = occurrenceId(bill.billId, month);
  return {
    id: billOccurrenceId,
    billOccurrenceId,
    billId: bill.billId,
    month,
    expectedAmount: Math.max(0, number(bill.expectedAmount)),
    actualAmount: '',
    dueDate: dueDateForMonth(bill.dueDate, month),
    status: 'Unpaid',
    paymentDate: '',
    paymentMethod: 'Not specified',
    notes: '',
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function debtSummary(debts = []) {
  const active = records(debts).filter(item => !item.archived && item.status !== 'Archived');
  const original = active.reduce((sum, item) => sum + number(item.originalBalance), 0);
  const current = active.reduce((sum, item) => sum + number(item.currentBalance), 0);
  const due = [...active].filter(item => item.status !== 'Paid Off' && item.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return {
    original,
    current,
    paid: Math.max(0, original - current),
    monthlyPayments: active.filter(item => item.status !== 'Paid Off').reduce((sum, item) => sum + number(item.minimumPayment), 0),
    pastDue: active.reduce((sum, item) => sum + number(item.pastDueAmount), 0),
    nextDue: due?.dueDate || '',
    activeCount: active.filter(item => item.status !== 'Paid Off').length,
    pastDueCount: active.filter(item => item.status === 'Past Due' || number(item.pastDueAmount) > 0).length,
    progress: original ? Math.max(0, Math.min(100, (original - current) / original * 100)) : 0,
  };
}

export function savingsSummary(goals = [], transactions = [], month = monthForDate()) {
  const active = records(goals).filter(item => !item.archived && item.status !== 'Archived');
  return {
    total: active.reduce((sum, item) => sum + number(item.currentAmount), 0),
    emergency: active.filter(item => item.goalType === 'Emergency Fund').reduce((sum, item) => sum + number(item.currentAmount), 0),
    goalCount: active.length,
    remaining: active.reduce((sum, item) => sum + Math.max(0, number(item.targetAmount) - number(item.currentAmount)), 0),
    monthlyContributions: records(transactions).filter(item => !item.archived && item.type === 'Deposit' && String(item.date).slice(0, 7) === month).reduce((sum, item) => sum + number(item.amount), 0),
    completed: active.filter(item => item.status === 'Completed').length,
    inProgress: active.filter(item => item.status === 'In Progress').length,
  };
}

export function billSummary(bills = [], occurrences = [], month = monthForDate(), referenceDate = today()) {
  const billMap = new Map(records(bills).filter(item => !item.archived).map(item => [item.billId, item]));
  const monthly = records(occurrences).filter(item => !item.archived && item.month === month && billMap.has(item.billId));
  const unpaid = monthly.filter(item => item.status !== 'Paid');
  const inSevenDays = new Date(`${referenceDate}T12:00:00`);
  inSevenDays.setDate(inSevenDays.getDate() + 7);
  const sevenDayValue = inSevenDays.toISOString().slice(0, 10);
  return {
    due: monthly.reduce((sum, item) => sum + number(item.expectedAmount), 0),
    paid: monthly.filter(item => item.status === 'Paid').reduce((sum, item) => sum + number(item.actualAmount || item.expectedAmount), 0),
    remaining: unpaid.reduce((sum, item) => sum + number(item.expectedAmount), 0),
    pastDue: unpaid.filter(item => item.dueDate && item.dueDate < referenceDate).reduce((sum, item) => sum + number(item.expectedAmount), 0),
    nextSevenDays: unpaid.filter(item => item.dueDate >= referenceDate && item.dueDate <= sevenDayValue).reduce((sum, item) => sum + number(item.expectedAmount), 0),
    recurringCount: [...billMap.values()].filter(item => item.recurring).length,
    estimatedMonthly: [...billMap.values()].reduce((sum, item) => {
      const amount = number(item.expectedAmount);
      if (!item.recurring) return sum;
      if (item.frequency === 'Weekly') return sum + amount * 52 / 12;
      if (item.frequency === 'Every two weeks') return sum + amount * 26 / 12;
      if (item.frequency === 'Quarterly') return sum + amount / 3;
      if (item.frequency === 'Yearly') return sum + amount / 12;
      return sum + amount;
    }, 0),
  };
}
