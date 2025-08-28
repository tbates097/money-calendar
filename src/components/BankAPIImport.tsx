'use client';

import { useState } from 'react';
import { Bill, Paycheck } from '@/lib/finance';

interface BankAPIImportProps {
  onBillsImported: (bills: Bill[]) => void;
  onPaychecksImported: (paychecks: Paycheck[]) => void;
}

export default function BankAPIImport({ onBillsImported, onPaychecksImported }: BankAPIImportProps) {
  const [selectedBank, setSelectedBank] = useState<string>('');

  const banks = [
    {
      name: 'Chase Bank',
      csvExport: 'Account Activity → Download → CSV',
      apiStatus: 'Limited API access',
      notes: 'Chase offers some API access for business accounts'
    },
    {
      name: 'Bank of America',
      csvExport: 'Statements → Download → CSV',
      apiStatus: 'Open Banking API available',
      notes: 'Supports Open Banking standards'
    },
    {
      name: 'Wells Fargo',
      csvExport: 'Account Activity → Export → CSV',
      apiStatus: 'Developer API available',
      notes: 'Requires business account and approval'
    },
    {
      name: 'Citibank',
      csvExport: 'Account Details → Download → CSV',
      apiStatus: 'Open Banking API available',
      notes: 'Supports PSD2/Open Banking'
    },
    {
      name: 'Capital One',
      csvExport: 'Account Activity → Export → CSV',
      apiStatus: 'Developer API available',
      notes: 'Requires application and approval'
    }
  ];

  return (
    <div className="card space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Bank Integration Options</h2>
        <p className="text-gray-600">Legal and secure ways to import your bank data</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-medium text-yellow-800">Important Security Notice</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Automated bank scraping is not recommended due to security risks, legal issues, and terms of service violations. 
              We recommend using the legal alternatives below.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Export Method */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📊 Manual CSV Export (Recommended)</h3>
          <p className="text-sm text-gray-600">
            Export your transactions as CSV from your bank's website and upload them here.
          </p>
          
          <div className="space-y-3">
            {banks.map((bank) => (
              <div key={bank.name} className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-sm">{bank.name}</h4>
                <p className="text-xs text-gray-600 mt-1">{bank.csvExport}</p>
              </div>
            ))}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="font-medium text-green-800 text-sm">✅ Benefits</h4>
            <ul className="text-xs text-green-700 mt-1 space-y-1">
              <li>• 100% legal and compliant</li>
              <li>• No security risks</li>
              <li>• Works with all banks</li>
              <li>• No API keys required</li>
            </ul>
          </div>
        </div>

        {/* API Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">🔌 Bank APIs (Advanced)</h3>
          <p className="text-sm text-gray-600">
            Some banks offer official APIs for developers and businesses.
          </p>

          <div className="space-y-3">
            {banks.map((bank) => (
              <div key={bank.name} className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-sm">{bank.name}</h4>
                <p className="text-xs text-gray-600 mt-1">{bank.apiStatus}</p>
                <p className="text-xs text-gray-500 mt-1">{bank.notes}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-800 text-sm">ℹ️ Requirements</h4>
            <ul className="text-xs text-blue-700 mt-1 space-y-1">
              <li>• Business account usually required</li>
              <li>• Application and approval process</li>
              <li>• Technical implementation needed</li>
              <li>• May have usage fees</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">🚀 Recommended Workflow</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">1</span>
            <span>Log into your bank's website manually</span>
          </div>
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">2</span>
            <span>Export your transactions as CSV (usually under "Account Activity" or "Statements")</span>
          </div>
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">3</span>
            <span>Upload the CSV file in our app</span>
          </div>
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">4</span>
            <span>Review and import your categorized transactions</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-2">💡 Pro Tips</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Most banks allow CSV exports for the last 90 days</li>
          <li>• Set up calendar reminders to export monthly</li>
          <li>• Use recurring manual entries for regular bills</li>
          <li>• Consider using budgeting apps that support bank APIs legally</li>
        </ul>
      </div>
    </div>
  );
}
