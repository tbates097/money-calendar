"use client";

import { useMemo, useState } from "react";
import {
  Bill,
  Paycheck,
  Transaction,
  computeProjection,
} from "../lib/finance";
import SimpleFINImport from "@/components/SimpleFINImport";
import CalendarView from "@/components/CalendarView";
import AuthWrapper from "@/components/AuthWrapper";
import { useUserData } from "@/hooks/useUserData";

interface SimpleFINAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export default function HomePage() {
  const {
    transactions,
    balanceStart,
    config,
    selectedAccount,
    transactionsLoaded,
    loading,
    error,
    isGuestMode,
    isAuthenticated,
    saveData,
    addTransactions
  } = useUserData();

  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [accounts, setAccounts] = useState<SimpleFINAccount[]>([]);
  
  // Legacy getters for backward compatibility
  const bills = transactions.filter(t => t.type === 'bill') as Bill[];
  const paychecks = transactions.filter(t => t.type === 'paycheck') as Paycheck[];

  // Calculate total balance from all SimpleFIN accounts
  const totalAccountBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  
  // Auto-detect pay period from paycheck frequency
  const autoDetectedPayPeriod = useMemo(() => {
    if (paychecks.length < 2) return config.payPeriodDays; // Not enough data
    
    const sortedPaychecks = [...paychecks].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const intervals: number[] = [];
    
    for (let i = 1; i < sortedPaychecks.length; i++) {
      const prevDate = new Date(sortedPaychecks[i - 1].date);
      const currDate = new Date(sortedPaychecks[i].date);
      const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0 && daysDiff <= 35) { // Reasonable paycheck interval
        intervals.push(daysDiff);
      }
    }
    
    if (intervals.length === 0) return config.payPeriodDays;
    
    // Find the most common interval (mode)
    const frequency: { [key: number]: number } = {};
    intervals.forEach(interval => {
      frequency[interval] = (frequency[interval] || 0) + 1;
    });
    
    const mostCommon = Object.keys(frequency).reduce((a, b) => 
      frequency[parseInt(a)] > frequency[parseInt(b)] ? a : b
    );
    
    return parseInt(mostCommon);
  }, [paychecks, config.payPeriodDays]);

  // Use selected account balance if available, otherwise fall back to total or manual balance
  const effectiveStartingBalance = selectedAccount 
    ? selectedAccount.balance 
    : (accounts.length > 0 ? totalAccountBalance : balanceStart);

  const projection = useMemo(() => {
    // Use auto-detected pay period and effective balance
    const effectiveConfig = {
      ...config,
      payPeriodDays: autoDetectedPayPeriod
    };
    
    console.log('🧮 Computing projection with:', {
      transactionCount: transactions.length,
      transactionSources: {
        simplefinTransactions: transactions.filter(t => t.id && t.id.startsWith('simplefin-')).length,
        manualTransactions: transactions.filter(t => t.id && !t.id.startsWith('simplefin-')).length
      },
      effectiveStartingBalance,
      effectiveConfig
    });
    
    // Log the actual transactions being used for transparency
    console.log('📋 Transactions being used in projection:', transactions.map(t => ({
      name: t.name,
      amount: t.amount,
      date: t.date,
      type: t.type,
      source: t.id && t.id.startsWith('simplefin-') ? 'SimpleFIN Selected' : 'Manual Entry'
    })));
    
    const result = computeProjection({
      transactions,
      startingBalance: effectiveStartingBalance,
      config: effectiveConfig,
    });
    
    return result;
  }, [transactions, effectiveStartingBalance, config, autoDetectedPayPeriod]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your financial data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <AuthWrapper>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Money Calendar</h1>

        <SimpleFINImport 
          existingTransactions={transactions}
          onBillsImported={(importedBills) => {
            console.log('Main page received bills:', importedBills);
            const billTransactions: Transaction[] = importedBills.map(bill => ({ ...bill, type: 'bill' }));
            addTransactions(billTransactions);
          }}
          onPaychecksImported={(importedPaychecks) => {
            console.log('Main page received paychecks:', importedPaychecks);
            const paycheckTransactions: Transaction[] = importedPaychecks.map(paycheck => ({ ...paycheck, type: 'paycheck' }));
            addTransactions(paycheckTransactions);
          }}
          onAccountsImported={(importedAccounts) => {
            console.log('Main page received accounts:', importedAccounts);
            setAccounts(importedAccounts);
          }}
          onTransactionsImported={(importedTransactions) => {
            console.log('🔥 MANUAL IMPORT: Main page received selected transactions:', importedTransactions);
            
            // Don't clear transactions if no new transactions to import
            if (importedTransactions.length === 0) {
              console.log('⏭️ No new transactions to import - keeping existing transactions');
              return;
            }
            
            console.log('🔄 Adding new transactions to existing calendar transactions');
            const newTransactions: Transaction[] = importedTransactions.map(tx => ({ 
              ...tx, 
              type: tx.type as Transaction['type']
            }));
            addTransactions(newTransactions);
          }}
          onSelectedAccountChanged={(account) => {
            console.log('📊 Selected account for balance:', account);
            saveData({ selectedAccount: account });
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">Financial Status</h2>
            
            {accounts.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-800 mb-2">💳 Connected Bank Accounts</div>
                  <div className="space-y-2">
                    {accounts.map((account) => (
                      <div key={account.id} className={`flex justify-between text-sm ${
                        selectedAccount?.id === account.id ? 'bg-green-100 p-1 rounded' : ''
                      }`}>
                        <span className={`${selectedAccount?.id === account.id ? 'text-green-900 font-medium' : 'text-green-700'}`}>
                          {account.name}
                          {selectedAccount?.id === account.id && ' 🎯'}
                        </span>
                        <span className={`font-medium ${selectedAccount?.id === account.id ? 'text-green-900' : 'text-green-700'}`}>
                          ${account.balance.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-green-200 mt-2 pt-2">
                    <div className="flex justify-between text-green-700 text-sm">
                      <span>Total Balance:</span>
                      <span>${totalAccountBalance.toFixed(2)}</span>
                    </div>
                    {selectedAccount && (
                      <div className="flex justify-between font-medium text-green-900 mt-1">
                        <span>Calendar Balance:</span>
                        <span>${selectedAccount.balance.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-800 mb-1">🔄 Auto-detected Pay Period</div>
                  <div className="text-blue-900">
                    {autoDetectedPayPeriod} days 
                    {paychecks.length >= 2 && autoDetectedPayPeriod !== config.payPeriodDays && (
                      <span className="text-xs text-blue-600 ml-1">(detected from your paychecks)</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">💰 Manual Balance Entry</div>
                  <label className="block mb-1 text-sm">Starting Balance</label>
                  <input
                    type="number"
                    value={balanceStart}
                    onChange={(e) => saveData({ balanceStart: Number(e.target.value) })}
                    className="w-full"
                    placeholder="Enter your current balance"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-sm">Project Months</label>
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={config.monthsToProject}
                  onChange={(e) =>
                    saveData({ config: { ...config, monthsToProject: Number(e.target.value) } })
                  }
                  className="w-full"
                />
              </div>
              
              {/* Show transaction summary */}
              {transactions.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-800 mb-1">📊 Active Transactions</div>
                  <div className="text-blue-900 text-sm">
                    {transactions.filter(t => t.id && t.id.startsWith('simplefin-')).length} selected from SimpleFIN
                    {transactions.filter(t => t.id && !t.id.startsWith('simplefin-')).length > 0 && 
                      ` + ${transactions.filter(t => t.id && !t.id.startsWith('simplefin-')).length} manually added`
                    }
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Only these transactions are used in calendar projections
                  </div>
                </div>
              )}
              {accounts.length === 0 && (
                <div>
                  <label className="block mb-1 text-sm">Pay Period Days</label>
                  <input
                    type="number"
                    min={7}
                    max={31}
                    value={config.payPeriodDays}
                    onChange={(e) =>
                      saveData({ config: { ...config, payPeriodDays: Number(e.target.value) } })
                    }
                    className="w-full"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
                <button
                  className="bg-orange-50 text-orange-700 border-orange-200"
                  onClick={() => {
                    // Clear only SimpleFIN imported transactions (those with simplefin- prefix)
                    const filteredTransactions = transactions.filter(t => !t.id || !t.id.startsWith('simplefin-'));
                    saveData({ transactions: filteredTransactions });
                    console.log('SimpleFIN transactions cleared');
                  }}
                >
                  Clear SimpleFIN Transactions
                </button>
                <button
                  className="bg-red-50 text-red-700 border-red-200"
                  onClick={() => {
                    if (isGuestMode) {
                      localStorage.removeItem("money-calendar-state");
                      localStorage.removeItem('simplefin_access_url');
                      localStorage.removeItem('simplefin_bank_name');
                    }
                    saveData({ 
                      transactions: [], 
                      balanceStart: 0, 
                      config: { payPeriodDays: 14, monthsToProject: 12, safetyCushionDays: 3 },
                      selectedAccount: null 
                    });
                    setAccounts([]);
                    console.log('All data cleared');
                  }}
                >
                  Clear All Data
                </button>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">Add Paycheck</h2>
            <PaycheckForm
              onAdd={(p) => {
                const paycheckTransaction: Transaction = { ...p, type: 'paycheck' };
                addTransactions([paycheckTransaction]);
              }}
              avgAmount={config.averagePaycheckAmount || 1000}
              onUpdateAvg={(n) => saveData({ config: { ...config, averagePaycheckAmount: n } })}
            />
            <h2 className="text-lg font-semibold">Add Bill</h2>
            <BillForm onAdd={(b) => {
              const billTransaction: Transaction = { ...b, type: 'bill' };
              addTransactions([billTransaction]);
            }} />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Financial Projection</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'calendar' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              >
                Calendar View
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              >
                Table View
              </button>
            </div>
          </div>
          
          {viewMode === 'calendar' ? (
            <CalendarView 
              projection={projection.periods} 
              onTransactionEdit={(editedTransaction, applyToFuture) => {
                console.log('📝 Transaction edit requested:', { editedTransaction, applyToFuture });
                // TODO: Implement transaction editing logic
                // For now, just log the edit request
              }}
            />
          ) : (
            <ProjectionTable projection={projection} />
          )}
        </div>
      </div>
    </AuthWrapper>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onAdd({ 
            id: `paycheck-${Date.now()}`,
            name: "Paycheck",
            date: new Date(date).toISOString(), 
            amount,
            type: 'paycheck',
            recurring: false,
            schedule: null
          })}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        onClick={() => onAdd({ 
          id: `bill-${Date.now()}`,
          name,
          date: new Date(date).toISOString(), 
          amount,
          type: 'bill',
          recurring: false,
          schedule: null
        })}
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
            <th className="py-2 pr-4">Day</th>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Starting Balance</th>
            <th className="py-2 pr-4">Income</th>
            <th className="py-2 pr-4">Expenses</th>
            <th className="py-2 pr-4">Safe to Spend</th>
            <th className="py-2 pr-4">Safe to Save</th>
            <th className="py-2 pr-4">End Balance</th>
          </tr>
        </thead>
        <tbody>
          {projection.periods.map((p, index) => (
            <tr key={index} className="border-b last:border-0">
              <td className="py-2 pr-4">{index + 1}</td>
              <td className="py-2 pr-4">{p.date}</td>
              <td className="py-2 pr-4">${p.startingBalance.toFixed(2)}</td>
              <td className="py-2 pr-4">${p.totalIncome.toFixed(2)}</td>
              <td className="py-2 pr-4">-${p.totalExpenses.toFixed(2)}</td>
              <td className="py-2 pr-4">${p.safeToSpend.toFixed(2)}</td>
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