import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface SimpleFINRequest {
  token?: string;
  accessToken?: string; // Added for new logic
}

interface SimpleFINAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface SimpleFINTransaction {
  id: string;
  memo: string;
  amount: number;
  posted: string;
  account: string;
}

interface SimpleFINResponse {
  accounts: SimpleFINAccount[];
  transactions: SimpleFINTransaction[];
  accessUrl?: string; // Added for new logic
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { token, accessToken }: SimpleFINRequest = await request.json();

    // For authenticated users, try to get stored connection first
    if (session?.user?.id && !token && !accessToken) {
      console.log('Checking for stored SimpleFIN connection...');
      
      const connection = await prisma.simplefinConnection.findUnique({
        where: { userId: session.user.id }
      });

      if (connection && connection.isActive && connection.accessUrl) {
        console.log('Using stored database access token');
        // Update last sync time
        await prisma.simplefinConnection.update({
          where: { userId: session.user.id },
          data: { lastSyncAt: new Date() }
        });
        return await fetchDataWithAccessToken(connection.accessUrl);
      }
    }

    // If we have an access token passed directly, use it
    if (accessToken) {
      console.log('Using provided access token');
      return await fetchDataWithAccessToken(accessToken);
    }

    // Otherwise, we need a setup token to create a new connection
    if (!token) {
      return NextResponse.json(
        { error: 'SimpleFIN token or access token is required' },
        { status: 400 }
      );
    }

    console.log('Processing SimpleFIN setup token:', token.substring(0, 20) + '...');

    // Step 1: Exchange Setup Token for Access Token
    let accessUrl: string;
    try {
      // Decode the base64 setup token to get the claim URL
      const claimUrl = Buffer.from(token, 'base64').toString('utf-8');
      console.log('Claim URL:', claimUrl);

      // POST to the claim URL to get the access URL
      const claimResponse = await fetch(claimUrl, {
        method: 'POST',
        headers: {
          'Content-Length': '0',
        },
      });

      if (!claimResponse.ok) {
        throw new Error(`Failed to claim access token: ${claimResponse.status} ${claimResponse.statusText}`);
      }

      accessUrl = await claimResponse.text();
      console.log('Access URL received:', accessUrl);
    } catch (claimError) {
      console.error('Error claiming access token:', claimError);
      return NextResponse.json(
        { 
          error: 'Failed to exchange setup token for access token. Please check your token and try again.',
          details: claimError instanceof Error ? claimError.message : 'Unknown error'
        },
        { status: 400 }
      );
    }

    // Step 2: Use Access Token to fetch data
    const result = await fetchDataWithAccessToken(accessUrl);
    
    // For authenticated users, save the connection to database
    if (session?.user?.id && result.ok) {
      try {
        const resultData = await result.json();
        const bankName = resultData.accounts && resultData.accounts.length > 0 
          ? `${resultData.accounts[0].name} (SimpleFIN)` 
          : 'Connected Bank (SimpleFIN)';
          
        await prisma.simplefinConnection.upsert({
          where: { userId: session.user.id },
          update: {
            accessUrl,
            bankName,
            isActive: true,
            lastSyncAt: new Date()
          },
          create: {
            userId: session.user.id,
            accessUrl,
            bankName,
            isActive: true,
            lastSyncAt: new Date()
          }
        });
        
        console.log('Saved SimpleFIN connection to database for user:', session.user.id);
        
        // Return the result data
        return NextResponse.json(resultData);
      } catch (dbError) {
        console.error('Failed to save SimpleFIN connection to database:', dbError);
        // Still return the result even if database save failed
        return result;
      }
    }
    
    return result;

  } catch (error) {
    console.error('SimpleFIN fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process SimpleFIN request. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function fetchDataWithAccessToken(accessUrl: string) {
  try {
    // Parse the access URL to extract credentials and base URL
    const urlMatch = accessUrl.match(/^https?:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!urlMatch) {
      throw new Error('Invalid access URL format');
    }

    const [, username, password, baseUrl] = urlMatch;
    
    // Calculate date range for rolling yearly window
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365); // 365 days ago
    
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);
    
    // Use the correct SimpleFIN API parameters from documentation
    const accountsUrl = `https://${baseUrl}/accounts?start-date=${startTimestamp}&end-date=${endTimestamp}`;

    console.log('Fetching accounts from:', accountsUrl);
    console.log('Date range:', `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Fetch accounts data using Basic Auth
    const accountsResponse = await fetch(accountsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error('SimpleFIN accounts API error:', accountsResponse.status, errorText);
      throw new Error(`Failed to fetch accounts: ${accountsResponse.status} ${accountsResponse.statusText}`);
    }

    const accountsData = await accountsResponse.json();
    console.log('SimpleFIN accounts data received:', JSON.stringify(accountsData, null, 2));
    
    // Count total transactions before processing
    let totalTransactionsReceived = 0;
    if (accountsData.accounts && Array.isArray(accountsData.accounts)) {
      accountsData.accounts.forEach((account: any) => {
        if (account.transactions && Array.isArray(account.transactions)) {
          totalTransactionsReceived += account.transactions.length;
          console.log(`Account "${account.name || 'Unknown'}" has ${account.transactions.length} transactions`);
        }
      });
    }
    console.log(`Total transactions received from SimpleFIN API: ${totalTransactionsReceived}`);

    // Process the SimpleFIN response
    const accounts: SimpleFINAccount[] = [];
    const transactions: SimpleFINTransaction[] = [];

    if (accountsData.accounts && Array.isArray(accountsData.accounts)) {
      accountsData.accounts.forEach((account: any, accountIndex: number) => {
        // Add account
        accounts.push({
          id: account.id || `acc-${accountIndex}`,
          name: account.name || 'Unknown Account',
          type: account.type || 'unknown',
          balance: parseFloat(account.balance) || 0,
        });

        // Add transactions for this account
        if (account.transactions && Array.isArray(account.transactions)) {
          account.transactions.forEach((tx: any, txIndex: number) => {
            transactions.push({
              id: tx.id || `tx-${accountIndex}-${txIndex}`,
              memo: tx.description || tx.memo || tx.name || 'Unknown Transaction',
              amount: parseFloat(tx.amount) || 0,
              posted: tx.posted ? new Date(tx.posted * 1000).toISOString() : new Date().toISOString(),
              account: account.id || `acc-${accountIndex}`,
            });
          });
        }
      });
    }

    // No sample data - if no transactions found, return empty array
    if (transactions.length === 0) {
      console.log('No transactions found in SimpleFIN response');
    }

    const result: SimpleFINResponse = {
      accounts,
      transactions,
      accessUrl, // Include the access URL for storage
    };

    console.log('Processed SimpleFIN data:', {
      accountsCount: accounts.length,
      transactionsCount: transactions.length
    });

    return NextResponse.json(result);

  } catch (fetchError) {
    console.error('Error fetching SimpleFIN data:', fetchError);
    return NextResponse.json(
      { 
        error: 'Failed to fetch data from SimpleFIN. Please try again.',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
