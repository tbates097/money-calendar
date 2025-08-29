"use client";

import { useState } from 'react';
import { DailyProjection, Transaction } from '@/lib/finance';

interface CalendarViewProps {
  projection: DailyProjection[];
  onTransactionEdit?: (editedTransaction: Transaction, applyToFuture: boolean) => void;
}

interface DayData {
  date: string;
  income: number;
  bills: number;
  safeToSpend: number;
  safeToSave: number;
  endBalance: number;
  hasEvents: boolean;
  isHistorical: boolean;
}

export default function CalendarView({ projection, onTransactionEdit }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now()); // Force refresh with timestamp
  const [editingTransaction, setEditingTransaction] = useState<{transaction: Transaction, date: string} | null>(null);
  const [editForm, setEditForm] = useState({ amount: 0, date: '', applyToFuture: false });
  
  // Debug removed - calendar working correctly

  // Convert projection data to daily lookup
  const projectionByDate = new Map<string, DailyProjection>();
  projection.forEach((dailyProjection) => {
    projectionByDate.set(dailyProjection.date, dailyProjection);
  });

  // Generate calendar days for the current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month and last day of month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Get the starting date (Sunday of first week)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  // Get the ending date (Saturday of last week)
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

  const calendarDays: DayData[] = [];
  
  
  for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    // Use local date string consistently with today comparison
    const dayYear = d.getFullYear();
    const dayMonth = String(d.getMonth() + 1).padStart(2, '0');
    const dayDate = String(d.getDate()).padStart(2, '0');
    const dateKey = `${dayYear}-${dayMonth}-${dayDate}`;
    
    // Calendar generation working correctly
    
    const periodData = projectionByDate.get(dateKey);
    
    calendarDays.push({
      date: dateKey,
      income: periodData?.totalIncome || 0,
      bills: periodData?.totalExpenses || 0,
      safeToSpend: periodData?.safeToSpend || 0,
      safeToSave: periodData?.safeToSave || 0,
      endBalance: periodData?.endingBalance || 0,
      hasEvents: !!(periodData && (periodData.totalIncome > 0 || periodData.totalExpenses > 0)),
      isHistorical: periodData?.isHistorical || false
    });
  }

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDayClick = (day: DayData) => {
    setSelectedDay(day);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getDayStyle = (day: DayData) => {
    const dayDate = new Date(day.date);
    const isCurrentMonth = dayDate.getMonth() === month;
    const today = new Date();
    // Format today's date in local timezone, not UTC
    const year = today.getFullYear();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${monthStr}-${dayStr}`;
    const isToday = day.date === todayStr;
    
    // Today calculation working correctly
    
    // Today highlighting logic
    
    let bgColor = 'bg-white';
    let textColor = isCurrentMonth ? 'text-gray-900' : 'text-gray-400';
    
    if (isToday) {
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-900';
    } else if (day.hasEvents) {
      if (day.isHistorical) {
        // Historical periods - use muted/grayed colors
        if (day.safeToSpend > 1000) {
          bgColor = 'bg-gray-100';
          textColor = isCurrentMonth ? 'text-gray-600' : 'text-gray-400';
        } else if (day.safeToSpend > 0) {
          bgColor = 'bg-gray-50';
          textColor = isCurrentMonth ? 'text-gray-600' : 'text-gray-400';
        } else {
          bgColor = 'bg-gray-100';
          textColor = isCurrentMonth ? 'text-gray-700' : 'text-gray-400';
        }
      } else {
        // Future periods - use normal financial colors
        if (day.safeToSpend > 1000) {
          bgColor = 'bg-green-50';
          textColor = isCurrentMonth ? 'text-green-800' : 'text-green-400';
        } else if (day.safeToSpend > 0) {
          bgColor = 'bg-yellow-50';
          textColor = isCurrentMonth ? 'text-yellow-800' : 'text-yellow-400';
        } else {
          bgColor = 'bg-red-50';
          textColor = isCurrentMonth ? 'text-red-800' : 'text-red-400';
        }
      }
    }
    
    return `${bgColor} ${textColor}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600">
          Click any date to see financial details
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded"></div>
              <span>Historical Data</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
              <span>Projected Data</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-600">🔄</span>
              <span>Recurring Transaction</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={goToPrevMonth}
            className="px-3 py-1 rounded hover:bg-gray-100"
          >
            ←
          </button>
          <span className="font-medium">
            {monthNames[month]} {year}
          </span>
          <button 
            onClick={goToNextMonth}
            className="px-3 py-1 rounded hover:bg-gray-100"
          >
            →
          </button>
          <button 
            onClick={() => setRefreshKey(Date.now())}
            className="px-3 py-1 rounded hover:bg-gray-100 text-xs"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div
            key={`${day.date}-${refreshKey}`}
            onClick={() => handleDayClick(day)}
            style={{
              backgroundColor: getDayStyle(day).includes('bg-blue-100') ? '#dbeafe' : 'white',
              padding: '8px',
              height: '80px',
              border: '1px solid #e5e7eb',
              cursor: 'pointer'
            }}
            className="hover:border-blue-300 transition-colors"
          >
            <div className="text-sm font-medium mb-1">
              {day.date.split('-')[2]}
            </div>
            {day.hasEvents && (
              <div className="text-xs space-y-0.5">
                {day.income > 0 && (
                  <div className="text-green-600">+{formatCurrency(day.income)}</div>
                )}
                {day.bills > 0 && (
                  <div className="text-red-600">-{formatCurrency(day.bills)}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedDay && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            {(() => {
              const [year, month, day] = selectedDay.date.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
            })()}
            <span className={`text-xs px-2 py-1 rounded ${
              selectedDay.isHistorical 
                ? 'bg-gray-200 text-gray-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {selectedDay.isHistorical ? 'Historical' : 'Projected'}
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Income:</div>
              <div className="text-green-600 font-medium">{formatCurrency(selectedDay.income)}</div>
            </div>
            <div>
              <div className="text-gray-600">Bills/Expenses:</div>
              <div className="text-red-600 font-medium">{formatCurrency(selectedDay.bills)}</div>
            </div>
            <div>
              <div className="text-gray-600">Safe to Spend:</div>
              <div className="text-blue-600 font-medium">{formatCurrency(selectedDay.safeToSpend)}</div>
            </div>
            <div>
              <div className="text-gray-600">Safe to Save:</div>
              <div className="text-purple-600 font-medium">{formatCurrency(selectedDay.safeToSave)}</div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-600">End Balance:</div>
              <div className={`font-medium ${selectedDay.endBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(selectedDay.endBalance)}
              </div>
            </div>
          </div>
          
          {(() => {
            const dayProjection = projectionByDate.get(selectedDay.date);
            if (dayProjection && dayProjection.transactions.length > 0) {
              return (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Transactions on this day:</h4>
                  <div className="space-y-1">
                    {dayProjection.transactions.map((transaction, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm group">
                        <span className="text-gray-700">
                          {transaction.name}
                          {transaction.recurring && (
                            <span className="ml-1 text-xs text-blue-600">🔄</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            transaction.type === 'paycheck' || transaction.type === 'income' || (transaction.type === 'internal_transfer' && transaction.amount > 0)
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {transaction.type === 'paycheck' || transaction.type === 'income' || (transaction.type === 'internal_transfer' && transaction.amount > 0)
                              ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                          </span>
                          {transaction.recurring && !dayProjection.isHistorical && (
                            <button
                              onClick={() => {
                                setEditingTransaction({transaction, date: selectedDay.date});
                                setEditForm({
                                  amount: transaction.amount,
                                  date: selectedDay.date,
                                  applyToFuture: false
                                });
                              }}
                              className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 text-xs transition-opacity"
                              title="Edit recurring transaction"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
          <span>Good ($1000+ safe to spend)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-50 border border-yellow-200 rounded"></div>
          <span>Caution (Some safe to spend)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
          <span>Tight (No safe spending)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
          <span>Today</span>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Recurring Transaction</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Transaction Name</label>
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {editingTransaction.transaction.name}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({...prev, amount: parseFloat(e.target.value) || 0}))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm(prev => ({...prev, date: e.target.value}))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Apply changes to:</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!editForm.applyToFuture}
                      onChange={() => setEditForm(prev => ({...prev, applyToFuture: false}))}
                      className="mr-2"
                    />
                    <span className="text-sm">This instance only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={editForm.applyToFuture}
                      onChange={() => setEditForm(prev => ({...prev, applyToFuture: true}))}
                      className="mr-2"
                    />
                    <span className="text-sm">This date forward (update pattern)</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (onTransactionEdit) {
                    const editedTransaction: Transaction = {
                      ...editingTransaction.transaction,
                      amount: editForm.amount,
                      date: editForm.date
                    };
                    onTransactionEdit(editedTransaction, editForm.applyToFuture);
                  }
                  setEditingTransaction(null);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingTransaction(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
