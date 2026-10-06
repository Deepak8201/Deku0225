# ATP2 Value Rules

What may enter a migration artifact as a placeholder, and what stays a resolved value carrying a mark. Applies to every artifact of the migration alike — unit partials, contracts, and the descriptor.

## Value syntaxes seen in the export

| Form | Where it occurs | Meaning |
|---|---|---|
| `${name}` inside a compound | `compounds[].metainfo[].parameters[].value` | formal parameter of that compound |
| `${name}` at scenario level | `testScenario.metainfo[].parameters[].value` | a previously stored variable, or a dataset attribute |
| `${a}${b}` | either level | concatenation |
| `$RANDBETWEEN('10000000','99999999')` | parameter value of an `ACTION` | scenario-level generator |
| `#RANDOMBETWEEN(100, 999)` | dataset attribute value | dataset-level generator |
| `SANITY_AT#RANDOMBETWEEN(10000, 100000)` | dataset attribute value | prefix + generator |
| `$RES_VARIABLE('sys','CONN.field')` | parameter value | an address inside the env config |
| `$tc.<name>` | inside callchains only — `preScript`, `keysToRegenerate` | ITF TC-context variable |
| literal | parameter value | a value typed by hand |

## Placeholder kinds and the proof each one needs

A placeholder is introduced only with proven origin. The proof differs per kind.

| Placeholder | What must be proven | Proof fails |
|---|---|---|
| `{{SYS.field}}` | `SYS` is the verbatim system key of `environment-configuration-template-<env>.json` and is the step's system; `field` is an existing field of that system's connection. Verified by string comparison | not a placeholder |
| `{param}` | the value is traceable to a step parameter, a compound parameter, a dataset attribute, or a stored variable | not a placeholder |
| `{var}` (`Consumes` / `Stores`) | the value is provably extracted from the response of an earlier step — Bruno post-response or the run log | not a placeholder |

No proof succeeded → the value stays resolved, exactly as the run had it, and carries a mark from the dictionary below.

### Keys are carried over verbatim

Case, hyphens and underscores of a key are copied character for character; normalization is forbidden. Real system keys look like `cloud-administrator`, `umbrella-ui`, `TDM`, `UUI`, `public-gateway`, `ATP_VM`. UPPER_SNAKE names such as `CLOUD_ADMINISTRATOR_HTTP_URL` belong to a different level — variable names in `env-<env>.yaml` — and are never used as a system key.

Four kinds of invention this rule catches:

| Invention | Written | Actual config |
|---|---|---|
| namespace | `{{ATP.testRunId}}` | no `ATP` key exists |
| system | `{{atp-tdm.url}}`, `{{NDO.password}}` | `TDM` exists; `atp-tdm` and `NDO` do not |
| field | `{{CLOUD_ADMINISTRATOR.projectId}}` | `cloud-administrator` has `url`, `login`, `password` |
| key case | `{{CLOUD_ADMINISTRATOR.url}}` | the key is `cloud-administrator` |

## The env-config gate

Every `{{X.y}}` in every phase artifact must resolve to an existing key of `environment-configuration-template-<env>.json`: `X` against the top-level system keys, `y` against the fields of that system's connection. The check is a string comparison — a grep of the key against the template, with no heuristics. Not found → the placeholder is not written.

## Mark dictionary

"Resolved value + mark" is the only way to record something for which no placeholder was proven, whatever the reason. The mark names the reason, because the reason decides the follow-up.

| Mark | Condition | Follow-up |
|---|---|---|
| `atp2-internal` | ATP2 infrastructure: a cluster address such as `http://atp-tdm:8080`, `executionRequestId`, `testRunId`, the platform token | none — the env config will never hold it |
| `external` | a host or value of a system outside the environment perimeter | none — accepted as is |
| `unmapped` | the system exists in ATP2 but is absent from the env config | candidate for an env top-up |
| `no-slot` | the origin is known and proven, but the schema `system → connection → field` has no place for the value: `projectId`, the ATP2 environment name | written as a resolved value; moved when a slot appears |
| `unknown-origin` | the origin could not be established | candidate for further investigation |

