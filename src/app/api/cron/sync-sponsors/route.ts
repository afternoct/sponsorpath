// ═══════════════════════════════════════════════════════════════════
// FILE: app/api/cron/sync-sponsors/route.ts
// Cron job endpoint - Syncs UK sponsor register daily
// Called by Vercel Cron at 2 AM daily
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key'

// Official UK Home Office sponsor register
// Updated quarterly by UK Government
const SPONSOR_REGISTER_URL = 'https://assets.publishing.service.gov.uk/media/65a6dcbb2548ca000d1f3b3c/2024-01-16_-_Worker_and_Temporary_Worker.xlsx'

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 Starting sponsor sync...')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Download and parse Excel file
    const response = await fetch(SPONSOR_REGISTER_URL)
    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const sponsors = XLSX.utils.sheet_to_json(worksheet)

    let imported = 0
    let errors = 0

    // Process in batches of 100
    const batchSize = 100
    for (let i = 0; i < sponsors.length; i += batchSize) {
      const batch = sponsors.slice(i, i + batchSize)
      
      const records = batch.map((sponsor: any) => {
        const name = sponsor['Organisation Name'] || sponsor['Name'] || ''
        const normalized = name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\b(ltd|limited|plc|llc|inc)\b/g, '')
          .trim()

        return {
          name,
          normalized_name: normalized,
          sponsor_status: 'confirmed',
          sponsor_confidence: 100,
          industry: sponsor['Type & Rating'] || null,
          location: sponsor['Town/City'] || sponsor['County'] || null,
          size: null,
          updated_at: new Date().toISOString()
        }
      }).filter(r => r.normalized_name) // Skip empty names

      const { error } = await supabase
        .from('employers')
        .upsert(records, { 
          onConflict: 'normalized_name',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error(`❌ Batch error:`, error.message)
        errors += batch.length
      } else {
        imported += batch.length
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Mark stale sponsors (not updated in 90 days)
    await supabase
      .from('employers')
      .update({ sponsor_status: 'unknown', sponsor_confidence: 30 })
      .lt('updated_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .eq('sponsor_status', 'confirmed')

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: sponsors.length,
      nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })

  } catch (error: any) {
    console.error('💥 Sync failed:', error)
    return NextResponse.json({ 
      error: error.message || 'Sync failed',
      success: false 
    }, { status: 500 })
  }
}

// Also allow POST for manual triggers from admin panel
export async function POST(req: NextRequest) {
  return GET(req)
}