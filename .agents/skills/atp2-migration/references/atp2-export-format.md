# ATP2 Export Format

How to read one `atp_export_test_full` dump: what its keys hold, how a compound expands, how a `${name}` unwinds to its origin, and where a unit is cut. The dump is requested with `includeEnvironments: false` and `includeTestPlan: false`; both default to `true` and together carry ~35 % of a dump that nothing reads.

## Top-level keys

| Key | Holds |
|---|---|
| `testCase` | case identity — id, name, project |
| `testScenario` | `metainfo[]`, the ordered scenario |
| `dataset` | the case dataset — `id`, `name`, `dataSets[]`, `attributes[]` |
| `callchains[]` | ITF callchain definitions — `id`, `name`, `steps.data[]` |
| `compounds{}` | reusable step groups, keyed by compound uuid |
| `templates{}` | leaf action definitions, keyed by the `stepId` of an `ACTION` |
| `directiveRefs[]` | deduplicated dictionary of the directives the scenario uses |
| `meta` | export metadata |

Scope is everything reachable from `testScenario.metainfo`. A callchain, compound or template that sits in the dump but is never reached from the scenario is out of scope — it is ignored, and it is never reported as a gap.

## `testScenario.metainfo`

A flat ordered list of `{ type, stepId, parameters[], otherTextValue }`. It is the only source of order.

| `type` | `stepId` resolves to | Meaning |
|---|---|---|
| `DIRECTIVE` | the directive uuid | switches execution context; only `Use(...)` is read |
| `ACTION` | `templates[stepId]` | one leaf action |
| `COMPOUND` | `compounds[stepId]` | one call of a reusable group |
| `OTHER` | `null` | comment or blank line, text in `otherTextValue` |

`OTHER` records carry separator comments such as `//BNG`. They produce neither a step nor a section, and they never break a unit.

`directiveRefs[]` is a dictionary of unique directives, not their sequence — a scenario holding four `DIRECTIVE` records may list two entries there. Take the order and the position of a directive only from `testScenario.metainfo`.

## Directives and the active system

Exactly one directive is significant: the constant uuid `96c65818-d959-11e9-8a34-2a2ae2dbcce4`, `Use(<system>)`. Every other directive is skipped without a record.

The active system of a step is the nearest preceding `Use(...)`. It propagates into the actions of an expanded compound and holds until the next directive. The alias is never derived from a screenshot, a screen title, or a host observed in a run.

## `templates{}` — leaf actions

Keyed by the `stepId` of an `ACTION`. Fields read here:

| Field | Holds |
|---|---|
| `type` | the node's native classification, the evidence a class is assigned on |
| `typeAction` | the executor plugin, e.g. `netcracker-atp-executor-actions-tdm` |
| `name` | the action template, with formal parameter names in quotes |
| `parameters[]` | the signature; the call site supplies the actual values |

## `compounds{}` — reusable groups

Keyed by compound uuid. The value carries `id`, `name` and its own `metainfo[]` of the same shape as the scenario's, so expansion is recursive.

The compound `name` is a template carrying the formal parameter names in quotes; the `parameters` of the call site bind them. Inside the body those names appear as `${name}`.

```
Call site:  COMPOUND  name="Create City "cityName" in the State "stateName""
                      parameters: cityName=Montpelier, stateName=Vermont
Body:       ACTION    Store  value="${cityName}"   ⇒ ${cityName} = Montpelier
```

## ITF actions and callchains

An `ACTION` whose `type` is `ITF` carries parameter `"0"` = the callchain **name**; `callchains[].name` resolves that name to the callchain `id`.

Inside `callchains[].steps.data[]` each entry is a `SituationStep`: `situation.name` is the call name, `situation.parent.name` the operation, `situation.parent.parent.name` the ITF system. `keysToRegenerate`, `preScript`, `conditions`, `retryOnFail` and `delay` sit on the same entry. An `embeddedChainStep` — a callchain nested in a callchain — is present but not expanded in the dump.

## `dataset`

`{ id, name, dataSets[], attributes[] }`, where each `attributes[]` entry has a `name` and a value that may be a literal or a generator expression. A missing `attributes` key means the dataset is empty. The dataset comes from the export; a second `atp_get_dataset` call is never made.

## Parameters

A plain parameter holds a single `value`, which may contain `${name}` or a generator. A complex parameter arrives as `complexParam` with `type = MAP` and a list `mapParams[]` of `paramKey` / `paramValue` pairs; expand it into name-value pairs, otherwise every TDM insert column and every UI element binding is lost. A `paramValue` may itself be a formula:

```
parameters[3].complexParam.mapParams[]
  paramKey.value   = "Location"
  paramValue.value = "${locationMarket}${locationPopNumber}"
```

## Resolving `${name}`

Three checks, top-down; the first hit wins.

| # | Check | Where to look | Applies |
|---|---|---|---|
| 1 | formal parameter of the enclosing compound | the `parameters` of that compound's call site | only inside a compound |
| 2 | variable stored earlier in the scenario | an earlier `ACTION` with template `Store value "value" in variable "varName"` whose `varName` matches | always |
| 3 | dataset attribute | `dataset.attributes[].name` | always |

```
ACTION    Store  value="$RANDBETWEEN('10000000','99999999')"  varName="randomNum"
…
COMPOUND  parameters: description="TA-YACT-BNG-${randomNum}-1"
          ⇒ ${randomNum} = the generator above, by check 2
```

Resolution is recursive: when the result is itself a placeholder (`cityName=${outerCityName}`), run the three checks again on it.

No check hits → the value is `UNRESOLVED` and is recorded as `UNRESOLVED`. A value observed in a run is never substituted for it, and a value is never invented.

## Step, call site, unit, contract

| Term | Definition | Deduplicated |
|---|---|---|
| **Step** | one significant top-level record of `testScenario.metainfo` — an `ACTION` or a `COMPOUND` | never: 127 call sites are 127 steps |
| **Call site** | a step referencing a reusable unit, together with its arguments | never |
| **Unit** | the work item one worker investigates, cut by the rules in Cutting units | by its own key |
| **Contract / partial** | the artifact the worker writes for one unit | one per unit |

A compound stays **one** step and is never expanded into steps — expanding turns 142 steps into 651 and loses reuse. Its inner actions are the material of the unit, not of the step list.

## Cutting units

| # | Rule |
|---|---|
| 1 | A unit never crosses a `Use(...)` boundary |
| 2 | A unit never mixes surfaces — UI, API, DB, SSH — except in row 5 |
| 3 | A compound goes whole to one worker |
| 4 | A compound whose leaves are all UI is a `ui-group`, named after the compound |
| 5 | A mixed compound is **not** cut: one worker, one file, ordered blocks each tagged with its surface |
| 6 | Consecutive UI actions outside a compound form one group, broken by a `Use(...)` and by a change of surface |
| 7 | A single catalog `REST` action is one unit per action, never grouped with a neighbour |
| 8 | `DB` and `SSH` actions are separate units, one per action |
| 9 | An action whose `type` no guide covers is its own unit, and it is always reported |
