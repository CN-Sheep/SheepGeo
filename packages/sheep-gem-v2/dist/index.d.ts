/**
 * SHEEP GEM v2 standalone scoring component. SPDX-License-Identifier: MIT
 * Adapted from the SheepGeo calculation implementation; no application services included.
 * All observations must be validated and reduced to these minimal fields by the caller.
 */
export type ScoreFact = {
    /** Calendar day in the caller's chosen timezone, YYYY-MM-DD. */
    day: string;
    /** An anonymous model label; not a provider URL or credential. */
    model: string;
    monitoring: boolean;
    /** -1 absent; 0 mentioned without a rank; positive integer = rank. */
    own: number;
};
export type CheckStatus = 'pass' | 'warn' | 'fail';
export type SiteCheck = {
    id: string;
    status: CheckStatus;
};
export declare function statusWeight(status: CheckStatus): number;
export declare const GEM_VERSION = "v2-standalone.1";
export type SheepKey = 'S' | 'H' | 'E1' | 'E2' | 'P';
export declare const SHEEP_DIMENSIONS: Array<{
    key: SheepKey;
    letter: string;
    name: string;
    weight: number;
    source: string;
}>;
export declare const MIN_WEEKLY_CHECKS = 20;
export type SheepScores = Record<SheepKey, number | null>;
export declare function gradeOf(score: number | null): string | null;
export declare function gemOf(scores: SheepScores): number | null;
export type SemanticDetail = {
    checks: number;
    mention: number;
    top3: number;
    first: number;
};
export declare function semanticScore(facts: ScoreFact[]): {
    score: number | null;
    detail: SemanticDetail;
};
export type EcosystemDetail = {
    checks: number;
    citingOwn: number;
    coverage: number;
    models: number;
    modelsCitingOwn: number;
};
/** ownCited(fact) = 这次检测的回答是否引用了我方内容（官网或已登记内容） */
export declare function ecosystemScore<T extends ScoreFact>(facts: T[], ownCited: (fact: T) => boolean): {
    score: number | null;
    detail: EcosystemDetail;
};
export type CrawlPageForScore = {
    status: number | null;
    ms: number | null;
    checks: SiteCheck[];
};
export type SiteScoreInput = {
    pages: CrawlPageForScore[];
    siteChecks: SiteCheck[];
    trust: Record<string, boolean>;
    aiCrawlers: {
        checked: number;
        blocked: number;
    };
};
export declare function siteScores(input: SiteScoreInput): {
    E1: number | null;
    H: number | null;
    P: number | null;
};
/** 'YYYY-MM-DD'（上海日期）所在周的周一 */
export declare function weekStart(day: string): string;
export declare function weekEnd(start: string): string;
/**
 * SHEEP 的数据源：监控在需要比较的每一期都有检测才只用监控，否则用全部关键词检测。
 * 这里「每一期」= 近 N 周里有检测的每个完整周（本周没过完不算，免得周中监控还没跑就整体切走）；
 * 近 N 周没有一条监控 → 用检测。刚开监控的项目早几周因此不会空白。
 */
export declare function pickSheepFacts(facts: ScoreFact[], today: string, weeks: number): ScoreFact[];
export type CrawlScoreRecord = {
    finishedDay: string;
    E1: number | null;
    H: number | null;
    P: number | null;
};
export type SheepWeek = {
    week: string;
    scores: SheepScores;
    gem: number | null;
    grade: string | null;
    semantic: SemanticDetail;
    ecosystem: EcosystemDetail;
    /** 这一周用的是哪天的官网抓取（本周或之前最近一次） */
    crawlDay: string | null;
    /** 本周还没过完 */
    partial: boolean;
};
/**
 * 近 N 周的 GEM v2。S / E2 用当周的检测；E1 / H / P 用当周结束前最近一次官网抓取。
 * facts 应为同一数据源（监控或检测，调用方用 pickSheepFacts 选好），today 为上海日期。
 */
export declare function buildSheepWeeks<T extends ScoreFact>(input: {
    facts: T[];
    ownCited: (fact: T) => boolean;
    crawls: CrawlScoreRecord[];
    today: string;
    weeks?: number;
}): SheepWeek[];
/** 最近一个有总分的周（本周数据不足时回退上一周），以及它的上一周（算涨跌） */
export declare function latestSheep(weeks: SheepWeek[]): {
    current: SheepWeek | null;
    previous: SheepWeek | null;
};
/** 最弱且最容易动的维度：按 SHEEP 优化顺序（E 证据 → S → H → E 生态 → P），取第一个低于 60 的 */
export declare const SHEEP_LEVER_ORDER: SheepKey[];
export declare function nextLever(scores: SheepScores): SheepKey | null;
