# Validation of this review bundle

- Strict TypeScript build succeeded using TypeScript 5.9.2.
- Repository integration also passed a build using locked TypeScript 5.9.3, with all 22 tests passing.
- `npm test` passed all 22 tests on Node.js 24.11.1.
- The synthetic example returned S=58, E2=57, H/E1/P=100, GEM=83, grade A.
- 250 seeded synthetic scenarios produced 1,250 matching results against the source calculation for S, E2, site dimensions, total score and action selection.
- Dedicated tests cover the standalone as-of-date correction, sample thresholds, missing dimensions, site-check defaults, HTTPS and response-time boundaries, source selection and weekly carry-forward.
- The release file list is explicit. A text scan checks for connection strings, private keys, credential-like tokens, email addresses, IP literals, absolute drive paths and web addresses. No matches were found in the candidate release.
- The scorer's compiled runtime contains no imports, environment access or network operations. All shipped observations are synthetic. Production services and data were not queried.

Checksums detect later byte changes; they are not an authenticity signature. To verify the unpacked review bundle before installing dependencies:

```sh
node verify-release.mjs
```

The scan and tests cover this extracted component and its shipped files, not the security of the commercial application, the scientific validity of the heuristic model, or arbitrary data later supplied by a caller. The extraction intentionally excludes application configuration and production data.
