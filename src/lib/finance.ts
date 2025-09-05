export type TransactionType = 'bill' | 'paycheck' | 'internal_transfer' | 'income' | 'expense' | 'other';

export type Transaction = {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: TransactionType;
  recurring: boolean;
  schedule: RecurringSchedule | null;
};

// Legacy types for backward compatibility
export type Bill = Transaction & { type: 'bill' };
export type Paycheck = Transaction & { type: 'paycheck' };

export type ScheduleConfig = {
  monthsToProject: number; // e.g., 12
  payPeriodDays: number; // e.g., 14
  averagePaycheckAmount?: number; // used for future periods when explicit checks missing
  safetyCushionDays?: number; // days of expenses to keep as safety buffer
};

export type RecurringSchedule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
};

export const defaultScheduleConfig: ScheduleConfig = {
  monthsToProject: 12,
  payPeriodDays: 14,
  averagePaycheckAmount: 2000,
  safetyCushionDays: 3,
};

export type DailyProjection = {
  date: string; // ISO date string (YYYY-MM-DD)
  startingBalance: number;
  transactions: Transaction[]; // Actual transactions occurring on this date
  totalIncome: number; // Sum of income for this day
  totalExpenses: number; // Sum of expenses for this day
  endingBalance: number; // Balance at end of day
  safeToSpend: number; // How much you can safely spend
  safeToSave: number; // How much you can safely save
  daysUntilNextIncome: number; // Days until next expected income
  isHistorical: boolean; // true for past dates, false for future
};

// Keep the old type for backward compatibility during transition
export type ProjectionPeriod = DailyProjection;

