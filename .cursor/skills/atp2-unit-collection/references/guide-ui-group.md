# Guide — UI Group

Collection procedure for a unit of kind `ui-group`: the group's log root and the action nodes under it. Output: a partial in the [UI partial format](atp2-ui-partial-format.md).

## Tools

| Tool | Args | Returns |
|---|---|---|
| `atp_get_log_children` | `logRecordId` | child log nodes; recurse to individual UI action nodes |
| `atp_get_log_record` | `logRecordId` | on a UI action node: the action type, the target element hint (name / xpath / label), the typed value, the status |
| `atp_get_log_screenshots` | `logRecordId` | the screenshots attached to that node |

## Step 1 — Recurse to the action nodes

From the unit's log root, recurse `atp_get_log_children` down to individual UI action nodes, then call `atp_get_log_record` on each:

```
log root
└─ atp_get_log_children → the UI group node
   ├─ INPUT  field   → atp_get_log_record → typed value + hint
   └─ CLICK  button  → atp_get_log_record → hint + status
```

Per node capture:

| Item | Content |
|---|---|
| Action type | click / input / select / navigate / hover / assert / wait |
| Target hint | whatever the record exposes — ButtonName, link text, field label, xpath — copied verbatim |
| Typed value | for inputs and selects |
| Node status | passed or failed |

Capture only nodes the recursion returned. Never add a node of your own — in particular, never synthesize a `Navigate` step from the host the run used.

Done when every action node under the root is captured, in execution order.

## Step 2 — Screenshots: save all, analyse a bounded subset

Saving an image to disk and reading it into context are different operations with different costs. Save generously; analyse deliberately.

**Save.** Call `atp_get_log_screenshots` for every action node and decode each image to `{screenshotsDir}` as `<slug>-stepNN.png`. Unanalysed images stay on disk as evidence for a corrective re-run.

**Analyse.** `Read` only these images:

| Node | Analysed |
|---|---|
| The first and the last node of the group | always |
| A node whose action changes state — click, select, navigate, submit, assert | always |
| A node that only types into a field | never — its Result follows from the action itself |

Cap the analysed images at **12** per group. On overflow keep the first, the last, and the state-changing nodes in execution order, and list the skipped ones in `## Notes` and in `unknowns`.

From each analysed image derive two things at once, because one image covers two steps:

- the **Page/Context** of its own node — the screen, breadcrumb or dialog the action happens on;
- the **Result** of the previous node — what that action changed on screen.

The Result of the group's **last** action is visible only in the next group, which another unit owns: write `UNKNOWN (no screenshot)` and do not resolve it.

Done when every captured node has a Page/Context and a Result, or an explicit `UNKNOWN (no screenshot)`.

## Step 3 — Describe each element so it can be found again

The hint the export and the log carry — `ButtonName=Create Plan`, `xpath=//div[contains(text(), 'Plan Management')]` — is provenance, not a description: a later agent walking this case through a live browser cannot find the control from it. The image supplies what the hint lacks; the hint and `System alias` supply what the image cannot show.

Write one sentence per captured node, holding the five elements listed in the format's `## Required composition of Interaction` section, and settle in it what a reader would otherwise have to guess:

| Evidence in the image | What the sentence must name |
|---|---|
| The label appears once on screen | the container the control sits in, its type, its visible label |
| The same label appears more than once | additionally what separates them — the container, the position inside it, the dialog versus the page behind it |
| The image does not settle which one was used | keep the verbatim hint, and record the ambiguity in `## Notes` |

```
Click the "Create" button in the footer of the *Create Plan* dialog, not the
"+ Create Plan" toolbar button on the page behind the dialog
```

Two collected partials of `ri_tc1_ui_create_new_plan_from_plan_management` — `ui-steps.partial.login-to-ndo.md` and `ui-steps.partial.create-a-new-plan.md` under `TestGeneration/tests/Raw/Debug/ATP2_Migration/` — are the benchmark for the detail of `Page/Context`, `Interaction` and `Result`. Their `system=` header and their `{{NDO.password}}` predate the rule of Step 4 and are not a model.

Done when every captured node carries a sentence naming its control without reference to a screenshot, a file, or ATP2.

## Step 4 — Write the partial

Write the file in the [UI partial format](atp2-ui-partial-format.md).

**The header system.** `system=` is `System alias`, copied from CONTEXT character for character. Deriving it from the screen title, from branding on a screenshot, or from the host the run reached is forbidden — one migration wrote `ndo` where the source said `Use(umbrella-ui)` twice.

**Values.** Every value obeys [ATP2 value rules](../../../../apm_modules/test-generation/.apm/skills/atp2-migration/references/atp2-value-rules.md), sections *Placeholder kinds and the proof each one needs*, *The env-config gate* and *Mark dictionary*. Two cases recur in a UI group:

- A credential. Its ATP2 form is `$RES_VARIABLE('umbrella-ui', 'HTTP.login')`, mapping literally onto system `umbrella-ui` → connection `HTTP` → field `login`. It becomes `{{umbrella-ui.login}}` only when that system key and that field both exist in `{envTemplate}` by string comparison; otherwise it stays resolved and carries one mark.
- A value typed into a form and later asserted. It is one value: write the parameter `Run inputs` proves it came from, under the same name in both places. The string the run produced appears only as an explicitly marked example, never as the asserted text.

Done when every block holds its Page/Context, its Interaction sentence, its Result, and only values that are a proven placeholder or a marked resolved value.

## Failure rows

| Failure | Action |
|---|---|
| A node has no screenshot and the next node in this group has none either | `degrade` — Result `UNKNOWN (no screenshot)` |
| An image does not disambiguate a weak element hint | `degrade` — keep the verbatim hint, record the ambiguity |
| An action node failed in the run | `degrade` — record the action, its failed status, and whatever the image shows |
| The 12-image cap is reached | `degrade` — analyse the priority set, list the skipped nodes |
| A credential's system key or field is absent from `{envTemplate}` | `degrade` — resolved value plus one mark, and a row in `## Notes` |
| The recursion finds no action node under the group node | `stop` |

## Return extras

`uiSystemAlias`, `screenshots` (the files saved). `itemCount` is the number of `### UI Step` blocks written.
