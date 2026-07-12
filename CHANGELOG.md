# Expenses App — Changelog

All notable changes to this project are documented here.
Format: `[vX.Y.Z] YYYY-MM-DD — Description`

---

## [v2.9.0] 2026-07-12 — New Report tab (bento-style dashboard)

### New features
- **Report tab** — new tab (🧩) alongside Stats, styled as an Apple-style "bento grid" of tiles instead of lists/charts. Shows current month's total spend + trend vs last month, budget %, top category, avg/day, expense count, "spent together" total (if any split expenses), biggest single expense, and a by-person mini breakdown with bars. Fixed layout for now — Stats tab is unchanged; per-user customization of which tiles appear is a possible follow-up.

---

## [v2.8.0] 2026-07-05 — List Month/Year/Custom periods, search across periods

### New features
- **List period toggle** — Month / Year / Custom, same pattern as Stats. Year merges the whole year; Custom shows From/To date pickers spanning any range across months or years
- **Search now works across the selected period** — e.g. search "Carrefour" while in Year mode finds every matching expense across the whole year, not just the current month. Category/person filters and the Together filter work the same way across all three periods

### Fixes
- `openEditModal` looked up the tapped expense in a cache that only ever held the current month — harmless while List was always month-scoped, but wrong once Year/Custom can show items from other months. Now resolves correctly regardless of period.

---

## [v2.7.0] 2026-07-05 — Compact List with per-day totals, Stats filters, keyboard fix

### New features
- **List per-day totals** — each day group shows its total next to the date
- **Stats filters** — category + person filter chips, same as List; persists across Month/Year toggle so you can e.g. see this year's total spend on a single category or person
- **List is more compact** — tighter spacing across the budget card, chips and expense rows; per-person/Together summary chips restacked (name over amount) so they no longer wrap or truncate

### Fixes
- Bottom tab bar no longer floats oddly above the on-screen keyboard — it now hides while any text field is focused and reappears on blur

---

## [v2.6.2] 2026-07-05 — Description/Date/Save full width

### Fixes
- Description, Date and Save on the Add Expense screen were capped at `max-width:360px` like other centered forms, leaving visible gutters on wider phones compared to the full-width category grid/chips above. Now they span the full width to match.

---

## [v2.6.1] 2026-07-05 — Fix Description/Date input alignment

### Fixes
- `.input-group` (Description, Date and other form fields) had a `max-width` but no horizontal centering, while the Save button did — on wider viewports the inputs sat pinned left while Save centered itself, visibly misaligned. Now they line up consistently.

---

## [v2.6.0] 2026-07-05 — Compact Add screen, per-user secondary currency

### New features
- **Compact Add Expense screen** — amount input, category grid, chips, inputs and button are all smaller and tighter so the whole form fits on one screen without scrolling
- **Tap-to-open currency picker** — Add screen shows a collapsed "AED ▾" pill instead of all 6 currencies; tapping it opens the picker, picking a currency closes it again
- **Per-user secondary currency** — the secondary (parenthetical, muted) currency shown on Home/List/Reports is now a personal preference per signed-in family member instead of one shared family setting; each person can pick their own or turn it off

---

## [v2.5.0] 2026-07-05 — Together filter/total, description autocomplete

### New features
- **List → "Together" filter chip** — shows only split (shared) expenses for the month
- **List → "Together" total** — a summary chip next to the per-person totals showing how much was spent jointly via splits
- **Description autocomplete** — Add/Edit/Recurring description fields suggest past descriptions; picking/typing an exact past description auto-fills amount, category and currency (seeded from the current + 2 prior months)

### Fixes
- Per-person totals in List silently dropped expenses not in the default currency — now converted consistently like the month total

---

## [v2.4.0] 2026-07-05 — Basic/secondary currency, currency display fixes

### New features
- **Settings → Currency** — pick a basic and a secondary currency for the family; applied consistently across Home, List and Reports (basic shown bold, secondary shown small and muted in parentheses)
- Replaces the old manual "Report currency" toggle in Stats

### Fixes
- Home's "Top categories" were shown in EUR while the total above them was in the account's default currency — now both match
- Category picker chips (Add/Edit/Recurring) resized when a category was renamed to a longer name — chips are now a fixed size with truncated labels
- `fmt()` was rendering GBP/CHF/SAR amounts with an "AED" prefix instead of their own symbol
- List's monthly total only summed expenses already tagged in the default currency — now correctly converts every expense into it

---

## [v2.3.0] 2026-06-27 — Filters, yearly stats, quick-add, category reorder, more currencies

