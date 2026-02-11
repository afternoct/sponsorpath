// ════════════════════════════════════════════════════════
// FILE: lib/cv-fixer.ts
// AI-powered CV fixer — automatically fixes all ATS issues
// ════════════════════════════════════════════════════════

export interface ATSIssue {
  category: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  fix_description: string
  impact: number // points lost
}

export interface ATSAnalysis {
  score: number
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  issues: ATSIssue[]
  total_impact: number
}

// ═══════════════════════════════════════════════════════════════════
// ATS ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════

export function analyzeCV(cvText: string): ATSAnalysis {
  const issues: ATSIssue[] = []
  let score = 100

  const text = cvText.toLowerCase()
  const lines = cvText.split('\n')

  // ── 1. CONTACT INFORMATION (20 points) ──
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(cvText)
  const hasPhone = /(\+44|0)[0-9\s\-().]{9,}/i.test(cvText)
  const hasLinkedIn = /linkedin\.com\/in\//i.test(cvText)

  if (!hasEmail || !hasPhone) {
    const impact = 15
    score -= impact
    issues.push({
      category: 'Contact Info',
      severity: 'critical',
      message: 'Missing email or phone number',
      fix_description: 'Add email and phone to header',
      impact,
    })
  }

  if (!hasLinkedIn) {
    const impact = 5
    score -= impact
    issues.push({
      category: 'Contact Info',
      severity: 'warning',
      message: 'No LinkedIn URL',
      fix_description: 'Add LinkedIn profile URL',
      impact,
    })
  }

  // ── 2. STRUCTURE (20 points) ──
  const sections = ['experience', 'education', 'skills', 'summary', 'profile']
  const foundSections = sections.filter((s) => text.includes(s))

  if (foundSections.length < 4) {
    const impact = 15
    score -= impact
    issues.push({
      category: 'Resume Structure',
      severity: 'critical',
      message: `Missing key sections: ${sections.filter((s) => !foundSections.includes(s)).join(', ')}`,
      fix_description: 'Add standard CV sections with clear headers',
      impact,
    })
  }

  // ── 3. ACTION VERBS (15 points) ──
  const actionVerbs = [
    'led', 'built', 'developed', 'delivered', 'improved', 'reduced',
    'increased', 'designed', 'implemented', 'automated', 'deployed',
    'managed', 'created', 'established', 'launched', 'optimized',
  ]
  const verbsFound = actionVerbs.filter((v) => text.includes(v))

  if (verbsFound.length < 5) {
    const impact = 12
    score -= impact
    issues.push({
      category: 'Action Verbs',
      severity: 'warning',
      message: 'Weak or passive language',
      fix_description: 'Start bullet points with strong action verbs (Led, Built, Delivered, etc.)',
      impact,
    })
  }

  // ── 4. QUANTIFIED RESULTS (20 points) ──
  const hasMetrics = /[0-9]+%|£[0-9,]+|[0-9]+ (users|clients|projects|team|people|days|months)/i.test(cvText)
  const metricCount = (cvText.match(/[0-9]+%/g) || []).length

  if (!hasMetrics || metricCount < 3) {
    const impact = 18
    score -= impact
    issues.push({
      category: 'Quantified Results',
      severity: 'critical',
      message: 'No measurable achievements',
      fix_description: 'Add specific metrics: "Reduced costs by 40%", "Led team of 8", "Delivered 15 projects"',
      impact,
    })
  }

  // ── 5. TECHNICAL SKILLS (15 points) ──
  const techKeywords = [
    'python', 'javascript', 'typescript', 'java', 'react', 'node',
    'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'sql', 'terraform',
    'linux', 'git', 'ci/cd', 'agile', 'scrum',
  ]
  const techFound = techKeywords.filter((t) => text.includes(t))

  if (techFound.length < 4) {
    const impact = 12
    score -= impact
    issues.push({
      category: 'Tech Skills',
      severity: 'warning',
      message: 'Limited technical keywords',
      fix_description: 'Expand technical skills section with relevant technologies',
      impact,
    })
  }

  // ── 6. LENGTH (10 points) ──
  const wordCount = cvText.split(/\s+/).length

  if (wordCount < 300) {
    const impact = 8
    score -= impact
    issues.push({
      category: 'Length',
      severity: 'warning',
      message: `Only ${wordCount} words — too short`,
      fix_description: 'Expand experience section with detailed achievements',
      impact,
    })
  } else if (wordCount > 800) {
    const impact = 5
    score -= impact
    issues.push({
      category: 'Length',
      severity: 'info',
      message: `${wordCount} words — consider trimming`,
      fix_description: 'Keep CV concise (600-700 words ideal)',
      impact,
    })
  }

  // ── 7. FORMATTING ──
  const hasBullets = /^[\s]*[•\-\*]/m.test(cvText)
  if (!hasBullets) {
    const impact = 5
    score -= impact
    issues.push({
      category: 'Formatting',
      severity: 'warning',
      message: 'No bullet points detected',
      fix_description: 'Use bullet points for achievements',
      impact,
    })
  }

  // Calculate final score and grade
  score = Math.max(0, Math.min(100, score))
  const grade: ATSAnalysis['grade'] =
    score >= 85 ? 'Excellent' :
    score >= 70 ? 'Good' :
    score >= 50 ? 'Fair' : 'Poor'

  const total_impact = issues.reduce((sum, issue) => sum + issue.impact, 0)

  return { score, grade, issues, total_impact }
}

