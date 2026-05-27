---
'@lti-tool/core': patch
---

Accept LTI 1.3 launch ID tokens whose `aud` claim is an array containing the
tool client ID, and reject additional audiences unless configured as trusted.
Launch verification now binds the client configuration from signed state before
checking the ID token, and session creation preserves the verified client ID for
multi-audience launches.
