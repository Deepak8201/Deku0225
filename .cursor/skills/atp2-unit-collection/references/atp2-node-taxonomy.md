# ATP2 Node Taxonomy

The single classification of an ATP2 node: which class it takes, which key deduplicates it, which guide collects it, and which artifact it produces. One node, one class.

Classification is offline. The evidence is `templates[].type` from the `atp_export_test_full` export — never a field of a run log record. A **unit** is defined in [atp2-export-format.md — Step, call site, unit, contract](../../../../apm_modules/test-generation/.apm/skills/atp2-migration/references/atp2-export-format.md), which also owns the rules that cut the scenario into units.

## Order of operations

1. Take the ordered steps of the scenario, repeats kept separate.
2. Apply the Absorption table. An absorbed node never becomes a unit, never gets a worker, and never gets a step block of its own.
3. Classify each remaining node by the evidence in Classes.
4. Deduplicate units by the rule of their class.

Absorb before classifying. A wait, a store of a constant and a store of a capture belong to a neighbouring step; classifying first turns them into phantom `other` units.

## Absorption

A technical node carries no step of its own — its content belongs to a neighbouring step. Absorption is **by node type**, and this table is exhaustive: absorbing a node of any other type is forbidden.

| Node type | Where its content goes |
|---|---|
| Wait (`Wait for "Timeout" seconds and take screenshot`) | leading `Actions` item of the **next** non-absorbed step, keeping the duration (`wait … up to 40 s`); a trailing wait at the very end becomes the closing item of the previous step. Never drop the duration |
| Store of a constant (`Store orgName2_original = Blomster Hex v1 0236`) | a row in the descriptor's `## Test Data Requirements` → **Fixed inputs** |
| Store of a capture (`Store current URL in mainPage`) | the `Stores` field of the step that produced the value |
| Store that computes its own value — SQL, a transformation | **not absorbed** — it is a `data` unit and a step of its own |

The second column is the destination inside the descriptor; counting absorbed nodes needs the first column only.

## Classes

| `unitKind` | Evidence | Contract key | Deduplication | `artifactKind` | Guide |
|---|---|---|---|---|---|
| `api-callchain` | an `ITF` action, alone or wrapped in a compound; its parameter `"0"` resolves to a `callchains[].id` | `callchainId` | same `callchainId` → one unit, note the repeat count; different → separate units | `contract` | `guide-api-callchain` |
| `api-compound` | a `REST` action, or a compound that resolves to no `callchainId` and whose leaves are not all `UI` — including a mixed compound of `UI` and `REST` leaves | the compound uuid; for a single action the template `stepId` | same key → one unit, note the repeat count; different key → separate units, never merged on a matching name | `contract` | `guide-api-compound` |
| `ui-group` | leaves are all `UI` — a compound of UI leaves, or consecutive top-level `UI` actions | none | never merged | `ui-partial` | `guide-ui-group` |
| `db` | `type` names a database query, e.g. `DB`, `SQL` | none | never merged | `unit-partial` | `guide-db-ssh-data` |
| `ssh` | `type` names a remote shell command, e.g. `SSH` | none | never merged | `unit-partial` | `guide-db-ssh-data` |
| `data` | a `TECHNICAL` store action that computes its own value — SQL, an expression, a transformation — rather than storing a constant or a capture | none | never merged | `unit-partial` | `guide-db-ssh-data` |
| `other` | a `type` no row above covers | none | never merged | `unit-partial` | `guide-generic-unknown` |

A node matching two rows takes the first one that fits, reading top to bottom: a node resolving to a `callchainId` is `api-callchain` even when it also contains UI leaves.

### Callchain wrapper compounds

A compound of the shape N × `Store` plus one `ITF` action is parameter binding, not a unit of its own. It collapses into the callchain it wraps, and its `Store` actions become the input arguments of the contract. The key stays `callchainId` and is never the compound uuid — two compounds wrapping one callchain must not yield two contracts.

## Known types

Informative, not validating: the `type` is taken from the test, never checked against this list. The list is open — a `type` absent here yields an `other` unit, never a lost node.

| `type` | `typeAction` | Template names |
|---|---|---|
| `TECHNICAL` | `...-qdl`, `netcracker-atp-executor-actions` | `Store value "value" in variable "varName"`, `Wait for "Timeout" seconds and take screenshot` |
| `UI` | `netcracker-atp-executor-actions`, `...-qdl`, `...-productcustom` | `Click the [ButtonName] button`, `Send keys "text" to "findExpression"`, `Fill value "value" to UIElement (...)`, `Verify "text" text does exist on the page`, `Click UIElement by xpath "xpath"` |
| `REST` | `netcracker-atp-executor-actions-tdm` | `Delete all rows under system "systemName" and table title "tableTitle"`, `Insert object under project ... with system ... and table ...` |
| `ITF` | `ITF action` | `Run and validate "0" call chain with default dataset` |

A `typeAction` ending in `-tdm` carries `type: REST` and migrates as an ordinary HTTP step — no special handling.

## Deduplication scope

Deduplication applies to **units and contracts only**. The execution manifest keeps one row per step and the descriptor keeps one step block per step; neither ever collapses a repeat. Grouping in the descriptor happens only through `Repeat`, which the format spec owns.

## Nodes without a guide

`other` means the `type` is known and no guide covers it — not that classification failed. Such a node is still collected: one worker, the generic guide, a `unit-partial` on disk. It is also always reported, as a row in the `## Nodes without a guide` section of `mcp-data-collection.md`:

| Column | Content |
|---|---|
| `type` | `templates[].type` verbatim |
| `typeAction` | e.g. `netcracker-atp-executor-actions-tdm` |
| Template | `templates[].name` verbatim |
| Unit | the unit name |
| `stepId` | the template uuid, by which the type is reproducible |
| Artifact | path to the file the worker wrote |

The same six fields form one entry of the collection return array. An empty section is written as `None`. Silently skipping a node is never an outcome of this taxonomy.
