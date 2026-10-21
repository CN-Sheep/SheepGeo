# SHEEP GEM v2

A standalone TypeScript implementation of the SHEEP five-dimensional scoring model. It computes scores from caller-supplied observations and site checks, entirely offline. Runtime dependencies: none.

This component contains **no datasets, customer identities, prompts, responses, model credentials, crawler, database connector, or production configuration**. All examples and tests are artificial. It is a scoring library, not a hosted analysis platform.

## Run locally

Requires Node.js 20 or newer. Compiled JavaScript and type declarations are included in the review bundle.

```sh
node examples/synthetic.mjs
node --test test/*.test.mjs
```

To rebuild from TypeScript:

```sh
npm ci
npm test
```

The development install obtains TypeScript from the package registry; the library and tests themselves do not contact any service. No package has been published to npm. The name in package.json is a local package name and does not assert registry ownership.

## Usage

```js
import { semanticScore, ecosystemScore, gemOf } from './dist/index.js';

const observations = Array.from({ length: 20 }, (_, index) => ({
  day: '2026-01-07',
  model: index < 10 ? 'model-a' : 'model-b',
  monitoring: false,
  own: index < 5 ? 1 : index < 10 ? 2 : index < 15 ? 0 : -1,
  cited: index < 6,
}));

const S = semanticScore(observations).score; // 58
const E2 = ecosystemScore(observations, item => item.cited).score; // 57
const gem = gemOf({ S, H: 100, E1: 100, E2, P: 100 }); // 83
```

The optional `cited` property above is a synthetic caller-defined flag. The library requires no source URL or response text to calculate E2.

## Dimensions

| Key | Dimension | Weight | Input |
| --- | --- | --- | --- |
| S | Semantic Coverage | 25% | Mention, top-three and first-rank observations |
| H | Human Credibility | 25% | Six binary site trust signals |
| E1 | Evidence Structuring | 20% | Page and site check statuses |
| E2 | Ecosystem Integration | 15% | Citation coverage and model diversity |
| P | Performance Monitoring | 15% | Crawler access, HTTP reachability, HTTPS and response time |

S and E2 require at least 20 observations. A missing dimension makes the overall GEM score `null`. Scores and thresholds are heuristics; they are not calibrated probabilities, proof of authority, or predictions of revenue or AI recommendations. Twenty samples is an implementation threshold, not a statistical confidence guarantee.

See [METHODOLOGY.md](METHODOLOGY.md) for formulas, data conventions and legacy defaults, [PRIVACY.md](PRIVACY.md) for data boundaries, and [README.zh-CN.md](README.zh-CN.md) for Chinese guidance.

## Public API

- `semanticScore`, `ecosystemScore`, `siteScores`: dimension calculations.
- `gemOf`, `gradeOf`: weighted total and grade.
- `weekStart`, `weekEnd`, `pickSheepFacts`, `buildSheepWeeks`, `latestSheep`: weekly time series.
- `nextLever`: first low dimension in a fixed suggested action order.
- `SHEEP_DIMENSIONS`, `MIN_WEEKLY_CHECKS`, `GEM_VERSION`, `statusWeight`: scoring metadata.

Inputs must already be validated, deduplicated, and consistently sampled by the caller. Functions expect finite, valid numeric values, ISO calendar dates and the documented check statuses. This component does not validate arbitrary untrusted JSON or evaluate whether upstream citations and rankings are correct. Do not mutate exported scoring metadata.

## License scope

MIT applies only to this standalone component. It does not change the license of other SheepGeo repository content or the commercial application. See [NOTICE](NOTICE).
