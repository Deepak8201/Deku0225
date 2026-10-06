# ATP2 Descriptor Format

The format of the test descriptor at `{rootFolder}/tests/TestDesign/<tc_name>.md`.

The descriptor is **self-contained**: it references nothing outside itself — no screenshot, no contract file, no `logRecordId`. HTTP detail lives in `## Call Contracts` at the end of the same file, and a step reaches it by `Ref`. The only ATP2 references that remain are the `Origin` line in `## Overview` and the `(ATP2 source: …)` hints inside UI actions, which address an element on the screen.

Where a piece of data goes is mechanical: **belongs to exactly one step → that step's block; shared by N steps → one definition in `## Call Contracts`.**

A worked descriptor covering every shape below — header sections, a DB step, an API step, UI steps, a `Repeat` block, verification points, and an inlined contract — is [atp2-descriptor-example.md](atp2-descriptor-example.md). Read it when a shape here is unclear; this file stays the authority when the two differ.

## Values

`{valueRules}` = [atp2-value-rules.md](atp2-value-rules.md) decides every value written into a descriptor. This file neither repeats nor extends it; four of its sections answer the four questions that arise:

| Question | Section of `{valueRules}` |
|---|---|
| May this value be written as `{{SYSTEM.field}}`, `{param}` or `{var}` | *Placeholder kinds and the proof each one needs* |
| Does this `{{X.y}}` exist in the env config | *The env-config gate* |
| Which mark does a value with no proven placeholder carry | *Mark dictionary* |
| Which of the three Test Data blocks does a resolved value belong in | *Where a resolved value goes* |

A value that carries a mark is written inline — inside its own step, or in **Fixed inputs** — in this shape:

```
`http://atp-tdm:8080` (mark: atp2-internal)
```

The mark is copied from the artifact that produced the value. The descriptor never re-decides a mark, never invents one, and never drops one.

**No step is ever parked.** There is no field, no section and no status that suspends a step whose system is absent from the env config: that step is written with resolved values and marks, and stays executable.

## Step block spec

One block shape for every surface. A field that does not apply to a step is **omitted entirely** — never `—`, `n/a`, or a placeholder. There is no `Screenshot` field and no node reference.

```
### Step N: <short action>

- **Surface**: <UI | API | DB | SSH | Data> · `<system alias>`
- **Page**: <screen / dialog>                      (UI only)
- **Contract**: <Ref — name>                       (contract-referencing step only)
- **Repeat**: <variable> = <range>                 (loop only)
- **Consumes**: <variables the step reads>
- **Stores**: <variables the step writes>

**Actions**:
1. <what happens>  (ATP2 source: <verbatim hint>)
2. Run contract **C<N> — <name>** — Args: `key=value, key=value`

**Expected Result**: <observable state | no observable change>
**Validation**: <checkable condition>
```

| Field | Required | Purpose |
|---|---|---|
| `Surface` | yes | surface + system alias; selects the generation layer |
| `Page` | UI | screen/dialog |
| `Contract` | contract step | `Ref — name` from `## Call Contracts` |
| `Repeat` | loop | loop variable and iteration range |
| `Consumes` / `Stores` | when data flows | cross-step data flow |
| `Actions` | yes | what the step does; a contract call and a DB/SSH statement use the syntaxes below |
| `Expected Result` | yes | observable state, or `no observable change` |
| `Validation` | yes | checkable condition |

### Contract call syntax

A block may call several contracts, so arguments live inside the `Actions` item rather than in a block field. The item form is fixed, so that every `{param}` of a contract can be checked mechanically:

```
N. Run contract **C<Ref> — <contract name>** — Args: `key=value, key=value`
```

### Statement syntax

A `DB` or `SSH` step carries the statement it runs **verbatim**, inside its `Actions` item. The generated code hands that text to `DatabaseHelper` or `SSHHelper`, so a paraphrase is not executable:

````
N. Run on `<connection or host alias>`:
   ```sql
   SELECT to_char(current_date + 1, 'DD-MM-YYYY')
   ```
````

Use `sql` for a `DB` step and `bash` for an `SSH` step. A `Data` step writes its expression the same way, without a target line and without a language tag. A step whose node type no guide covered writes its content the same way too — one item per statement the unit partial recorded, with no special field and no special section.

Values bound into the statement are `{param}` placeholders resolved from `Consumes` or `## Test Data Requirements`; host, port, user and password are `{{SYSTEM.field}}` when the *Values* proof holds and a resolved value with a mark when it does not. When the source never exposed the statement, the item is `UNKNOWN (<reason>)` — never a reconstruction from the node name.

### What a step is

**One significant top-level `testScenario.metainfo` record = one step block.** `## Execution manifest` in the collection file lists those records in order, one row per record; the descriptor keeps that order and that count.

