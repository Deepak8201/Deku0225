# Guide — Generic Unknown

Collection procedure for a unit routed to `other`: its `type` is known and no guide covers it. Output: a partial in the [unit partial format](atp2-unit-partial-format.md), marked `Guide: none — generic procedure applied`.

You know what the node is — `type`, `typeAction` and the template name are all in hand. What is missing is a per-kind procedure, not the node's identity. The procedure below is bounded on purpose: it produces a faithful record of what the node contains, plus the report by which a type earns a guide of its own.

## Entry

Routing is by `templates[].type` from the export, through the `other` row of [atp2-node-taxonomy.md — Classes](atp2-node-taxonomy.md). The type is read from the test and never matched against a closed list: a type absent from that reference's `## Known types` is an ordinary entry here — never an error, never a reason to stop, to skip the node, or to guess a class from its name.

## Tools

| Tool | Args | Returns |
|---|---|---|
| `atp_get_log_children` | `logRecordId` | child log nodes |
| `atp_get_log_record` | `logRecordId` | the node's parameters, its condition, and for a leaf its request and response or its statement |
| `atp_get_log_screenshots` | `logRecordId` | screenshots, when a leaf turns out to be a UI action |

## Step 1 — Recurse under two limits

From the unit's log root, recurse `atp_get_log_children` until every branch reaches a leaf, under two hard limits:

- depth **6**;
- **40** leaves visited in total.

On hitting either limit, stop recursing immediately and record which limit was hit, at which node, and how much of the tree remained unexplored. Continuing past a limit is not an option.

Done when every branch has reached a leaf, or a limit is recorded.

## Step 2 — Capture each leaf verbatim

Call `atp_get_log_record` on each leaf and record what that leaf holds:

| The leaf holds | Capture |
|---|---|
| an HTTP exchange | method, full URL with query, request headers and body, response code, response body trimmed to a schema |
| a UI action | the action, the target hint verbatim, the typed value, plus one screenshot when the leaf has one |
| a statement — SQL, shell, an expression | the verbatim text, its inputs, its output |
| anything else | the record's fields verbatim, field name by field name, nothing renamed and nothing summarised |

For every leaf also record the condition that guarded it and, when the condition has a second branch, what that branch would have done; a leaf the run skipped is recorded with its condition, never dropped. Faithfulness beats tidiness here: when the shape of a record is unfamiliar, copy it rather than interpret it.

Done when every visited leaf has an entry, in execution order.

## Step 3 — Re-check the class

The leaves may show that a real class applies after all. Read the `## Classes` table of [atp2-node-taxonomy.md](atp2-node-taxonomy.md) against what they hold.

- A row now applies → abandon this guide, follow that class's guide from its first step, and report the override.
- No row applies → the routing stands and this procedure continues.

Done when the routing is either handed over or confirmed.

## Step 4 — Write the partial and the report

Read [atp2-value-rules.md](../../../../apm_modules/test-generation/.apm/skills/atp2-migration/references/atp2-value-rules.md) and apply its sections *Placeholder kinds and the proof each one needs*, *The env-config gate*, *Mark dictionary* and *Hosts observed in the run* to every value. Then write the file in the [unit partial format](atp2-unit-partial-format.md), one `## Statement N` block per leaf in execution order, keeping `Guide: none — generic procedure applied` in the header.

`## Notes` carries the six report fields of [atp2-node-taxonomy.md — Nodes without a guide](atp2-node-taxonomy.md), and on top of them:

- the leaf count reached and the depth the recursion stopped at;
- which limit was hit, if either was, and what stayed unexplored;
- what a per-kind guide for this `type` would have to cover.

## Failure rows

| Failure | Action |
|---|---|
| Either recursion limit is hit | `degrade` — write what was collected, record the limit and the unexplored remainder |
| A leaf's record is unreadable | `degrade` — `UNKNOWN (<reason>)` for that leaf, continue with the rest |
| A leaf's condition is exposed nowhere | `degrade` — `Condition: UNKNOWN (<reason>)` |
| The node has no children and no fields beyond its name | `degrade` — write one block holding the name, the `type` and the `typeAction`, and say that the log exposes nothing else |

## Return extras

`guideUsed` is `null`. `itemCount` is the number of blocks written. `notes` carries the six report fields. `screenshots` when a leaf turned out to be a UI action and its image was saved.
