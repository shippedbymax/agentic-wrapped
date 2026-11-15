# 1. One package, layers enforced by lint

Date: 2026-11-15 · Status: accepted

## Context

The architecture has four layers (core, adapters, renderers, cli). A monorepo with one package per layer would enforce the boundaries through `package.json`, but adds build, versioning and release work.

## Decision

Ship one npm package. Enforce the boundaries with dependency-cruiser (`npm run lint:layers`) in CI.

## Consequences

- One install, one build, one release. `npx agentic-wrapped` stays small.
- The boundaries are as strict as in a monorepo, as long as CI runs.
- If someone needs the core as a library, `src/core` can be moved to its own package without code changes: it imports nothing from outside.
