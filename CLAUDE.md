# Hosoon development notes

Hosoon is a local-first Arabic RTL PWA for memorizing the Quran using the Five Fortresses method. It uses 480 thumuns (60 hizbs, eight thumuns each), dated daily plans, review sessions, a mobile Mushaf reader, audio playback, XP, achievements, and optional Supabase synchronization.

## Current product behavior

- The warm parchment theme is the default; users can switch among warm, light, dark, ocean, and ocean-dark.
- Western numerals are used in the interface.
- Progress is stored locally first and can be synchronized to Supabase with account isolation and optimistic concurrency checks.
- A task earns XP once when it changes from incomplete to complete. The UI shows a small floating XP animation at the checkbox.
- The statistics screen contains the party map, milestones/achievements, and monthly activity calendar.
- The Mushaf reader prioritizes the page image on mobile, supports horizontal navigation, compact controls, and audio that continues while controls are hidden.
- Quran boundaries and approved text are read-only application data; there is no correction-suggestion feature.

## Architecture

- `src/components/HosoonApp.tsx` coordinates the workspace and tab navigation.
- `src/store/useHifzStore.ts` owns persistent progress mutations and XP accounting.
- `src/lib/progress/` validates, migrates, merges, backs up, and serializes progress.
- `src/lib/quran-data.ts` and `src/lib/quran-labels.ts` expose verified Quran metadata.
- `src/lib/audio-engine.ts` owns the shared audio element and Media Session integration.
- `src/components/mushaf/ThumunReaderView.tsx` is the mobile reader.
- `supabase/` contains the local database schema and RLS tests.

## Validation

Run `npm run type-check`, `npm run lint`, `npm test`, and the focused Playwright test affected by a UI change. Run `npm run verify-data` after changing Quran data or generators.
