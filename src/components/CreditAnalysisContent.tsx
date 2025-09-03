'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from './AuthWrapper';

interface SimpleFINAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface SimpleFINTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  account: string;
  memo?: string;
}

interface CategorySpending {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  monthlyAverage: number;
  transactions: SimpleFINTransaction[];
}

// Credit card specific keywords for better categorization
const CREDIT_CARD_CATEGORIES = {
  'Dining & Restaurants': ['restaurant', 'cafe', 'bistro', 'diner', 'food', 'pizza', 'burger', 'taco', 'sushi', 'bar', 'pub', 'grill', 'kitchen', 'eatery', 'mcdonald', 'subway', 'starbucks', 'dunkin', 'chipotle'],
  'Groceries': ['grocery', 'supermarket', 'market', 'kroger', 'safeway', 'walmart', 'target', 'costco', 'whole foods', 'trader joe', 'publix', 'aldi', 'food lion', 'harris teeter'],
  'Gas & Fuel': ['gas', 'fuel', 'shell', 'exxon', 'bp', 'chevron', 'mobil', 'texaco', 'sunoco', 'speedway', 'wawa', 'circle k'],
  'Shopping & Retail': ['amazon', 'ebay', 'walmart', 'target', 'best buy', 'home depot', 'lowes', 'macy', 'nordstrom', 'tj maxx', 'marshalls', 'kohls', 'old navy', 'gap'],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'apple music', 'youtube', 'theater', 'cinema', 'movie', 'concert', 'gaming', 'steam', 'playstation', 'xbox'],
  'Transportation': ['uber', 'lyft', 'taxi', 'parking', 'toll', 'metro', 'bus', 'train', 'airline', 'flight', 'rental car', 'car rental'],
  'Health & Medical': ['pharmacy', 'cvs', 'walgreens', 'rite aid', 'hospital', 'clinic', 'doctor', 'dentist', 'medical', 'health'],
  'Utilities & Services': ['electric', 'power', 'energy', 'water', 'gas', 'internet', 'wifi', 'phone', 'mobile', 'cable', 'tv', 'insurance'],
  'Travel & Hotels': ['hotel', 'motel', 'airbnb', 'booking', 'expedia', 'marriott', 'hilton', 'hyatt', 'holiday inn', 'travel', 'vacation'],
  'Subscriptions': ['subscription', 'monthly', 'annual', 'membership', 'gym', 'fitness', 'club']
};

