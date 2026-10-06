# Tag Selection Guidelines

Practical rules for choosing tags during **test generation** and keeping **TestTagsMapping.json** consistent.

## Suite

**Values:** `smoke`, `regression`, `full`, `sanity` (fixed; **mandatory**; **multiple** allowed).

**How to choose:** Match **importance** and **how often** the test should run in CI/CD or release gates.

- **smoke** — minimal path proving the build is not broken.
- **sanity** — quick checks of critical areas after a change.
- **regression** — standard regression coverage.
- **full** — deep or exhaustive coverage including edge cases (often slower or broader).

A test may belong to more than one suite when that reflects real execution groupings.

## Priority

**Values:** `critical`, `high`, `medium`, `low` (fixed; **mandatory**; **single**).

**How to choose:** Based on **business impact if this test fails**.

- **critical** — revenue, compliance, or safety-critical flows.
- **high** — major user journeys or integrations.
- **medium** — standard features.
- **low** — secondary or cosmetic behavior.

## Type

**Values:** `e2e`, `api`, `integration`, `ui`, `unit` (fixed; **mandatory**; **single**).

**How to choose:** Based on **scope** of the test.

- **e2e** — full stack through browser (typical Playwright UI flow).
- **api** — HTTP/API layer without full UI.
- **integration** — multiple components/services, not necessarily full browser e2e.
- **ui** — UI-focused (layout, components) where not classified as full e2e.
- **unit** — smallest scope (rare in Playwright-heavy repos; use only when accurate).

## dataImpact

**Values:** `readonly`, `mutating` (fixed; **mandatory**; **single**).

| Value | When to use |
| --- | --- |
| **readonly** | Test only reads data; no creates/updates/deletes of persistent state. |
| **mutating** | Test creates, updates, or deletes data (including setup/teardown that changes DB or backend state). |

## Extensible Tags: Reuse Rules

1. Open **`tests/Settings/TagConfiguration.json`** (path may vary slightly per project).
2. For **feature**, **component**, **team**: if an existing value **means the same thing**, **reuse** it.
3. **Add** a new value only when the concept is **genuinely different** and no existing tag covers it.
4. When adding values, **update TagConfiguration.json**; do not repurpose or rename existing entries casually.

**Heuristics:**

- Same concept, different wording → **reuse** (e.g. “user auth” vs “authentication”).
- Different product area or user journey → consider a **new** feature tag (e.g. **checkout** vs **login**).

## Examples: Reuse vs New

| Context | Existing values | Decision |
| --- | --- | --- |
| Login test | `user-authentication` | **Reuse** `user-authentication` |
| Registration test | `user-authentication` | **Reuse** `user-authentication` |
| Checkout flow | `user-authentication`, `payment` | **Add** `checkout` (or equivalent) if checkout is the focus and not covered |
| School create | `school-management` | **Reuse** |
| School edit | `school-management` | **Reuse** |
| New reporting area | `school-management` only | **Add** `reporting` if reports are a distinct feature |

## Test Description Requirements

Entries in **TestTagsMapping.json** (and any linked docs) need a **comprehensive** description:

- States **what** is under test and **scope** (data, actors, expected outcome).
- Enough for a reader to understand **intent** without opening code.

**Bad (too short/vague):**

- “Create school”
- “Test login”
- “Verify user”

**Good (clear scope and outcome):**

- “Create a new school with all mandatory fields, persist it, open the school list, and assert the new school appears with correct name, address, and type.”
- “Sign in with valid credentials, assert the dashboard loads, and confirm session indicators match a logged-in state.”
- “Create a subject and a teacher, link them, then verify the association appears on both detail views.”

## TestId Generation Process

1. Open **`tests/Utils/TestTagsMapping.json`** (or project path for the mapping file).
2. Parse existing **testId** keys and find the **highest** numeric segment **`XXX`** in `TC_XXX_vYYY_Name`.
3. Increment **`XXX`** by **1** for the new test (preserve zero-padding to match **`config.testIdFormat`**).
4. Use version **`v001`** (i.e. `..._v001_...`) by default; bump version only when the user explicitly requests a new version of the same logical case.
5. Build **PascalCase** `Name` from the test purpose; ensure it starts with a letter.
6. Add the new **immutable** **testId** as a key with full tags and description.

This keeps IDs unique, ordered, and aligned with the single source of truth in the mapping file.
