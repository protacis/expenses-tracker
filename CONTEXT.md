# Expenses App — Context for Claude

Αρχείο πλαισίου για μελλοντικές συνομιλίες. Διάβασε αυτό πρώτα όταν δουλεύεις με το expenses project.

---

## Τι είναι

PWA expense tracker για οικογένεια. Single-file app (`expenses.html`), deployed στο Firebase Hosting (`expenses-558cd.web.app`). Multi-tenant μέσω Firebase Realtime Database — κάθε οικογένεια έχει δικό της `familyId`.

---

## Τρέχουσα έκδοση

**v2.8.0** · deploy 2026-07-05 15:39 (Greece time, UTC+3)

---

## Αρχεία

| Αρχείο | Ρόλος |
|---|---|
| `expenses.html` | Ολόκληρη η εφαρμογή (HTML + CSS + JS, ~2200 γραμμές) |
| `sw.js` | Service Worker για PWA offline |
| `manifest.json` | PWA manifest |
| `icon.svg` | App icon |
| `version.json` | `{"v":"HH:MM"}` — ώρα τελευταίου deploy (χρησιμοποιείται για auto-update) |
| `CHANGELOG.md` | Ιστορικό αλλαγών |
| `deploy.js` | Deploy μέσω Firebase Hosting REST API (δεν χρειάζεται Firebase CLI) |
| `expenses-558cd-firebase-adminsdk-fbsvc-d59934c14b.json` | Service account key (μην το commitάρεις) |
| `CONTEXT.md` | Αυτό το αρχείο |

---

## Deploy

```
node expenses/deploy.js
```
(από το root του repo)

Πριν κάθε deploy:
1. Ενημέρωσε `version.json` με την ώρα σε Greece time (UTC+3)
2. Ενημέρωσε τον in-app timestamp στο `expenses.html` (2 εμφανίσεις + `_THIS_VERSION`) — **ΜΟΝΟ με Edit tool**, ποτέ PowerShell Get-Content/Set-Content (καταστρέφει emoji encoding)
3. Πρόσθεσε entry στο `CHANGELOG.md`
4. Git commit + push

Για να πάρεις Greece time: PowerShell `[System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow, 'GTB Standard Time').ToString('HH:mm')`

---

## Αρχιτεκτονική

### Firebase
- **Hosting**: `expenses-558cd` — servέρει μόνο `expenses.html`
- **Realtime DB**: `europe-west1`
  - `families/${familyId}/config/` — users, settings, categories, budgets, recurring
  - `families/${familyId}/expenses/${year}/${month}/${id}` — έξοδα

### Auto-update
`version.json` φορτώνεται στο app launch. Αν `_THIS_VERSION !== fetched version` → reload. Έτσι το iPhone παίρνει πάντα το νέο build.

### Κατηγορίες
- `DEFAULT_CATS`: const array με 11 built-in κατηγορίες (Food, Shopping, κτλ.)
- `activeCats`: let array — φορτώνεται από Firebase `config/categories`, fallback σε DEFAULT_CATS
- `catMap`: lookup object `{id → cat}`
- `DEFAULT_CAT_IDS`: Set με built-in IDs — μπορούν να μετονομαστούν αλλά ΟΧΙ να διαγραφούν
- Custom cat IDs: `'cat_' + Date.now()`

### Νομίσματα
AED, EUR, USD, GBP, CHF, SAR — FX rates από `open.er-api.com` (EUR base)
`fxToEur`: fallback τιμές αν δεν έχει internet

---

## Features (v2.8.0)

- **List Month/Year/Custom periods** — ίδιο toggle pattern με Stats· search + category/user/Together filters δουλεύουν σε ό,τι period είναι επιλεγμένο (π.χ. search "Carrefour" σε Year mode βρίσκει όλα τα ματς όλης της χρονιάς)
- **Stats filters** — category + person chips όπως στο List, εφαρμόζονται σε pie/breakdown/trend, persist σε Month↔Year toggle
- **List per-day totals** — κάθε ημέρα δείχνει το σύνολό της δίπλα στην ημερομηνία· γενικά πιο compact
- **Tab bar hides on keyboard focus** — δεν "φεύγει" πια περίεργα πάνω από το πληκτρολόγιο σε mobile
- **Compact Add screen** — όλη η φόρμα χωράει σε μία οθόνη χωρίς scroll· το νόμισμα είναι collapsed "AED ▾" chip που ανοίγει μόνο όταν το πατήσεις
- **Secondary currency είναι πλέον ανά χρήστη** — αποθηκεύεται στο `users[i].secondaryCurrency` (όχι στο family-wide config πια)· fallback 'EUR' αν δεν έχει οριστεί, hidden αν έχει επιλεγεί ρητά "None"
- **List "Together" filter/total** — chip που δείχνει μόνο τα split έξοδα + summary chip με το σύνολο που ξοδεύτηκε μαζί
- **Description autocomplete** — Add/Edit/Recurring προτείνουν προηγούμενες περιγραφές και συμπληρώνουν ποσό/κατηγορία/νόμισμα σε exact match
- **Basic currency** — family-wide, set στο Settings → Currency, εφαρμόζεται σε Home/List/Reports (bold)
- **Multi-user** — μέχρι 5 άτομα, με PIN (shared ή individual)
- **Split expenses** — διαχωρισμός εξόδων ανά άτομο με custom ποσά
- **Recurring expenses** — μηνιαίες υπενθυμίσεις για fixed πληρωμές
- **Custom categories** — νέες + rename/delete, χρώμα + emoji + όνομα
- **Category reordering** — ↑↓ στο Settings
- **Budget** — μηνιαίο συνολικό + ανά κατηγορία (με δικό της νόμισμα)
- **Stats (Month mode)** — pie chart, category breakdown, 6-month trend, by person
- **Stats (Year mode)** — ετήσια άθροιση, pie chart, 12-month bar, by person
- **List filters** — category chips + user chips κάτω από το search
- **Quick-add από Home** — emoji chips για τις 6 πρώτες κατηγορίες
- **Export CSV** — 2 χρόνια δεδομένα
- **Theme** — Dark / Light / System
- **PWA** — installable, offline support

---

## Κρίσιμο: Emoji encoding

**ΠΟΤΕ** μη χρησιμοποιείς PowerShell `Get-Content` / `Set-Content` για να επεξεργαστείς το `expenses.html`. Το PowerShell 5.1 διαβάζει UTF-8 με λάθος encoding και καταστρέφει ΟΛΟΙ τα emoji.

Πάντα χρησιμοποίησε:
- `Edit` tool για αλλαγές
- `Write` tool αν χρειαστεί πλήρης αντικατάσταση
- Για timestamps: `Edit` με `replace_all: true`

---

## Pending / Ιδέες (δεν έχουν υλοποιηθεί ακόμα)

- Income tracking (αναβλήθηκε — "πιο σύνθετα μετά")
- Receipt photos (αναβλήθηκε)
- Debt balance between users (ο user το απέρριψε ρητά)

---

## Git

Branch: `multi-tenant` → push στο `origin/multi-tenant`
Remote: `https://github.com/protacis/claude-code-projects`
