---
'@lti-tool/core': patch
---

Accept dynamic registration responses that omit `messages` from the LTI tool configuration. Moodle 5.3 leaves it out, which made registration fail with "Invalid request data" after the platform had already registered the tool.
