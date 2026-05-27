---
'@lti-tool/core': patch
'@lti-tool/dynamodb': patch
'@lti-tool/hono': patch
'@lti-tool/mysql': patch
'@lti-tool/postgresql': patch
---

Emit Node-compatible ESM consistently across published packages by using NodeNext module resolution and explicit `.js` extensions for internal relative imports.
