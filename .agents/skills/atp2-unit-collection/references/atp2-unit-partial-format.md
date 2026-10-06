# ATP2 Unit Partial Format

The file format of `unit-steps.partial.<slug>.md` — the artifact of a unit that is neither a single HTTP contract nor a single UI group: a database query (`db`), a remote shell command (`ssh`), a store node that computes its own value (`data`), a node whose `type` is known while no guide covers it (`other`), and a unit whose blocks span two surfaces.

A statement, a command and a computed expression are written exactly as executed — a paraphrase cannot be run. The condition that guarded a block and the branch the run did not take are written the same way: the file has to hold the behaviour of the test case, not of one run.

## File shape

````
# Unit — <name>

> Source: <key>=<id> | kind=<the unit's class, verbatim from the taxonomy> | run=<testRunId> | collected=<YYYY-MM-DD>
> System(s): <alias(es) this unit talks to, or none>
> Guide: <guide name, or `none — generic procedure applied`>

## Statement 1 — <what it does>
- Kind: `db`
- Target: `<system alias, plus the connection or datasource name when one is exposed>`
- Statement:
```sql
SELECT current_date + 1
```
- Inputs: `<key=value, or {param} placeholders>`
- Observed output (trimmed): `<what the run returned, 1–2 rows>`
- → Store: `<variable> = <the field or expression it takes>`
- Condition: `<what had to hold for this block to run, and what the other branch does, or none>`

## Notes
<repeat observations, UNKNOWNs, log record ids, dump file paths>
````

One `## Statement N` block per node, in execution order — the nodes the run executed and the nodes it skipped alike.

## Per block kind

A block's `Kind` is its own surface tag and is what decides its body.

| `Kind` | `Statement` holds | `Target` holds |
|---|---|---|
| `db` | the verbatim SQL | the system alias and the database connection name |
| `ssh` | the verbatim shell command | the system alias |
| `data` | the expression or transformation applied | `none` |
| `other` | whatever the node exposes, verbatim | the system alias when the unit talks to one, else `none` |
| `ui` | unused — the block instead carries the interaction composition required by [atp2-ui-partial-format.md](atp2-ui-partial-format.md) | the system alias |
| `api` | unused — the block instead carries the call block of [atp2-contract-format.md](atp2-contract-format.md) | the system alias |

Fence the statement with the matching language tag: `sql` for `db`, `bash` for `ssh`, none for the rest.

## Mixed-surface units

A unit whose nodes span two surfaces — a compound that fills a form and then verifies the result over REST — stays one unit, in one file, written by one worker. Its blocks keep execution order, and each one declares the `Kind` of its own surface, which may differ from the header's `kind`. `ui` and `api` are available only here. Multi-file workers do not exist.

No such compound occurs in the analysed exports.

## An `other` unit

`## Notes` carries the six report fields of [atp2-node-taxonomy.md — Nodes without a guide](atp2-node-taxonomy.md). The header keeps `Guide: none — generic procedure applied`, which is what marks the unit as collected without a per-kind instruction.

## Writing rules

- Verbatim, never paraphrased. A statement reconstructed from a node name is `UNKNOWN (<reason>)`, not a guess.
- Placeholders, marks and the env-config gate follow [atp2-value-rules.md](../../../../apm_modules/test-generation/.apm/skills/atp2-migration/references/atp2-value-rules.md) — its sections *Placeholder kinds and the proof each one needs*, *The env-config gate*, *Mark dictionary* and *Hosts observed in the run*.
- Numbers in an observed output are unquoted; booleans and null stay literal.
- Trim an output to 1–2 rows; never trim a statement, a command or a condition.
- A value a later step consumes always gets a `→ Store` line.
- A node the run skipped keeps its block, with its condition and `Observed output: UNKNOWN (skipped in this run)`.

## Acceptance

A block is done when all five checks pass.

| # | Check |
|---|---|
| 1 | A reader writes the equivalent call from this block alone: statement, target, inputs and consumed value are present, or explicitly `UNKNOWN (<reason>)` |
| 2 | The statement, command or expression is character for character what the run executed |
| 3 | `Condition` states what had to hold and what the other branch does, or `none`; never blank, and never `none` for a condition nobody read |
| 4 | Every `{{X.y}}` in the block resolves by string comparison in `{envTemplate}`, the `environment-configuration-template-<env>.json` of this migration |
| 5 | Every value with no proven placeholder is resolved as the run had it and carries exactly one mark from the dictionary |
