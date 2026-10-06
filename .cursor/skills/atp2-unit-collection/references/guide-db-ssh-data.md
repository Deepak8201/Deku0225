# Guide — DB, SSH and Data

Collection procedure for a unit routed to `db` (a query against a database), `ssh` (a remote shell command) or `data` (a store node that computes its own value). Output: a partial in the [unit partial format](atp2-unit-partial-format.md).

A SQL statement, a shell command and a computed expression are recorded exactly as executed — a paraphrase cannot be run. The same holds for the condition that guarded the node and for the branch the run did not take: the artifact must reproduce the test case, not the one run it was read from.

## Entry

Routing is by `templates[].type` from the export, through the `db`, `ssh` and `data` rows of [atp2-node-taxonomy.md — Classes](atp2-node-taxonomy.md). The type is read from the test and never matched against a closed list: a type absent from that reference's `## Known types` routes by those same rows and is not an error. Never derive the kind from the node's name.

## Tools

| Tool | Args | Returns |
|---|---|---|
| `atp_get_log_children` | `logRecordId` | child log nodes, when the unit wraps its statement in inner nodes |
| `atp_get_log_record` | `logRecordId` | the node's action type, its resolved parameters, the statement text, the condition it carried, the output it produced and the variable it fed |

## Step 1 — Locate the statement

Call `atp_get_log_record` on the unit's log root. When that record carries no statement of its own, recurse `atp_get_log_children` one level at a time until a child exposes it; stop at depth 4.

The statement is the resolved text the run executed — the SQL with its values substituted, the shell command as it was sent. Where the record exposes both a template and a resolved form, record the resolved form and note the template's parameters as `Inputs`.

Done when every node of the unit has its statement text, or a failure row applies to it.

## Step 2 — Capture per kind

| Kind | Capture |
|---|---|
| `db` | the SQL, the connection or datasource name, the bound parameters, the returned rows (1–2), the variable the value feeds |
| `ssh` | the command, the working directory when the record exposes one, the exit status, the captured stdout (trimmed), the variable it feeds |
| `data` | the expression or transformation, its inputs, the computed value, the variable it feeds |

For every kind also capture the condition under which the node ran and, when the condition has a second branch, what that branch would have done. A node the run skipped still gets its capture: its condition, and its output as `UNKNOWN (skipped in this run)`.

Done when every executed and every skipped node of the unit is captured, in execution order.

## Step 3 — Apply the value rules

Read [atp2-value-rules.md](../../../../apm_modules/test-generation/.apm/skills/atp2-migration/references/atp2-value-rules.md) and apply its sections *Placeholder kinds and the proof each one needs*, *The env-config gate*, *Mark dictionary* and *Hosts observed in the run* to every host, port, credential and inlined value the statement carries.

The unit's target system is the `System alias` of CONTEXT; `Run inputs` is what proves a `{param}`. Record the resolved `scheme://host` and its alias for the `resolvedHosts` return field when the record exposes one.

Done when every value in hand is either a proven placeholder or a resolved value with one mark.

## Step 4 — Write the partial

Write the file in the [unit partial format](atp2-unit-partial-format.md), each captured node as its own block, and check it against that file's `## Acceptance`.

## Failure rows

| Failure | Action |
|---|---|
| The record exposes the node name but no statement text | `degrade` — `Statement: UNKNOWN (the log exposes only the node name)`, and say what the name was |
| The output is absent or unreadable | `degrade` — `Observed output: UNKNOWN (<reason>)` |
| The connection or datasource name is not exposed | `degrade` — `Target` holds the `System alias` alone, plus any fragment the record does show |
| The condition is exposed nowhere on the node | `degrade` — `Condition: UNKNOWN (<reason>)`; an unread condition is never written as `none` |
| The recursion reaches depth 4 without finding a statement | `degrade` — write the block with `UNKNOWN` and record what the four levels contained |

Nothing here is a `stop`: a unit of this kind always produces a block, even when every field of it is `UNKNOWN`.

## Return extras

`resolvedHosts` when the unit exposed one. `itemCount` is the number of `## Statement` blocks written.
