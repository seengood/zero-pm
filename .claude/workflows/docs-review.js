
export const meta = {
  name: 'docs-review',
  description: 'Max-effort documentation review of ZeroPM docs directory',
  phases: [
    { title: 'Read Docs' },
    { title: 'Find Candidates' },
    { title: 'Verify' },
    { title: 'Sweep' },
  ],
}

// Phase 0: Read all key docs in parallel
phase('Read Docs')

const docFiles = [
  'docs/00-개요/00-README.md',
  'docs/00-개요/01-페르소나-사용자스토리맵.md',
  'docs/00-개요/02-기능우선순위-NFR.md',
  'docs/00-개요/03-User-Flow-시나리오.md',
  'docs/00-개요/04-수용기준-AC.md',
  'docs/01-설계/00-설계-개요.md',
  'docs/01-설계/01-사용자-UX설계.md',
  'docs/01-설계/02-기능-요구사항.md',
  'docs/01-설계/03-시스템-아키텍처.md',
  'docs/01-설계/04-스케줄링-엔진.md',
  'docs/01-설계/05-DB-스키마.md',
  'docs/01-설계/06-보안-인증.md',
  'docs/01-설계/07-실시간-협업.md',
  'docs/01-설계/08-자원-비용-보고.md',
  'docs/01-설계/09-운영-구현로드맵.md',
]

const SCHEMA_STRING = JSON.stringify({
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          summary: { type: 'string' },
          failure_scenario: { type: 'string' }
        },
        required: ['file', 'line', 'summary', 'failure_scenario']
      }
    }
  },
  required: ['findings']
})

const FINDINGS_SCHEMA = JSON.parse(SCHEMA_STRING)

const docContents = await parallel(docFiles.map(f => () =>
  agent(`Read this file and return its FULL content verbatim: ${f}. Return only the raw file content with no commentary.`, { label: `read:${f.split('/').pop()}`, phase: 'Read Docs' })
))

const docsMap = {}
docFiles.forEach((f, i) => { docsMap[f] = docContents[i] || '(empty)' })
log(`Read ${docFiles.filter((_, i) => docContents[i]).length} doc files`)

// Also read the reference design docs for comparison
const refDocs = await parallel([
  'docs/01-설계/_참고/01-Undo-Redo-아키텍처.md',
  'docs/01-설계/_참고/02-이벤트-아키텍처-개선-설계.md',
  'docs/01-설계/_참고/03-DB-스키마-개선-설계.md',
  'docs/01-설계/_참고/04-보안-설계.md',
].map(f => () =>
  agent(`Read this file and return its FULL content verbatim: ${f}. Return only the raw file content with no commentary.`, { label: `read-ref:${f.split('/').pop()}`, phase: 'Read Docs' })
))

const docsContext = docFiles.map((f, i) => `\n\n=== ${f} ===\n${docContents[i] || '(could not read)'}`).join('')
const refContext = [
  'docs/01-설계/_참고/01-Undo-Redo-아키텍처.md',
  'docs/01-설계/_참고/02-이벤트-아키텍처-개선-설계.md',
  'docs/01-설계/_참고/03-DB-스키마-개선-설계.md',
  'docs/01-설계/_참고/04-보안-설계.md',
].map((f, i) => `\n\n=== ${f} ===\n${refDocs[i] || '(could not read)'}`).join('')

const fullContext = docsContext + '\n\n--- REFERENCE DOCS ---' + refContext

// Phase 1: 9 finder angles
phase('Find Candidates')

