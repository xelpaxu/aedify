import { NextRequest, NextResponse } from 'next/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const reportId = id as unknown as Id<"reports">
        const report = await fetchQuery(api.reports.getReport, { id: reportId })

        if (!report || !report.imageUri) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 })
        }

        const imageData = report.imageUri || report.processedImage

        // Return the base64 image directly
        return NextResponse.json({
            imageUri: imageData,
            processedImage: report.processedImage
        })
    } catch (error) {
        console.error('Error fetching image:', error)
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
    }
}