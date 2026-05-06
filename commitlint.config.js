// commitlint.config.js
// Enforces conventional commit format:
//   type(scope): description
//
// Valid types:
//   feat     — new feature
//   fix      — bug fix
//   chore    — maintenance, deps, config
//   docs     — documentation only
//   style    — formatting, no logic change
//   refactor — code restructure, no feature/fix
//   test     — adding or updating tests
//   ci       — CI/CD pipeline changes
//   perf     — performance improvement
//   revert   — revert a previous commit
//
// Valid scopes (optional):
//   backend, frontend, simulation, ai, models,
//   security, docker, deps

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "chore",
        "docs",
        "style",
        "refactor",
        "test",
        "ci",
        "perf",
        "revert",
      ],
    ],
    "scope-enum": [
      1,   // warning only — scope is optional
      "always",
      [
        "backend",
        "frontend",
        "simulation",
        "ai_service",
        "models",
        "security",
        "docker",
        "deps",
        "auth",
        "redis",
        "influx",
        "mongo",
        "infrastructure",
        "documentation",
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "subject-max-length": [2, "always", 72],
    "body-max-line-length": [1, "always", 100],
  },
};