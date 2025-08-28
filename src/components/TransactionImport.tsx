'use client';

import { useState } from 'react';
import { Bill, Paycheck } from '@/lib/finance';
import PlaidLink from './PlaidLink';

interface TransactionImportProps {
  onBillsImported: (bills: Bill[]) => void;
  onPaychecksImported: (paychecks: Paycheck[]) => void;
}

interface PlaidTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string[];
  type: 'bill' | 'paycheck' | 'income' | 'expense';
  merchant: string;
}

export default function TransactionImport({ onBillsImported, onPaychecksImported }: TransactionImportProps) {
  const [accessToken, setAccessToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    endDate: new Date().toISOString().split('T')[0],
  });

  const handlePlaidSuccess = async (publicToken: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken }),
      });
      
      const data = await response.json();
      setAccessToken(data.access_token);
    } catch (error) {
      console.error('Error exchanging token:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/plaid/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
      });
      
      const data = await response.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Import from Bank</h3>
      
      {!accessToken ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Connect your bank account to automatically import bills and paychecks.
          </p>
          <PlaidLink onSuccess={handlePlaidSuccess} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-40"
              />
            </div>
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Fetching...' : 'Fetch Transactions'}
            </button>
          </div>

          {transactions.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="card">
                  <h4 className="font-medium mb-2">Bills Found ({bills.length})</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {bills.map(bill => (
                      <div key={bill.id} className="text-sm">
                        <div className="font-medium">{bill.name}</div>
                        <div className="text-gray-600">
                          ${Math.abs(bill.amount).toFixed(2)} • {bill.date}
                        </div>
                      </div>
                    ))}
                  </div>
                  {bills.length > 0 && (
                    <button
                      onClick={importBills}
                      className="mt-2 w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Import Bills
                    </button>
                  )}
                </div>

                <div className="card">
                  <h4 className="font-medium mb-2">Paychecks Found ({paychecks.length})</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {paychecks.map(paycheck => (
                      <div key={paycheck.id} className="text-sm">
                        <div className="font-medium">{paycheck.name}</div>
                        <div className="text-gray-600">
                          ${Math.abs(paycheck.amount).toFixed(2)} • {paycheck.date}
                        </div>
                      </div>
                    ))}
                  </div>
                  {paychecks.length > 0 && (
                    <button
                      onClick={importPaychecks}
                      className="mt-2 w-full px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Import Paychecks
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Total transactions: {transactions.length}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
