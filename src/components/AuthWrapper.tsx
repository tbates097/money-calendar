'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const isGuestMode = searchParams?.get('guest') === 'true'

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated and not in guest mode, show auth options
  if (!session && !isGuestMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Money Calendar</h1>
            <p className="text-gray-600 mb-8">
              Plan bills, paychecks, and financial projections with cross-device sync
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </Link>
            
            <Link
              href="/auth/signup"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Account
            </Link>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">or</span>
              </div>
            </div>

            <Link
              href="/?guest=true"
              className="w-full flex justify-center py-3 px-4 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 hover:border-gray-400"
            >
              Continue as Guest
              <span className="block text-xs text-gray-500 mt-1">
                (data won't sync across devices)
              </span>
            </Link>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Why create an account?</h3>
            <div className="text-xs text-blue-700 space-y-1 text-left">
              <div>✅ Access your data from any device</div>
              <div>✅ Automatic backup of all transactions</div>
              <div>✅ Sync SimpleFIN connections</div>
              <div>✅ Never lose your financial planning data</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated or in guest mode - show the app
  return (
    <div>
      {/* Auth status bar */}
      <div className="mb-6 flex justify-between items-center p-3 bg-white rounded-lg border">
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                Signed in as <span className="font-medium">{session.user?.email}</span>
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                Guest mode - data won't sync across devices
              </span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {session ? (
            <Link
              href="/api/auth/signout"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </Link>
          ) : (
            <Link
              href="/auth/signin"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Sign in to sync data
            </Link>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}