### New features
- **List filters** — category chips + user chips below search bar; filter expenses by category and/or person
- **Yearly stats** — Month/Year toggle in Stats; Year mode aggregates all months Jan–today with pie chart, category breakdown, by-person, and monthly bar chart
- **Quick-add from Home** — first 6 categories shown as tappable emoji chips; tap to jump to Add tab with category pre-selected
- **Category reordering** — ↑↓ arrows in Settings → Categories; reorder persists to Firebase
- **More currencies** — GBP, CHF, SAR added to all currency pickers (Add, Edit, Stats, Setup, Budget, Recurring)

---

## [v2.2.0] 2026-06-27 — Custom categories

### New features
- **Custom categories** — create new categories with emoji icon, name, and color
- **Rename categories** — edit label and icon of any existing category
- All categories stored in Firebase (`config/categories`); synced across users
- Built-in categories (Food, Shopping, etc.) can be renamed but not deleted
- Custom categories can be fully deleted (existing expenses fall back to Other)

---

## [v2.0.0] 2026-06-21 — Full multi-user rewrite

### New features
- **Multi-user support** — up to 5 users, add/edit/soft-delete in Settings → Users
- **Split expenses** — 🔀 Split chip; equal split by default; per-person amount override; stored as `split:[{userId,amount,pct}]`
- **Recurring expenses** — define recurring (desc/amount/currency/cat/day/who); monthly pending confirmation; manageable list in Settings
- **Notification bell 🔔** — badge with count; bottom sheet with pending recurring (Add / Skip); pending card on Home
- **Settings accordion** — 6 collapsible sections: Appearance / Users / Security / Budget / Recurring / Data
- **Multi-currency budget per category** — each category has its own amount + currency; compared in report currency in Stats
- **Export CSV** — all expenses from last 2 years; columns: date/desc/cat/amount/currency/EUR/who/split detail
- **PIN system overhaul** — Shared PIN (who-screen after auth) OR Individual PINs per user; change shared PIN; set per-user PIN
- **Data model migration** — auto-migrates old `name1`/`name2` config → `users[]` with IDs; backward compat via `resolveUserId()`

### Firebase data model
```
config/users:        [{ id, name, pinHash, deleted }]
config/pinMode:      "shared" | "individual"
config/person1Id:    "u_xxx"   (backward compat)
config/person2Id:    "u_yyy"   (backward compat)
config/categoryBudgets: { food: { amount, currency }, ... }
expenses/year/month/id: { amount, currency, cat, desc, date, ts, who | split }
recurring/id:        { desc, amount, currency, cat, day, who|split, active, lastAdded }
```

---

## [v1.4.0] 2026-06-20 — Who-screen personalization

### New features
- **Personalized greeting** — "Good morning, Byron!" vs "Androniki!" depending on who logs in
- Time-based greeting (morning / afternoon / evening)

---

## [v1.3.0] 2026-06-20 — Charts & Trends

### New features
- **Trends bar chart** — 6 months of spending history in Stats tab
- **Pie chart slice labels** — emoji + percentage shown on slices >5% (chartjs-plugin-datalabels)
- Pie chart tooltip shows report currency amount + percentage

---

## [v1.2.0] 2026-06-20 — Homepage & Appearance

### New features
- **Homepage dashboard** — monthly total, budget progress, top 3 categories, Add Expense button
- **Light / Dark / System theme toggle** — saved to localStorage
- 5-tab layout (Home / Add / List / Stats / Settings)

---

## [v1.1.0] 2026-06-19 — Report currency & FX

### New features
- **Report currency selector** — AED / EUR / USD in Stats tab
- **FX rate source** — switched to `open.er-api.com` (supports AED; ECB via frankfurter.app does not)
- FX rate timestamp shown in Stats ("updated at HH:MM")
- FX refresh: once per day (86 400 000 ms)

### Fixes
- `frankfurter.app` doesn't support AED → switched to `open.er-api.com`
- fx-note moved above the fold so it's always visible in Stats

---

## [v1.0.0] 2026-06-19 — Initial release

### Features
- PIN lock screen (sha256 via crypto.subtle)
- 5 expense categories with colour-coded icons
- AED / EUR / USD currency per expense
- Monthly list view with day grouping
- Budget progress bar
- Stats: pie chart by category, by person (person1 / person2)
- Firebase Realtime Database (europe-west1)
- Firebase Hosting deploy via `node deploy.js`
- Google Fonts: DM Sans
- Dark theme by default; mobile-first layout with safe-area insets
