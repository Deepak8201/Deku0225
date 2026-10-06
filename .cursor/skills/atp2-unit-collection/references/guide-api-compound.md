# Guide — API Compound

Collection procedure for a unit of kind `api-compound`: a `COMPOUND`/`ITF` node that resolves to no `callchainId`, such as `[SP][ITF Lite] …` or `Update TDM Table`, or a single catalog `REST` action. Output: a contract file in the [contract format](atp2-contract-format.md).

This unit has no callchain, so `atp_export_callchain_to_bruno` does not apply to it: the execution log under the unit's log root is the only source of its content.

## Tools

| Tool | Args | Returns |
|---|---|---|
| `atp_get_log_children` | `logRecordId` | child log nodes |
| `atp_get_log_record` | `logRecordId` | on a `TRANSPORT`/`REST` leaf the real `{ request, response }`; on a TECHNICAL "Store value X in variable Y" node the extraction; on a guard or condition node the expression it evaluated |

## Single catalog REST action

A catalog `REST` action is one unit per action and runs this same procedure over a single leaf. A `typeAction` ending in `-tdm` — `Delete all rows under system "systemName" and table title "tableTitle"`, `Insert object under project … with system … and table …` — is an ordinary HTTP step; no TDM-specific handling exists.

Statically only the template name and its parameter names are known. The endpoint (`/api/tdm/rest/truncate-table`), the headers, the request body and the response exist only in the run.

The request body of such a step is built from formulas rather than literals (`${locationMarket}${locationPopNumber}`), and its resolved columns arrive in `Run inputs`. Match every body field against `Run inputs` before recording it as a literal.

Two such actions yield two contracts carrying near-identical auth headers. That is accepted; never merge them into one file.

## Step 1 — Recurse the execution log

From the unit's log root, recurse `atp_get_log_children` through inner COMPOUND/ITF/TECHNICAL nodes down to the leaves, then call `atp_get_log_record` on each leaf and on each TECHNICAL store node:

```
Unit log root  ("[SP][ITF Lite] ...")
└─ atp_get_log_children → ITF / sub-COMPOUND
   └─ atp_get_log_children → TECHNICAL "..."
      ├─ TRANSPORT "Get Authorization Token"        → atp_get_log_record → request+response
      ├─ TRANSPORT "Create resource (POST)"         → atp_get_log_record → request+response
      ├─ TECHNICAL "Store value $.id in variable X" → atp_get_log_record → extraction (field → var)
      └─ TRANSPORT "[WA][SNMP] ..."                 → non-HTTP leaf → Transport, no endpoint
```

Per HTTP leaf capture: method, full URL with query, request headers, request body, response code, and response body trimmed to a schema. Per TECHNICAL store node capture: the JSONPath and the variable it feeds.

For repeated inner sub-compounds, compare `definitionId` and request path:

- both identical → collect one representative and note the repetition;
- either differs → collect both;
- neither is available → collect both, never merge on a guess.

An inner node carrying its own `callchainId` is referenced in `## Notes` by that id instead of having its calls copied in.

Done when every leaf under the root is captured, marked `UNKNOWN`, or recorded as a non-HTTP transport.

## Step 2 — Capture the conditions, not the branch

Collect what reproduces the unit as a test case, not as this one run.

- A leaf the run skipped is captured all the same, together with the condition that governs it; the format's *Non-standard calls* table gives the entry for a call with no response.
- A guard, an `if` or a value transformation is captured as the expression it holds; the outcome this run produced is the observation, never the rule.
- A retry, a delay or a skip the log exposes belongs to the call it governs.

Done when every branch under the root is recorded either as an executed call or as a condition plus the call it guards.

## Step 3 — Leaves of more than one surface

A mixed compound arrives whole: leaves of two surfaces in one unit, for instance a form filled in the UI and then checked over REST. Work the leaves in execution order and capture each by its own kind:

| Leaf | Captured as in |
|---|---|
| HTTP | Step 1 of this guide |
| UI action | [guide-ui-group.md](guide-ui-group.md) |
| SQL, shell or expression statement | [guide-db-ssh-data.md](guide-db-ssh-data.md) |

Every block lands in the one file this unit writes, in the shape the format's *Mixed units* section gives it. There is no second artifact, no second worker, and no split by surface.

## Step 4 — Capture the auth call

Evidence: a leaf whose response yields an `access_token` that later leaves send as `Authorization: Bearer …`.

- Such a leaf exists → build `authCall` with `endpoint`, `body` (credentials templated) and `store` (the JSONPath the token comes from).
- No such leaf → omit `authCall`.

Never put a real token or credential in it.

## Step 5 — Contract deltas

Write the file in the [contract format](atp2-contract-format.md) with these values:

| Element | Value |
|---|---|
| Title | `# Contract — <unit name>` |
| `> Source:` key | `definitionId=<Contract key>` for a compound, `stepId=<Contract key>` for a single action |
| `{param}` names | the unit's `Run inputs`; this unit has no callchain keys |
| Extraction logic (`→ Store`) | the TECHNICAL "Store value X in variable Y" nodes of Step 1 |
| `Condition:` | the expressions of Step 2 |
| `## Notes` | repeat observations, referenced callchainIds, UNKNOWNs, log record ids, dump files |

Inner sub-compounds and leaves become the `## Call 1..N` blocks of this one contract.

## Failure rows

| Failure | Action |
|---|---|
| A TRANSPORT/REST response is absent, skipped or unreadable | `degrade` — `Status: UNKNOWN (<reason>)` and `Response Schema: UNKNOWN (<reason>)` |
| A leaf carries no HTTP endpoint | `degrade` — record it as `Transport: <type>` and list it in `transportNotes` |
| A guard or condition node is present but unreadable | `degrade` — its node name plus `UNKNOWN (<reason>)` in `## Notes` |
| The recursion finds no leaf under the root | `stop` |

## Return extras

`resolvedHosts`, `authCall`, `transportNotes`. Never `brunoExported`. `itemCount` is the number of HTTP `## Call` blocks written.

`resolvedHosts` carries each HTTP leaf's resolved `scheme://host` with `System alias` as its alias; a non-HTTP leaf contributes no host.
