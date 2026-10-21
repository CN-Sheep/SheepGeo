# Methodology and input contract

Algorithm identifier: `v2-standalone.1`. This is an extracted calculation component, not a trained model or a dataset release. It preserves the GEM v2 formulas while adding an as-of-date limit to weekly data selection.

## Observation contract

Each observation has `day` (valid YYYY-MM-DD in one caller-selected timezone), `model` (a nonempty anonymous identifier), `monitoring` (boolean), and `own` (integer: -1 absent, 0 unranked mention, positive rank). An observation must represent one independently collected, deduplicated execution. `ownCited` is a deterministic caller-supplied predicate. Upstream sampling, correctness, source ownership matching and citation verification are outside this library.

S = mention rate × 50 + top-three rate × 30 + first-rank rate × 20.

E2 = min(100, citation coverage × 200) × 0.7 + citing-model fraction × 100 × 0.3.

Rates are fractions in [0,1]. Both dimensions withhold their score below 20 observations while retaining diagnostic counts. Repeated or biased observations can distort results; the threshold does not establish representative coverage.

## Site contract and formulas

HTTP status is an integer or null; response time `ms` is a finite nonnegative number or null. Check statuses are exactly `pass`, `warn`, `fail`, weighted 1, 0.5, 0. Each page's check IDs and each site-level check ID should be unique. `aiCrawlers.checked` and `blocked` are nonnegative integers with blocked <= checked. Trust flags are booleans.

- E1: average per-page evidence check fraction ×85 + site evidence check fraction ×15. Page IDs: `readable`, `headings`, `meta`, `schema`, `dates`. Site IDs: `llms-txt`, `sitemap`. Pages without relevant checks are excluded from that page average. An entirely missing evidence portion contributes zero.
- H: number of true flags among `about`, `contact`, `credential`, `cases`, `press`, `organization`, divided by six, times 100. Signals indicate presence, not independent verification of claims.
- P: crawler access ×35 + reachable-page fraction ×25 + HTTPS status weight ×20 + speed fraction ×20. Reachable means HTTP 200..299. Speed gets 1 at <=1500ms, 0.5 at <=4000ms, otherwise 0; pages with unknown timings are excluded from speed averaging, or speed is zero if none have timings.
- Compatibility defaults: zero crawler checks means crawler-access fraction 1. Missing `https` redistributes the remaining three weights by dividing their sum by 0.8. These are legacy compatibility assumptions, not verified access or TLS findings.
- No pages means E1, H and P are all null.

Dimension scores are clamped to 0..100 and rounded. GEM is the rounded weighted sum of those dimension scores: S .25, H .25, E1 .20, E2 .15, P .15. A null or nonfinite dimension yields no GEM total. The caller must reject out-of-range input scores and malformed observations; the library does not provide a general input validator.

Grades: A+ >=90, A >=80, B+ >=70, B >=60, C >=40, D otherwise. Missing or nonfinite totals have no grade. These grades are not comparable to historical versions with different scales or collection methods.

## Weekly selection

Weeks start Monday and end Sunday. Supply `today` in the same calendar timezone as observation days and crawl completion days. `weeks` must be a positive integer. S and E2 use observations in each week up to `today`; H/E1/P use the last site snapshot at or before min(week end, today). A snapshot can be carried forward indefinitely; `crawlDay` exposes its age and the caller should decide when to refresh it. The current week has `partial=true`, even if it already has enough data to score.

`pickSheepFacts` selects only monitoring observations when monitoring exists in the requested period and every populated complete week in it has monitoring. Otherwise it returns all observations. It selects a source, not a date range; `buildSheepWeeks` performs week selection. An incomplete current week is intentionally excluded from the completeness decision.

`latestSheep` selects the most recent scored week and previous scored week, potentially skipping unscored weeks. `nextLever` chooses the first score below 60 in E1, S, H, E2, P order; it is a fixed heuristic, not a causal intervention recommendation.

## Limits

These weights are explicit heuristics, not statistically calibrated coefficients. This release makes no claim of independent validation, specific user counts, production dataset sizes, causal effects or expected business outcomes. Site checks and AI observation collection are not included. A full audit of source application security and scientific validity is outside this component's scope.