const ANGLES = [
  {
    key: 'A',
    label: 'line-by-line inconsistency',
    prompt: `You are reviewing ZeroPM PM tool documentation. Your task is Angle A: line-by-line scan for internal inconsistencies, incorrect statements, contradictions.

Read each document carefully. Look for:
- Statements that contradict each other across documents
- Feature descriptions that conflict (e.g., a feature described differently in AC vs design docs)
- Incorrect technical claims about the existing implementation
- Version/date inconsistencies
- Numbering or reference errors within docs

The CLAUDE.md describes the actual implementation:
- Tech stack: Next.js 16, React 19.2, TypeScript 5, Supabase, SVAR React Gantt, Yjs
- Link type codes: e2s=FS, s2s=SS, e2e=FF, s2e=SF
- Constraints: asap, alap, mso, mfo, snet, fnlt (ALAP not fully implemented)
- End dates are EXCLUSIVE in scheduling engine
- Port: 3005 not 3000
- workingDays = 7 (no weekend exclusion)

DOCUMENTS TO REVIEW:
${fullContext.substring(0, 80000)}

Return up to 8 findings as JSON with fields: file, line (best guess), summary (one sentence bug statement), failure_scenario (concrete scenario showing the problem). Focus on REAL bugs, not style.`
  },
  {
    key: 'B',
    label: 'removed-behavior audit',
    prompt: `You are reviewing ZeroPM PM tool documentation. Your task is Angle B: check what was removed/replaced and whether that content/behavior is accounted for in the new docs.

Context: The docs were reorganized. Old structure:
- docs/01-기능정의/ → moved to docs/_참고/01-기능정의/ (archived)
- docs/02-데이터설계/ → moved to docs/_참고/02-데이터설계/ (archived)
- docs/03-구현/ → moved to docs/_참고/03-구현/ (archived)
- docs/04-설계리뷰/ → moved to docs/_참고/04-설계리뷰/ (archived)
- docs/05-PM-UX설계/ → moved to docs/00-개요/ (kept active)
- docs/06-아키텍처설계/ → split between docs/01-설계/ and docs/01-설계/_참고/
- NEW: docs/01-설계/ (10 new comprehensive design documents)

Look for:
- Important information in old docs that may NOT appear in new docs
- Decisions or constraints mentioned in reference docs that are absent from active docs
- Feature requirements in _참고 docs that the new design docs don't address
- Cross-references that now point to moved/deleted files

DOCUMENTS TO REVIEW:
${fullContext.substring(0, 80000)}

Return up to 8 findings as JSON with fields: file, line (best guess), summary (one sentence stating what was dropped), failure_scenario (concrete description of the problem).`
  },
  {
    key: 'C',
    label: 'cross-doc reference tracer',
    prompt: `You are reviewing ZeroPM PM tool documentation. Your task is Angle C: check cross-document references and internal links.

Look for:
- Links to files that no longer exist at their referenced paths (e.g., after the reorganization)
- References like "../05-PM-UX설계/" or "../04-설계리뷰/" that now point to moved locations
- References in docs/00-개요/ pointing to old paths
- References in docs/01-설계/ pointing to old paths
- Numbered section references that don't match actual document structure
- "See also" or "참고" links that point to non-existent anchors

The reorganization moved:
- docs/05-PM-UX설계/* → docs/00-개요/*
- docs/04-설계리뷰/* → docs/_참고/04-설계리뷰/*
- docs/01-기능정의/* → docs/_참고/01-기능정의/*
- docs/02-데이터설계/* → docs/_참고/02-데이터설계/*
- docs/03-구현/* → docs/_참고/03-구현/*
- docs/06-아키텍처설계/* → docs/01-설계/_참고/*

DOCUMENTS TO REVIEW:
${fullContext.substring(0, 80000)}

Return up to 8 findings as JSON with fields: file, line (best guess), summary (one sentence stating the broken reference), failure_scenario (what happens when someone tries to follow the link).`
  },
  {
    key: 'D',
    label: 'technical accuracy vs implementation',
    prompt: `You are reviewing ZeroPM PM tool documentation against the actual implementation. Your task is Angle D: find places where the docs describe things differently from how they are actually implemented.

Actual implementation facts from CLAUDE.md:
- Dev server: port 3005 (NOT 3000)
- Link types: e2s=FS, s2s=SS, e2e=FF, s2e=SF (SVAR conventions)
- Scheduling constraints: asap (default), alap, mso, mfo, snet, fnlt. ALAP is NOT fully implemented.
- End dates are EXCLUSIVE in the scheduling engine; display layer converts to inclusive (start + duration - 1 at 23:59)
- Start dates normalized to 00:00:00 before persistence
- workingDays = 7 (calendar days, weekends NOT excluded from scheduling)
- Architecture: event-driven via singleton taskEventEmitter
- SVAR Gantt ignores React props after mount — all updates via ganttApiRef.current.exec()
- Observers: DBObserver (→ Supabase), UIObserver (→ React state), ScheduleObserver
- Real-time sync via Supabase postgres_changes (NOT Yjs for tasks/links)
- Yjs is used for document-level CRDT (ws://localhost:1234 by default)
- Optimistic locking via version column
- RLS policies are critical for security
- Tasks have CPM fields: early_start, late_finish, total_float, is_critical

Look for docs that incorrectly describe:
- Port numbers, URLs, environment variables
- How real-time sync works (postgres_changes vs Yjs)
- Which constraints are implemented vs planned
- How dates work (exclusive vs inclusive end dates)
- How SVAR Gantt updates work
- CPM/scheduling fields
- Authentication flow

DOCUMENTS TO REVIEW:
${fullContext.substring(0, 80000)}

Return up to 8 findings as JSON: file, line, summary, failure_scenario.`
  },
  {
    key: 'E',
    label: 'AC coverage gaps',
    prompt: `You are reviewing ZeroPM PM tool documentation. Your task is Angle E: check Acceptance Criteria (AC) traceability — ensure every AC in docs/00-개요/04-수용기준-AC.md has corresponding coverage in docs/01-설계/ documents.

Process:
1. Extract all ACs from 04-수용기준-AC.md
2. For each AC, determine whether docs/01-설계/ documents provide implementation guidance
3. Flag ACs that have NO corresponding design coverage

Also check:
- ACs that exist in design docs but NOT in the AC list (orphaned design decisions)
- ACs listed as "P0" (must-have) that lack design details
- Conflicts between AC requirements and design choices
- AC completeness: are there obvious missing ACs for features described in the design docs?

DOCUMENTS TO REVIEW:
${fullContext.substring(0, 80000)}

Return up to 8 findings as JSON: file, line, summary, failure_scenario (describe what feature/requirement goes unimplemented or conflicted).`
  },
  {
    key: 'F',
    label: 'reuse and duplication',
    prompt: `You are reviewing ZeroPM PM tool documentation. Your task is Angle F (Reuse): find significant content duplication between documents.

Look for:
- Same feature described in detail in multiple docs with slight variations (which is authoritative?)
- Identical or near-identical sections copy-pasted between docs
- Schema definitions that appear in multiple places with inconsistencies
- Feature lists that overlap significantly
- When two docs give conflicting details about the same feature, flag the inconsistency

DOCUMENTS TO REVIEW:
${fullContext.substring(0, 80000)}

Return up to 8 findings as JSON: file, line, summary (name the duplicated content and where), failure_scenario (describe the confusion or inconsistency this creates for a developer reading the docs).`
  },
  {
    key: 'G',
    label: 'simplification and structure',
    prompt: `You are reviewing ZeroPM PM tool documentation. Your task is Angle G (Simplification): find structural problems, unnecessary complexity, or missing information in the doc organization.

Look for:
- Documents with ambiguous scope (what is it for? who reads it?)
- Missing index/navigation — can a new developer find what they need?
- Sections that would be better placed in a different document
- Important technical decisions buried or missing
- Documents that are too long/complex when they should be concise reference
- Documents that lack concrete examples where they are needed
- Incomplete sections (marked TODO or stub)
- Inconsistent terminology (same concept named differently across docs)

DOCUMENTS TO REVIEW:
${fullContext.substring(0, 80000)}

Return up to 8 findings as JSON: file, line, summary, failure_scenario (describe the concrete cost: what a developer trying to use these docs will struggle with).`
  },
  {
    key: 'H',
    label: 'security and operational gaps',
    prompt: `You are reviewing ZeroPM PM tool documentation for a PM SaaS tool with Supabase backend. Your task is Angle H: find security and operational documentation gaps.

The system has:
- Supabase Auth + RLS policies for multi-tenant isolation
- Real-time collaboration (postgres_changes + Yjs)
- Optimistic locking (version column)
- Google OAuth + email/password auth
- Row Level Security on tasks, links, projects tables

Look for docs/01-설계/ documents that:
- Describe security features without proper threat modeling
- Miss important RLS policy scenarios (e.g., project sharing, public links)
- Don't address how Yjs/WebSocket is authenticated
- Have incomplete or vague error handling for auth failures
- Miss operational concerns (backup, monitoring, rate limiting)
- Describe ALAP constraint as if it's implemented (it's not)
- Don't address data migration or backwards compatibility concerns
- Miss multi-tenancy isolation guarantees

DOCUMENTS TO REVIEW:
${fullContext.substring(0, 80000)}

Return up to 8 findings as JSON: file, line, summary, failure_scenario.`
  },
  {
    key: 'I',
    label: 'altitude — bandaid vs root',
    prompt: `You are reviewing ZeroPM PM tool documentation. Your task is Angle I (Altitude): check whether design decisions are made at the right depth, or whether they are bandaids over deeper problems.

Look for:
- Design decisions that add special cases to work around architectural problems
- Solutions that solve symptoms rather than root causes
- Places where the design doc says "we handle X specially" without explaining why X needs special handling
- Scheduled/phased features that should be in the MVP to avoid data migration pain later
- Features that are described as "future" but whose absence creates problems NOW
- Architectural descriptions that will require re-work when later phases arrive
- The Yjs+Supabase realtime hybrid: does the doc explain when to use which? Could this be simplified?

DOCUMENTS TO REVIEW:
${fullContext.substring(0, 80000)}

Return up to 8 findings as JSON: file, line, summary, failure_scenario (describe the concrete downstream cost if the bandaid approach is built as documented).`
  },
]

