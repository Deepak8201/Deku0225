# ATP2 UI Partial Format

The file format of `ui-steps.partial.<slug>.md`, the per-UI-group artifact in the migration folder.

The partial is the only surviving record of what happened on screen: the screenshots are gitignored working files and the descriptor references nothing outside itself. Every interaction is therefore executable from its own sentence — without ATP2, without a screenshot, and without a guess.

## File shape

````
# UI Group — <name>

> Source: group=<logRecordId> | system=<System alias> | run=<testRunId> | collected=<YYYY-MM-DD>
> Run inputs: <the unit's resolved call-site arguments, as name=parameter>
> Screenshots: <screenshotsDir>

### UI Step N: <short action title>
**Page/Context:** <screen, dialog or area the action happens on>
**Interaction:** <the five elements below>  (ATP2 source: <verbatim hint>)
**Input data:** <field = value, each value written per Values; omit when none>
**Result:** <state of the screen after the action, or UNKNOWN (no screenshot)>
**Screenshot:** screenshots/<slug>-stepNN.png

## Notes
<System alias, UNKNOWNs, unresolved ambiguities, skipped screenshots, log record ids, dump paths>
````

Blocks run in execution order and are numbered from 1. `system=` holds the `System alias` of CONTEXT character for character; a screen title, a brand name read off a screenshot, and a host observed in the run are never written there. `**Screenshot:**` and the log record ids live in this file only.

## Required composition of `Interaction`

| # | Element | Example fragment |
|---|---|---|
| 1 | the screen or dialog the control belongs to | inside the *Create Ticket* dialog |
| 2 | the control type | button, input, dropdown, row, tab, link, checkbox |
| 3 | the visible label or accessible name, verbatim from the screen | "Save" |
| 4 | the value entered, for an input or a select | with `7858 • Hillerød` |
| 5 | a disambiguation clause, when the same label appears more than once on screen | not the toolbar Save |

Element 5 is written whenever the screen shows the label twice; when the screenshot does not settle which one was used, keep the verbatim ATP2 hint and record the ambiguity in `## Notes`.

Example:

```
**Interaction:** Click the "Save" button inside the *Create Ticket* dialog, not the toolbar Save  (ATP2 source: ButtonName="Save")
```

`(ATP2 source: …)` is provenance, never a selector. No Playwright locator appears anywhere in the file — no `page.getByRole(...)`, no `page.locator(...)`, and no xpath written as the target of the action.

## Values

Every value in an `**Input data:**` line and inside an `**Interaction:**` sentence follows [ATP2 value rules](../../../../apm_modules/test-generation/.apm/skills/atp2-migration/references/atp2-value-rules.md): a placeholder only with the proof that reference requires, otherwise the value as the run resolved it plus one mark from its closed dictionary. This file neither repeats that dictionary nor adds to it.

A value typed into a form and later asserted is one value and carries one name in both blocks — the parameter the header's `Run inputs` traces it to. The string the run produced is written only where it is labelled an example.

## `Result`

The state of the screen after the action, in enough detail to serve as the precondition of the next step: what opened, what closed, which row appeared, which value is now displayed, which toast was shown.

| Situation | Value |
|---|---|
| A screenshot shows the outcome | describe it |
| The node has no screenshot but the next node in this group does | describe what that screenshot shows |
| Neither exists, or this is the group's last step and only the next group would show it | `UNKNOWN (no screenshot)` |

The node's status is not a result: `Step PASSED per execution log` is never an acceptable value. Assert nothing a screenshot does not show.

## Banned vocabulary

Unexecutable for a later reader, therefore never written: "the corresponding element", "the required field", "as in ATP2", "see the screenshot", "the same as above", and any path to a file.

## Acceptance

A block passes when it carries a Page/Context, an Interaction holding all five elements that apply, its ATP2 provenance, the entered value when the action enters one, and a Result that is an observed state or an explicit `UNKNOWN (…)`.

A file passes when every block passes and all five checks below hold:

| # | Check | Passes when |
|---|---|---|
| 1 | Locators | no `page.getByRole(...)`, no `page.locator(...)`, and no xpath standing as the target of an action |
| 2 | System | `system=` equals the `System alias` of CONTEXT verbatim, and no header field holds a host, a screen title or a brand name |
| 3 | Placeholders | every `{{X.y}}` resolves in `environment-configuration-template-<env>.json` by string comparison, per *The env-config gate* of [ATP2 value rules](../../../../apm_modules/test-generation/.apm/skills/atp2-migration/references/atp2-value-rules.md) |
| 4 | Marks | every value with no proven placeholder carries exactly one mark from the *Mark dictionary* of that same reference |
| 5 | Run values | no string produced by the run stands as a typed value or as asserted text unless it is labelled an example |
