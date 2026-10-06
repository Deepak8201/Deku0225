# Tag Taxonomy

Complete reference for **tag categories**: type (fixed vs extensible), allowed values, whether the category is mandatory, and cardinality.

| Category | Type | Values | Mandatory | Allow multiple |
| --- | --- | --- | --- | --- |
| **suite** | Fixed | `smoke`, `regression`, `full`, `sanity` | Yes | Yes |
| **priority** | Fixed | `critical`, `high`, `medium`, `low` | Yes | No (single) |
| **type** | Fixed | `e2e`, `api`, `integration`, `ui`, `unit` | Yes | No (single) |
| **dataImpact** | Fixed | `readonly`, `mutating` | Yes | No (single) |
| **environment** | Fixed | `dev`, `staging`, `production`, `all` | No (optional) | Yes |
| **stability** | Fixed | `stable`, `flaky`, `wip`, `deprecated` | No (optional) | No (single) |
| **speed** | Fixed | `fast`, `medium`, `slow` | No (optional) | No (single) |
| **feature** | Extensible | Defined during generation / config | No (optional) | Yes |
| **component** | Extensible | Defined during generation / config | No (optional) | Yes |
| **team** | Extensible | Defined during generation / config | No (optional) | No (single) |

## Notes

- **Fixed** categories must use only values recognized in **TagConfiguration.json** (and project policy).
- **Extensible** categories may gain new values when needed; updates belong in **TagConfiguration.json** and must not change existing meanings.
- **Mandatory** rows (**suite**, **priority**, **type**, **dataImpact**) are required for every test entry in **TestTagsMapping.json**.
