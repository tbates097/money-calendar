import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Retrieve user's SimpleFIN connection
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connection = await prisma.simplefinConnection.findUnique({
      where: { userId: session.user.id },
      select: {
        accessUrl: true,
        bankName: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true
      }
    })

    if (!connection || !connection.isActive) {
      return NextResponse.json({ connection: null })
    }

    return NextResponse.json({ connection })
  } catch (error) {
    console.error('Get SimpleFIN connection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save/update user's SimpleFIN connection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accessUrl, bankName } = await request.json()

    if (!accessUrl || !bankName) {
      return NextResponse.json(
        { error: 'accessUrl and bankName are required' },
        { status: 400 }
      )
    }

    // Upsert the connection (create or update)
    const connection = await prisma.simplefinConnection.upsert({
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
    })

    return NextResponse.json({ 
      success: true,
      connection: {
        accessUrl: connection.accessUrl,
        bankName: connection.bankName,
        isActive: connection.isActive,
        lastSyncAt: connection.lastSyncAt,
        createdAt: connection.createdAt
      }
    })
  } catch (error) {
    console.error('Save SimpleFIN connection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove user's SimpleFIN connection
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.simplefinConnection.updateMany({
      where: { userId: session.user.id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete SimpleFIN connection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
