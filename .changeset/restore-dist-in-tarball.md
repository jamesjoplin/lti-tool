---
'@lti-tool/core': patch
---

Restore the compiled `dist/` output to the published package. 1.3.0 was published without it, so importing `@lti-tool/core@1.3.0` fails. Packages now declare a `files` allowlist so their contents no longer depend on how the release tooling invokes `npm publish`.
