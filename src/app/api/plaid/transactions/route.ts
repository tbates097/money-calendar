import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

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

function categorizeTransaction(transaction: any) {
  const name = transaction.name?.toLowerCase() || '';
  const category = transaction.category?.join(' ')?.toLowerCase() || '';
  const searchText = `${name} ${category}`;

  // Check for paycheck indicators
  if (PAYCHECK_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    return 'paycheck';
  }

  // Check for bill indicators
  if (BILL_KEYWORDS.some(keyword => searchText.includes(keyword))) {
    return 'bill';
  }

  // Default categorization based on amount
  if (transaction.amount > 0) {
    return 'income';
  } else {
    return 'expense';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, startDate, endDate } = await request.json();

    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        include_personal_finance_category: true,
      },
    });

    const transactions = transactionsResponse.data.transactions.map(transaction => ({
      id: transaction.transaction_id,
      name: transaction.name,
      amount: transaction.amount,
      date: transaction.date,
      category: transaction.category,
      type: categorizeTransaction(transaction),
      merchant: transaction.merchant_name,
    }));

    // Group by type
    const bills = transactions.filter(t => t.type === 'bill');
    const paychecks = transactions.filter(t => t.type === 'paycheck');
    const other = transactions.filter(t => !['bill', 'paycheck'].includes(t.type));

    return NextResponse.json({
      transactions,
      bills,
      paychecks,
      other,
      total: transactions.length,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
