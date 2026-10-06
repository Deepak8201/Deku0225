#!/usr/bin/env node

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Anchor every filesystem/git lookup to the actual project root instead of
// process.cwd() (which Cursor does not guarantee equals the workspace root
// when it spawns the hook). CURSOR_PROJECT_DIR is always passed by Cursor;
// the __dirname-based fallback covers manual invocation (e.g. --record-state
// from a terminal) where the env var may be absent.
const PROJECT_ROOT = process.env.CURSOR_PROJECT_DIR || path.join(__dirname, '..', '..');

// State file lives next to this script — __dirname is always writable since
// the hook itself runs from there. A TTL simulates "new session" without
// relying on OS temp-dir cleanup (which is unreliable on Windows).
const STATE_FILE = path.join(__dirname, '.docs-sync-state.json');
const CONFIG_FILE = path.join(PROJECT_ROOT, '.cursor', 'hooks', 'docs-sync-config.json');
const CORE_VERSION_FILE = path.join(PROJECT_ROOT, '.cursor', 'rules', '.core-version.json');
const SKILLS_ROOT = path.join(PROJECT_ROOT, '.cursor', 'skills');

const NEW_FILES_THRESHOLD = 1; // suppress only if no new files added since last notification
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h → treat as a new session (files/timestamp only)
const HISTORY_FILE_LIMIT = 100; // collapse the committed-history listing above this count
const MAX_CONFIG_PATTERN_LENGTH = 200; // guards against pathological regex sources
const MAX_CONFIG_PATTERNS = 300; // total patterns accepted from docs-sync-config.json

function diag(message) {
  try {
    process.stderr.write(`[docs-sync-check] ${message}\n`);
  } catch {
    // stderr unavailable — nothing more we can do
  }
}

// ---------------------------------------------------------------------------
// State file — `lastSyncSha` is intentionally NOT subject to the 24h TTL that
// governs `files`/`timestamp`. Losing the sha on every TTL expiry would mean
// "committed since last sync" resets to "since HEAD" every day, defeating the
// point of commit-aware detection. Reads/writes below keep the two lifetimes
// independent.
// ---------------------------------------------------------------------------

function readStateRaw() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function loadState() {
  const raw = readStateRaw();
  if (!raw || typeof raw !== 'object') {
    return { files: null, lastSyncSha: null };
  }
  const filesFresh = raw.timestamp && Date.now() - raw.timestamp <= SESSION_TTL_MS;
  return {
    files: filesFresh && Array.isArray(raw.files) ? raw.files : null,
    lastSyncSha: typeof raw.lastSyncSha === 'string' && raw.lastSyncSha ? raw.lastSyncSha : null,
  };
}

function saveState(files, lastSyncSha) {
  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ files, timestamp: Date.now(), lastSyncSha: lastSyncSha || null }),
      'utf-8',
    );
  } catch {
    // Non-critical — if we can't write state, we just won't suppress next time
  }
}

// Updates only `lastSyncSha`, preserving whatever `files`/`timestamp` are on
// disk (even if expired) — used for the silent baseline-seed / reseed path,
// which must never appear to the suppression logic as "a message was just
// emitted".
function patchStateSha(sha) {
  const raw = readStateRaw() || {};
  raw.lastSyncSha = sha || null;
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(raw), 'utf-8');
  } catch {
    // non-critical
  }
}

// ---------------------------------------------------------------------------
// Git layer — execFileSync (no shell, no quoting hazards), always anchored to
// PROJECT_ROOT, always NUL-delimited (-z) and repo-cwd-relative (--relative)
// so paths are consistent between the working-tree diff and the historical
// diff regardless of where PROJECT_ROOT sits inside the repository.
// ---------------------------------------------------------------------------

function runGit(args) {
  try {
    const stdout = execFileSync('git', args, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, stdout };
  } catch (err) {
    return { ok: false, stdout: '', error: err };
  }
}

function gitPathList(args) {
  const res = runGit(args);
  if (!res.ok) return [];
  return res.stdout.split('\0').filter(Boolean);
}

