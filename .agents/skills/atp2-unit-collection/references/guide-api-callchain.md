# Guide — API Callchain

Collection procedure for a unit of kind `api-callchain`: a node whose `ITF` action resolves to a callchain. Output: one contract file in the [contract format](atp2-contract-format.md).

The compound wrapping the callchain belongs to this unit — see *Callchain wrapper compounds* in [atp2-node-taxonomy.md](atp2-node-taxonomy.md).

## From CONTEXT

| Field | Used for |
|---|---|
| `Contract key` | the `callchainId`: what is exported to Bruno and what fills `> Source:` |
| `System alias` | the unit's system, and the only source of `SYS` in `{{SYS.field}}` |
| `Run inputs` | the call-site arguments proving the origin of each `{param}` |
| `{brunoDir}` | where `.bru` files are exported |
| `{envTemplate}` | the env-config template every `{{SYS.field}}` is checked against |

Every recursion below starts from the unit's log root, which is already fixed when this guide begins.

## Tools

| Tool | Args | Returns |
|---|---|---|
| `atp_export_callchain_to_bruno` | `callchainId`, `projectId`, `outputDir`, `executionId`, `testRunId` | `.bru` files on disk: HTTP templates, scripts, conditions, unexecuted branches |
| `atp_get_log_children` | `logRecordId` | child log nodes |
| `atp_get_log_record` | `logRecordId` | on a `TRANSPORT` node the real `{ request, response }` |

## Step 1 — Export the callchain to Bruno

Call `atp_export_callchain_to_bruno` with `callchainId` = `Contract key` and `outputDir` = `{brunoDir}`, passing `executionId` and `testRunId` so `#if` body blocks resolve. `folder.bru` carries `docs { Callchain ID }`; a value differing from `Contract key` is a `## Notes` line.

Done when the `.bru` files exist on disk, or the failure row below has been applied.

## Step 2 — Read every `.bru` file whole

One `.bru` is one call, and the request is half of it: value generation, variable chains and skip logic live in the scripts. Read every block of every file.

| `.bru` block | What it yields |
|---|---|
| `meta` | the call name and `seq` — the order of the `## Call` blocks |
| `get` / `post` | method, endpoint, query, and the `{{var}}` the URL consumes |
| `headers` | the auth scheme, and every header the run generates |
| `body:json` / `body:text` | the request body and the `{{var}}` it consumes |
| `script:pre-request` | value generation, variable chains, and skip logic |
| `script:post-response` | which response field feeds which variable — the `→ Store` lines |
| `docs { System: }` | the callchain's ITF system; a mismatch with `System alias` is a `## Notes` line, never a replacement |
| `docs { Conditions: }` | the condition of that call, for Step 5 |

A Velocity macro in a header value is an intent, not text: `#macro( generateUUID )…` is recorded as "generate a UUID". The macro text itself never enters the contract.

Done when every `.bru` under `{brunoDir}` has been read block by block.

## Step 3 — Recurse the execution log

The log holds the real request, the real response body and status code, and the branch that executed. From the unit's log root, recurse `atp_get_log_children` down to `actionType: "TRANSPORT"` nodes, then call `atp_get_log_record` on each:

```
Unit log root
└─ atp_get_log_children → ITF "Run [BS] ..." (logRecordId)
   └─ atp_get_log_children → TECHNICAL "Call chain [BS] ..." (logRecordId)
      ├─ TRANSPORT "Get Authorization Token"  → atp_get_log_record → request+response
      ├─ TRANSPORT "Get country ID"           → atp_get_log_record → request+response
      └─ TECHNICAL "Call chain [Get City Id]" → atp_get_log_children → ... (deeper)
```

Per TRANSPORT node capture: method, full URL with query, request headers, request body, response code, and the response body trimmed to a schema.

For repeated inner callchains, compare `callchainId` and request path:

- both identical → collect one representative and note the repetition;
- either differs → collect both;
- neither is available → collect both, never merge on a guess.

