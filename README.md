# Learn Effect TS

A small monorepo for learning Effect TS through practical Node.js examples.

Start with the [Effect TS learning roadmap](docs/effect-ts-roadmap.md). The goal
is to build enough Effect judgment to design boundaries, review AI-generated
code, and safely add small Effect-powered modules to real projects.

## Stack

- Node.js 24.15.0
- pnpm 10.33.0
- Effect TS
- Hono
- TypeScript
- tsx

## Tooling

- Turborepo
- Biome
- Vitest
- Playwright

## Commands

```bash
nvm use
pnpm install
pnpm dev
pnpm check
pnpm test:e2e
```

This repo enforces the Node.js and pnpm versions declared in `package.json`.
If you switch from another repo and run a pnpm command with the wrong runtime,
pnpm will stop with an engine error instead of continuing with a mismatched
version.
