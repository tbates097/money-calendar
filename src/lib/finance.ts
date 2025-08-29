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
  averagePaycheckAmount: number; // used for future periods when explicit checks missing
};

export type RecurringSchedule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
};

export const defaultScheduleConfig: ScheduleConfig = {
  monthsToProject: 12,
  payPeriodDays: 14,
  averagePaycheckAmount: 2000,
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
  
  // Group transactions by name and type to detect patterns
  const transactionGroups = new Map<string, Transaction[]>();
  
  transactions.forEach(transaction => {
    const key = `${transaction.name.toLowerCase()}-${transaction.type}`;
    if (!transactionGroups.has(key)) {
      transactionGroups.set(key, []);
    }
    transactionGroups.get(key)!.push(transaction);
  });
  
  // For each group, try to detect recurring pattern and generate future instances
  transactionGroups.forEach((groupTransactions, key) => {
    if (groupTransactions.length < 1) return;
    
    // Sort by date
    const sortedTransactions = groupTransactions.sort((a, b) => a.date.localeCompare(b.date));
    const lastTransaction = sortedTransactions[sortedTransactions.length - 1];
    const lastDate = new Date(lastTransaction.date);
    
    // Analyze all dates to detect pattern type
    const allDates = sortedTransactions.map(tx => new Date(tx.date));
    const intervals = [];
    for (let i = 1; i < allDates.length; i++) {
      const daysDiff = Math.round((allDates[i].getTime() - allDates[i-1].getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0 && daysDiff <= 90) intervals.push(daysDiff);
    }
    
    // Determine if this is bi-weekly (around 14 days) or monthly (around 30 days)
    const avgInterval = intervals.length > 0 ? intervals.reduce((sum, i) => sum + i, 0) / intervals.length : 30;
    const isBiWeekly = avgInterval >= 10 && avgInterval <= 18; // ~14 days with some tolerance
    const isMonthly = avgInterval >= 25 && avgInterval <= 35; // ~30 days with some tolerance
    
    console.log(`🔍 Pattern analysis for "${lastTransaction.name}": ${allDates.length} occurrences, avg interval: ${avgInterval.toFixed(1)} days, ${isBiWeekly ? 'BI-WEEKLY' : isMonthly ? 'MONTHLY' : 'IRREGULAR'} pattern`);
    
          // If the last occurrence was in the past, generate future instances
      if (lastDate < today) {
        let instanceCount = 0;
        
        if (lastTransaction.type === 'paycheck' || isBiWeekly) {
          // Paychecks: Use frequency-based approach (bi-weekly pattern)
          let intervalDays = 14; // Default bi-weekly
          
          // Use the calculated average interval from pattern analysis
          intervalDays = Math.round(avgInterval);
          
          // Generate future paycheck instances using frequency
          let nextDate = new Date(lastDate);
          nextDate.setDate(nextDate.getDate() + intervalDays);
          
          while (nextDate <= endDate && instanceCount < 50) {
            recurringTransactions.push({
              id: `${lastTransaction.id}-future-${instanceCount}`,
              name: lastTransaction.name,
              amount: lastTransaction.amount,
              date: nextDate.toISOString(),
              type: lastTransaction.type,
              recurring: true,
              schedule: {
                frequency: intervalDays <= 7 ? 'weekly' : intervalDays <= 31 ? 'monthly' : 'yearly',
                interval: intervalDays <= 7 ? 1 : intervalDays <= 31 ? 1 : 1
              }
            });
            
            nextDate = new Date(nextDate);
            nextDate.setDate(nextDate.getDate() + intervalDays);
            instanceCount++;
          }
          
          console.log(`🔄 Generated ${instanceCount} future ${lastTransaction.type === 'paycheck' ? 'paycheck' : 'bi-weekly'} instances of "${lastTransaction.name}" (every ${intervalDays} days)`);
          
        } else {
          // Bills/Expenses: Use day-of-month pattern for more accurate monthly billing
          const dayOfMonth = lastDate.getDate(); // e.g., 15th of the month
          let currentMonth = lastDate.getMonth();
          let currentYear = lastDate.getFullYear();
          
          console.log(`🔍 Generating recurring for "${lastTransaction.name}": last date ${lastDate.toISOString().slice(0, 10)}, day-of-month: ${dayOfMonth}, historical transactions in group: ${sortedTransactions.length}`);
          
          // Start from next month
          currentMonth++;
          if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
          }
          
          while (instanceCount < 50) {
            // Create date for this month on the same day
            let nextDate = new Date(currentYear, currentMonth, dayOfMonth);
            
            // Handle months with fewer days (e.g., trying to set Feb 31st)
            if (nextDate.getMonth() !== currentMonth) {
              // If day doesn't exist in this month, use last day of month
              nextDate = new Date(currentYear, currentMonth + 1, 0);
            }
            
            if (nextDate > endDate) break;
            
            recurringTransactions.push({
              id: `${lastTransaction.id}-future-${instanceCount}`,
              name: lastTransaction.name,
              amount: lastTransaction.amount,
              date: nextDate.toISOString(),
              type: lastTransaction.type,
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
          
          console.log(`🔄 Generated ${instanceCount} future bill instances of "${lastTransaction.name}" (${dayOfMonth}th of each month)`);
        }
      }
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