The call list is complete when every `.bru` of Step 2 and every TRANSPORT leaf under the root has a `## Call` block. Completeness is settled here and nowhere else — never by comparing a count against a list of calls read out of the export, which leaves every `embeddedChainStep` unexpanded and is a lower bound.

Done when every TRANSPORT leaf under the root is captured or marked `UNKNOWN`.

## Step 4 — Turn the wrapper's `Store` actions into input arguments

The callchain declares no input keys of its own: its inputs arrive from outside, as the `Store` actions of the wrapper compound. Evidence: `Run inputs`, plus each `{{var}}` a `.bru` consumes.

| The `{{var}}` is | Contract entry |
|---|---|
| supplied by a wrapper `Store` and matched in `Run inputs` | `{param}`, named after the stored variable |
| set by the `script:post-response` of an earlier call | `{var}`, plus a `→ Store` line on the call that produces it |
| computed by a `script:pre-request` | the generator itself, recorded as a generator |
| none of the three | a resolved value carrying one mark from the dictionary the contract format's *Acceptance* names |

Done when every `{{var}}` of every `.bru` has exactly one of the four entries.

## Step 5 — Carry every condition, including the branch the run skipped

Evidence: `docs { Conditions: … }`, the `conditions` entries of the callchain step, and the skip logic of `script:pre-request`.

| Evidence | Contract entry |
|---|---|
| A condition on a call the run executed | `Condition:` states when the call runs, `Observed: executed` |
| A condition on a call the run skipped | a `## Call` block all the same, with that `Condition:`, `Observed: skipped (<reason>)` and `Status: UNKNOWN (<reason>)` |
| A pre-request check that skips a create when the id already exists | the GET-or-create pair: the variable checked, the call that sets it, the call it skips |
| None of the three sources holds a condition | `Condition: always` |

The observed branch never replaces the condition: a contract recording only the executed path reproduces one run, not the test case.

Done when every call carries a `Condition:` line and every condition found sits on a call.

## Step 6 — Capture the auth call

Evidence: a TRANSPORT step whose response yields an `access_token` that later steps send as `Authorization: Bearer …`.

- Such a step exists → build `authCall` with `endpoint` (`<METHOD> {{SYSTEM.url}}/path`), `body` (the credential fields of that system exactly as `{envTemplate}` names them) and `store` (the JSONPath the token comes from, e.g. `authorization_token = $.access_token`).
- No such step → omit `authCall`.

Never put a real token or credential in it.

## Step 7 — Contract deltas

Write the file in the [contract format](atp2-contract-format.md) with these values:

| Element | Value |
|---|---|
| Title | `# Callchain Contract — <unit name>` |
| `> Source:` key | `callchainId=<Contract key>` |
| `{param}` names | the wrapper `Store` variables of Step 4 |
| `→ Store` lines | the `script:post-response` blocks of Step 2, confirmed against the responses of Step 3 |
| `Condition:` / `Observed:` | the Step 5 table |
| `## Notes` | repeat observations, UNKNOWNs, the `{brunoDir}` path, log record ids, dump files |

A non-HTTP transport shows up here as a Bruno `/api/placeholder` URL, e.g. an SNMP outbound — record it as `Transport: <type>`, never as an invented endpoint.

## Failure rows

| Failure | Action |
|---|---|
| Bruno export fails or writes no `.bru` | retry once; still failing → `degrade`: build the contract from the log, return `brunoExported: false`, record the missing scripts and conditions |
| A `script:` block cannot be interpreted | `degrade` — quote it verbatim in `## Notes`; the values it feeds have no proven origin and take the matching mark |
| A TRANSPORT response is absent, skipped or unreadable | `degrade` — `Status: UNKNOWN (<reason>)` and `Response Schema: UNKNOWN (<reason>)` |
| A non-HTTP leaf has no endpoint | `degrade` — record it as `Transport: <type>` |
| The recursion finds no leaf under the unit's log root | `stop` |

## Return extras

`brunoExported`, `resolvedHosts`, `authCall`. `itemCount` is the number of `## Call` blocks written.
