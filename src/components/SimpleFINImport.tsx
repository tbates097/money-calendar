'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bill, Paycheck } from '@/lib/finance';

interface SimpleFINImportProps {
  onBillsImported: (bills: Bill[]) => void;
  onPaychecksImported: (paychecks: Paycheck[]) => void;
  onAccountsImported?: (accounts: SimpleFINAccount[]) => void;
  onTransactionsImported?: (transactions: any[]) => void;
  onSelectedAccountChanged?: (account: SimpleFINAccount | null) => void;
  existingTransactions?: any[]; // To calculate latest import date
}

interface SimpleFINTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: 'bill' | 'paycheck' | 'income' | 'expense' | 'internal_transfer';
  selected: boolean;
  account: string;
}

interface SimpleFINAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface SimpleFINData {
  accounts: SimpleFINAccount[];
  transactions: any[];
  accessUrl?: string; // Added for auto-reconnection
}

// Keywords to identify bills vs paychecks (same as CSV version)
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

const INTERNAL_TRANSFER_KEYWORDS = [
  'transfer', 'internal transfer', 'account transfer', 'between accounts',
  'from checking', 'to savings', 'from savings', 'to checking', 'move money'
];

function categorizeTransaction(name: string, amount: number): 'bill' | 'paycheck' | 'income' | 'expense' | 'internal_transfer' {
  const searchText = name.toLowerCase();

  // Check for internal transfer indicators
  if (INTERNAL_TRANSFER_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    return 'internal_transfer';
  }

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

export default function SimpleFINImport({ onBillsImported, onPaychecksImported, onAccountsImported, onTransactionsImported, onSelectedAccountChanged, existingTransactions = [] }: SimpleFINImportProps) {
  const [transactions, setTransactions] = useState<SimpleFINTransaction[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'bill' | 'paycheck' | 'income' | 'expense' | 'internal_transfer'>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [bankName, setBankName] = useState<string>('');
  const [connectionToken, setConnectionToken] = useState<string>('');
  const [accounts, setAccounts] = useState<SimpleFINAccount[]>([]);
  const [importedTransactionIds, setImportedTransactionIds] = useState<Set<string>>(new Set());

  // Load imported transaction IDs from localStorage on component mount
  useEffect(() => {
    const storedIds = localStorage.getItem('importedTransactionIds');
    if (storedIds) {
      try {
        const parsedIds = JSON.parse(storedIds);
        setImportedTransactionIds(new Set(parsedIds));
        console.log('📂 Loaded', parsedIds.length, 'previously imported transaction IDs');
      } catch (error) {
        console.warn('Failed to parse stored transaction IDs:', error);
      }
    }
  }, []);

  // Save imported transaction IDs to localStorage whenever it changes
  useEffect(() => {
    if (importedTransactionIds.size > 0) {
      localStorage.setItem('importedTransactionIds', JSON.stringify([...importedTransactionIds]));
      console.log('💾 Saved', importedTransactionIds.size, 'imported transaction IDs to localStorage');
    }
  }, [importedTransactionIds]);

  const fetchDataWithAccessToken = useCallback(async (accessUrl: string) => {
    setLoading(true);
    setError('');
    
    console.log('🔄 Fetching data with importedIds count:', importedTransactionIds.size);
    
    try {
      const response = await fetch('/api/simplefin/fetch-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: accessUrl }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Process transactions and filter out already imported ones
      const allTransactions: SimpleFINTransaction[] = data.transactions.map((tx: any, index: number) => ({
        id: `simplefin-${tx.id || index}`,
        name: tx.memo || tx.name || 'Unknown Transaction',
        amount: tx.amount || 0,
        date: tx.posted || tx.date || new Date().toISOString().slice(0, 10),
        type: categorizeTransaction(tx.memo || tx.name || '', tx.amount || 0),
        selected: true,
        account: tx.account || 'unknown'
      }));

      // Calculate latest import date from existing calendar transactions
      const latestImportDate = existingTransactions.length > 0 
        ? existingTransactions.reduce((latest, tx) => {
            const txDate = new Date(tx.date);
            return txDate > latest ? txDate : latest;
          }, new Date(0))
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago for fresh start
      
      console.log('🔍 Debug: existingTransactions count:', existingTransactions.length);
      console.log('📅 Latest import date from calendar:', latestImportDate.toISOString().slice(0, 10));
      
      // Filter to only show transactions >= latest import date
      const newTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= latestImportDate;
      });
      
      const filteredCount = allTransactions.length - newTransactions.length;
      
      console.log(`📊 Date-based filtering: ${allTransactions.length} total, ${filteredCount} before ${latestImportDate.toISOString().slice(0, 10)}, ${newTransactions.length} new/current`);
      console.log('🔍 Date filter details:', {
        latestImportDate: latestImportDate.toISOString().slice(0, 10),
        existingTransactionCount: existingTransactions.length,
        sampleDates: allTransactions.slice(0, 3).map(t => ({ name: t.name, date: t.date, included: new Date(t.date) >= latestImportDate }))
      });
      
      setTransactions(newTransactions);
      setAccounts(data.accounts);
      setSuccessMessage(`Successfully fetched ${allTransactions.length} total transactions. Showing ${newTransactions.length} from ${latestImportDate.toISOString().slice(0, 10)} onward (${filteredCount} older transactions filtered).`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Pass updated account data to parent component  
      onAccountsImported?.(data.accounts);
    } catch (err) {
      console.error('SimpleFIN data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data from SimpleFIN. Please try again.');
      // If access URL is invalid, clear it and disconnect
      localStorage.removeItem('simplefin_access_url');
      localStorage.removeItem('simplefin_bank_name');
      setConnectionStatus('disconnected');
      setBankName('');
    } finally {
      setLoading(false);
    }
  }, [importedTransactionIds]);

  // Check for stored access URL on component mount
  useEffect(() => {
    const storedAccessUrl = localStorage.getItem('simplefin_access_url');
    const storedBankName = localStorage.getItem('simplefin_bank_name');
    
    console.log('SimpleFIN Auto-reconnect check:', { storedAccessUrl: storedAccessUrl ? 'Found' : 'Not found', storedBankName });
    
    if (storedAccessUrl && storedBankName) {
      console.log('Auto-reconnecting with stored access URL...');
      setConnectionStatus('connected');
      setBankName(storedBankName);
      // Auto-fetch transactions on page load to restore previous session
      fetchDataWithAccessToken(storedAccessUrl);
    } else {
      console.log('No stored access URL found, showing connection form');
    }
  }, [fetchDataWithAccessToken]);

  const getRecentTransactions = async () => {
    const storedAccessUrl = localStorage.getItem('simplefin_access_url');
    if (storedAccessUrl) {
      await fetchDataWithAccessToken(storedAccessUrl);
    } else {
      setError('No stored access token found. Please reconnect.');
    }
  };

  const updateTransactionType = (id: string, newType: 'bill' | 'paycheck' | 'income' | 'expense' | 'internal_transfer') => {
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

  const selectByType = (type: 'bill' | 'paycheck' | 'income' | 'expense' | 'internal_transfer') => {
    setTransactions(prev => 
      prev.map(t => ({ ...t, selected: t.type === type }))
    );
  };

  const importSelected = () => {
    const selectedTransactions = transactions.filter(t => t.selected);
    
    if (selectedTransactions.length === 0) {
      setSuccessMessage('No transactions selected for import.');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    // Filter to only include transactions from the selected account (if an account is selected)
    const accountFilteredTransactions = selectedAccount === 'all' 
      ? selectedTransactions 
      : selectedTransactions.filter(t => t.account === selectedAccount);

    if (accountFilteredTransactions.length === 0) {
      setSuccessMessage('No transactions selected from the current account filter.');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    console.log(`🎯 Importing ${accountFilteredTransactions.length} transactions from account filter: ${selectedAccount}`);

    // Add imported transaction IDs to the tracking set
    const newImportedIds = accountFilteredTransactions.map(t => t.id);
    setImportedTransactionIds(prev => {
      const updated = new Set([...prev, ...newImportedIds]);
      console.log(`📝 Tracking ${newImportedIds.length} new imported transaction IDs (total: ${updated.size})`);
      return updated;
    });

    // Convert filtered transactions to the app's transaction format
    const allImportedTransactions = accountFilteredTransactions.map(t => ({
      id: t.id,
      name: t.name,
      amount: t.type === 'bill' || t.type === 'expense' ? Math.abs(t.amount) : t.amount,
      date: t.date,
      type: t.type,
      recurring: false,
      schedule: null,
    }));

    // Use the general transaction import if available (better approach)
    if (onTransactionsImported) {
      console.log('Importing all transactions:', allImportedTransactions);
      onTransactionsImported(allImportedTransactions);
    } else {
      // Fallback to separate callbacks for backward compatibility
      const selectedBills = allImportedTransactions.filter(t => t.type === 'bill');
      const selectedPaychecks = allImportedTransactions.filter(t => t.type === 'paycheck');
      
      if (selectedBills.length > 0) {
        console.log('Importing bills:', selectedBills);
        onBillsImported(selectedBills as Bill[]);
      }
      
      if (selectedPaychecks.length > 0) {
        console.log('Importing paychecks:', selectedPaychecks);
        onPaychecksImported(selectedPaychecks as Paycheck[]);
      }
    }
    
    setSuccessMessage(`Successfully imported ${accountFilteredTransactions.length} transactions from ${selectedAccount === 'all' ? 'all accounts' : accounts.find(acc => acc.id === selectedAccount)?.name || 'selected account'}!`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const connectToSimpleFIN = async () => {
    if (!connectionToken.trim()) {
      setError('Please enter your SimpleFIN connection token');
      return;
    }

    setLoading(true);
    setError('');
    setConnectionStatus('connecting');

    try {
      // Fetch data from SimpleFIN API
      const response = await fetch('/api/simplefin/fetch-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: connectionToken }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data: SimpleFINData = await response.json();
      
      console.log('SimpleFIN API response:', { hasAccessUrl: !!data.accessUrl, accountsCount: data.accounts?.length, transactionsCount: data.transactions?.length });
      console.log('Raw transactions received:', data.transactions);
      
      // Process transactions and filter out already imported ones
      const allTransactions: SimpleFINTransaction[] = data.transactions.map((tx: any, index: number) => ({
        id: `simplefin-${tx.id || index}`,
        name: tx.memo || tx.name || 'Unknown Transaction',
        amount: tx.amount || 0,
        date: tx.posted || tx.date || new Date().toISOString().slice(0, 10),
        type: categorizeTransaction(tx.memo || tx.name || '', tx.amount || 0),
        selected: true,
        account: tx.account || 'unknown'
      }));

      // Calculate latest import date from existing calendar transactions
      const latestImportDate = existingTransactions.length > 0 
        ? existingTransactions.reduce((latest, tx) => {
            const txDate = new Date(tx.date);
            return txDate > latest ? txDate : latest;
          }, new Date(0))
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago for fresh start
      
      console.log('🔍 Debug: existingTransactions count:', existingTransactions.length);
      console.log('📅 Latest import date from calendar:', latestImportDate.toISOString().slice(0, 10));
      
      // Filter to only show transactions >= latest import date
      const newTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= latestImportDate;
      });
      
      const filteredCount = allTransactions.length - newTransactions.length;
      
      console.log(`📊 Date-based filtering: ${allTransactions.length} total, ${filteredCount} before ${latestImportDate.toISOString().slice(0, 10)}, ${newTransactions.length} new/current`);

      setTransactions(newTransactions);
      setAccounts(data.accounts);
      setConnectionStatus('connected');
      const newBankName = data.accounts.length > 0 ? `${data.accounts[0].name} (SimpleFIN)` : 'Connected Bank (SimpleFIN)';
      setBankName(newBankName);
      setSuccessMessage(`Successfully connected! Found ${data.accounts.length} accounts with ${allTransactions.length} total transactions. Showing ${newTransactions.length} transactions from ${latestImportDate.toISOString().slice(0, 10)} onward.`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Pass account data to parent component
      onAccountsImported?.(data.accounts);
      
      // Store access URL for auto-reconnection (not the setup token)
      if (data.accessUrl) {
        console.log('Storing access URL for future use');
        localStorage.setItem('simplefin_access_url', data.accessUrl);
        localStorage.setItem('simplefin_bank_name', newBankName);
      } else {
        console.error('No accessUrl received from API - cannot enable auto-reconnection');
      }
    } catch (err) {
      console.error('SimpleFIN connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to SimpleFIN. Please check your token and try again.');
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const disconnectFromSimpleFIN = () => {
    setTransactions([]);
    setAccounts([]);
    setConnectionStatus('disconnected');
    setBankName('');
    setConnectionToken('');
    setSuccessMessage('Disconnected from SimpleFIN');
    setTimeout(() => setSuccessMessage(''), 3000);
    localStorage.removeItem('simplefin_access_url');
    localStorage.removeItem('simplefin_bank_name');
  };

  const resetImportedTransactions = () => {
    setImportedTransactionIds(new Set());
    localStorage.removeItem('importedTransactionIds');
    setSuccessMessage('Reset complete! All transactions will be available for import again.');
    setTimeout(() => setSuccessMessage(''), 3000);
    
    // Refetch to show all transactions again
    const storedAccessUrl = localStorage.getItem('simplefin_access_url');
    if (storedAccessUrl) {
      fetchDataWithAccessToken(storedAccessUrl);
    }
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = transactions
    .filter(t => {
      const matchesSearch = (t.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || t.type === filterType;
      const matchesAccount = selectedAccount === 'all' || t.account === selectedAccount;
      return matchesSearch && matchesFilter && matchesAccount;
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

  // Calculate selected counts from ALL transactions, not just filtered ones
  const selectedBills = transactions.filter(t => t.selected && t.type === 'bill');
  const selectedPaychecks = transactions.filter(t => t.selected && t.type === 'paycheck');
  
  // Calculate stats based on current filters (including account filter)
  const filteredTransactions = transactions.filter(t => selectedAccount === 'all' || t.account === selectedAccount);
  const allBills = filteredTransactions.filter(t => t.type === 'bill');
  const allPaychecks = filteredTransactions.filter(t => t.type === 'paycheck');
  const allTransfers = filteredTransactions.filter(t => t.type === 'internal_transfer');
  const allOther = filteredTransactions.filter(t => !['bill', 'paycheck', 'internal_transfer'].includes(t.type));

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">SimpleFIN Banking Integration</h2>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">What is SimpleFIN?</h3>
          <p className="text-sm text-blue-800 mb-3">
            SimpleFIN is a free, open-source protocol that allows secure access to your financial data 
            without requiring API keys or complex integrations. It's supported by many banks and credit unions.
          </p>
          <div className="text-xs text-blue-700 space-y-1">
            <div>✅ Free and open-source</div>
            <div>✅ Secure - no passwords shared</div>
            <div>✅ Supported by many banks</div>
            <div>✅ Real-time transaction data</div>
          </div>
        </div>

        {/* Connection Token Input */}
        {connectionStatus === 'disconnected' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              SimpleFIN Connection Token
            </label>
            <input
              type="password"
              placeholder="Enter your SimpleFIN connection token..."
              value={connectionToken}
              onChange={(e) => setConnectionToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500">
              Get your connection token from <a href="https://simplefin.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">simplefin.org</a>
            </p>
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="font-medium">
              {connectionStatus === 'connected' ? bankName : 'Not Connected'}
            </div>
            <div className="text-sm text-gray-600">
              Status: {connectionStatus === 'connected' ? 'Connected' : 
                      connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </div>
            {connectionStatus === 'connected' && accounts.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
              </div>
            )}
            {connectionStatus === 'connected' && (
              <div className="text-xs text-blue-600 mt-1">
                Fetching available transaction data (up to 1 year)
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus === 'disconnected' && (
              <button
                onClick={connectToSimpleFIN}
                disabled={loading || !connectionToken.trim()}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connecting...' : 'Connect to SimpleFIN'}
              </button>
            )}
            {connectionStatus === 'connected' && (
              <div className="flex gap-2">
                <button
                  onClick={getRecentTransactions}
                  disabled={loading}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Fetching...' : 'Get Recent Transactions'}
                </button>
                <button
                  onClick={resetImportedTransactions}
                  className="btn bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  Reset Import History
                </button>
                <button
                  onClick={disconnectFromSimpleFIN}
                  className="btn bg-red-600 text-white hover:bg-red-700"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Setup Instructions */}
        {connectionStatus === 'disconnected' && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">How to Set Up SimpleFIN</h3>
            <ol className="text-sm text-gray-700 space-y-2">
              <li>1. Visit <a href="https://simplefin.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">simplefin.org</a></li>
              <li>2. Create a SimpleFIN account</li>
              <li>3. Add your bank account(s)</li>
              <li>4. Get your connection token</li>
              <li>5. Enter the token above and click "Connect to SimpleFIN"</li>
            </ol>
          </div>
        )}
      </div>

      {loading && <div className="text-sm text-gray-600">Connecting to SimpleFIN...</div>}
      
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="font-medium text-blue-900">{allBills.length}</div>
              <div className="text-sm text-blue-700">Total Bills</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="font-medium text-green-900">{allPaychecks.length}</div>
              <div className="text-sm text-green-700">Total Paychecks</div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="font-medium text-purple-900">{allTransfers.length}</div>
              <div className="text-sm text-purple-700">Internal Transfers</div>
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
                value={selectedAccount}
                onChange={(e) => {
                  const newAccountId = e.target.value;
                  setSelectedAccount(newAccountId);
                  
                  // Notify parent of selected account change
                  if (newAccountId === 'all') {
                    onSelectedAccountChanged?.(null);
                  } else {
                    const selectedAccountData = accounts.find(acc => acc.id === newAccountId);
                    onSelectedAccountChanged?.(selectedAccountData || null);
                  }
                }}
                className="px-3 py-2 border rounded"
              >
                <option value="all">All Accounts ({accounts.length})</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 border rounded"
              >
                <option value="all">All Types</option>
                <option value="bill">Bills Only</option>
                <option value="paycheck">Paychecks Only</option>
                <option value="internal_transfer">Internal Transfers Only</option>
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
              <button
                onClick={() => selectByType('internal_transfer')}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                Select Transfers
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

          {/* Import Button */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={importSelected}
              disabled={transactions.filter(t => t.selected).length === 0}
              className="btn btn-primary"
            >
              Import Selected ({transactions.filter(t => t.selected).length} transactions)
            </button>
            {selectedAccount !== 'all' && (
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                📁 From: {accounts.find(acc => acc.id === selectedAccount)?.name || 'Selected Account'}
              </div>
            )}
            {transactions.length === 0 && connectionStatus === 'connected' && (
              <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                ✅ All transactions up to date! No new transactions to import.
              </div>
            )}
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
                  <th className="text-left py-2 px-2">Account</th>
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
                    <td className="py-2 px-2 text-right">${(Number(t.amount) || 0).toFixed(2)}</td>
                    <td className="py-2 px-2 text-xs text-gray-600">
                      {accounts.find(acc => acc.id === t.account)?.name || 'Unknown'}
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={t.type}
                        onChange={(e) => updateTransactionType(t.id, e.target.value as any)}
                        className={`px-2 py-1 rounded text-xs border-0 ${
                          t.type === 'bill' ? 'bg-red-100 text-red-800' :
                          t.type === 'paycheck' ? 'bg-green-100 text-green-800' :
                          t.type === 'internal_transfer' ? 'bg-purple-100 text-purple-800' :
                          t.type === 'income' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="bill">Bill</option>
                        <option value="paycheck">Paycheck</option>
                        <option value="internal_transfer">Internal Transfer</option>
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
