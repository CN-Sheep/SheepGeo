# Integration into the existing public repository

This standalone component lives at `packages/sheep-gem-v2/` in the public SheepGeo repository. The root LICENSE clarifies the MIT exception for this component; the original terms for other framework documents remain in place.

The public repository's root README should distinguish:

- Existing published methodology and documents, under their existing terms.
- `packages/sheep-gem-v2/`, a runnable scoring implementation under that directory's MIT license.
- The commercial service, data collection infrastructure and datasets, which are not included or licensed by this component.

Link to the component README and its offline example. Avoid describing the entire commercial platform as open source. The MIT notice must travel with the new component.

Run `npm ci && npm test` in the component directory after integration. Review the resulting Git diff for unintended files. Never copy a production project directory, its Git history, environment files, deployment scripts, server configuration, databases, reports or exports into the public repository.

This preparation does not push commits, publish a package, change a server, or submit a program application. The existence of a runnable component alone does not establish adoption or guarantee selection for a support program. Support any future usage and maintenance claims with verified evidence, without exposing customer identities or conversations.
