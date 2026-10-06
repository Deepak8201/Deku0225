# Infrastructure Guidelines

> **Component Rule:** This file contains detailed infrastructure and DevOps guidelines for the project.
>
> **Related:** See [development.mdc](mdc:../../../rules/development.mdc) for high-level architecture overview.

---

## Infrastructure Configuration

- **Cloud Provider:** NetCracker (Artifactory: `artifactorycn.netcracker.com`; runner tag: `NETCRACKER`)
- **Container Platform:** Docker multistage — 4 stages: `transfer`, `helm-processor` (openjdk21:21.0.5.11.01), `artifact` (scratch), `runner`
- **Orchestration:** Helm (`app-chart/`); chart renamed from `atp3-playwright-runner` to `${APPLICATION_NAME}` at build time
- **CI/CD Tool:** GitLab CI with NextGenCI reusable components:
  - `bootstrap-config@1.1.10` — bootstrap, runner tags, docker/npm registries, Helm repos
  - `ng-buildx@1.6.0` — builds runner image and extracts Helm artifacts
  - `app-chart@1.7.0` — packages Helm chart
  - `application-dd@1.9.0` — publishes NC manifest application descriptor

---

## Deployment Strategy

### Deployment Method

Pipeline is disabled (`workflow: when: never`) until placeholders are filled. Required replacements:

| Placeholder | File | Description |
|---|---|---|
| `<to_replace_project_name>` | `.gitlab-ci.yml` | Sets `APPLICATION_NAME` and `APPLICATION_ARTIFACT_ID` |
| `<to_replace_latest_runner_version>` | `.gitlab-ci.yml` | `RUNNER_IMAGE` — ATP Playwright runner Docker image |
| `<to_replace_latest_runner_transfer_version>` | `.gitlab-ci.yml` | `TRANSFER_IMAGE` — source image with `/scripts` and `/deployments` |
| `REPLACE_SONAR_PROJECT_KEY` | `.gitlab-ci.yml` | SonarQube project key |

### Environment Strategy

- No target environments are configured yet.
- Environment values (URLs, credentials) are injected at runtime via `environment-configuration-template.json` + `${PLACEHOLDER}` substitution (not in `.gitlab-ci.yml`).
- GitLab CI/CD variables should supply `TEST_PARAMS` (JSON execution list) and any credentials needed by `SettingsHelper`.

### Release Process

- Merge requests and branches trigger GitLab CI pipelines.
- Final artifact is a Docker image with extracted Helm templates; publish to the configured container registry.
- Document environment promotion gates here once determined.

---

## CI/CD Pipeline

### Pipeline Stages

1. **build-sonar** — SonarQube analysis via `sonar-scanner-cli:11`; allows failure; triggers on MR and `master`/`main`/`develop`.
2. **build** — Builds runner image + extracts Helm artifacts via `ng-buildx@1.6.0`; 20-minute timeout; publishes to `NG_CI_DOCKER_SNAPSHOT_REGISTRY_HOST` under namespace `nextgenci`.
3. **package** — Packages Helm chart via `app-chart@1.7.0`; depends on `ng-buildx.default.build`.
4. **publish** — Publishes NC manifest application descriptor via `application-dd@1.9.0`.

### Build Process

- `Dockerfile.multistage` stages:
  - `transfer` (`${TRANSFER_IMAGE}`) — source image supplying `/scripts` and `/deployments`.
  - `helm-processor` (`openjdk21:21.0.5.11.01`) — renames `atp3-playwright-runner` → `${APPLICATION_NAME}`, applies optional `configmap-extra.yaml`, outputs helm-templates.
  - `artifact` (scratch) — lightweight export stage; `ng-buildx` extracts to `ng-buildx/build-artifacts/`.
  - `runner` (`${RUNNER_IMAGE}`) — final test-runner image; copies `TestGeneration/` to `/tmp/clone`; runs as non-root `runner` user.
- Additional Docker build args: `HTTP_FTP_PROJECTS`, `APPLICATION_NAME`.

### Automated Tests

- Test runner image copies `TestGeneration/` to `TESTS_DIR=/tmp/clone`; invoked via `run-playwright.js` which parses `TEST_PARAMS` JSON env var.
- `TEST_PARAMS` format: `{ "execution_list": [{ "type": "scope"|"test", "name": "<tag or file>" }] }`.
- `CI` / `TRIGGER_PIPELINE_SOURCE` env var activates CI mode in `playwright.config.ts` (retries: 2, trace/video on).

### Deployment Triggers

- Pipeline currently disabled (`workflow: when: never`) — re-enable by removing/changing this rule after placeholders are filled.
- When enabled: triggers on merge requests and protected branches (`master`, `main`, `develop`).

---

## Containerization

### Docker Configuration

- `Dockerfile.multistage` uses `artifactorycn.netcracker.com:17003/alpine/openjdk21:21.0.5.11.01` as the Helm processor image.
- Final `runner` stage copies `TestGeneration/` to `TESTS_DIR=/tmp/clone`; runs as non-root `runner` user.
- Build args injected at CI build time: `TRANSFER_IMAGE`, `RUNNER_IMAGE`, `APPLICATION_NAME`, `HTTP_FTP_PROJECTS`.

### Image Management

