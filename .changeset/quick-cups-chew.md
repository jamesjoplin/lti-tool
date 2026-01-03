---
'@lti-tool/core': major
---

First stable release of LTI 1.3 toolkit for Node.js.

- Add ltiServiceFetch utility with automatic User-Agent injection for Canvas API compliance (effective January 2026)
- Add HTML escaping utility for XSS prevention in dynamic registration flows
- Complete LTI 1.3 specification: OIDC authentication, AGS, NRPS, Deep Linking, Dynamic Registration
- Serverless-native design optimized for AWS Lambda and Cloudflare Workers
- Cookie-free session management for iframe compatibility
