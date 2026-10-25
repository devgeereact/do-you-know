# Offline Specification

| Journey | Offline read | Offline write | User message | Queue or fallback | Recovery |
|---|---|---|---|---|---|
| `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |

Define cache allowlists, expiry, private-data exclusions and behaviour across slow, intermittent, offline and restored connections. Never imply a write succeeded before durable confirmation.
