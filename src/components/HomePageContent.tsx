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
import Link from "next/link";

interface SimpleFINAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export default function HomePageContent() {
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Money Calendar</h1>
          <Link 
            href="/credit-analysis" 
            className="btn bg-purple-600 text-white hover:bg-purple-700"
          >
            💳 Credit Card Analysis
          </Link>
        </div>

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
            <h2 className="text-lg font-semibold">Financial Statistics</h2>
            <StatisticsSection transactions={transactions} />
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

function StatisticsSection({ transactions }: { transactions: Transaction[] }) {
  const stats = useMemo(() => {
    if (transactions.length === 0) {
      return {
        monthlyAverages: { income: 0, bills: 0, expenses: 0, transfers: 0 },
        totals: { income: 0, bills: 0, expenses: 0, transfers: 0 },
        transactionCounts: { income: 0, bills: 0, expenses: 0, transfers: 0 },
        dateRange: { start: null, end: null, months: 0 },
        topCategories: { income: [], bills: [], expenses: [] },
        trends: { avgTransactionSize: 0, netMonthly: 0 }
      };
    }

    // Calculate date range
    const sortedDates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    const monthsSpan = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));

    // Categorize transactions
    const income = transactions.filter(t => t.type === 'paycheck' || t.type === 'income' || (t.type === 'internal_transfer' && t.amount > 0));
    const bills = transactions.filter(t => t.type === 'bill');
    const expenses = transactions.filter(t => t.type === 'expense');
    const transfers = transactions.filter(t => t.type === 'internal_transfer');

    // Calculate totals
    const incomeTotal = income.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const billsTotal = bills.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expensesTotal = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const transfersTotal = transfers.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate monthly averages
    const monthlyAverages = {
      income: incomeTotal / monthsSpan,
      bills: billsTotal / monthsSpan,
      expenses: expensesTotal / monthsSpan,
      transfers: transfersTotal / monthsSpan
    };

    // Top categories by frequency and amount
    const getTopCategories = (transactionList: Transaction[]) => {
      const categoryMap = new Map<string, { count: number; total: number }>();
      
      transactionList.forEach(t => {
        const key = t.name.toLowerCase();
        const existing = categoryMap.get(key) || { count: 0, total: 0 };
        categoryMap.set(key, {
          count: existing.count + 1,
          total: existing.total + Math.abs(t.amount)
        });
      });

      return Array.from(categoryMap.entries())
        .map(([name, data]) => ({ name, ...data, avg: data.total / data.count }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    };

    return {
      monthlyAverages,
      totals: { income: incomeTotal, bills: billsTotal, expenses: expensesTotal, transfers: transfersTotal },
      transactionCounts: { 
        income: income.length, 
        bills: bills.length, 
        expenses: expenses.length, 
        transfers: transfers.length 
      },
      dateRange: { 
        start: startDate, 
        end: endDate, 
        months: monthsSpan 
      },
      topCategories: {
        income: getTopCategories(income),
        bills: getTopCategories(bills),
        expenses: getTopCategories(expenses)
      },
      trends: {
        avgTransactionSize: (incomeTotal + billsTotal + expensesTotal) / transactions.length,
        netMonthly: monthlyAverages.income - monthlyAverages.bills - monthlyAverages.expenses
      }
    };
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">📊</div>
        <p>Import transactions to see your financial statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Averages */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Monthly Averages</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-green-700">Income</div>
            <div className="text-lg font-semibold text-green-900">
              ${stats.monthlyAverages.income.toFixed(0)}
            </div>
            <div className="text-xs text-green-600">
              {stats.transactionCounts.income} transactions
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-red-700">Bills</div>
            <div className="text-lg font-semibold text-red-900">
              ${stats.monthlyAverages.bills.toFixed(0)}
            </div>
            <div className="text-xs text-red-600">
              {stats.transactionCounts.bills} transactions
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-sm text-orange-700">Expenses</div>
            <div className="text-lg font-semibold text-orange-900">
              ${stats.monthlyAverages.expenses.toFixed(0)}
            </div>
            <div className="text-xs text-orange-600">
              {stats.transactionCounts.expenses} transactions
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-700">Net Monthly</div>
            <div className={`text-lg font-semibold ${stats.trends.netMonthly >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              ${stats.trends.netMonthly >= 0 ? '+' : ''}${stats.trends.netMonthly.toFixed(0)}
            </div>
            <div className="text-xs text-blue-600">
              Income - Expenses
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Data Period</div>
            <div className="font-medium text-gray-900">
              {stats.dateRange.months} month{stats.dateRange.months !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-500">
              {stats.dateRange.start?.toLocaleDateString()} - {stats.dateRange.end?.toLocaleDateString()}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Total Transactions</div>
            <div className="font-medium text-gray-900">
              {transactions.length}
            </div>
            <div className="text-xs text-gray-500">
              Avg: ${stats.trends.avgTransactionSize.toFixed(0)} per transaction
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">SimpleFIN Connected</div>
            <div className="font-medium text-gray-900">
              {transactions.filter(t => t.id && t.id.startsWith('simplefin-')).length} transactions
            </div>
            <div className="text-xs text-gray-500">
              {Math.round((transactions.filter(t => t.id && t.id.startsWith('simplefin-')).length / transactions.length) * 100)}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {stats.topCategories.bills.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Top Bills</h3>
          <div className="space-y-2">
            {stats.topCategories.bills.slice(0, 3).map((category, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-red-50 rounded">
                <div>
                  <div className="font-medium text-red-900 capitalize">{category.name}</div>
                  <div className="text-xs text-red-600">{category.count} transactions</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-red-900">${category.total.toFixed(0)}</div>
                  <div className="text-xs text-red-600">${category.avg.toFixed(0)} avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.topCategories.income.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Top Income Sources</h3>
          <div className="space-y-2">
            {stats.topCategories.income.slice(0, 3).map((category, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-green-50 rounded">
                <div>
                  <div className="font-medium text-green-900 capitalize">{category.name}</div>
                  <div className="text-xs text-green-600">{category.count} transactions</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-green-900">${category.total.toFixed(0)}</div>
                  <div className="text-xs text-green-600">${category.avg.toFixed(0)} avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
