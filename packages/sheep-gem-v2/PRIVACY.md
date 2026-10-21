# Privacy boundary

This package uses no network, filesystem, database or environment access during scoring. It does not log or retain observations; returned scores and diagnostics remain in the caller's process. User-supplied callbacks may perform I/O; keep citation callbacks pure to retain offline operation.

All shipped observations are generated from constants and arithmetic. No production conversations, brand records, customer reports, source URLs, user identifiers, conversation IDs, credentials, infrastructure configuration or server access files were used as fixtures. No production system was queried to prepare this release.

Callers should derive the minimum ranking and check-status fields within their own controlled environment. Do not attach brand names, prompts, responses, domains, account IDs or server configuration to shared examples, issue reports, logs or pull requests. Anonymous labels are sufficient. Removing names from real conversations is not equivalent to creating safe synthetic examples.

This component does not release or license any conversations or other datasets. It makes no claim about consent or redistribution rights for data held by any application.
