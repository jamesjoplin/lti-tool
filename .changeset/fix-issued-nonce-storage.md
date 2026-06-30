---
'@lti-tool/dynamodb': major
'@lti-tool/d1': patch
'@lti-tool/memory': patch
'@lti-tool/mysql': major
'@lti-tool/postgresql': major
'@lti-tool/core': patch
---

Require nonces to be stored before validation succeeds.

MySQL, PostgreSQL, and DynamoDB now store issued nonces during login and atomically mark existing unexpired nonces as used during launch validation. Unknown, expired, or already-used nonces now fail validation instead of being accepted on first sight.

The obsolete `nonceExpirationSeconds` storage adapter option has been removed from MySQL, PostgreSQL, and DynamoDB configuration types. Nonce expiration is controlled by the core LTI security config and passed to storage as the issued nonce `expiresAt` value.

SQL migrations backfill existing nonce rows as consumed so historical replay-protection records cannot become valid unused issued nonces after upgrade.
