# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com), and the project uses [Semantic Versioning](https://semver.org).

## [0.2.1] - 2026-11-15

### Fixed

- Cursor's model names (`claude-4.6-opus-high-thinking`) are translated to the providers' names, so they get a price.
- The API value is no longer shown when most tokens have no known price (Cursor's "auto" mode). A dollar value that covers a few percent of the usage was misleading.

## [0.2.0] - 2026-11-15

### Added

- Cursor support. Cursor logs no reliable token counts, so Cursor-only reports count AI replies and sessions instead of tokens and cost.

### Changed

- "Longest session" is now the longest stretch of work without a break of more than 30 minutes.

## [0.1.2] - 2026-11-15

### Added

- `--demo` shows a sample video and card with made-up numbers, clearly labeled.
- A clearer message when no logs are found: what is supported and what to do next.

## [0.1.1] - 2026-11-15

### Added

- A link under the video to star the project on GitHub.

## [0.1.0] - 2026-11-15

### Added

- Adapters for Claude Code and Codex CLI.
- Share card (PNG), 20-second video page with a synthesized beat, terminal summary and JSON output.
- Cost at API list prices from a bundled price snapshot.
