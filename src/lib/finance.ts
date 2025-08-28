export type Bill = {
  id: string;
  name: string;
  amount: number;
  date: string;
  recurring: boolean;
  schedule: RecurringSchedule | null;
};

export type Paycheck = {
  id: string;
  name: string;
  amount: number;
  date: string;
  recurring: boolean;
  schedule: RecurringSchedule | null;
};

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

export type ProjectionPeriod = {
  index: number;
  startDate: string; // ISO
  endDate: string; // ISO
  totalIncome: number;
  totalBills: number;
  carryBufferNeeded: number;
  safeToSave: number;
  endingBalance: number;
};

export function computeProjection(input: {
  bills: Bill[];
  paychecks: Paycheck[];
  startingBalance: number;
  config: ScheduleConfig;
}) {
  const { bills, paychecks, startingBalance, config } = input;
  const now = new Date();
  const startDate = startOfDay(now);
  const monthsToProject = config.monthsToProject;
  const payPeriodDays = config.payPeriodDays;
  const projectionEnd = addMonths(startDate, monthsToProject);

  const sortedBills = [...bills].sort((a, b) => a.date.localeCompare(b.date));
  const sortedChecks = [...paychecks].sort((a, b) => a.date.localeCompare(b.date));

  const periods: ProjectionPeriod[] = [];

  let periodStart = startDate;
  let balance = startingBalance;
  let checkIndex = 0;
  let billIndex = 0;
  let periodIdx = 0;

  while (periodStart < projectionEnd) {
    const periodEnd = addDays(periodStart, payPeriodDays);
    const incomeInPeriod: Paycheck[] = [];
    const billsInPeriod: Bill[] = [];

    while (checkIndex < sortedChecks.length) {
      const d = new Date(sortedChecks[checkIndex].date);
      if (d >= periodStart && d < periodEnd) {
        incomeInPeriod.push(sortedChecks[checkIndex]);
        checkIndex++;
      } else if (d >= periodEnd) {
        break;
      } else {
        checkIndex++;
      }
    }

    while (billIndex < sortedBills.length) {
      const d = new Date(sortedBills[billIndex].date);
      if (d >= periodStart && d < periodEnd) {
        billsInPeriod.push(sortedBills[billIndex]);
        billIndex++;
      } else if (d >= periodEnd) {
        break;
      } else {
        billIndex++;
      }
    }

    let totalIncome = sum(incomeInPeriod.map((c) => c.amount));
    // If there is no explicit paycheck this period, assume an average paycheck hits once
    if (totalIncome === 0) totalIncome = config.averagePaycheckAmount;

    const totalBills = sum(billsInPeriod.map((b) => b.amount));

    // Carry buffer is how much we need to hold back so next period won't go negative
    // Estimate next period's deficit based on average paycheck and scheduled bills
    const nextPeriodStart = periodEnd;
    const nextPeriodEnd = addDays(nextPeriodStart, payPeriodDays);
    const nextBills = sortedBills.filter((b) => {
      const d = new Date(b.date);
      return d >= nextPeriodStart && d < nextPeriodEnd;
    });
    const nextBillsTotal = sum(nextBills.map((b) => b.amount));
    const nextIncomeExpected = expectedIncomeForPeriod(sortedChecks, nextPeriodStart, nextPeriodEnd, config);
    const nextNet = nextIncomeExpected - nextBillsTotal;
    const carryBufferNeeded = nextNet < 0 ? Math.abs(nextNet) : 0;

    const availableThisPeriod = balance + totalIncome - totalBills;
    const safeToSave = Math.max(0, availableThisPeriod - carryBufferNeeded);
    balance = availableThisPeriod - safeToSave; // keep carry buffer in account

    periods.push({
      index: periodIdx,
      startDate: toISO(periodStart),
      endDate: toISO(periodEnd),
      totalIncome,
      totalBills,
      carryBufferNeeded,
      safeToSave,
      endingBalance: balance,
    });

    periodIdx++;
    periodStart = periodEnd;
  }

  return { periods, finalBalance: balance };
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

export function sampleData() {
  const today = startOfDay(new Date());
  const bills: Bill[] = [
    { 
      id: "sample-rent",
      name: "Rent", 
      date: toISO(addDays(today, 2)), 
      amount: 1500,
      recurring: true,
      schedule: { frequency: 'monthly', interval: 1 }
    },
    { 
      id: "sample-utilities",
      name: "Utilities", 
      date: toISO(addDays(today, 10)), 
      amount: 200,
      recurring: true,
      schedule: { frequency: 'monthly', interval: 1 }
    },
    { 
      id: "sample-internet",
      name: "Internet", 
      date: toISO(addDays(today, 20)), 
      amount: 80,
      recurring: true,
      schedule: { frequency: 'monthly', interval: 1 }
    },
  ];
  const paychecks: Paycheck[] = [
    { 
      id: "sample-paycheck-1",
      name: "Salary",
      date: toISO(addDays(today, 1)), 
      amount: 2100,
      recurring: true,
      schedule: { frequency: 'weekly', interval: 2 }
    },
    { 
      id: "sample-paycheck-2",
      name: "Salary",
      date: toISO(addDays(today, 15)), 
      amount: 2050,
      recurring: true,
      schedule: { frequency: 'weekly', interval: 2 }
    },
  ];
  const config: ScheduleConfig = {
    monthsToProject: 12,
    payPeriodDays: 14,
    averagePaycheckAmount: 2050,
  };
  return { bills, paychecks, balanceStart: 1000, config };
}

