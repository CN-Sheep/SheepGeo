import { semanticScore, ecosystemScore, siteScores, gemOf, gradeOf } from '../dist/index.js';
// Entirely artificial observations: no prompt, brand, domain or response fields.
const facts = Array.from({length: 20}, (_, i) => ({
  day: '2026-01-07', model: i < 10 ? 'model-a' : 'model-b',
  monitoring: false, own: i < 5 ? 1 : i < 10 ? 2 : i < 15 ? 0 : -1,
  cited: i < 6
}));
const pass = id => ({id, status: 'pass'});
const site = siteScores({
  pages: [{status: 200, ms: 1000, checks: ['readable','headings','meta','schema','dates'].map(pass)}],
  siteChecks: ['llms-txt','sitemap','https'].map(pass),
  trust: {about:true,contact:true,credential:true,cases:true,press:true,organization:true},
  aiCrawlers: {checked: 2, blocked: 0}
});
const scores = {S: semanticScore(facts).score, E2: ecosystemScore(facts, f => f.cited).score, ...site};
console.log(JSON.stringify({synthetic: true, scores, gem: gemOf(scores), grade: gradeOf(gemOf(scores))}, null, 2));