| Manifest row | Descriptor |
|---|---|
| `ACTION`, whatever its `templates[].type` — including a `type` no guide covered | one step block |
| `COMPOUND` | one step block; never expanded into one block per leaf |
| a row repeating an earlier one | its own step block, unless one `Repeat` block covers the run of them |
| a node the Absorption table absorbs | no block; its content lands in the destination that table names |

The Absorption table is in [../../atp2-unit-collection/references/atp2-node-taxonomy.md](../../../../apm_modules/test-generation/.apm/skills/atp2-unit-collection/references/atp2-node-taxonomy.md), which also states where each absorbed node's content lands in this format. A separator comment produces nothing at all — not a step, not a section, not a heading. `Repeat` is the only grouping and absorption the only omission; nodes are never grouped on meaning, similarity, or brevity.

A contract is a reusable unit, not a step: N steps calling one contract stay N blocks pointing at one `### C<N>`.

### General rules

1. **A repeat is one block with `Repeat`** when the iterations run an identical contract sequence and differ only in the loop variable's value. `Repeat: ontNum = 1..5` states the range of nodes it covers.
2. **The `Surface` alias is the `system` value of that step's manifest row**, copied character for character. A screen title, a brand name read off a screenshot, and a host observed in the run are never an alias.
3. **No Playwright locators.** UI interactions are semantic; `(ATP2 source: …)` is provenance, not a selector.
4. **Nothing is truncated.** Cutting a value with `…` is forbidden.
5. **Nothing to write → `UNKNOWN (reason)`** — never an empty field, never an invention.
6. **`Expected Result` is an observable state or `no observable change`** — see Generation-ready criterion.

## Document sections (in order)

| # | Section | Contains |
|---|---|---|
| 1 | `## Overview` | Test Name, Test Type, Objective, Systems, Preconditions, `Origin` |
| 2 | `## Systems Referenced` | alias → purpose → env config key |
| 3 | `## Authorization` | migration only; the OAuth call and the once-per-test note. Omitted when the source has none |
| 4 | `## Test Data Requirements` | the three blocks below |
| 5 | `## Test Steps` | the `### Step N` blocks, numbered consecutively from 1 |
| 6 | `## Verification Points` | the run's checkable outcomes |
| 7 | `## Call Contracts` | migration only; last in the file, read by anchor |

`Test Type` is a set of surfaces from `{UI, API, DB, SSH}` joined with ` + ` (e.g. `API`, `UI + API`, `API + DB`), copied from the source classification.

The `Origin` line is prose and references nothing:

```markdown
- **Origin**: migrated from ATP2, case `[ND2.2] Creating new "Business Customer"…`, run of 2026-08-11
```

Never emit: `## Variables Used Summary`, `## Expected Final State`, `## Notes`, `## Unresolved endpoints`, `## Business Workflow Contracts`.

### `## Systems Referenced`

One row per system the descriptor's own steps use, and no other: a system that appears in no `Surface` line, no `Actions` item and no contract has no row. The `Configuration Source` cell is `environment-configuration.json → systems.<system key>.connections.<TYPE>`, with the system key character for character as the env config spells it. A system the steps use that the env config lacks keeps its row, with `UNKNOWN (absent from the env template)` as its Configuration Source.

### `## Test Data Requirements`

Three blocks — **Fixed inputs**, **Generated / random values**, **Stored / extracted variables** — filled per *Where a resolved value goes* in `{valueRules}`, plus four constraints on what may enter them:

1. Only the dataset attributes the scenario references get a row, under their **plain** name. `$tc.` is a separate namespace living inside callchains; it is never prefixed onto a dataset attribute.
2. A value whose final form is a generator belongs in **Generated / random values** and never in **Fixed inputs**. It is declared once — pattern plus one string labelled as an example — and every step that uses it refers to it by name.
3. A credential or URL that maps onto an env-config field enters none of the three blocks: it belongs to `## Systems Referenced` and to `{{SYSTEM.field}}` in place.
4. An absorbed store constant lands in **Fixed inputs**, per the Absorption table.

## The `## Call Contracts` section

Each contract is the [atp2-contract-format.md](../../../../apm_modules/test-generation/.apm/skills/atp2-unit-collection/references/atp2-contract-format.md) shape one nesting level deeper: the contract file's title becomes `### C<N> — <name>`, and each `## Call N` inside it becomes `#### Call N`. `> System(s):`, `Response Schema` and `→ Store` keep their form, as do the writing rules (numbers unquoted, `UNKNOWN (…)` instead of an invention, `Transport:` for non-HTTP).

Close each contract with a `#### Notes` line naming the steps that call it.

## Generation-ready criterion

- An **assert step** carries an observable `Expected Result` and a checkable `Validation`.
- An **action step** carries a semantic description of its intent; its `Expected Result` may be `no observable change`.
- `Step PASSED per execution log` is not an acceptable value in either case — write `UNKNOWN (<reason>)` instead.
