'use client';

import { useState } from 'react';
import { Bill, Paycheck } from '@/lib/finance';
import CSVImport from './CSVImport';
import ManualEntry from './ManualEntry';
import BankAPIImport from './BankAPIImport';
import SimpleFINImport from './SimpleFINImport';

interface SimpleFINAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface ImportSelectorProps {
  onBillsImported: (bills: Bill[]) => void;
  onPaychecksImported: (paychecks: Paycheck[]) => void;
  onAccountsImported: (accounts: SimpleFINAccount[]) => void;
  onTransactionsImported?: (transactions: any[]) => void;
  onSelectedAccountChanged?: (account: SimpleFINAccount | null) => void;
}

type ImportMethod = 'csv' | 'manual' | 'bank' | 'simplefin';

export default function ImportSelector({ onBillsImported, onPaychecksImported, onAccountsImported, onTransactionsImported, onSelectedAccountChanged }: ImportSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod | null>(null);



  if (selectedMethod === 'csv') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to import options
        </button>
        <CSVImport 
          onBillsImported={(bills) => {
            console.log('ImportSelector received bills:', bills);
            onBillsImported(bills);
          }} 
          onPaychecksImported={(paychecks) => {
            console.log('ImportSelector received paychecks:', paychecks);
            onPaychecksImported(paychecks);
          }} 
        />
      </div>
    );
  }

  if (selectedMethod === 'manual') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to import options
        </button>
        <ManualEntry onBillsImported={onBillsImported} onPaychecksImported={onPaychecksImported} />
      </div>
    );
  }

  if (selectedMethod === 'bank') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to import options
        </button>
        <BankAPIImport onBillsImported={onBillsImported} onPaychecksImported={onPaychecksImported} />
      </div>
    );
  }

  if (selectedMethod === 'simplefin') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedMethod(null)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to import options
        </button>
        <SimpleFINImport 
          onBillsImported={(bills) => {
            console.log('ImportSelector received SimpleFIN bills:', bills);
            onBillsImported(bills);
          }} 
          onPaychecksImported={(paychecks) => {
            console.log('ImportSelector received SimpleFIN paychecks:', paychecks);
            onPaychecksImported(paychecks);
          }}
          onAccountsImported={(accounts) => {
            console.log('ImportSelector received SimpleFIN accounts:', accounts);
            onAccountsImported(accounts);
          }}
          onTransactionsImported={(transactions) => {
            console.log('ImportSelector received SimpleFIN transactions:', transactions);
            onTransactionsImported?.(transactions);
          }}
          onSelectedAccountChanged={(account) => {
            console.log('ImportSelector received selected account:', account);
            onSelectedAccountChanged?.(account);
          }}
        />
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Import Your Financial Data</h2>
        <p className="text-gray-600">Choose how you'd like to add your bills and paychecks</p>
      </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CSV Import Option */}
        <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
             onClick={() => setSelectedMethod('csv')}>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">Upload CSV</h3>
            <p className="text-sm text-gray-600 mb-4">
              Export your bank statement as CSV and upload it here. We'll automatically categorize your transactions.
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>✅ Works with most banks</div>
              <div>✅ Automatic categorization</div>
              <div>✅ Completely free</div>
            </div>
          </div>
        </div>

        {/* Manual Entry Option */}
        <div className="border border-gray-200 rounded-lg p-6 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
             onClick={() => setSelectedMethod('manual')}>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">Manual Entry</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add bills and paychecks one by one. Perfect for setting up recurring payments.
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>✅ Full control</div>
              <div>✅ Recurring options</div>
              <div>✅ No bank connection needed</div>
            </div>
          </div>
        </div>

                 {/* Bank API Option */}
         <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedMethod('bank')}>
           <div className="text-center">
             <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
               </svg>
             </div>
             <h3 className="font-semibold text-lg mb-2">Bank Integration</h3>
             <p className="text-sm text-gray-600 mb-4">
               Learn about legal bank API options and manual CSV export methods.
             </p>
             <div className="text-xs text-gray-500 space-y-1">
               <div>✅ Legal alternatives</div>
               <div>✅ Security best practices</div>
               <div>✅ Bank-specific guides</div>
             </div>
           </div>
         </div>

         {/* SimpleFIN Option */}
         <div className="border border-gray-200 rounded-lg p-6 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedMethod('simplefin')}>
           <div className="text-center">
             <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
               </svg>
             </div>
             <h3 className="font-semibold text-lg mb-2">SimpleFIN</h3>
             <p className="text-sm text-gray-600 mb-4">
               Connect directly to your bank using SimpleFIN protocol. Real-time transaction data.
             </p>
             <div className="text-xs text-gray-500 space-y-1">
               <div>✅ Free and open-source</div>
               <div>✅ Secure - no passwords shared</div>
               <div>✅ Real-time data</div>
               <div>✅ Many banks supported</div>
             </div>
           </div>
         </div>

      </div>

      <div className="text-center pt-4 border-t">
        <p className="text-sm text-gray-500">
          All import methods are completely free and don't require any bank connections or API keys.
        </p>
      </div>
    </div>
  );
}
