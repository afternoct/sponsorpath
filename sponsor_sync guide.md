# UK SPONSOR SYNC SYSTEM - COMPLETE GUIDE

## Why You Were Right About 20 Sponsors Being Too Few

The UK Home Office maintains a register of **30,000+ sponsors**. I initially seeded only 20 because:
1. It makes the platform work immediately (no API setup required)
2. Those 20 are the highest-priority tech/finance companies

But you're absolutely right — **the platform needs ALL sponsors and should update automatically**.

## How the Full Sync System Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  UK Home Office Register (Excel, updated quarterly)    │
│  https://gov.uk/... (~30,000 sponsors)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Daily sync (2 AM)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel Cron Job                                        │
│  GET /api/cron/sync-sponsors                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Downloads Excel, parses, batch imports
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase employers table                               │
│  - 30,000+ sponsors                                     │
│  - Auto-updated daily                                   │
│  - Stale sponsors marked after 90 days                  │
└─────────────────────────────────────────────────────────┘
```

### What I Built for You

**4 New Files:**

1. **`scripts/sync-uk-sponsors.ts`** - Manual sync script (run locally)
2. **`app/api/cron/sync-sponsors/route.ts`** - Auto-sync API (Vercel Cron)
3. **`vercel.json`** - Cron configuration (runs at 2 AM daily)
4. **`db/schema_update_sponsors.sql`** - Better indexes + sync log table

## Setup Instructions

### 1. Run Schema Update

In Supabase SQL Editor, run `schema_update_sponsors.sql`:
- Adds better indexes for faster sponsor matching
- Creates sync log table
- Seeds 20 priority sponsors

### 2. Add Environment Variable

Add to `.env.local`:
```env
CRON_SECRET=your-random-secret-key-here
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 3. Deploy to Vercel

```bash
vercel
```

Add the `CRON_SECRET` to Vercel environment variables.

### 4. Cron Will Run Automatically

Vercel Cron will call `/api/cron/sync-sponsors` daily at 2 AM:
- Downloads UK Home Office Excel file
- Parses 30,000+ sponsors
- Batch imports to Supabase (100 at a time)
- Marks stale sponsors (not updated in 90 days)

### 5. Manual Sync (Optional)

To sync immediately without waiting:

**Option A: Run locally**
```bash
npm install xlsx
npx tsx scripts/sync-uk-sponsors.ts
```

**Option B: Call API**
```bash
curl -X POST https://yourapp.vercel.app/api/cron/sync-sponsors \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## How Sponsor Matching Works

### Before (Only 20 Sponsors)
```typescript
const KNOWN_SPONSORS = ['revolut', 'monzo', 'wise', ...] // Only 20
```

### After (30,000+ Sponsors)
```typescript
// Job comes in from Reed API
const job = { company: "Revolut Ltd" }

// Query database
const { data } = await supabase
  .from('employers')
  .select('*')
  .ilike('normalized_name', '%revolut%')
  .single()

if (data?.sponsor_status === 'confirmed') {
  job.sponsor_verified = true
  job.sponsor_confidence = data.sponsor_confidence
}
```

### Smart Matching
The system handles:
- **Company name variations**: "Revolut", "Revolut Ltd", "Revolut Limited"
- **Fuzzy matching**: "Goldman Sachs" matches "Goldman Sachs International"
- **Confidence scoring**: 100 = confirmed, 30 = outdated/stale

## Monitoring

### Check Sync Status

```sql
-- Last 10 syncs
SELECT * FROM sponsor_sync_log 
ORDER BY created_at DESC 
LIMIT 10;

-- Total sponsors
SELECT COUNT(*) FROM employers WHERE sponsor_status = 'confirmed';

-- Recently updated
SELECT name, location, updated_at 
FROM employers 
WHERE sponsor_status = 'confirmed' 
ORDER BY updated_at DESC 
LIMIT 20;
```

### Sync Logs Table
```sql
CREATE TABLE sponsor_sync_log (
  id UUID PRIMARY KEY,
  sync_started_at TIMESTAMPTZ,
  sync_completed_at TIMESTAMPTZ,
  total_sponsors INT,
  imported INT,
  errors INT,
  status TEXT, -- 'running', 'completed', 'failed'
  error_message TEXT
)
```

## Real Data Source

The official UK sponsor register is published here:
https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers

**File format**: Excel (.xlsx)
**Update frequency**: Quarterly by UK Government
**Size**: ~30,000 sponsors

## Cost Analysis

**Supabase Storage:**
- 30,000 rows × ~200 bytes = ~6 MB
- Well within free tier

**Vercel Cron:**
- 1 execution/day × 30 days = 30 executions/month
- Free tier: 100 executions/month
- ✅ No cost

**API Calls:**
- 1 download/day from UK Gov (free)
- ~300 Supabase writes (batch upserts)
- Well within free tier

## Why This Approach is Better

### Old Approach (20 sponsors)
❌ Misses 29,980+ sponsors  
❌ Manual updates required  
❌ Stale data  
❌ Can't scale  

### New Approach (Full sync)
✅ All 30,000+ sponsors  
✅ Auto-updates daily  
✅ Always fresh data  
✅ Handles company name variations  
✅ Confidence scoring  
✅ Sync monitoring  

## Testing

### Test Sponsor Matching
```typescript
// Test in browser console after sync
const testCompanies = [
  'Revolut',
  'Google UK',
  'Some Random Startup Ltd'
]

for (const company of testCompanies) {
  const { data } = await supabase
    .from('employers')
    .select('name, sponsor_status, sponsor_confidence')
    .ilike('normalized_name', `%${company.toLowerCase()}%`)
    .limit(1)
    
  console.log(company, '->', data)
}
```

Expected output:
```
Revolut -> { name: 'Revolut Ltd', sponsor_status: 'confirmed', sponsor_confidence: 100 }
Google UK -> { name: 'Google UK Limited', sponsor_status: 'confirmed', sponsor_confidence: 100 }
Some Random Startup Ltd -> null
```

## Troubleshooting

### Sync fails
- Check UK Gov website is up
- Verify `SUPABASE_SERVICE_KEY` in env
- Check Supabase logs

### Sponsors not matching
- Check `normalized_name` in database
- Try fuzzy search with ILIKE
- Verify company name spelling

### Cron not running
- Verify `vercel.json` is deployed
- Check Vercel dashboard → Cron logs
- Ensure `CRON_SECRET` is set

## Summary

You now have:
- ✅ Daily auto-sync of 30,000+ UK sponsors
- ✅ Smart company name matching
- ✅ Confidence scoring
- ✅ Stale data detection
- ✅ Sync monitoring
- ✅ Zero ongoing cost

The platform starts with 20 priority sponsors and automatically expands to the full register on first cron run.

---

**Next Steps:**
1. Run `schema_update_sponsors.sql` in Supabase
2. Add `CRON_SECRET` to environment variables
3. Deploy to Vercel
4. Wait for 2 AM or trigger manual sync
5. Check `sponsor_sync_log` table