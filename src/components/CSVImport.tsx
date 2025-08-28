'use client';

import { useState } from 'react';
import { Bill, Paycheck } from '@/lib/finance';

interface CSVImportProps {
  onBillsImported: (bills: Bill[]) => void;
  onPaychecksImported: (paychecks: Paycheck[]) => void;
}

interface CSVTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: 'bill' | 'paycheck' | 'income' | 'expense';
  selected: boolean;
}

// Keywords to identify bills vs paychecks
const BILL_KEYWORDS = [
  'electric', 'power', 'energy', 'utility', 'water', 'gas', 'internet', 'wifi',
  'phone', 'mobile', 'cable', 'tv', 'rent', 'mortgage', 'insurance', 'car',
  'auto', 'loan', 'credit card', 'netflix', 'spotify', 'amazon prime', 'gym',
  'membership', 'subscription', 'tax', 'fees', 'service charge'
];

const PAYCHECK_KEYWORDS = [
  'payroll', 'salary', 'direct deposit', 'paycheck', 'wages', 'income',
  'deposit', 'transfer in', 'credit'
];

function categorizeTransaction(name: string, amount: number): 'bill' | 'paycheck' | 'income' | 'expense' {
  const searchText = name.toLowerCase();

  // Check for paycheck indicators
  if (PAYCHECK_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    return 'paycheck';
  }

  // Check for bill indicators
  if (BILL_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    return 'bill';
  }

  // Default categorization based on amount
  if (amount > 0) {
    return 'income';
  } else {
    return 'expense';
  }
}

function parseCSV(csvText: string): CSVTransaction[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Common CSV column names for different banks
  const dateIndex = headers.findIndex(h => 
    h.includes('date') || h.includes('posted') || h.includes('transaction')
  );
  const descriptionIndex = headers.findIndex(h => 
    h.includes('description') || h.includes('memo') || h.includes('payee') || h.includes('name')
  );
  const amountIndex = headers.findIndex(h => 
    h.includes('amount') || h.includes('debit') || h.includes('credit')
  );

  if (dateIndex === -1 || descriptionIndex === -1 || amountIndex === -1) {
    throw new Error('Could not identify required columns (date, description, amount)');
  }

  const transactions: CSVTransaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const date = values[dateIndex];
    const name = values[descriptionIndex];
    const amountStr = values[amountIndex];
    
    if (!date || !name || !amountStr) continue;
    
    const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
    if (isNaN(amount)) continue;
    
    const type = categorizeTransaction(name, amount);
    
    transactions.push({
      id: `csv-${i}-${Date.now()}`,
      name,
      amount,
      date,
      type,
      selected: true
    });
  }
  
  return transactions;
}