function generateRecurringTransactions(transactions: Transaction[], endDate: Date): Transaction[] {
  const now = new Date();
  const today = startOfDay(now);
  const recurringTransactions: Transaction[] = [];
  
  // Helper function to move weekends to Monday
  function adjustForWeekend(date: Date): Date {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0) { // Sunday
      date.setDate(date.getDate() + 1); // Move to Monday
    } else if (dayOfWeek === 6) { // Saturday
      date.setDate(date.getDate() + 2); // Move to Monday
    }
    return date;
  }
  
  // Only process transactions marked as recurring
  const recurringBaseTransactions = transactions.filter(tx => tx.recurring);
  
  recurringBaseTransactions.forEach(transaction => {
    const baseDate = new Date(transaction.date);
    const dayOfMonth = baseDate.getDate();
    
    console.log(`🔄 Simple recurring for "${transaction.name}": same day each month (${dayOfMonth}th)`);
    
    let instanceCount = 0;
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();
    
    // Start from current month if we haven't had this transaction yet this month
    const currentMonthDate = new Date(currentYear, currentMonth, dayOfMonth);
    if (currentMonthDate < today) {
      // Already passed this month, start next month
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    
    // Generate future instances - same day each month
    while (instanceCount < 50) {
      let nextDate = new Date(currentYear, currentMonth, dayOfMonth);
      
      // Handle months with fewer days (e.g., Feb 31st becomes Feb 28th/29th)
      if (nextDate.getMonth() !== currentMonth) {
        nextDate = new Date(currentYear, currentMonth + 1, 0); // Last day of the month
      }
      
      // Move weekends to Monday
      nextDate = adjustForWeekend(nextDate);
      
      if (nextDate > endDate) break;
      
      recurringTransactions.push({
        id: `${transaction.id}-future-${instanceCount}`,
        name: transaction.name,
        amount: transaction.amount,
        date: nextDate.toISOString(),
        type: transaction.type,
        recurring: true,
        schedule: {
          frequency: 'monthly',
          interval: 1
        }
      });
      
      instanceCount++;
      
      // Move to next month
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    
    console.log(`✅ Generated ${instanceCount} simple monthly instances of "${transaction.name}"`);
  });
  
  return recurringTransactions;
}

export function computeProjection(input: {
  transactions: Transaction[];
  startingBalance: number;
  config: ScheduleConfig;
}): { periods: DailyProjection[], finalBalance: number } {
  const { transactions, startingBalance, config } = input;
  
  const now = new Date();
  const today = startOfDay(now);
  const todayStr = today.toISOString().slice(0, 10);
  
  console.log(`💰 Starting projection from ${todayStr} with balance: $${startingBalance.toFixed(2)}`);
  
  // Sort all transactions by date
  const allTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  
  // Determine projection end date
  const endDate = addMonths(today, config.monthsToProject);
  
  // Generate recurring transactions for the future
  const recurringTransactions = generateRecurringTransactions(transactions, endDate);
  console.log(`🔄 Generated ${recurringTransactions.length} recurring transaction instances`);
  
  // Combine historical and generated recurring transactions
  const allTransactionsWithRecurring = [...allTransactions, ...recurringTransactions]
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // Create a map of transactions by date
  const transactionsByDate = new Map<string, Transaction[]>();
  allTransactionsWithRecurring.forEach(transaction => {
    const dateKey = new Date(transaction.date).toISOString().slice(0, 10);
    if (!transactionsByDate.has(dateKey)) {
      transactionsByDate.set(dateKey, []);
    }
    transactionsByDate.get(dateKey)!.push(transaction);
  });
  
  // Determine date range for projection
  const earliestDate = allTransactions.length > 0 
    ? new Date(allTransactions[0].date)
    : today;
  const startDate = new Date(Math.min(
    addMonths(today, -3).getTime(), // 3 months back
    earliestDate.getTime()
  ));
  
  console.log(`📅 Projecting from ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`);
  
  const dailyProjections: DailyProjection[] = [];
  let currentBalance = startingBalance;
  
  // Generate daily projections
  for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
    const dateStr = currentDate.toISOString().slice(0, 10);
    const isHistorical = currentDate < today;
    const isToday = dateStr === todayStr;
    
    const dayTransactions = transactionsByDate.get(dateStr) || [];
    
    // Calculate income and expenses for this day
    const actualIncome = dayTransactions
      .filter(t => t.type === 'paycheck' || t.type === 'income' || (t.type === 'internal_transfer' && t.amount > 0))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const actualExpenses = dayTransactions
      .filter(t => t.type === 'bill' || t.type === 'expense' || (t.type === 'internal_transfer' && t.amount < 0))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // For balance calculations: don't apply today's transactions since SimpleFIN balance already includes them
    const income = isToday ? 0 : actualIncome;
    const expenses = isToday ? 0 : actualExpenses;
    
    const startingBalanceForDay = isToday ? startingBalance : currentBalance;
    
    // Update balance for this day
    if (!isHistorical && !isToday) {
      // Future dates: apply projected transactions to calculate balance
      currentBalance = currentBalance + income - expenses;
    } else if (isToday) {
      // Today: Use SimpleFIN balance as-is (already includes today's transactions)
      currentBalance = startingBalance;
      if (actualIncome > 0 || actualExpenses > 0) {
        console.log(`📅 TODAY (${dateStr}): Using SimpleFIN balance $${startingBalance.toFixed(2)} (includes ${actualExpenses > 0 ? `$${actualExpenses.toFixed(2)} expenses` : 'no expenses'} ${actualIncome > 0 ? `+ $${actualIncome.toFixed(2)} income` : ''})`);
      }
    }
    
    // Calculate days until next income (for safe spending calculation)
    let daysUntilNextIncome = 0;
    if (!isHistorical) {
      const futureDate = new Date(currentDate);
      while (futureDate <= endDate) {
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateStr = futureDate.toISOString().slice(0, 10);
        const futureTransactions = transactionsByDate.get(futureDateStr) || [];
        const hasIncome = futureTransactions.some(t => 
          t.type === 'paycheck' || t.type === 'income' || (t.type === 'internal_transfer' && t.amount > 0)
        );
        daysUntilNextIncome++;
        if (hasIncome) break;
        if (daysUntilNextIncome > 30) break; // Cap at 30 days
      }
    }
    
    // Calculate safe to spend/save amounts
    let safeToSpend = 0;
    let safeToSave = 0;
    
    if (!isHistorical) {
      // Look ahead to see upcoming expenses until next income
      const lookAheadDate = new Date(currentDate);
      let upcomingExpenses = 0;
      
      for (let i = 0; i < daysUntilNextIncome && i < 30; i++) {
        lookAheadDate.setDate(lookAheadDate.getDate() + 1);
        const lookAheadStr = lookAheadDate.toISOString().slice(0, 10);
        const lookAheadTransactions = transactionsByDate.get(lookAheadStr) || [];
        upcomingExpenses += lookAheadTransactions
          .filter(t => t.type === 'bill' || t.type === 'expense' || (t.type === 'internal_transfer' && t.amount < 0))
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      }
      
      const safeBalance = currentBalance - upcomingExpenses;
      safeToSpend = Math.max(0, safeBalance * 0.8); // 80% of safe balance
      safeToSave = Math.max(0, safeBalance * 0.2);   // 20% for savings
    }
    
    dailyProjections.push({
      date: dateStr,
      startingBalance: startingBalanceForDay,
      transactions: dayTransactions,
      totalIncome: actualIncome, // Show actual amounts for UI display
      totalExpenses: actualExpenses, // Show actual amounts for UI display
      endingBalance: currentBalance, // But use correct balance calculation
      safeToSpend,
      safeToSave,
      daysUntilNextIncome,
      isHistorical
    });
  }
  
  console.log(`📊 Generated ${dailyProjections.length} daily projections`);
  
  return { 
    periods: dailyProjections, 
    finalBalance: currentBalance 
  };
}

function expectedIncomeForPeriod(checks: Paycheck[], start: Date, end: Date, config: ScheduleConfig) {
  const hasExplicit = checks.some((c) => {
    const d = new Date(c.date);
    return d >= start && d < end;
  });
  if (hasExplicit) {
    return sum(
      checks
        .filter((c) => {
          const d = new Date(c.date);
          return d >= start && d < end;
        })
        .map((c) => c.amount)
    );
  }
  return config.averagePaycheckAmount;
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function toISO(d: Date) {
  return new Date(d).toISOString();
}

// Sample data function removed - app now starts with clean slate

