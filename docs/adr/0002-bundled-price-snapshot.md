# 2. Prices are a bundled snapshot

Date: 2026-11-15 · Status: accepted

## Context

Cost needs model prices, and prices change. Loading them at run time keeps them fresh but needs a network call.

## Decision

Bundle a snapshot (`src/core/pricing/model-prices.json`) and refresh it at development time with `npm run update-pricing`. The published tool never touches the network.

## Consequences

- "100% local" is true and testable.
- Prices can be out of date between releases. Models without a known price are listed in the output and left out of the cost instead of being counted as free.
- Historic price changes are not modeled: every token is valued at the snapshot's price.
