import { NextRequest, NextResponse } from 'next/server';

// Plaid integration is optional and requires API keys
// This endpoint is kept for compatibility but may not work without proper configuration
export async function POST(request: NextRequest) {
  try {
    // Check if Plaid credentials are configured
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      return NextResponse.json(
        { error: 'Plaid integration not configured. Use CSV upload or manual entry instead.' },
        { status: 400 }
      );
    }

    // For now, return an error suggesting to use free alternatives
    return NextResponse.json(
      { 
        error: 'Plaid integration is deprecated. Please use CSV upload or manual entry for free data import.',
        alternatives: [
          'Upload CSV file from your bank',
          'Use manual entry for bills and paychecks',
          'Try sample data to see the app in action'
        ]
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error with Plaid integration:', error);
    return NextResponse.json(
      { error: 'Plaid integration not available. Use free alternatives instead.' },
      { status: 500 }
    );
  }
}
