---
"@lti-tool/core": minor
---

`PrivacyClaimsSchema` now treats `given_name`, `family_name`, `name`, and `email` as optional, per the LTI 1.3 / OIDC spec. Platforms such as Canvas leave these claims out when a tool is registered with a `privacyLevel` other than `public`, and those launches used to fail validation.

**Type change:** these fields on `LTI13JwtPayload` are now `string | undefined`. If your code reads them from `session.jwtPayload` and expects a `string`, add a fallback. `session.user.*` was already optional, so code using it is unaffected.
