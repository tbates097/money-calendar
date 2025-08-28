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
}

// Keywords to identify bills vs paychecks (same as Plaid version)
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
      type
    });
  }
  
  return transactions;
}

export default function CSVImport({ onBillsImported, onPaychecksImported }: CSVImportProps) {
  const [transactions, setTransactions] = useState<CSVTransaction[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

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

  const importBills = () => {
    const bills = transactions
      .filter(t => t.type === 'bill')
      .map(t => ({
        id: t.id,
        name: t.name,
        amount: Math.abs(t.amount),
        date: t.date,
        recurring: false,
        schedule: null,
      }));
    
    onBillsImported(bills);
  };

  const importPaychecks = () => {
    const paychecks = transactions
      .filter(t => t.type === 'paycheck')
      .map(t => ({
        id: t.id,
        name: t.name,
        amount: Math.abs(t.amount),
        date: t.date,
        recurring: false,
        schedule: null,
      }));
    
    onPaychecksImported(paychecks);
  };

  const bills = transactions.filter(t => t.type === 'bill');
  const paychecks = transactions.filter(t => t.type === 'paycheck');
  const other = transactions.filter(t => !['bill', 'paycheck'].includes(t.type));

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

      {transactions.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Found {transactions.length} transactions
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="font-medium text-blue-900">{bills.length}</div>
              <div className="text-sm text-blue-700">Bills</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="font-medium text-green-900">{paychecks.length}</div>
              <div className="text-sm text-green-700">Paychecks</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-gray-900">{other.length}</div>
              <div className="text-sm text-gray-700">Other</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={importBills}
              disabled={bills.length === 0}
              className="btn btn-primary"
            >
              Import {bills.length} Bills
            </button>
            <button
              onClick={importPaychecks}
              disabled={paychecks.length === 0}
              className="btn btn-secondary"
            >
              Import {paychecks.length} Paychecks
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-left py-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-1">{t.date}</td>
                    <td className="py-1 truncate max-w-32">{t.name}</td>
                    <td className="py-1 text-right">${t.amount.toFixed(2)}</td>
                    <td className="py-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        t.type === 'bill' ? 'bg-red-100 text-red-800' :
                        t.type === 'paycheck' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                  </tr>
                ))}
                {transactions.length > 20 && (
                  <tr>
                    <td colSpan={4} className="py-2 text-center text-gray-500">
                      ... and {transactions.length - 20} more transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
