# Hosoon repository guidance

## Framework

This project uses Next.js 16.3, React 19, TypeScript, Tailwind CSS v4, Zustand, Supabase, and Vitest/Playwright. Before changing Next.js behavior, read the relevant guide in `node_modules/next/dist/docs/`; this version has breaking changes compared with older Next.js releases.

## Working rules

- Keep Quran data and boundaries unchanged unless the task explicitly requests a data correction.
- Preserve Arabic RTL behavior, local-first progress storage, and cloud ownership/epoch checks.
- Prefer existing components, tokens, stores, and helpers over new parallel implementations.
- Do not expose secrets or commit `.env.local`.
- Validate changes with the smallest relevant checks, then run `npm run type-check`, `npm run lint`, and focused tests.
- For UI changes, check mobile widths (320px and 390px), keyboard focus, reduced motion, and all five themes.
- Keep user-facing text concise and Arabic unless an existing technical label requires English.

## Useful commands

```bash
npm run dev
npm run type-check
npm run lint
npm test
npm run test:e2e
npm run verify-data
npm run verify-offline
```

## Important areas

- `src/store/`: persistent progress, session, audio, and XP state.
- `src/lib/progress/`: schemas, migrations, backups, merge, and cloud DTOs.
- `src/components/mushaf/`: mobile Mushaf reader and page navigation.
- `src/components/tabs/`: daily plan, preparation, review, schedule, and stats views.
- `data/` and `quran/`: source data used by the verification scripts.
- `supabase/`: local schema, migrations, and RLS tests.
