# ATP2 Contract Format

The file format of a per-migration contract partial in the migration's working contract folder (`{MIG}contracts/`, gitignored) — written for an `api-callchain` unit (`<callchainId>__<slug>.md`) and for an `api-compound` unit (`<definitionId>__<slug>.md`). Both use the same shape; each guide's own deltas — title, `> Source:` key, where `{param}` names and extraction logic come from — stay in that guide.

A contract is **env-agnostic and test-case-agnostic**. Every value in it is one of exactly two things: a placeholder whose origin is proven — `{{SYSTEM.field}}`, `{param}`, `{var}` — or the value the run had, carrying exactly one mark. A dataset value never appears; a `$tc.*` variable appears only as the `{var}` it feeds, which stays local to this contract; a token is trimmed to `"eyJ...<trimmed>"`.

## File shape

````
# <Title — per the writing guide>

> Source: <contract key>=<id> | name=<Name> | run=<testRunId> | collected=<YYYY-MM-DD>
> System(s): <comma-separated {{SYSTEM}} aliases used>
> Signature: <optional readable signature, e.g. addDeviceToOlt(model)>

## Call 1 — <name>
- Method/Endpoint: `<METHOD> {{SYSTEM.url}}/path?query`
- Headers: Authorization: Bearer {authorization_token}; Content-Type: ...
- Body (request) (numbers unquoted): `{ ... }`
- Status: <observed response code>
- Response Schema (trimmed): `{ ... structure to match on; 1–2 list elements; JWTs trimmed ... }`
- → Store: var = `$.jsonpath`
- Condition: <when it runs> | Observed: <the branch that actually executed>

## Notes
<repeat/dedup observations, referenced contract keys, UNKNOWNs, log record ids, dump file paths>
````

Concrete example:

````
## Call 1 — Get Authorization Token
- Method/Endpoint: `POST {{public-gateway.url}}/api/v1/auth/token`
- Headers: Content-Type: application/x-www-form-urlencoded; x-request-id: <generated UUID>
- Body (request) (numbers unquoted): `{ "grant_type": "password", "username": "{{public-gateway.login}}", "password": "{{public-gateway.password}}" }`
- Status: 200
- Response Schema (trimmed): `{ "access_token": "eyJ...<trimmed>", "token_type": "Bearer", "expires_in": 3600 }`
- → Store: authorization_token = `$.access_token`
- Condition: always | Observed: executed
````

## Gated lines

Four markers are gated. A contract missing any of them fails its gate:

| Marker | Required |
|---|---|
| `## Call` | one block per call, executed or skipped |
| `> System(s):` | always present; empty or `none` only for a non-HTTP-only unit |
| `Response Schema` | one per HTTP call (the value may be `UNKNOWN (…)`) |
| `→ Store` | one per value a later step consumes |

`Status:` is required by every HTTP block, but is deliberately not a fifth gated marker.

## Writing rules

- **Header:** `collected` = today's date; `run` = the testRunId. No `schemaRev` / `defHash` — contracts are per-migration and never reused.
- Keep path, query, method, body structure, and JSONPath exactly as observed.
- **Trimming applies to responses only.** A response list is cut to 1–2 elements and a JWT to `"eyJ...<trimmed>"`. The request — path, query, headers, body — is always recorded complete; a truncated request cannot be replayed.
- `Status:` is the code the run actually returned. An absent response gives `Status: UNKNOWN (<reason>)`.
- `Condition:` states when the call runs; `Observed:` states which branch executed this run. Both are short clauses, not prose.
- `Observed:` stays an observation that proves the format. It is never a constant in generated code, never an assertion, and a generator stays a generator.
- A generated value used by several calls is one variable: generated once, stored, then only read.
- Numeric fields **unquoted** (or `<number>`); never quote a numeric placeholder. Booleans and null stay literal.
- Trees and nested objects are shown as a schema with explicit nesting and the match fields — not as prose.
- Variables listed in the Cross-step glossary come from earlier steps; do **not** flag them as unknown.

## Non-standard calls

| Observation | Contract entry |
|---|---|
| Create POST skipped on an idempotent hit | `Status: UNKNOWN (idempotent skip)` and `Response Schema: UNKNOWN (idempotent skip)`, plus the `Condition:` that governs the skip; never a fabricated schema |
| Response unavailable for another reason | `Response Schema: UNKNOWN (<reason>)`; never a fabricated schema |
| Non-HTTP transport, e.g. `[WA][SNMP]` outbound | `Transport: <type>` with a short note, no endpoint, no `Status`; adds no `> System(s):` dependency |
| A header holding a Velocity macro, e.g. `#macro( generateUUID )` | the intent — `x-request-id: <generated UUID>`; never the macro text |

## Mixed units

A unit touching two surfaces stays one unit and one file. Its blocks are `## Call 1..N`, numbered in execution order across surfaces, and each block opens with `- Surface: API | UI | DB | SSH`. No example of this shape exists in the analysed exports.

| Block | Fields |
|---|---|
| `API` | the field list of *File shape*, unchanged |
| `UI`, `DB`, `SSH` | `- Action:` (the interaction, or the verbatim statement) replaces `Method/Endpoint`, `Body (request)`, `Status` and `Response Schema`; `→ Store` and `Condition:` stay |

A single-surface unit writes no `- Surface:` line.

## Acceptance

`{valueRules}` = `.cursor/skills/atp2-migration/references/atp2-value-rules.md`; `{envTemplate}` = the env-config template named in CONTEXT. The file is done when all six checks pass:

1. The four markers of *Gated lines* are present.
2. A reader can write the HTTP call from one block alone: method, endpoint, headers, complete request body, status, response schema, stores and condition are each present or explicitly `UNKNOWN (<reason>)`.
3. Every `{{X.y}}` resolves in `{envTemplate}` by string comparison, keys carried over character for character: run the check of *The env-config gate* in `{valueRules}` against each one.
4. Every `{param}` and `{var}` carries the proof its kind needs, per *Placeholder kinds and the proof each one needs* in `{valueRules}`.
5. Every value with no proven origin is a resolved value carrying exactly one mark from the closed dictionary in *Mark dictionary* of `{valueRules}`. A mark invented on the spot fails this check.
6. Every condition found in the export, the Bruno scripts or the log sits on a `## Call` block — including a call the run skipped.
