/**
 * SHEEP GEM v2 standalone scoring component. SPDX-License-Identifier: MIT
 * Adapted from the SheepGeo calculation implementation; no application services included.
 * All observations must be validated and reduced to these minimal fields by the caller.
 */
export type ScoreFact = {
  /** Calendar day in the caller's chosen timezone, YYYY-MM-DD. */
  day: string
  /** An anonymous model label; not a provider URL or credential. */
  model: string
  monitoring: boolean
  /** -1 absent; 0 mentioned without a rank; positive integer = rank. */
  own: number
}
export type CheckStatus = 'pass' | 'warn' | 'fail'
export type SiteCheck = { id: string; status: CheckStatus }
export function statusWeight(status: CheckStatus): number {
  return status === 'pass' ? 1 : status === 'warn' ? 0.5 : 0
}

export const GEM_VERSION = 'v2-standalone.1'

export type SheepKey = 'S' | 'H' | 'E1' | 'E2' | 'P'

export const SHEEP_DIMENSIONS: Array<{ key: SheepKey; letter: string; name: string; weight: number; source: string }> = [
  { key: 'S', letter: 'S', name: '语义覆盖', weight: 0.25, source: 'AI 检测：提及率 / TOP3 / 首推' },
  { key: 'H', letter: 'H', name: '人类可信度', weight: 0.25, source: '官网信任信号' },
  { key: 'E1', letter: 'E', name: '证据结构化', weight: 0.2, source: '官网逐页体检' },
  { key: 'E2', letter: 'E', name: '生态集成', weight: 0.15, source: 'AI 引用我方内容' },
  { key: 'P', letter: 'P', name: '性能监测', weight: 0.15, source: 'AI 爬虫访问 / 可打开 / HTTPS / 速度' },
]

export const MIN_WEEKLY_CHECKS = 20

export type SheepScores = Record<SheepKey, number | null>

