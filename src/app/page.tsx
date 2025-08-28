"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bill,
  Paycheck,
  ScheduleConfig,
  computeProjection,
  defaultScheduleConfig,
  sampleData,
} from "@/lib/finance";

export default function HomePage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [balanceStart, setBalanceStart] = useState<number>(0);
  const [config, setConfig] = useState<ScheduleConfig>(defaultScheduleConfig);

  useEffect(() => {
    const raw = localStorage.getItem("money-calendar-state");
    if (raw) {
      const parsed = JSON.parse(raw);
      setBills(parsed.bills ?? []);
      setPaychecks(parsed.paychecks ?? []);
      setBalanceStart(parsed.balanceStart ?? 0);
      setConfig(parsed.config ?? defaultScheduleConfig);
    } else {
      const s = sampleData();
      setBills(s.bills);
      setPaychecks(s.paychecks);
      setBalanceStart(s.balanceStart);
      setConfig(s.config);
    }
  }, []);

  useEffect(() => {
    const state = JSON.stringify({ bills, paychecks, balanceStart, config });
    localStorage.setItem("money-calendar-state", state);
  }, [bills, paychecks, balanceStart, config]);

  const projection = useMemo(() => {
    return computeProjection({
      bills,
      paychecks,
      startingBalance: balanceStart,
      config,
    });
  }, [bills, paychecks, balanceStart, config]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Money Calendar</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block mb-1">Starting Balance</label>
              <input
                type="number"
                value={balanceStart}
                onChange={(e) => setBalanceStart(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Project Months</label>
              <input
                type="number"
                min={1}
                max={36}
                value={config.monthsToProject}
                onChange={(e) =>
                  setConfig({ ...config, monthsToProject: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Pay Period Days</label>
              <input
                type="number"
                min={7}
                max={31}
                value={config.payPeriodDays}
                onChange={(e) =>
                  setConfig({ ...config, payPeriodDays: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const s = sampleData();
                setBills(s.bills);
                setPaychecks(s.paychecks);
                setBalanceStart(s.balanceStart);
                setConfig(s.config);
              }}
            >
              Load Sample
            </button>
            <button
              className="bg-red-50 text-red-700 border-red-200"
              onClick={() => {
                setBills([]);
                setPaychecks([]);
                setBalanceStart(0);
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Add Paycheck</h2>
          <PaycheckForm
            onAdd={(p) => setPaychecks((prev) => [...prev, p])}
            avgAmount={config.averagePaycheckAmount}
            onUpdateAvg={(n) => setConfig({ ...config, averagePaycheckAmount: n })}
          />
          <h2 className="text-lg font-semibold">Add Bill</h2>
          <BillForm onAdd={(b) => setBills((prev) => [...prev, b])} />
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Projection</h2>
        <ProjectionTable projection={projection} />
      </div>
    </div>
  );
}

function PaycheckForm({
  onAdd,
  avgAmount,
  onUpdateAvg,
}: {
  onAdd: (p: Paycheck) => void;
  avgAmount: number;
  onUpdateAvg: (n: number) => void;
}) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(avgAmount);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdd({ date: new Date(date).toISOString(), amount })}
        >
          Add Paycheck
        </button>
        <div className="ml-4 grid grid-cols-2 gap-2 items-center">
          <label>Avg paycheck</label>
          <input
            type="number"
            value={avgAmount}
            onChange={(e) => onUpdateAvg(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

function BillForm({ onAdd }: { onAdd: (b: Bill) => void }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(100);
  const [name, setName] = useState<string>("Bill");
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
      <button
        onClick={() => onAdd({ date: new Date(date).toISOString(), amount, name })}
      >
        Add Bill
      </button>
    </div>
  );
}

function ProjectionTable({
  projection,
}: {
  projection: ReturnType<typeof computeProjection>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Period</th>
            <th className="py-2 pr-4">Start</th>
            <th className="py-2 pr-4">End</th>
            <th className="py-2 pr-4">Income</th>
            <th className="py-2 pr-4">Bills</th>
            <th className="py-2 pr-4">Carry Buffer</th>
            <th className="py-2 pr-4">Safe to Save</th>
            <th className="py-2 pr-4">End Balance</th>
          </tr>
        </thead>
        <tbody>
          {projection.periods.map((p) => (
            <tr key={p.index} className="border-b last:border-0">
              <td className="py-2 pr-4">{p.index + 1}</td>
              <td className="py-2 pr-4">{p.startDate.slice(0, 10)}</td>
              <td className="py-2 pr-4">{p.endDate.slice(0, 10)}</td>
              <td className="py-2 pr-4">${p.totalIncome.toFixed(2)}</td>
              <td className="py-2 pr-4">-${p.totalBills.toFixed(2)}</td>
              <td className="py-2 pr-4">${p.carryBufferNeeded.toFixed(2)}</td>
              <td className="py-2 pr-4">${p.safeToSave.toFixed(2)}</td>
              <td className="py-2 pr-4">${p.endingBalance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-sm">
        <div>
          Final balance after {projection.periods.length} periods: ${
            projection.finalBalance.toFixed(2)
          }
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bill,
  Paycheck,
  ScheduleConfig,
  computeProjection,
  defaultScheduleConfig,
  sampleData,
} from "@/lib/finance";

export default function HomePage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [balanceStart, setBalanceStart] = useState<number>(0);
  const [config, setConfig] = useState<ScheduleConfig>(defaultScheduleConfig);

  useEffect(() => {
    const raw = localStorage.getItem("money-calendar-state");
    if (raw) {
      const parsed = JSON.parse(raw);
      setBills(parsed.bills ?? []);
      setPaychecks(parsed.paychecks ?? []);
      setBalanceStart(parsed.balanceStart ?? 0);
      setConfig(parsed.config ?? defaultScheduleConfig);
    } else {
      const s = sampleData();
      setBills(s.bills);
      setPaychecks(s.paychecks);
      setBalanceStart(s.balanceStart);
      setConfig(s.config);
    }
  }, []);

  useEffect(() => {
    const state = JSON.stringify({ bills, paychecks, balanceStart, config });
    localStorage.setItem("money-calendar-state", state);
  }, [bills, paychecks, balanceStart, config]);

  const projection = useMemo(() => {
    return computeProjection({
      bills,
      paychecks,
      startingBalance: balanceStart,
      config,
    });
  }, [bills, paychecks, balanceStart, config]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Money Calendar</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block mb-1">Starting Balance</label>
              <input
                type="number"
                value={balanceStart}
                onChange={(e) => setBalanceStart(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Project Months</label>
              <input
                type="number"
                min={1}
                max={36}
                value={config.monthsToProject}
                onChange={(e) =>
                  setConfig({ ...config, monthsToProject: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Pay Period Days</label>
              <input
                type="number"
                min={7}
                max={31}
                value={config.payPeriodDays}
                onChange={(e) =>
                  setConfig({ ...config, payPeriodDays: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const s = sampleData();
                setBills(s.bills);
                setPaychecks(s.paychecks);
                setBalanceStart(s.balanceStart);
                setConfig(s.config);
              }}
            >
              Load Sample
            </button>
            <button
              className="bg-red-50 text-red-700 border-red-200"
              onClick={() => {
                setBills([]);
                setPaychecks([]);
                setBalanceStart(0);
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Add Paycheck</h2>
          <PaycheckForm
            onAdd={(p) => setPaychecks((prev) => [...prev, p])}
            avgAmount={config.averagePaycheckAmount}
            onUpdateAvg={(n) => setConfig({ ...config, averagePaycheckAmount: n })}
          />
          <h2 className="text-lg font-semibold">Add Bill</h2>
          <BillForm onAdd={(b) => setBills((prev) => [...prev, b])} />
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Projection</h2>
        <ProjectionTable projection={projection} />
      </div>
    </div>
  );
}

function PaycheckForm({
  onAdd,
  avgAmount,
  onUpdateAvg,
}: {
  onAdd: (p: Paycheck) => void;
  avgAmount: number;
  onUpdateAvg: (n: number) => void;
}) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(avgAmount);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdd({ date: new Date(date).toISOString(), amount })}
        >
          Add Paycheck
        </button>
        <div className="ml-4 grid grid-cols-2 gap-2 items-center">
          <label>Avg paycheck</label>
          <input
            type="number"
            value={avgAmount}
            onChange={(e) => onUpdateAvg(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

function BillForm({ onAdd }: { onAdd: (b: Bill) => void }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(100);
  const [name, setName] = useState<string>("Bill");
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="block mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
      <button
        onClick={() => onAdd({ date: new Date(date).toISOString(), amount, name })}
      >
        Add Bill
      </button>
    </div>
  );
}

function ProjectionTable({
  projection,
}: {
  projection: ReturnType<typeof computeProjection>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Period</th>
            <th className="py-2 pr-4">Start</th>
            <th className="py-2 pr-4">End</th>
            <th className="py-2 pr-4">Income</th>
            <th className="py-2 pr-4">Bills</th>
            <th className="py-2 pr-4">Carry Buffer</th>
            <th className="py-2 pr-4">Safe to Save</th>
            <th className="py-2 pr-4">End Balance</th>
          </tr>
        </thead>
        <tbody>
          {projection.periods.map((p) => (
            <tr key={p.index} className="border-b last:border-0">
              <td className="py-2 pr-4">{p.index + 1}</td>
              <td className="py-2 pr-4">{p.startDate.slice(0, 10)}</td>
              <td className="py-2 pr-4">{p.endDate.slice(0, 10)}</td>
              <td className="py-2 pr-4">${p.totalIncome.toFixed(2)}</td>
              <td className="py-2 pr-4">-${p.totalBills.toFixed(2)}</td>
              <td className="py-2 pr-4">${p.carryBufferNeeded.toFixed(2)}</td>
              <td className="py-2 pr-4">${p.safeToSave.toFixed(2)}</td>
              <td className="py-2 pr-4">${p.endingBalance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-sm">
        <div>
          Final balance after {projection.periods.length} periods: ${
            projection.finalBalance.toFixed(2)
          }
        </div>
      </div>
    </div>
  );
}