- Images pushed to `NG_CI_DOCKER_SNAPSHOT_REGISTRY_HOST` under namespace `nextgenci`.
- Image name: `${APPLICATION_NAME}` (placeholder `atp3-pw-<to_replace_project_name>`).
- Additional tags: `${CI_PIPELINE_ID}` and `${CI_COMMIT_REF_SLUG}`.
- Artifacts group: `com.netcracker.cloud.atp.project.applications-entities`.

### Container Security

- No infrastructure constraints recorded yet — run /initialize or update this file once CI/CD/deployment choices are made.
- Follow organizational policies for base image scanning and non-root execution.

---

## Environment Management

### Environment Types

- No target environments configured yet.
- Define development, staging, and production environments in GitLab after placeholders are replaced.

### Configuration Management

- Environment-specific values should stay out of source control.
- Use GitLab CI/CD variables and, where applicable, Helm `values.yaml` per environment.

### Secrets Management

- No infrastructure constraints recorded yet — run /initialize or update this file once CI/CD/deployment choices are made.
- Use GitLab CI/CD secrets or the organization's vault solution; never commit credentials.

---

## Monitoring & Observability

### Monitoring Tools

Not configured.

### Logging Strategy

- No centralized logging configured yet.
- When infrastructure is added, document the platform and retention policy here.

### Alerting Rules

- No alerting configured yet.
- When infrastructure is added, document the platform and notification channels here.

### Metrics Collection

- No metrics configured yet.
- When infrastructure is added, document the platform and exported metrics here.

---

## Scaling

### Scaling Strategy

- No scaling rules configured yet.
- When infrastructure is added, document the platform and scaling criteria here.

### Load Balancing

- No load balancing configured yet.
- When infrastructure is added, document the platform and routing rules here.

### Auto-scaling Rules

- No infrastructure constraints recorded yet — run /initialize or update this file once CI/CD/deployment choices are made.

---

## Disaster Recovery

### Backup Strategy

- No backup strategy configured yet.
- When infrastructure is added, document the platform, schedule, and retention here.

### Recovery Procedures

- No recovery procedures documented yet.
- When infrastructure is added, document runbooks and ownership here.

### RTO/RPO Targets

- No infrastructure constraints recorded yet — run /initialize or update this file once CI/CD/deployment choices are made.

---

## Security

### Network Security

- No infrastructure constraints recorded yet — run /initialize or update this file once CI/CD/deployment choices are made.

### Access Control

- No infrastructure constraints recorded yet — run /initialize or update this file once CI/CD/deployment choices are made.

### Compliance

- No infrastructure constraints recorded yet — run /initialize or update this file once CI/CD/deployment choices are made.

---

## Agent Instructions

> **For AI Agents:** Follow these instructions when working with infrastructure and DevOps tasks.

### Before Making Infrastructure Changes

1. ✅ Review Deployment Strategy — understand current deployment method and release process
2. ✅ Check Environment Management — know all environment types and secrets management approach
3. ✅ Review CI/CD Pipeline stages before adding new steps
4. ✅ Check Container Security rules before modifying Dockerfiles
5. ✅ Review Scaling Strategy before changing resource limits or auto-scaling rules

### After Making Infrastructure Changes

> **Update Policy:** This document MUST be updated when any of the following occur:

1. 📝 New environment added or environment strategy changed → update Environment Management
2. 📝 CI/CD pipeline stages modified → update CI/CD Pipeline section
3. 📝 Container configuration or image management changed → update Containerization
4. 📝 Monitoring tools, alerting rules, or logging strategy changed → update Monitoring & Observability
5. 📝 Cloud provider, orchestration, or container platform changed → update Infrastructure Configuration
6. 📝 Scaling or load balancing rules changed → update Scaling section
7. 📝 Backup strategy or RTO/RPO targets revised → update Disaster Recovery
8. 📝 Ask user to confirm documentation updates before finalizing

### When User Asks About Environments or Deployment

1. 🔍 **FIRST** check this document for the current configuration
2. 🔍 If not found here, check CI/CD config files — then propose adding to this document
3. ❌ **DO NOT** add new environment variables or deployment steps without checking existing patterns

---

## Related Rules

- [development.mdc](mdc:../../../rules/development.mdc) - Architecture overview
- `.cursor/skills/backend-context/SKILL.md` - Application configuration (deployed by APM only when the `backend-developer` package is installed)
- `.cursor/skills/testing-context/SKILL.md` - CI testing integration (deployed by APM only when the `qa` package is installed)
- **Equivalent OpenCode-line configuration** (this is a cross-harness project — the `.opencode/` side was initialized first and is the source these answers were ported from): [`.opencode/skills/infrastructure-context/references/guidelines.md`](../../../../.opencode/skills/infrastructure-context/references/guidelines.md)

---

## Notes

NetCracker ATP3 Playwright runner project. GitLab CI uses NextGenCI reusable components with NetCracker Artifactory as registry. Pipeline is disabled (`workflow: never`) until `APPLICATION_NAME`, `RUNNER_IMAGE`, `TRANSFER_IMAGE`, and `REPLACE_SONAR_PROJECT_KEY` placeholders are filled. Update this file when environment targets, monitoring, scaling, or deployment promotion strategies are decided.