function isInsideWorkTree() {
  const res = runGit(['rev-parse', '--is-inside-work-tree']);
  if (!res.ok || res.stdout.trim() !== 'true') {
    diag(
      `not inside a git work tree (cwd=${PROJECT_ROOT}): ` +
        (res.error ? res.error.message || String(res.error) : 'unexpected output'),
    );
    return false;
  }
  return true;
}

function getHead() {
  const res = runGit(['rev-parse', 'HEAD']);
  return res.ok ? res.stdout.trim() : null;
}

function isValidAncestorSha(sha) {
  if (!sha || !/^[0-9a-f]{4,40}$/i.test(sha)) return false;
  if (!runGit(['cat-file', '-e', `${sha}^{commit}`]).ok) return false;
  // Covers rebase, force-push, branch switch, and shallow clones where the
  // ancestor was never fetched — all collapse to "treat sha as invalid".
  return runGit(['merge-base', '--is-ancestor', sha, 'HEAD']).ok;
}

function getWorkingTreeFiles() {
  // On a repository with zero commits, `HEAD` does not resolve and both diff
  // commands fail (caught by runGit → empty list). Untracked files are still
  // collected via ls-files, which needs no HEAD — this is the intended
  // degradation path for a fresh `git init` with no commits yet.
  const unstaged = gitPathList(['diff', '--name-only', '-z', '--relative', 'HEAD']);
  const staged = gitPathList(['diff', '--cached', '--name-only', '-z', '--relative']);
  const untracked = gitPathList(['ls-files', '--others', '--exclude-standard', '-z']);
  return [...new Set([...unstaged, ...staged, ...untracked])];
}

function getHistoryFiles(sinceSha) {
  return gitPathList(['diff', '--name-only', '-z', '--relative', `${sinceSha}..HEAD`]);
}

// ---------------------------------------------------------------------------
// Built-in defaults — always active. docs-sync-config.json (below) can only
// ADD to these, never remove or override them, so absence of a config file
// reproduces exactly this behavior.
// ---------------------------------------------------------------------------

const IGNORED_PATTERNS = [
  /(?:^|\/)node_modules\//,
  /\.lock$/,
  /(?:^|\/)dist\//,
  /(?:^|\/)build\//,
  /(?:^|\/)\.next\//,
  /(?:^|\/)coverage\//,
  /\.plan\.md$/,
  /(?:^|\/)\.docs-sync-state\.json$/,
  /(?:^|\/)\.cursor\/\.update-backup\//,
  /(?:^|\/)\.cursor\/\.backups\//,
  /(?:^|\/)\.cursor\/\.temp-update\//,
  /(?:^|\/)apm_modules\//,
  /(?:^|\/)\.workplace\//,
  // Initialization analysis artifacts. They are project-owned and committed, but they
  // describe the code rather than being code: a re-analysis writes index.json plus a
  // .json/.md pair per component, which alone clears the 3-file threshold and would ask
  // for a /docs-sync on every refresh.
  /(?:^|\/)\.cursor\/project\/analysis\//,
];

const DEPENDENCY_FILES = [
  /(?:^|\/)package\.json$/,
  /(?:^|\/)requirements\.txt$/,
  /(?:^|\/)go\.mod$/,
  /(?:^|\/)Cargo\.toml$/,
  /(?:^|\/)pyproject\.toml$/,
  /(?:^|\/)pom\.xml$/,
  /(?:^|\/)build\.gradle(?:\.kts)?$/,
  /(?:^|\/)Gemfile$/,
  /(?:^|\/)apm\.yml$/,
  /(?:^|\/)apm\.lock\.yaml$/,
];

const BUILD_CONFIG_FILES = [
  /tsconfig/,
  /webpack/,
  /vite\.config/,
  /angular\.json/,
  /next\.config/,
  /rollup\.config/,
  /esbuild/,
  /babel\.config/,
  /\.babelrc/,
  /jest\.config/,
  /vitest\.config/,
];