function categorizeTransaction(name: string, memo?: string, customCategories?: {[transactionId: string]: string}, transactionId?: string): string {
  // Check if there's a custom category assignment first
  if (customCategories && transactionId && customCategories[transactionId]) {
    return customCategories[transactionId];
  }
  
  const searchText = `${name} ${memo || ''}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CREDIT_CARD_CATEGORIES)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
}

export default function CreditAnalysisContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const isGuestMode = searchParams.get('guest') === 'true';
  
  const [transactions, setTransactions] = useState<SimpleFINTransaction[]>([]);
  const [accounts, setAccounts] = useState<SimpleFINAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'30' | '90' | '180' | '365'>('90');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [customCategories, setCustomCategories] = useState<{[transactionId: string]: string}>({});
  const [availableCategories, setAvailableCategories] = useState<string[]>(Object.keys(CREDIT_CARD_CATEGORIES));
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Load credit card data from SimpleFIN
  const loadCreditCardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const storedAccessUrl = localStorage.getItem('simplefin_access_url');
      if (!storedAccessUrl) {
        setError('No SimpleFIN connection found. Please connect to SimpleFIN from the main Money Calendar page first.');
        return;
      }

      const response = await fetch('/api/simplefin/fetch-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: storedAccessUrl }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Show all accounts - let user choose which are credit cards
      const allAccounts = data.accounts;
      
      // Get all transactions and filter for actual spending (negative amounts = charges)
      const allTransactions = data.transactions
        .filter((tx: any) => (tx.amount || 0) < 0) // Only include charges/purchases (negative amounts)
        .map((tx: any) => ({
          id: `simplefin-${tx.id}`,
          name: tx.memo || tx.name || 'Unknown Transaction',
          amount: Math.abs(tx.amount || 0), // Convert to positive for display
          date: tx.posted || tx.date || new Date().toISOString().slice(0, 10),
          account: tx.account || 'unknown',
          memo: tx.memo || ''
        }));

      setAccounts(allAccounts);
      setTransactions(allTransactions);
      
      if (allAccounts.length === 0) {
        setError('No accounts found. Make sure you have accounts connected in SimpleFIN.');
      }
      
    } catch (err) {
      console.error('Credit card data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch credit card data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditCardData();
  }, []);

  // Calculate category spending analysis
  const categoryAnalysis = useMemo(() => {
    if (transactions.length === 0) return [];

    // Filter by selected account and time range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));
    
    const filteredTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const matchesAccount = selectedAccount === 'all' || tx.account === selectedAccount;
      const withinTimeRange = txDate >= cutoffDate;
      return matchesAccount && withinTimeRange;
    });

    // Group by category
    const categoryMap = new Map<string, SimpleFINTransaction[]>();
    
    filteredTransactions.forEach(tx => {
      const category = categorizeTransaction(tx.name, tx.memo, customCategories, tx.id);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(tx);
    });

    // Calculate statistics for each category
    const monthsInRange = parseInt(timeRange) / 30;
    
    const analysis: CategorySpending[] = Array.from(categoryMap.entries()).map(([category, txs]) => {
      const totalAmount = txs.reduce((sum, tx) => sum + tx.amount, 0);
      const transactionCount = txs.length;
      const averageAmount = totalAmount / transactionCount;
      const monthlyAverage = totalAmount / monthsInRange;
      
      return {
        category,
        totalAmount,
        transactionCount,
        averageAmount,
        monthlyAverage,
        transactions: txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
    });

    return analysis.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [transactions, selectedAccount, timeRange, customCategories]);

  const totalSpending = categoryAnalysis.reduce((sum, cat) => sum + cat.totalAmount, 0);
  const monthsInRange = parseInt(timeRange) / 30;
  const averageMonthlySpending = totalSpending / monthsInRange;

  // Category editing functions
  const updateTransactionCategory = (transactionId: string, newCategory: string) => {
    setCustomCategories(prev => ({
      ...prev,
      [transactionId]: newCategory
    }));
  };

  const addNewCategory = () => {
    if (newCategoryName.trim() && !availableCategories.includes(newCategoryName.trim())) {
      setAvailableCategories(prev => [...prev, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const saveCustomCategories = () => {
    // Save to localStorage for persistence
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
    localStorage.setItem('availableCategories', JSON.stringify(availableCategories));
    setEditMode(false);
  };

  const loadCustomCategories = () => {
    const saved = localStorage.getItem('customCategories');
    const savedAvailable = localStorage.getItem('availableCategories');
    if (saved) {
      setCustomCategories(JSON.parse(saved));
    }
    if (savedAvailable) {
      setAvailableCategories(JSON.parse(savedAvailable));
    }
  };

  // Load custom categories on mount
  useEffect(() => {
    loadCustomCategories();
  }, []);

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Spending Analysis
                  {editMode && <span className="text-lg text-purple-600 ml-3">✏️ Edit Mode</span>}
                </h1>
                <p className="text-gray-600 mt-1">
                  Analyze your spending patterns by category for any account (payments and credits excluded)
                  {editMode && <span className="text-purple-600"> • Click on transactions to change their categories</span>}
                </p>
              </div>
              <Link 
                href="/" 
                className="btn bg-blue-600 text-white hover:bg-blue-700"
              >
                ← Back to Calendar
              </Link>
            </div>
            
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Accounts ({accounts.length})</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type}) - Balance: ${account.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="180">Last 6 months</option>
                  <option value="365">Last year</option>
                </select>
              </div>
              
              <div className="sm:self-end flex gap-2">
                <button
                  onClick={loadCreditCardData}
                  disabled={loading}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
                <button
                  onClick={() => editMode ? saveCustomCategories() : setEditMode(true)}
                  className={`btn ${editMode ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                >
                  {editMode ? 'Save Changes' : 'Edit Categories'}
                </button>
                {editMode && (
                  <button
                    onClick={() => setEditMode(false)}
                    className="btn bg-gray-600 text-white hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
            
            {/* Add New Category */}
            {editMode && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">Add New Category</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter new category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addNewCategory()}
                  />
                  <button
                    onClick={addNewCategory}
                    disabled={!newCategoryName.trim()}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800">{error}</div>
              {error.includes('No SimpleFIN connection') && (
                <div className="mt-2">
                  <Link href="/" className="text-red-600 hover:text-red-800 underline">
                    Go to Money Calendar to connect SimpleFIN
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="text-xl text-gray-600">Loading account data...</div>
            </div>
          )}

          {/* Summary Cards */}
          {!loading && !error && accounts.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-sm font-medium text-gray-500">Total Spending</div>
                  <div className="text-2xl font-bold text-gray-900">${totalSpending.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">Last {timeRange} days</div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-sm font-medium text-gray-500">Monthly Average</div>
                  <div className="text-2xl font-bold text-blue-600">${averageMonthlySpending.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">Based on {monthsInRange.toFixed(1)} months</div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-sm font-medium text-gray-500">Total Transactions</div>
                  <div className="text-2xl font-bold text-green-600">
                    {categoryAnalysis.reduce((sum, cat) => sum + cat.transactionCount, 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Avg: ${(totalSpending / categoryAnalysis.reduce((sum, cat) => sum + cat.transactionCount, 0) || 0).toFixed(2)} per transaction
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-sm font-medium text-gray-500">Categories</div>
                  <div className="text-2xl font-bold text-purple-600">{categoryAnalysis.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Spending categories found</div>
                </div>
              </div>

              {/* Category Analysis */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Spending by Category</h2>
                </div>
                
                {categoryAnalysis.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-2">💳</div>
                    <p>No spending transactions found for the selected account and time range.</p>
                    <p className="text-xs mt-2">Note: Payments and credits are excluded from spending analysis.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {categoryAnalysis.map((category, index) => (
                      <div key={category.category} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{category.category}</h3>
                            <div className="text-sm text-gray-500">
                              {category.transactionCount} transactions • ${category.averageAmount.toFixed(2)} avg per transaction
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">${category.totalAmount.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">${category.monthlyAverage.toFixed(2)}/month</div>
                            <div className="text-xs text-blue-600">
                              {((category.totalAmount / totalSpending) * 100).toFixed(1)}% of total
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(category.totalAmount / Math.max(...categoryAnalysis.map(c => c.totalAmount))) * 100}%` }}
                          ></div>
                        </div>
                        
                        {/* Recent transactions */}
                        <details className="group">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                            {editMode ? 'Edit transactions' : 'View recent transactions'} ({Math.min(editMode ? 10 : 5, category.transactions.length)} of {category.transactions.length})
                          </summary>
                          <div className="mt-3 space-y-2">
                            {category.transactions.slice(0, editMode ? 10 : 5).map((tx, txIndex) => (
                              <div key={txIndex} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-sm">
                                <div className="flex-1">
                                  <div className="font-medium">{tx.name}</div>
                                  <div className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</div>
                                  {editMode && (
                                    <div className="mt-2">
                                      <select
                                        value={customCategories[tx.id] || categorizeTransaction(tx.name, tx.memo)}
                                        onChange={(e) => updateTransactionCategory(tx.id, e.target.value)}
                                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        {availableCategories.map(cat => (
                                          <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="Other">Other</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                                <div className="font-medium">${tx.amount.toFixed(2)}</div>
                              </div>
                            ))}
                            {category.transactions.length > (editMode ? 10 : 5) && (
                              <div className="text-xs text-gray-500 text-center py-2">
                                ... and {category.transactions.length - (editMode ? 10 : 5)} more transactions
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}