export default function CSVImport({ onBillsImported, onPaychecksImported }: CSVImportProps) {
  const [transactions, setTransactions] = useState<CSVTransaction[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'bill' | 'paycheck' | 'income' | 'expense'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const parsedTransactions = parseCSV(csvText);
        setTransactions(parsedTransactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const updateTransactionType = (id: string, newType: 'bill' | 'paycheck' | 'income' | 'expense') => {
    setTransactions(prev => 
      prev.map(t => t.id === id ? { ...t, type: newType } : t)
    );
  };

  const toggleTransactionSelection = (id: string) => {
    setTransactions(prev => 
      prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    );
  };

  const selectAll = () => {
    setTransactions(prev => prev.map(t => ({ ...t, selected: true })));
  };

  const selectNone = () => {
    setTransactions(prev => prev.map(t => ({ ...t, selected: false })));
  };

  const selectByType = (type: 'bill' | 'paycheck' | 'income' | 'expense') => {
    setTransactions(prev => 
      prev.map(t => ({ ...t, selected: t.type === type }))
    );
  };

  const importSelectedBills = () => {
    const selectedBills = transactions
      .filter(t => t.selected && t.type === 'bill')
      .map(t => ({
        id: t.id,
        name: t.name,
        amount: Math.abs(t.amount),
        date: t.date,
        recurring: false,
        schedule: null,
      }));
    
    console.log('Importing bills:', selectedBills);
    onBillsImported(selectedBills);
    setSuccessMessage(`Successfully imported ${selectedBills.length} bills!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const importSelectedPaychecks = () => {
    const selectedPaychecks = transactions
      .filter(t => t.selected && t.type === 'paycheck')
      .map(t => ({
        id: t.id,
        name: t.name,
        amount: Math.abs(t.amount),
        date: t.date,
        recurring: false,
        schedule: null,
      }));
    
    console.log('Importing paychecks:', selectedPaychecks);
    onPaychecksImported(selectedPaychecks);
    setSuccessMessage(`Successfully imported ${selectedPaychecks.length} paychecks!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = transactions
    .filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || t.type === filterType;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const selectedBills = filteredAndSortedTransactions.filter(t => t.selected && t.type === 'bill');
  const selectedPaychecks = filteredAndSortedTransactions.filter(t => t.selected && t.type === 'paycheck');
  const allBills = transactions.filter(t => t.type === 'bill');
  const allPaychecks = transactions.filter(t => t.type === 'paycheck');
  const allOther = transactions.filter(t => !['bill', 'paycheck'].includes(t.type));

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Import from CSV</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Upload Bank Statement CSV
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="text-xs text-gray-500">
          Export your bank statement as CSV and upload it here. Most banks support this feature.
        </p>
        <div className="text-xs text-gray-500">
          <a 
            href="/sample-transactions.csv" 
            download
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Download sample CSV file
          </a> to test the import feature.
        </div>
      </div>

      {loading && <div className="text-sm text-gray-600">Processing CSV...</div>}
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
          {successMessage}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="font-medium text-blue-900">{allBills.length}</div>
              <div className="text-sm text-blue-700">Total Bills</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="font-medium text-green-900">{allPaychecks.length}</div>
              <div className="text-sm text-green-700">Total Paychecks</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-gray-900">{allOther.length}</div>
              <div className="text-sm text-gray-700">Other Transactions</div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border rounded"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 border rounded"
              >
                <option value="all">All Types</option>
                <option value="bill">Bills Only</option>
                <option value="paycheck">Paychecks Only</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Select None
              </button>
              <button
                onClick={() => selectByType('bill')}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Select Bills
              </button>
              <button
                onClick={() => selectByType('paycheck')}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Select Paychecks
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 text-sm border rounded"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="name">Name</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Import Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={importSelectedBills}
              disabled={selectedBills.length === 0}
              className="btn btn-primary"
            >
              Import {selectedBills.length} Selected Bills
            </button>
            <button
              onClick={importSelectedPaychecks}
              disabled={selectedPaychecks.length === 0}
              className="btn btn-secondary"
            >
              Import {selectedPaychecks.length} Selected Paychecks
            </button>
          </div>

          {/* Transactions Table */}
          <div className="max-h-96 overflow-y-auto border rounded">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b">
                <tr>
                  <th className="text-left py-2 px-2">
                    <input
                      type="checkbox"
                      checked={filteredAndSortedTransactions.length > 0 && filteredAndSortedTransactions.every(t => t.selected)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTransactions(prev => 
                            prev.map(t => 
                              filteredAndSortedTransactions.some(ft => ft.id === t.id) 
                                ? { ...t, selected: true }
                                : t
                            )
                          );
                        } else {
                          setTransactions(prev => 
                            prev.map(t => 
                              filteredAndSortedTransactions.some(ft => ft.id === t.id) 
                                ? { ...t, selected: false }
                                : t
                            )
                          );
                        }
                      }}
                    />
                  </th>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-right py-2 px-2">Amount</th>
                  <th className="text-left py-2 px-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTransactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={t.selected}
                        onChange={() => toggleTransactionSelection(t.id)}
                      />
                    </td>
                    <td className="py-2 px-2">{t.date}</td>
                    <td className="py-2 px-2 truncate max-w-32" title={t.name}>{t.name}</td>
                    <td className="py-2 px-2 text-right">${t.amount.toFixed(2)}</td>
                    <td className="py-2 px-2">
                      <select
                        value={t.type}
                        onChange={(e) => updateTransactionType(t.id, e.target.value as any)}
                        className={`px-2 py-1 rounded text-xs border-0 ${
                          t.type === 'bill' ? 'bg-red-100 text-red-800' :
                          t.type === 'paycheck' ? 'bg-green-100 text-green-800' :
                          t.type === 'income' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="bill">Bill</option>
                        <option value="paycheck">Paycheck</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAndSortedTransactions.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                No transactions match your filters
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Showing {filteredAndSortedTransactions.length} of {transactions.length} transactions
          </div>
        </div>
      )}
    </div>
  );
}