// ═══════════════════════════════════════════════════════════════════
// AI CV FIXER (Uses Anthropic API)
// ═══════════════════════════════════════════════════════════════════

export async function fixCV(cvText: string, issues: ATSIssue[], apiKey: string): Promise<string> {
  const issuesList = issues.map((issue, i) => 
    `${i + 1}. **${issue.category}** (${issue.severity}): ${issue.fix_description}`
  ).join('\n')

  const prompt = `You are an expert UK CV writer and ATS optimization specialist. You have been given a CV that scored poorly on ATS compatibility. Your job is to rewrite it to fix ALL the issues identified while keeping the same factual content.

**ORIGINAL CV:**
${cvText}

**ISSUES TO FIX:**
${issuesList}

**INSTRUCTIONS:**
1. Fix every single issue listed above
2. Keep ALL factual content — do not invent experience or skills
3. Rewrite bullet points to start with strong action verbs (Led, Built, Delivered, etc.)
4. Add quantifiable metrics where they're missing (estimate realistic numbers based on the role)
5. Ensure all standard sections are present: Summary, Experience, Education, Skills
6. Add a professional summary at the top if missing
7. Expand technical skills section with relevant keywords
8. Format with bullet points for all achievements
9. Keep the tone professional and confident
10. Ensure email, phone, and LinkedIn are in the header

**OUTPUT:**
Return ONLY the fixed CV text. No preamble, no explanations, no markdown code blocks. Just the clean CV text that will score 100/100 on ATS.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${error}`)
  }

  const data = await response.json()
  const fixedCV = data.content?.[0]?.text || ''

  if (!fixedCV) {
    throw new Error('No response from AI')
  }

  return fixedCV.trim()
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE HTML PREVIEW
// ═══════════════════════════════════════════════════════════════════

export function generateCVPreview(cvText: string): string {
  // Convert plain text CV to clean HTML
  const lines = cvText.split('\n')
  let html = '<div class="cv-preview">'

  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += '<br>'
      continue
    }

    // Section headers (all caps or starts with specific keywords)
    if (
      trimmed === trimmed.toUpperCase() ||
      /^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|TECHNICAL SKILLS|CERTIFICATIONS)/i.test(trimmed)
    ) {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += `<h2>${trimmed}</h2>`
      continue
    }

    // Bullet points
    if (/^[•\-\*]/.test(trimmed)) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      html += `<li>${trimmed.replace(/^[•\-\*]\s*/, '')}</li>`
      continue
    }

    // Job titles / dates (contains date pattern or company + title)
    if (/\d{4}/.test(trimmed) || /\|/.test(trimmed)) {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += `<p class="cv-job"><strong>${trimmed}</strong></p>`
      continue
    }

    // Regular paragraphs
    if (inList) {
      html += '</ul>'
      inList = false
    }
    html += `<p>${trimmed}</p>`
  }

  if (inList) {
    html += '</ul>'
  }

  html += '</div>'

  // Add styling
  const styled = `
    <style>
      .cv-preview {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
        background: white;
        color: #1a1a1a;
        line-height: 1.6;
      }
      .cv-preview h2 {
        font-size: 18px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #2563eb;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 8px;
        margin: 24px 0 12px 0;
      }
      .cv-preview p {
        margin: 8px 0;
        font-size: 14px;
      }
      .cv-preview .cv-job {
        font-size: 15px;
        margin: 16px 0 8px 0;
      }
      .cv-preview ul {
        margin: 8px 0 16px 20px;
        padding: 0;
      }
      .cv-preview li {
        margin: 6px 0;
        font-size: 14px;
      }
      .cv-preview br {
        display: block;
        margin: 8px 0;
        content: "";
      }
    </style>
    ${html}
  `

  return styled
}