import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Retrieve user's custom categories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customCategories = await prisma.creditAnalysisCustomCategory.findMany({
      where: { userId: session.user.id },
      select: {
        transactionId: true,
        category: true,
        updatedAt: true
      }
    })

    // Convert to the format expected by the component
    const categoriesMap: {[transactionId: string]: string} = {}
    let latestUpdateDate: Date | null = null

    customCategories.forEach(cc => {
      categoriesMap[cc.transactionId] = cc.category
      if (!latestUpdateDate || cc.updatedAt > latestUpdateDate) {
        latestUpdateDate = cc.updatedAt
      }
    })

    return NextResponse.json({ 
      customCategories: categoriesMap,
      latestUpdateDate: latestUpdateDate ? latestUpdateDate.toISOString() : null
    })
  } catch (error) {
    console.error('Get custom categories error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save/update custom categories
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customCategories }: { customCategories: {[transactionId: string]: string} } = await request.json()

    if (!customCategories || typeof customCategories !== 'object') {
      return NextResponse.json(
        { error: 'customCategories object is required' },
        { status: 400 }
      )
    }

    // Use transaction to update all categories atomically
    await prisma.$transaction(async (tx) => {
      // Delete existing categories for this user (we'll recreate them)
      await tx.creditAnalysisCustomCategory.deleteMany({
        where: { userId: session.user.id }
      })

      // Insert new categories
      const categoriesToInsert = Object.entries(customCategories).map(([transactionId, category]) => ({
        userId: session.user.id,
        transactionId,
        category
      }))

      if (categoriesToInsert.length > 0) {
        await tx.creditAnalysisCustomCategory.createMany({
          data: categoriesToInsert
        })
      }
    })

    return NextResponse.json({ 
      success: true,
      savedCount: Object.keys(customCategories).length
    })
  } catch (error) {
    console.error('Save custom categories error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Clear all custom categories for user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.creditAnalysisCustomCategory.deleteMany({
      where: { userId: session.user.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete custom categories error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