const angleResults = await parallel(ANGLES.map(angle => () =>
  agent(`${angle.prompt}\n\nIMPORTANT: You MUST call StructuredOutput with your findings array. Return findings ONLY about real problems you can point to in the documents.`, {
    label: `angle-${angle.key}:${angle.label}`,
    phase: 'Find Candidates',
    schema: FINDINGS_SCHEMA,
  })
))

const allCandidates = angleResults
  .filter(Boolean)
  .flatMap(r => r.findings || [])

log(`Collected ${allCandidates.length} raw candidates from ${angleResults.filter(Boolean).length} angles`)

// Dedup by file+line
const seen = new Set()
const deduped = allCandidates.filter(c => {
  const key = `${c.file}:${c.line}:${c.summary.substring(0, 50)}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

log(`After dedup: ${deduped.length} candidates`)

// Phase 2: Verify
phase('Verify')

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['CONFIRMED', 'PLAUSIBLE', 'REFUTED'] },
    evidence: { type: 'string' },
    refined_summary: { type: 'string' }
  },
  required: ['verdict', 'evidence', 'refined_summary']
}

const verified = await pipeline(
  deduped,
  candidate => agent(
    `You are verifying a documentation finding for ZeroPM.

Finding to verify:
- File: ${candidate.file}
- Line: ${candidate.line}
- Summary: ${candidate.summary}
- Failure scenario: ${candidate.failure_scenario}

Verify this finding against the actual documents:
${fullContext.substring(0, 60000)}

Return:
- CONFIRMED: the finding is real, you can quote the problematic text
- PLAUSIBLE: the mechanism exists but you can't fully verify without seeing the actual code
- REFUTED: the finding is factually wrong, the document does NOT say what the finding claims

Be honest. REFUTE findings that are wrong or based on misreadings.`,
    {
      label: `verify:${candidate.file.split('/').pop()}:${candidate.summary.substring(0, 30)}`,
      phase: 'Verify',
      schema: VERDICT_SCHEMA,
    }
  ),
  (verdict, candidate) => verdict ? { ...candidate, verdict: verdict.verdict, evidence: verdict.evidence, refined_summary: verdict.refined_summary } : null
)

const confirmed = verified.filter(Boolean).filter(v => v.verdict !== 'REFUTED')
log(`After verification: ${confirmed.length} confirmed/plausible findings`)

// Phase 3: Sweep for gaps
phase('Sweep')

const sweepResult = await agent(
  `You are doing a final sweep for ZeroPM documentation review. The following findings have already been identified:

${JSON.stringify(confirmed.map(c => ({ file: c.file, summary: c.summary })), null, 2)}

Now re-read the documents looking ONLY for defects NOT already listed. Focus on what the first pass tends to miss: dropped guards in moved content, inconsistencies between Korean section headers and content, missing required fields in DB schema docs, incomplete roadmap entries, or security assumptions stated without justification.

DOCUMENTS:
${fullContext.substring(0, 60000)}

Return up to 8 NEW findings not already covered above.`,
  {
    label: 'sweep',
    phase: 'Sweep',
    schema: FINDINGS_SCHEMA,
  }
)

const sweepFindings = (sweepResult?.findings || []).filter(f => {
  const key = f.summary.substring(0, 50)
  return !confirmed.some(c => c.summary.substring(0, 50) === key)
})

const allFindings = [...confirmed, ...sweepFindings]

// Sort: CONFIRMED first, then PLAUSIBLE, severity proxied by angle
const sorted = allFindings
  .sort((a, b) => {
    const order = { CONFIRMED: 0, PLAUSIBLE: 1, undefined: 2 }
    return (order[a.verdict] || 2) - (order[b.verdict] || 2)
  })
  .slice(0, 15)

log(`Final: ${sorted.length} findings`)
return sorted
