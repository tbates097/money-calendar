import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await prisma.userConfiguration.findUnique({
      where: { userId: session.user.id }
    })

    if (!config) {
      // Create default config if it doesn't exist
      const newConfig = await prisma.userConfiguration.create({
        data: {
          userId: session.user.id,
          balanceStart: 0,
          payPeriodDays: 14,
          monthsToProject: 12,
          safetyCushionDays: 3,
        }
      })
      return NextResponse.json(newConfig)
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Get config error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const config = await prisma.userConfiguration.upsert({
      where: { userId: session.user.id },
      update: {
        balanceStart: data.balanceStart,
        payPeriodDays: data.payPeriodDays,
        monthsToProject: data.monthsToProject,
        safetyCushionDays: data.safetyCushionDays,
        selectedAccountId: data.selectedAccountId,
      },
      create: {
        userId: session.user.id,
        balanceStart: data.balanceStart || 0,
        payPeriodDays: data.payPeriodDays || 14,
        monthsToProject: data.monthsToProject || 12,
        safetyCushionDays: data.safetyCushionDays || 3,
        selectedAccountId: data.selectedAccountId,
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Update config error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