The dictionary is closed — five marks, five follow-ups. A mark is never invented on the spot.

Marked values live where ordinary values live: inside their own step, or in the **Fixed inputs** block of `## Test Data Requirements`. There is no separate section for them.

## Hosts observed in the run

A host observed in the run never becomes a system alias. If the step's system maps to the env config, the host is written as `{{SYS.field}}`. If the observed host does not map, it stays resolved with a mark and is reported. Silent substitution by an invented placeholder is forbidden — a lost host is unrecoverable.

## A run value is not a test value

1. A generator stays a generator: `SANITY_AT#RANDOMBETWEEN(10000, 100000)` is regenerated with the same prefix and the same range.
2. A generated value reused several times is one variable: generated once, stored, then only read.
3. A run value may appear only as an example, and only when it is explicitly marked as an example — it proves the format and is never the value.
4. A value that exists nowhere but the run stays static, with an explicit mark stating that it is a fixed run value and why.
5. A value extracted from a response stays an extraction — `Stores` / `Consumes` — never a constant.

## Where a resolved value goes

The three descriptor blocks — **Fixed inputs**, **Generated / random**, **Stored / extracted** — are the whole classification. No fourth category exists.

**Resolve the indirection first, classify afterwards.** `compound-param` and `stored-var` are references, not categories; the final value decides.

| Final value | Block |
|---|---|
| Literal | Fixed inputs |
| Dataset attribute without a generator | Fixed inputs |
| Any generator: `#RANDOMBETWEEN`, `$RANDBETWEEN`, prefix + generator | Generated / random |
| Value taken from the response of an earlier step | Stored / extracted |
| Concatenation | by its worst part: a generator makes it Generated, an extraction makes it Stored |

**Two kinds of value do not enter these three blocks at all.**

| Value | Where it goes | What it is |
|---|---|---|
| `$RES_VARIABLE('sys','CONN.field')` | `{{SYS.field}}` in place, plus an entry under `## Systems Referenced` | an address in the env config: `sys` = system key, `CONN` = connection, `field` = field name, matching exactly |
| `$tc.<name>` | the contract of the callchain it occurs in | an ITF TC-context variable that exists only inside a callchain. `$tc.*` are not dataset attributes |

The criterion deciding the destination is whether the value maps onto a field of the env config — not whether it feels infrastructural or feels like test data. An env login maps, so it goes to `## Systems Referenced`; the ATP2 environment name does not map, so it stays in Fixed inputs with `no-slot`.

## Worked example — one TDM request

Body observed in the run, plus the headers `X-Execution-Request-Id`, `X-Test-Run-Id` and `Authorization: Bearer …`:

```json
{"environment":{"projectName":"ee56690d-7dc5-49a1-b676-37520dd345fb",
                "envName":"saas-gf-jci-01_ci03",
                "systemName":"UUI"},
 "title-table":"Sanity_run"}
```

| Value | Origin | Recorded as |
|---|---|---|
| `systemName: UUI` | step parameter `systemName` | `{systemName}` — proven |
| `title-table: Sanity_run` | step parameter `tableTitle` | `{tableTitle}` — proven |
| `projectName: ee56690d-…` | the test's `projectId`, present in the export | resolved value + `no-slot` |
| `envName: saas-gf-jci-01_ci03` | name of the ATP2 environment of the run | resolved value + `no-slot` |
| `X-Execution-Request-Id`, `X-Test-Run-Id` | identity of the ATP2 run | resolved value + `atp2-internal` |
| `Authorization: Bearer …` | ATP2 platform token; the issuer is not visible in the run | resolved value + `unknown-origin` |

Four modes in one request: a proven `{param}`, a known value with no slot in the schema, an unreproducible run identity, and a value of unknown origin. `{{SYS.field}}` is correct for none of them.

`systemName: UUI` also carries the trap: `UUI` is a system key of the env config and is still a request-body parameter here, not the step's system. A value that looks like a system key is not a system alias.
