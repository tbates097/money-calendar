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

    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    // Handle both single transaction and array of transactions
    const transactions = Array.isArray(data) ? data : [data]
    
    const createdTransactions = []
    
    for (const transactionData of transactions) {
      const transaction = await prisma.transaction.create({
        data: {
          userId: session.user.id,
          name: transactionData.name,
          amount: transactionData.amount,
          date: transactionData.date,
          type: transactionData.type,
          recurring: transactionData.recurring || false,
          schedule: transactionData.schedule || null,
          source: transactionData.source || 'manual',
          externalId: transactionData.externalId || null,
        }
      })
      
      createdTransactions.push(transaction)
    }

    return NextResponse.json(
      Array.isArray(data) ? createdTransactions : createdTransactions[0]
    )
  } catch (error) {
    console.error('Create transaction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    await prisma.transaction.delete({
      where: {
        id,
        userId: session.user.id, // Ensure user can only delete their own transactions
      }
    })

    return NextResponse.json({ message: 'Transaction deleted' })
  } catch (error) {
    console.error('Delete transaction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

