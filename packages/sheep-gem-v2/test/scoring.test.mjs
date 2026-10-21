import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GEM_VERSION, MIN_WEEKLY_CHECKS, SHEEP_DIMENSIONS, statusWeight,
  semanticScore, ecosystemScore, siteScores, gemOf, gradeOf,
  weekStart, weekEnd, pickSheepFacts, buildSheepWeeks, latestSheep, nextLever,
} from '../dist/index.js';

const fact = (own, extra = {}) => ({day: '2026-01-07', model: 'model-a', monitoring: false, own, ...extra});
const repeat = (n, own, extra) => Array.from({length:n}, () => fact(own, extra));
const check = (id, status = 'pass') => ({id, status});
const fullSite = () => ({
  pages: [{status:200, ms:1000, checks:['readable','headings','meta','schema','dates'].map(id => check(id))}],
  siteChecks: ['llms-txt','sitemap','https'].map(id => check(id)),
  trust: {about:true,contact:true,credential:true,cases:true,press:true,organization:true},
  aiCrawlers: {checked:2,blocked:0},
});

test('version and five published weights remain explicit', () => {
  assert.equal(GEM_VERSION, 'v2-standalone.1');
  assert.equal(MIN_WEEKLY_CHECKS, 20);
  assert.deepEqual(SHEEP_DIMENSIONS.map(d => [d.key,d.weight]), [['S',.25],['H',.25],['E1',.2],['E2',.15],['P',.15]]);
  assert.ok(Math.abs(SHEEP_DIMENSIONS.reduce((s,d)=>s+d.weight,0)-1)<1e-10);
});
test('rank observations: absent, unranked mention, top 3 and first recommendation', () => {
  const facts = [...repeat(5,1),...repeat(3,2),...repeat(2,3),...repeat(4,0),...repeat(1,5),...repeat(5,-1)];
  assert.deepEqual(semanticScore(facts), {score:58,detail:{checks:20,mention:75,top3:50,first:25}});
  assert.equal(semanticScore(repeat(20,0)).score,50);
  assert.equal(semanticScore(repeat(20,-1)).score,0);
  assert.equal(semanticScore(repeat(20,1)).score,100);
});
test('insufficient samples keep diagnostics but withhold scores', () => {
  assert.deepEqual(semanticScore([]),{score:null,detail:{checks:0,mention:0,top3:0,first:0}});
  assert.equal(semanticScore(repeat(19,1)).score,null);
  assert.equal(ecosystemScore(repeat(19,1),()=>true).score,null);
  assert.equal(ecosystemScore([],()=>true).score,null);
});
test('citation coverage and model diversity: manually calculated 57', () => {
  const facts = [...repeat(10,1,{model:'model-a'}),...repeat(10,1,{model:'model-b'})].map((f,i)=>({...f,cited:i<6}));
  assert.deepEqual(ecosystemScore(facts,f=>f.cited),{score:57,detail:{checks:20,citingOwn:6,coverage:30,models:2,modelsCitingOwn:1}});
  assert.equal(ecosystemScore(facts,()=>true).score,100);
  assert.equal(ecosystemScore(facts,()=>false).score,0);
});
test('no crawled pages means all site dimensions are missing', () => {
  assert.deepEqual(siteScores({...fullSite(),pages:[]}),{E1:null,H:null,P:null});
});
test('all positive site signals produce 100 in each site dimension', () => {
  assert.deepEqual(siteScores(fullSite()),{E1:100,H:100,P:100});
});
test('site evidence and performance match independent hand calculations', () => {
  const input = {
    pages:[
      {status:200,ms:1000,checks:[check('reachable'),check('readable'),check('headings','warn'),check('meta'),check('schema','fail')]},
      {status:200,ms:3000,checks:[check('readable','fail'),check('headings'),check('meta','warn'),check('schema'),check('dates','warn')]},
      {status:404,ms:5000,checks:[check('reachable','fail'),check('speed','fail')]},
    ],
    siteChecks:[check('llms-txt','warn'),check('sitemap')],
    trust:{about:true,contact:true,cases:true,unrecognized:true},
    aiCrawlers:{checked:12,blocked:3},
  };
  // E1 = ((.625 + .6)/2 * .85 + .75*.15)*100 = 63.3125
  // H = 3/6*100; P = (.75*.35 + (2/3)*.25 + .5*.2)/.8*100
  assert.deepEqual(siteScores(input),{E1:63,H:50,P:66});
});
test('HTTPS pass, warning and fail have different contributions', () => {
  for(const [state,expected] of [['pass',100],['warn',90],['fail',80]]) {
    const input=fullSite(); input.siteChecks=input.siteChecks.map(c=>c.id==='https'?check('https',state):c);
    assert.equal(siteScores(input).P,expected);
  }
});
test('legacy missing HTTPS redistributes weights instead of assuming a certificate', () => {
  const input=fullSite(); input.siteChecks=input.siteChecks.filter(c=>c.id!=='https');
  assert.equal(siteScores(input).P,100);
});
test('timing thresholds include 1500 and 4000 ms', () => {
  for(const [ms,score] of [[1500,100],[1501,90],[4000,90],[4001,80],[null,80]]) {
    const input=fullSite(); input.pages[0].ms=ms; assert.equal(siteScores(input).P,score);
  }
});
test('legacy defaults for absent check coverage are explicit', () => {
  const input=fullSite(); input.aiCrawlers={checked:0,blocked:0};
  assert.equal(siteScores(input).P,100);
  input.pages[0].checks=[]; input.siteChecks=[];
  assert.equal(siteScores(input).E1,0);
});
test('GEM has independently calculated rounding and missing-value behavior', () => {
  assert.equal(gemOf({S:80,H:60,E1:50,E2:40,P:100}),66);
  for(const value of [null,NaN,Infinity]) assert.equal(gemOf({S:80,H:value,E1:50,E2:40,P:100}),null);
});
test('grade boundaries', () => {
  assert.deepEqual([100,90,89,80,79,70,69,60,59,40,39,0].map(gradeOf),['A+','A+','A','A','B+','B+','B','B','C','C','D','D']);
  assert.equal(gradeOf(null),null); assert.equal(gradeOf(NaN),null);
});
test('week boundaries cross calendar year and leap day correctly', () => {
  assert.equal(weekStart('2026-01-01'),'2025-12-29');
  assert.equal(weekEnd('2025-12-29'),'2026-01-04');
  assert.equal(weekStart('2024-02-29'),'2024-02-26');
});
test('weekly values do not use future observations or future crawl snapshots', () => {
  const facts=[...repeat(20,-1),...repeat(20,1,{day:'2026-01-09'})];
  const result=buildSheepWeeks({facts,ownCited:()=>false,today:'2026-01-07',weeks:1,crawls:[
    {finishedDay:'2026-01-06',E1:10,H:10,P:10},
    {finishedDay:'2026-01-09',E1:100,H:100,P:100},
  ]})[0];
  assert.equal(result.semantic.checks,20); assert.equal(result.scores.S,0);
  assert.equal(result.crawlDay,'2026-01-06'); assert.equal(result.scores.H,10); assert.equal(result.partial,true);
});
test('weekly series carries forward previous available site snapshot', () => {
  const series=buildSheepWeeks({facts:repeat(20,1),ownCited:()=>true,today:'2026-01-07',weeks:2,crawls:[{finishedDay:'2026-01-01',E1:80,H:80,P:80}]});
  // 100*.25 + 80*.25 + 80*.20 + 100*.15 + 80*.15 = 88.
  assert.equal(series.length,2); assert.equal(series[0].gem,null); assert.equal(series[1].gem,88);
  assert.equal(series[1].crawlDay,'2026-01-01');
  assert.equal(latestSheep(series).current.week,'2026-01-05'); assert.equal(latestSheep(series).previous,null);
  assert.deepEqual(latestSheep([]),{current:null,previous:null});
});
test('monitoring is selected only when all populated complete weeks have it', () => {
  const old=fact(1,{day:'2025-12-30'});
  const monitored=fact(1,{monitoring:true});
  const mixed=[old,monitored];
  assert.equal(pickSheepFacts(mixed,'2026-01-07',2),mixed);
  const covered=[{...old,monitoring:true},monitored,fact(0)];
  assert.equal(pickSheepFacts(covered,'2026-01-07',2).length,2);
});
test('next action follows the published priority rather than minimum score', () => {
  assert.equal(nextLever({S:10,H:10,E1:59,E2:10,P:10}),'E1');
  assert.equal(nextLever({S:100,H:100,E1:100,E2:100,P:100}),null);
});
test('check weights map explicitly', () => {
  assert.deepEqual(['pass','warn','fail'].map(statusWeight),[1,.5,0]);
});
test('calculation is deterministic and leaves input unchanged', () => {
  const input=fullSite(); const before=structuredClone(input);
  assert.deepEqual(siteScores(input),siteScores(input)); assert.deepEqual(input,before);
  const facts=repeat(20,1); const snapshot=structuredClone(facts);
  semanticScore(facts); ecosystemScore(facts,()=>true); assert.deepEqual(facts,snapshot);
});
test('all valid uniform rank samples and representative site checks stay within 0..100', () => {
  for(const own of [-1,0,1,2,3,4,100]) for(const n of [20,21,100]) {
    const facts=repeat(n,own); const result=semanticScore(facts).score;
    assert.ok(result>=0 && result<=100);
    for(const cite of [true,false]) assert.ok(ecosystemScore(facts,()=>cite).score<=100);
  }
});
test('runtime implementation has no imports, environment access or network operations', () => {
  const source=readFileSync(new URL('../dist/index.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:import|require|fetch|XMLHttpRequest|WebSocket)\s*(?:\(|[{*'"])/);
  assert.doesNotMatch(source,/process\s*\.\s*env|https?:\/\/|postgres(?:ql)?:\/\//i);
});
