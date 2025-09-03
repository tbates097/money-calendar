'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Transaction, ScheduleConfig, defaultScheduleConfig } from '@/lib/finance'

interface SimpleFINAccount {
  id: string
  name: string
  type: string
  balance: number
}

interface UserData {
  transactions: Transaction[]
  balanceStart: number
  config: ScheduleConfig
  selectedAccount: SimpleFINAccount | null
  transactionsLoaded: boolean
}

export function useUserData() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const isGuestMode = searchParams?.get('guest') === 'true' || false

  const [userData, setUserData] = useState<UserData>({
    transactions: [],
    balanceStart: 0,
    config: defaultScheduleConfig,
    selectedAccount: null,
    transactionsLoaded: false
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data from localStorage (guest mode) or API (authenticated)
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (isGuestMode || status === 'unauthenticated') {
        // Guest mode - use localStorage
        const raw = localStorage.getItem("money-calendar-state")
        if (raw) {
          const parsed = JSON.parse(raw)
          console.log('💾 Loading from localStorage (guest mode):', { 
            hasTransactions: !!parsed.transactions, 
            transactionCount: parsed.transactions?.length || 0
          })
          
          // Handle migration from old format
          let transactions: Transaction[] = []
          if (parsed.bills || parsed.paychecks) {
            transactions = [
              ...(parsed.bills || []).map((b: any) => ({ ...b, type: 'bill' as const })),
              ...(parsed.paychecks || []).map((p: any) => ({ ...p, type: 'paycheck' as const }))
            ]
          } else {
            transactions = parsed.transactions ?? []
          }
          
          setUserData({
            transactions,
            balanceStart: parsed.balanceStart ?? 0,
            config: parsed.config ?? defaultScheduleConfig,
            selectedAccount: parsed.selectedAccount ?? null,
            transactionsLoaded: true
          })
        } else {
          console.log('💾 No localStorage data found - starting fresh (guest mode)')
          setUserData(prev => ({ ...prev, transactionsLoaded: true }))
        }
      } else if (session?.user?.id) {
        // Authenticated mode - use API
        console.log('🌐 Loading from database (authenticated mode)')
        
        const [transactionsRes, configRes] = await Promise.all([
          fetch('/api/user/transactions'),
          fetch('/api/user/config')
        ])

        if (!transactionsRes.ok || !configRes.ok) {
          throw new Error('Failed to load user data')
        }

        const transactions = await transactionsRes.json()
        const config = await configRes.json()

        setUserData({
          transactions: transactions || [],
          balanceStart: config.balanceStart || 0,
          config: {
            payPeriodDays: config.payPeriodDays || 14,
            monthsToProject: config.monthsToProject || 12,
            safetyCushionDays: config.safetyCushionDays || 3
          },
          selectedAccount: null, // TODO: Load selected account
          transactionsLoaded: true
        })
        
        console.log('✅ Loaded user data from database:', {
          transactionCount: transactions?.length || 0,
          balanceStart: config.balanceStart
        })
      }
    } catch (err) {
      console.error('Failed to load user data:', err)
      setError('Failed to load your data. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, status, isGuestMode])

  // Save data to localStorage (guest mode) or API (authenticated)
  const saveData = useCallback(async (updates: Partial<UserData>) => {
    const newData = { ...userData, ...updates }
    setUserData(newData)

    try {
      if (isGuestMode || status === 'unauthenticated') {
        // Guest mode - save to localStorage
        const state = JSON.stringify({
          transactions: newData.transactions,
          balanceStart: newData.balanceStart,
          config: newData.config,
          selectedAccount: newData.selectedAccount
        })
        localStorage.setItem("money-calendar-state", state)
        console.log('💾 Saved to localStorage (guest mode)')
      } else if (session?.user?.id) {
        // Authenticated mode - save to API
        console.log('🌐 Saving to database (authenticated mode)')
        
        // Save config
        await fetch('/api/user/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            balanceStart: newData.balanceStart,
            payPeriodDays: newData.config.payPeriodDays,
            monthsToProject: newData.config.monthsToProject,
            safetyCushionDays: newData.config.safetyCushionDays,
            selectedAccountId: newData.selectedAccount?.id
          })
        })
        
        console.log('✅ Saved user data to database')
      }
    } catch (err) {
      console.error('Failed to save user data:', err)
      setError('Failed to save your data. Changes may not persist.')
    }
  }, [userData, session?.user?.id, status, isGuestMode])

  // Add transactions
  const addTransactions = useCallback(async (newTransactions: Transaction[]) => {
    try {
      if (session?.user?.id && !isGuestMode) {
        // Save to database
        await fetch('/api/user/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTransactions)
        })
      }
      
      // Update local state
      await saveData({
        transactions: [...userData.transactions, ...newTransactions]
      })
    } catch (err) {
      console.error('Failed to add transactions:', err)
      throw err
    }
  }, [userData.transactions, saveData, session?.user?.id, isGuestMode])

  // Load data when session changes
  useEffect(() => {
    if (status !== 'loading') {
      loadData()
    }
  }, [status, loadData])

  return {
    ...userData,
    loading,
    error,
    isGuestMode: isGuestMode || status === 'unauthenticated',
    isAuthenticated: !!session?.user?.id && !isGuestMode,
    saveData,
    addTransactions,
    refreshData: loadData
  }
}