const CATEGORY_PATTERNS = {
  api:       [/(?:^|\/)api\//, /controller/i, /(?:^|\/)route/i, /endpoint/i],
  frontend:  [/component/i, /(?:^|\/)page/i, /(?:^|\/)view/i, /\.tsx$/, /\.vue$/, /\.svelte$/],
  backend:   [/(?:^|\/)service/i, /middleware/i, /handler/i, /(?:^|\/)server\//],
  database:  [/migration/i, /(?:^|\/)schema/i, /(?:^|\/)model/i, /\.prisma$/],
  tests:     [/\.spec\./, /\.test\./, /\.e2e\./],
  infra:     [/Dockerfile/i, /docker-compose/i, /\.tf$/, /(?:^|\/)\.github\//, /(?:^|\/)ci\//i],
  docs:      [/^docs\//, /\.md$/, /AGENTS\.md$/, /README\.md$/],
  workspace: [
    /^\.cursor\/agents\//,
    /^\.cursor\/skills\//,
    /^\.cursor\/rules\//,
    /^\.cursor\/commands\//,
    /^\.cursor\/hooks\//,
    /^\.cursor\/hooks\.json$/,
    /^\.cursor\/mcp\.json$/,
  ],
};

const CATEGORY_TO_SKILL = {
  api:       'api-context',
  frontend:  'frontend-context',
  backend:   'backend-context',
  database:  'database-context',
  tests:     'testing-context',
  infra:     'infrastructure-context',
  docs:      'documentation-management',
  workspace: 'documentation-management',
};

const DEFAULT_SOURCE_FILE_THRESHOLD = 3;
const DEFAULT_TEST_FILE_THRESHOLD = 3;

function relativeIfFile(skillName, ...segments) {
  const candidate = path.join(SKILLS_ROOT, skillName, ...segments);
  try {
    if (fs.statSync(candidate).isFile()) {
      return path.relative(PROJECT_ROOT, candidate).split(path.sep).join('/');
    }
  } catch {
    // File not found — the skill is uninitialized or does not ship this artifact.
    // Either way, nothing to flag.
  }
  return null;
}

/**
 * The two initialization-owned artifacts inside a context skill, in the order the agent
 * should reconcile them: `project-config.json` holds the structured facts a change can
 * invalidate (framework, version, patterns, conventions), and `references/guidelines.md`
 * is rendered from it. Refreshing the prose while the config still names the old
 * framework leaves the two disagreeing, so both are listed together.
 */
function findContextArtifactsForSkill(skillName) {
  return [
    relativeIfFile(skillName, 'project-config.json'),
    relativeIfFile(skillName, 'references', 'guidelines.md'),
  ].filter(Boolean);
}

function skillDirExists(skillName) {
  try {
    return fs.statSync(path.join(SKILLS_ROOT, skillName)).isDirectory();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// docs-sync-config.json — optional, project-owned, purely additive. Absence,
// or any parse/validation failure, reproduces default-only behavior.
// ---------------------------------------------------------------------------

function safeCompile(source, label) {
  if (typeof source !== 'string' || source.length === 0 || source.length > MAX_CONFIG_PATTERN_LENGTH) {
    diag(`docs-sync-config.json: skipping invalid pattern in ${label} (empty or over ${MAX_CONFIG_PATTERN_LENGTH} chars)`);
    return null;
  }
  try {
    return new RegExp(source);
  } catch (err) {
    diag(`docs-sync-config.json: skipping invalid regex in ${label}: "${source}" (${err.message})`);
    return null;
  }
}

function loadConfig() {
  const config = {
    categories: {},
    categorySkills: {},
    dependencyFiles: [],
    buildConfigFiles: [],
    ignoredPatterns: [],
    thresholds: {},
  };

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8').replace(/^\uFEFF/, ''));
  } catch {
    return config; // absent or unparsable → defaults only, zero regression risk
  }
  if (!raw || typeof raw !== 'object') return config;

  let budget = { n: MAX_CONFIG_PATTERNS };
  const takeBudget = () => {
    if (budget.n <= 0) {
      diag(`docs-sync-config.json: pattern budget (${MAX_CONFIG_PATTERNS}) exceeded — ignoring remaining patterns`);
      return false;
    }
    budget.n -= 1;
    return true;
  };

  if (raw.categories && typeof raw.categories === 'object') {
    for (const [name, def] of Object.entries(raw.categories)) {
      if (!def || !Array.isArray(def.patterns)) continue;
      const compiled = [];
      for (const p of def.patterns) {
        if (!takeBudget()) break;
        const re = safeCompile(p, `categories.${name}`);
        if (re) compiled.push(re);
      }
      if (compiled.length) config.categories[name] = compiled;
    }
  }

  if (raw.categorySkills && typeof raw.categorySkills === 'object') {
    for (const [name, skill] of Object.entries(raw.categorySkills)) {
      if (typeof skill === 'string' && skill) config.categorySkills[name] = skill;
    }
  }

  for (const key of ['dependencyFiles', 'buildConfigFiles', 'ignoredPatterns']) {
    if (!Array.isArray(raw[key])) continue;
    for (const p of raw[key]) {
      if (!takeBudget()) break;
      const re = safeCompile(p, key);
      if (re) config[key].push(re);
    }
  }

  if (raw.thresholds && typeof raw.thresholds === 'object') {
    if (Number.isFinite(raw.thresholds.sourceFiles)) config.thresholds.sourceFiles = raw.thresholds.sourceFiles;
    if (Number.isFinite(raw.thresholds.testFiles)) config.thresholds.testFiles = raw.thresholds.testFiles;
  }

  return config;
}

function isIgnored(file, config) {
  return IGNORED_PATTERNS.some(p => p.test(file)) || config.ignoredPatterns.some(p => p.test(file));
}

function isDependencyFile(file, config) {
  return DEPENDENCY_FILES.some(p => p.test(file)) || config.dependencyFiles.some(p => p.test(file));
}

function isBuildConfig(file, config) {
  return BUILD_CONFIG_FILES.some(p => p.test(file)) || config.buildConfigFiles.some(p => p.test(file));
}

function categorizeFile(file, config) {
  const matched = new Set();
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    const extra = config.categories[category] || [];
    if (patterns.some(p => p.test(file)) || extra.some(p => p.test(file))) {
      matched.add(category);
    }
  }
  // Categories that exist only in the project config (no built-in patterns).
  for (const [category, patterns] of Object.entries(config.categories)) {
    if (CATEGORY_PATTERNS[category]) continue;
    if (patterns.some(p => p.test(file))) matched.add(category);
  }
  return [...matched];
}

function summarizePaths(files, limit) {
  const dirs = new Set();
  for (const f of files) {
    const parts = f.split('/');
    if (parts.length > 1) {
      dirs.add(parts.slice(0, -1).join('/') + '/*');
    } else {
      dirs.add(f);
    }
  }
  const arr = [...dirs].sort();
  if (arr.length <= limit) return arr.join(', ');
  return arr.slice(0, limit).join(', ') + ` (+${arr.length - limit} more)`;
}

function buildFollowupMessage(ctx) {
  const {
    uncommittedFiles, committedFiles, historyTruncatedCount,
    affectedSkills, rulesToReview, reasons, contextArtifacts,
  } = ctx;

  const lines = ['Documentation sync recommended.', ''];

  lines.push(`Uncommitted: ${uncommittedFiles.length} file(s) modified` +
    (uncommittedFiles.length ? ` (${summarizePaths(uncommittedFiles, 3)}).` : '.'));

  if (historyTruncatedCount > 0) {
    lines.push(`Committed since last sync: large history delta (${historyTruncatedCount} file(s)) — consider /docs-sync --since=<period>.`);
  } else if (committedFiles.length > 0) {
    lines.push(`Committed since last sync: ${committedFiles.length} file(s) (${summarizePaths(committedFiles, 3)}).`);
  } else {
    lines.push('Committed since last sync: none.');
  }

  if (affectedSkills.length > 0) {
    lines.push(`Potentially affected: ${affectedSkills.join(', ')}.`);
  }
  if (rulesToReview.length > 0) {
    lines.push(`Rules to review: ${rulesToReview.join(', ')}.`);
  }
  if (contextArtifacts && contextArtifacts.length > 0) {
    lines.push('Context skill artifacts that may need refresh (initialization deep-expertise files —');
    lines.push('reconcile project-config.json first, then re-render guidelines.md from it):');
    for (const a of contextArtifacts) {
      lines.push(`  - ${a}`);
    }
  }
  if (reasons.length > 0) {
    lines.push(`Triggers: ${reasons.join('; ')}.`);
  }
  lines.push('Link check: node .cursor/skills/project-initialization/scripts/validate-doc-links.js --json (run as part of either option below).');
  lines.push('');
  lines.push('AGENT INSTRUCTION: This message was generated automatically and will be sent as the next user turn.');
  lines.push('Do NOT start any documentation sync yet. Present exactly these two options to the user and wait for their explicit choice:');
  lines.push('  Option 1 — Local changes: run /docs-sync');
  lines.push('  Option 2 — Git history analysis: run /docs-sync --since=<period> (e.g. 7d, 2w, v1.2.0)');
  lines.push('Do not run either command yourself unless the user explicitly asks for it in their next message.');

  return lines.join('\n');
}

function isProjectInitialized() {
  try {
    // Strip a BOM if present — PowerShell `Set-Content -Encoding utf8` on
    // Windows PowerShell 5.1 (and several copy-paste flows) prepends EF BB BF,
    // which makes JSON.parse throw "Unexpected token \uFEFF". Without this
    // guard the hook silently treated initialized projects as "not initialized"
    // and never emitted a docs-sync recommendation.
    const raw = fs.readFileSync(CORE_VERSION_FILE, 'utf-8').replace(/^\uFEFF/, '');
    return JSON.parse(raw).initializationStatus === 'active';
  } catch (err) {
    diag(`Cannot read ${CORE_VERSION_FILE}: ${err.message || err}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// --record-state — called by /docs-sync at the end of its own run so the next
// hook invocation measures drift from "now", not from files docs-sync itself
// just touched. Snapshots the current working tree and reseeds lastSyncSha to
// HEAD (or null, on a repo with zero commits).
// ---------------------------------------------------------------------------

function recordState() {
  if (!isInsideWorkTree()) {
    diag('--record-state: not inside a git work tree, nothing to record');
    return;
  }
  const config = loadConfig();
  const files = getWorkingTreeFiles().filter(f => !isIgnored(f, config));
  const head = getHead();
  saveState(files, head);
  diag(`--record-state: recorded ${files.length} file(s), lastSyncSha=${head || '(none — no commits yet)'}`);
}

// ---------------------------------------------------------------------------
// Main hook entry point
// ---------------------------------------------------------------------------

function main(input) {
  if (input.status !== 'completed' || (input.loop_count && input.loop_count > 0)) {
    return {};
  }

  // Never fire during initialization — either the project has never been
  // initialized (.core-version.json absent) or initialization is still in
  // progress (initializationStatus !== "active").
  if (!isProjectInitialized()) {
    return {};
  }

  if (!isInsideWorkTree()) {
    return {};
  }

  const config = loadConfig();
  const sourceFileThreshold = config.thresholds.sourceFiles || DEFAULT_SOURCE_FILE_THRESHOLD;
  const testFileThreshold = config.thresholds.testFiles || DEFAULT_TEST_FILE_THRESHOLD;

  // --- Resolve / seed / validate lastSyncSha before touching any diff ---
  const head = getHead();
  const state = loadState();
  let lastSyncSha = null; // sha to actually diff against this run, if any

  if (!head) {
    diag('HEAD does not resolve (no commits yet) — history-based detection disabled; using working tree files only.');
  } else if (!state.lastSyncSha) {
    // First run ever (or state file lost): do NOT scan the whole repo
    // history — seed the baseline to HEAD so drift is measured from now on.
    diag('no lastSyncSha recorded yet — history not scanned this run; seeding baseline to HEAD.');
    patchStateSha(head);
  } else if (state.lastSyncSha === head) {
    // Nothing committed since the baseline — no diff needed.
  } else if (isValidAncestorSha(state.lastSyncSha)) {
    lastSyncSha = state.lastSyncSha;
  } else {
    diag(`lastSyncSha ${state.lastSyncSha} is not a valid ancestor of HEAD (rebase/force-push/branch switch/shallow clone?) — reseeding to HEAD without analyzing history this run.`);
    patchStateSha(head);
  }

  const workingTreeFiles = getWorkingTreeFiles();
  const historyFilesRaw = lastSyncSha ? getHistoryFiles(lastSyncSha) : [];
  const historyTruncatedCount = historyFilesRaw.length > HISTORY_FILE_LIMIT ? historyFilesRaw.length : 0;

  const allFiles = [...new Set([...workingTreeFiles, ...historyFilesRaw])];
  if (allFiles.length === 0) return {};

  const sourceFiles = allFiles.filter(f => !isIgnored(f, config));
  if (sourceFiles.length === 0) return {};

  const depsChanged = allFiles.some(f => isDependencyFile(f, config));
  const buildConfigChanged = allFiles.some(f => isBuildConfig(f, config));

  const categoryHits = {};
  let hasCodeChange = false;
  for (const f of sourceFiles) {
    const cats = categorizeFile(f, config);
    if (cats.length === 0) hasCodeChange = true;
    for (const cat of cats) {
      if (!categoryHits[cat]) categoryHits[cat] = [];
      categoryHits[cat].push(f);
      if (cat !== 'docs' && cat !== 'workspace') hasCodeChange = true;
    }
  }

  const affectedSkills = new Set();
  for (const [cat, files] of Object.entries(categoryHits)) {
    if (cat === 'tests' && files.length < testFileThreshold) continue;
    const skill = config.categorySkills[cat] || CATEGORY_TO_SKILL[cat];
    if (skill) affectedSkills.add(skill);
  }
  // Fallback: a change touching non-docs/non-workspace code that didn't hit
  // any framework-specific category (e.g. a Python/Java/Go file with no
  // matching *-context package installed) still gets a coding-conventions
  // hint instead of silently producing zero affected skills.
  if (hasCodeChange) affectedSkills.add('coding-standards-context');

  const rulesToReview = [];
  if (depsChanged || buildConfigChanged) rulesToReview.push('development.mdc');

  // Mirrors the "Complex" task criteria from orchestrator.mdc:
  //   3+ files changed, new dependencies, or architectural changes (build config / workspace)
  const architecturalChange = buildConfigChanged || (categoryHits.workspace && categoryHits.workspace.length > 0);

  const isSignificant =
    sourceFiles.length >= sourceFileThreshold ||
    depsChanged ||
    architecturalChange;

  if (!isSignificant) return {};

  const reasons = [];
  if (sourceFiles.length >= sourceFileThreshold) {
    reasons.push(`${sourceFiles.length} source files modified`);
  }
  if (depsChanged) reasons.push('new dependencies detected');
  if (architecturalChange) reasons.push('architectural changes detected');
  if (historyTruncatedCount > 0) reasons.push(`large history delta (${historyTruncatedCount} files since last sync)`);

  // Suppress if we already notified this session and the file set hasn't grown
  // by more than NEW_FILES_THRESHOLD new files since the last recommendation.
  if (state.files) {
    const previousSet = new Set(state.files);
    const newFiles = sourceFiles.filter(f => !previousSet.has(f));
    if (newFiles.length < NEW_FILES_THRESHOLD) {
      return {};
    }
  }

  // Persist current file set (uncommitted ∪ committed-since-sha) before
  // emitting the recommendation. lastSyncSha is left untouched here — it only
  // advances via --record-state or the seed/reseed path above.
  const raw = readStateRaw() || {};
  saveState(sourceFiles, raw.lastSyncSha || null);

  const sortedSkills = [...affectedSkills].filter(skillDirExists).sort();
  const contextArtifacts = sortedSkills.flatMap(findContextArtifactsForSkill);

  const uncommittedFiles = workingTreeFiles.filter(f => !isIgnored(f, config));
  const committedFiles = historyFilesRaw.filter(f => !isIgnored(f, config));

  return {
    followup_message: buildFollowupMessage({
      uncommittedFiles,
      committedFiles,
      historyTruncatedCount,
      affectedSkills: sortedSkills,
      rulesToReview,
      reasons,
      contextArtifacts,
    }),
  };
}

if (process.argv.includes('--record-state')) {
  recordState();
  process.exit(0);
}

let inputData = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse((inputData || '{}').replace(/^\uFEFF/, ''));
    const result = main(input);
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({
      followup_message:
        'Documentation sync hook encountered an error and could not analyze changes automatically. ' +
        'Please run /docs-sync manually to check if documentation needs updating. ' +
        '(Error: ' + (err.message || String(err)) + ')',
    }) + '\n');
  }
});
