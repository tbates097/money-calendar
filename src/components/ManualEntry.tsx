'use client';

import { useState } from 'react';
import { Bill, Paycheck } from '@/lib/finance';

interface ManualEntryProps {
  onBillsImported: (bills: Bill[]) => void;
  onPaychecksImported: (paychecks: Paycheck[]) => void;
}

export default function ManualEntry({ onBillsImported, onPaychecksImported }: ManualEntryProps) {
  const [activeTab, setActiveTab] = useState<'bill' | 'paycheck'>('bill');
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    recurring: false,
    frequency: 'monthly',
    interval: '1'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (!formData.name || isNaN(amount) || !formData.date) {
      return;
    }

    const item = {
      id: `manual-${Date.now()}`,
      name: formData.name,
      amount: Math.abs(amount),
      date: formData.date,
      recurring: formData.recurring,
      schedule: formData.recurring ? {
        frequency: formData.frequency as any,
        interval: parseInt(formData.interval)
      } : null,
    };

    if (activeTab === 'bill') {
      onBillsImported([item as Bill]);
    } else {
      onPaychecksImported([item as Paycheck]);
    }

    // Reset form
    setFormData({
      name: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      recurring: false,
      frequency: 'monthly',
      interval: '1'
    });
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Manual Entry</h2>
      
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('bill')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'bill'
              ? 'border-b-2 border-red-500 text-red-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Add Bill
        </button>
        <button
          onClick={() => setActiveTab('paycheck')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'paycheck'
              ? 'border-b-2 border-green-500 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Add Paycheck
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {activeTab === 'bill' ? 'Bill Name' : 'Paycheck Source'}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={activeTab === 'bill' ? 'e.g., Rent, Netflix, Utilities' : 'e.g., Employer Name'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="recurring"
            checked={formData.recurring}
            onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="recurring" className="text-sm font-medium">
            Recurring {activeTab === 'bill' ? 'Bill' : 'Paycheck'}
          </label>
        </div>

        {formData.recurring && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Every</label>
              <input
                type="number"
                min="1"
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className={`w-full py-2 px-4 rounded-md font-medium text-white ${
            activeTab === 'bill'
              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
          } focus:outline-none focus:ring-2 focus:ring-offset-2`}
        >
          Add {activeTab === 'bill' ? 'Bill' : 'Paycheck'}
        </button>
      </form>

      <div className="text-xs text-gray-500">
        <p>💡 <strong>Tip:</strong> Use recurring entries for regular bills and paychecks to save time.</p>
        <p>💡 <strong>Tip:</strong> You can edit or delete entries later from the main calendar view.</p>
      </div>
    </div>
  );
}