export function gradeOf(score: number | null): string | null {
  if (score === null || !Number.isFinite(score)) return null
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

export function gemOf(scores: SheepScores): number | null {
  let total = 0
  for (const dim of SHEEP_DIMENSIONS) {
    const value = scores[dim.key]
    if (value === null || !Number.isFinite(value)) return null
    total += value * dim.weight
  }
  return Math.round(total)
}

const round = (value: number) => Math.round(Math.max(0, Math.min(100, value)))

// ─── S：语义覆盖 ─────────────────────────────────────────────

export type SemanticDetail = { checks: number; mention: number; top3: number; first: number }

export function semanticScore(facts: ScoreFact[]): { score: number | null; detail: SemanticDetail } {
  const checks = facts.length
  if (checks === 0) return { score: null, detail: { checks: 0, mention: 0, top3: 0, first: 0 } }
  const mention = facts.filter((fact) => fact.own >= 0).length / checks
  const top3 = facts.filter((fact) => fact.own >= 1 && fact.own <= 3).length / checks
  const first = facts.filter((fact) => fact.own === 1).length / checks
  const detail = { checks, mention: Math.round(mention * 100), top3: Math.round(top3 * 100), first: Math.round(first * 100) }
  if (checks < MIN_WEEKLY_CHECKS) return { score: null, detail }
  return { score: round(mention * 50 + top3 * 30 + first * 20), detail }
}

// ─── E2：生态集成 ────────────────────────────────────────────

export type EcosystemDetail = { checks: number; citingOwn: number; coverage: number; models: number; modelsCitingOwn: number }

/** ownCited(fact) = 这次检测的回答是否引用了我方内容（官网或已登记内容） */
export function ecosystemScore<T extends ScoreFact>(facts: T[], ownCited: (fact: T) => boolean): { score: number | null; detail: EcosystemDetail } {
  const checks = facts.length
  const models = new Set(facts.map((fact) => fact.model))
  const citing = facts.filter(ownCited)
  const citingModels = new Set(citing.map((fact) => fact.model))
  const coverage = checks > 0 ? citing.length / checks : 0
  const detail = { checks, citingOwn: citing.length, coverage: Math.round(coverage * 100), models: models.size, modelsCitingOwn: citingModels.size }
  if (checks < MIN_WEEKLY_CHECKS || models.size === 0) return { score: null, detail }
  return { score: round(Math.min(100, coverage * 200) * 0.7 + (citingModels.size / models.size) * 100 * 0.3), detail }
}

// ─── 官网三维：E1 / H / P ───────────────────────────────────

export type CrawlPageForScore = { status: number | null; ms: number | null; checks: SiteCheck[] }

export type SiteScoreInput = {
  pages: CrawlPageForScore[]
  siteChecks: SiteCheck[]
  trust: Record<string, boolean>
  aiCrawlers: { checked: number; blocked: number }
}

const TRUST_KEYS = ['about', 'contact', 'credential', 'cases', 'press', 'organization']
const EVIDENCE_PAGE_CHECKS = new Set(['readable', 'headings', 'meta', 'schema', 'dates'])

export function siteScores(input: SiteScoreInput): { E1: number | null; H: number | null; P: number | null } {
  if (input.pages.length === 0) return { E1: null, H: null, P: null }
  // E1：逐页证据项的平均分
  const pageScores = input.pages
    .map((page) => page.checks.filter((check) => EVIDENCE_PAGE_CHECKS.has(check.id)))
    .filter((list) => list.length > 0)
    .map((list) => list.reduce((sum, check) => sum + statusWeight(check.status), 0) / list.length)
  const siteEvidence = input.siteChecks.filter((check) => check.id === 'llms-txt' || check.id === 'sitemap')
  const pagePart = pageScores.length > 0 ? pageScores.reduce((a, b) => a + b, 0) / pageScores.length : 0
  const sitePart = siteEvidence.length > 0 ? siteEvidence.reduce((sum, check) => sum + statusWeight(check.status), 0) / siteEvidence.length : 0
  const E1 = round((pagePart * 0.85 + sitePart * 0.15) * 100)
  // H：信任信号
  const H = round((TRUST_KEYS.filter((key) => input.trust[key]).length / TRUST_KEYS.length) * 100)
  // P：爬虫可访问 + 可打开 + HTTPS 证书 + 速度
  const access = input.aiCrawlers.checked > 0 ? 1 - input.aiCrawlers.blocked / input.aiCrawlers.checked : 1
  const reachable = input.pages.filter((page) => page.status !== null && page.status >= 200 && page.status < 300).length / input.pages.length
  const timed = input.pages.filter((page) => page.ms !== null)
  const speed = timed.length > 0 ? timed.reduce((sum, page) => sum + (page.ms! <= 1500 ? 1 : page.ms! <= 4000 ? 0.5 : 0), 0) / timed.length : 0
  const httpsCheck = input.siteChecks.find((check) => check.id === 'https')
  const base = access * 0.35 + reachable * 0.25 + speed * 0.2
  const P = round((httpsCheck ? base + statusWeight(httpsCheck.status) * 0.2 : base / 0.8) * 100)
  return { E1, H, P }
}

// ─── 按周 ─────────────────────────────────────────────────

/** 'YYYY-MM-DD'（上海日期）所在周的周一 */
export function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return day
  const offset = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  return date.toISOString().slice(0, 10)
}

export function weekEnd(start: string): string {
  const date = new Date(`${start}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 6)
  return date.toISOString().slice(0, 10)
}

/**
 * SHEEP 的数据源：监控在需要比较的每一期都有检测才只用监控，否则用全部关键词检测。
 * 这里「每一期」= 近 N 周里有检测的每个完整周（本周没过完不算，免得周中监控还没跑就整体切走）；
 * 近 N 周没有一条监控 → 用检测。刚开监控的项目早几周因此不会空白。
 */
export function pickSheepFacts(facts: ScoreFact[], today: string, weeks: number): ScoreFact[] {
  const currentWeek = weekStart(today)
  const cursor = new Date(`${currentWeek}T00:00:00Z`)
  cursor.setUTCDate(cursor.getUTCDate() - Math.max(0, weeks - 1) * 7)
  const firstWeek = cursor.toISOString().slice(0, 10)
  const withData = new Set<string>()
  const withMonitoring = new Set<string>()
  let anyMonitoring = false
  for (const fact of facts) {
    const week = weekStart(fact.day)
    if (week < firstWeek || week > currentWeek) continue
    if (fact.monitoring) anyMonitoring = true
    if (week === currentWeek) continue
    withData.add(week)
    if (fact.monitoring) withMonitoring.add(week)
  }
  if (!anyMonitoring) return facts
  for (const week of Array.from(withData)) if (!withMonitoring.has(week)) return facts
  return facts.filter((fact) => fact.monitoring)
}

export type CrawlScoreRecord = { finishedDay: string; E1: number | null; H: number | null; P: number | null }

export type SheepWeek = {
  week: string
  scores: SheepScores
  gem: number | null
  grade: string | null
  semantic: SemanticDetail
  ecosystem: EcosystemDetail
  /** 这一周用的是哪天的官网抓取（本周或之前最近一次） */
  crawlDay: string | null
  /** 本周还没过完 */
  partial: boolean
}

/**
 * 近 N 周的 GEM v2。S / E2 用当周的检测；E1 / H / P 用当周结束前最近一次官网抓取。
 * facts 应为同一数据源（监控或检测，调用方用 pickSheepFacts 选好），today 为上海日期。
 */
export function buildSheepWeeks<T extends ScoreFact>(input: {
  facts: T[]
  ownCited: (fact: T) => boolean
  crawls: CrawlScoreRecord[]
  today: string
  weeks?: number
}): SheepWeek[] {
  const count = input.weeks ?? 12
  const currentWeek = weekStart(input.today)
  const starts: string[] = []
  const cursor = new Date(`${currentWeek}T00:00:00Z`)
  for (let index = 0; index < count; index += 1) {
    starts.unshift(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() - 7)
  }
  const byWeek = new Map<string, T[]>()
  for (const fact of input.facts) {
    if (fact.day > input.today) continue
    const key = weekStart(fact.day)
    const list = byWeek.get(key) || []
    list.push(fact)
    byWeek.set(key, list)
  }
  const crawls = [...input.crawls].sort((a, b) => a.finishedDay.localeCompare(b.finishedDay))
  return starts.map((week) => {
    const facts = byWeek.get(week) || []
    const semantic = semanticScore(facts)
    const ecosystem = ecosystemScore(facts, input.ownCited)
    const end = weekEnd(week) < input.today ? weekEnd(week) : input.today
    const crawl = [...crawls].reverse().find((item) => item.finishedDay <= end) || null
    const scores: SheepScores = {
      S: semantic.score,
      H: crawl?.H ?? null,
      E1: crawl?.E1 ?? null,
      E2: ecosystem.score,
      P: crawl?.P ?? null,
    }
    const gem = gemOf(scores)
    return {
      week,
      scores,
      gem,
      grade: gradeOf(gem),
      semantic: semantic.detail,
      ecosystem: ecosystem.detail,
      crawlDay: crawl?.finishedDay ?? null,
      partial: week === currentWeek,
    }
  })
}

/** 最近一个有总分的周（本周数据不足时回退上一周），以及它的上一周（算涨跌） */
export function latestSheep(weeks: SheepWeek[]): { current: SheepWeek | null; previous: SheepWeek | null } {
  const scored = weeks.filter((week) => week.gem !== null)
  const current = scored[scored.length - 1] || null
  const previous = current ? scored.filter((week) => week.week < current.week).pop() || null : null
  return { current, previous }
}

/** 最弱且最容易动的维度：按 SHEEP 优化顺序（E 证据 → S → H → E 生态 → P），取第一个低于 60 的 */
export const SHEEP_LEVER_ORDER: SheepKey[] = ['E1', 'S', 'H', 'E2', 'P']

export function nextLever(scores: SheepScores): SheepKey | null {
  for (const key of SHEEP_LEVER_ORDER) {
    const value = scores[key]
    if (value !== null && value < 60) return key
  }
  return null
}
