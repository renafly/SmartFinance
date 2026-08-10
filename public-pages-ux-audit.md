# SmartFinance Public Pages — UX Audit

Scope: Home (`/`), Features, How It Works, News, About (all under `src/app/(public)/`, rendered by `src/features/landing/landing-screen.web.tsx` and `src/features/landing/public-overview-screen.web.tsx`), plus the language dropdown (`components/language-menu.web.tsx`).

Note up front: these five pages only exist on **web**. On native (iOS/Android), `entry-screen.tsx` and `public-overview-screen.tsx` immediately `<Redirect href="/login" />` — there's no marketing content in the mobile app at all. That's presumably intentional, but worth confirming it's a deliberate product decision and not an oversight, since it means anyone sharing a `/features` or `/about` link that opens in the mobile app gets bounced straight to login with no context.

## 1. Structure & content

- **Home** is a genuine one-page scroller: hero, features, "how it works" steps, news teaser, final CTA, footer.
- **Features / How It Works / News / About** all render through one shared template (`PublicOverviewScreen`): back link → kicker → title → lead → a card grid → a generic CTA banner → footer. The content differs, the layout doesn't.
- This makes **News** the odd one out. "News" implies dated, individually linkable posts, but it's rendered with the exact same card grid as Features and About — no publish dates, no article pages, no way to open a single story, no pagination/archive. It reads as a fourth features list rather than a news/blog section. Worth deciding whether News should get its own layout (dates, links to full posts) or whether it should be renamed to something that matches what it actually is (e.g. "Updates" as a flat highlights list).
- **Dead anchor IDs**: Home wraps its sections in `nativeID="features"`, `nativeID="howItWorks"`, `nativeID="news"`, `nativeID="about"` — but the header nav links go to separate routes (`/features`, `/how-it-works`, etc.), not `#anchors`, and nothing links to Home's `#news`/`#about` anchors either. `nativeID="about"` is actually stuck on the **final CTA banner**, not an About section. These look like leftovers from an earlier single-page-with-anchors design and can be removed, or the nav could be restored to jump-scroll on Home instead of navigating away.
- **Icon-to-content mismatches**: card icons are chosen by cycling through a short, page-specific icon list with `index % icons.length`. Features (8 items) and How It Works (6 items) have exactly one icon per item, so that's fine. But News has only 3 icons for 6 items and About only 4 icons for 6 items, so icons repeat and land on unrelated cards — e.g. on News, the "shield" icon (meant for the security/households story) also lands on "Turn repeated expenses into a plan," and "auto-graph" (dashboard) also lands on "A transfer isn't another expense." Either add more distinct icons per page or map icons explicitly per item instead of cycling.
- **Translations are complete and parallel** — PT and EN have matching item counts and structure for every page, so there's no missing-content risk switching languages.
- Content tone and length are consistent across pages (short kicker → title → 1-sentence lead → card grid of title+description). That consistency is a genuine strength.

## 2. Navigation

- Header nav (Features / How it works / News / About) plus Sign in / Get started is identical in content across all five pages — good, predictable IA.
- The header is **implemented twice**: once inline in `landing-screen.web.tsx` for Home, and once inside `public-overview-screen.web.tsx` for the other four. This duplication has already caused visible drift (see §4), and doubles the maintenance surface for anything header-related.
- The brand/logo is a clickable "back to home" link on Features/How It Works/News/About (in both header and footer), but is a static, non-clickable element on Home itself. That's reasonable (you're already home), but means the logo's behavior isn't consistent if a user builds a mental model of "logo = home" — clicking it on the homepage does nothing.
- Sub-pages add an explicit "← Back to home" text link above the page title, which Home doesn't need. No issue there, just noting the pattern isn't mirrored (nor should it be).
- The Cookie Policy page (`/cookie-policy`) exists but isn't linked from the header or footer of any of the five pages — it's presumably only reachable via the cookie-consent banner. If someone dismisses that banner, there is no path back to the policy from the marketing site.

## 3. Consistency issues between Home and the other four pages

These are the most concrete, fixable findings:

- **"Sign in" is a full secondary button on Home** (bordered, `colors.surface` background, same height as "Get started") **but a bare text link with no button styling on Features/How It Works/News/About**. The visual weight of the same action changes depending on which page you're on.
- **Button sizing differs**: Home's CTA buttons are `minHeight: 44`, `paddingHorizontal: 18`. The sub-page header's "Get started" button is `minHeight: 42`, `paddingHorizontal: 16`, and has no border. Small, but on close inspection the header looks subtly different depending on the page.
- **Mobile menu locks background scroll on Home** (`document.body.style.overflow = "hidden"` while the menu is open) **but does not on the sub-pages** — opening the hamburger menu on Features/News/etc. lets the page scroll underneath it, which can look broken next to Home's behavior.
- **Header z-index** is 30 on Home and 20 on the sub-pages — doesn't cause a visible bug today, but is an unnecessary inconsistency in otherwise-identical components.

Given the header is duplicated rather than shared, I'd extract one `<PublicHeader>` component used by all five pages — it removes this whole class of drift risk going forward.

## 4. Responsiveness

- Breakpoints are consistent and sensible: `compact < 900px` (collapse nav into hamburger), `phone < 600px` (tighter hero/title sizing). Same thresholds used everywhere.
- **Layout flash on Features/How It Works/News/About only**: the sub-page `Header` and the page body each gate their responsive breakpoint behind a local `layoutReady` flag that only flips to `true` after a `requestAnimationFrame`. Until then, `compact` and `phone` are forced to `false`, meaning **on every load of these four pages, the desktop nav and desktop buttons render for one frame even on a phone-width viewport**, before snapping into mobile layout. Home has no such delay — `compact`/`phone` are computed directly from `useWindowDimensions()` on first render. Two consequences: (1) a visible flash/layout jump on Features/How It Works/News/About that Home doesn't have, and (2) because the header and the page body each keep their *own* `layoutReady` state, the two can flip a frame apart, so the header and the content can briefly disagree about whether they're in mobile mode. Worth either removing the delay (matching Home) or lifting a single shared "ready" flag if the delay is there to avoid an SSR/hydration mismatch.
- Card grids (`flexBasis: 330` / `245`, `flexWrap`) reflow sensibly from 1 to 2 to 3 columns; no overflow issues found in the styles.
- Hero and section max-widths (860–1180px) are consistent and center correctly at all sizes.

## 5. Visual hierarchy

- Page hierarchy on Features/How It Works/News/About is clear and repeatable: kicker (small, colored, uppercase) → large title → lead paragraph → card grid → CTA band → footer. This repetition is a strength for a multi-page marketing site — visitors always know where they are on the page.
- Home's hero is denser (eyebrow badge, large title, body copy, two CTAs, trust line, plus a financial-preview mock panel) which is appropriate for a landing page, but the jump in visual complexity from Home to the very plain sub-pages is fairly steep. The sub-pages could borrow a bit more visual interest (e.g. the trust row, or a small stat) without breaking their simplicity.
- CTA banner ("Ready for a clearer financial life?") appears on all four sub-pages with identical copy and identical button ("Open SmartFinance"), which is fine for consistency but means a visitor who reads Features then How It Works then News then About sees the **exact same closing pitch four times**. Varying the CTA copy per page (or varying just the description line) would reduce the repetition without hurting conversion consistency.

## 6. Language dropdown

**Placement**: consistent — sits between the nav links and Sign in/Get started on desktop, and inside the mobile hamburger panel (grouped with Sign in/Get started) on mobile. Same position on all five pages, including Home.

**Trigger design**: shows only a flag emoji + chevron, no text label. This is compact but has two real drawbacks:
- Flags represent countries, not languages (a 🇬🇧 flag for "English" reads oddly to non-UK English speakers, e.g. US, Irish, or international users), and a flag-only trigger with a generic `accessibilityLabel="Select language"` doesn't tell an assistive-tech user which language is *currently* selected — they'd have to open the menu and find the checkmark to find out.
- Consider adding the language code as visible text next to the flag (e.g. "🇬🇧 EN"), and making the accessibility label dynamic, e.g. "Language: English. Select language."

**Selected-language state**: correctly reflected — the active option shows a checkmark and a soft-highlighted background, and the trigger's flag updates immediately. Menu closes on selection, on outside click, and on Escape (with focus returned to the trigger) — solid interaction design.

**Persistence — the one real bug**: language selection is stored via `setStoredLanguage()`, which on web writes to `localStorage` **only if `isPreferenceStorageAllowed()` is true** (i.e., only after the visitor has accepted the "Preferences" cookie category). If a visitor hasn't yet interacted with the cookie-consent banner (or rejected optional cookies), switching the language still *works visibly* in the moment — the UI updates immediately via the in-memory i18next/zustand state — but **nothing is written to storage**, so a page refresh or a new visit silently reverts to English. There's no messaging anywhere in the language menu that explains this. A user who deliberately switches to Português, refreshes, and finds it back on English has no way to know why. Two options: surface a note when storage isn't allowed, or don't gate *language* persistence behind the same consent category as analytics (it's arguably a "necessary" preference for usability, not tracking).

**Cross-page consistency**: because language state lives in a global i18next instance + zustand store rather than per-page state, navigating between Home/Features/How It Works/News/About within a session keeps the selection correctly in sync everywhere — no page-to-page drift.

**Mobile behavior**: on mobile the dropdown is only reachable after opening the hamburger menu (there's no persistent language control outside the menu). That's a reasonable tradeoff for space, but it does mean language switching takes two taps on mobile vs. one on desktop. The dropdown itself opens correctly within the mobile panel; I didn't find an overflow/clipping bug in the styles, but it's worth a manual check on a narrow (320–360px) viewport since the menu has a fixed 172px width and both mobile menu and language submenu are absolutely positioned/stacked.

## Priority suggestions

1. **Fix the desktop-nav flash on the four sub-pages** — remove or align the `layoutReady` delay so mobile viewports render mobile layout immediately, matching Home's behavior.
2. **Deduplicate the header** into one shared component used by all five pages, to eliminate the button-styling, scroll-lock, and z-index drift.
3. **Make "Sign in" visually consistent** (button vs. plain link) between Home and the sub-pages.
4. **Fix icon cycling on News and About** so icons don't land on unrelated cards — either add more icons or map them per item explicitly.
5. **Address language-persistence-vs-cookie-consent gap** — either exempt language from the "Preferences" consent gate or tell users their choice won't stick until they accept it.
6. **Decide what News actually is** — a real dated/linkable article layout, or rename it to match a static highlights format.
7. **Remove dead `nativeID` anchors on Home** or repurpose the nav to scroll to them, and fix the `about` ID currently sitting on the CTA band.
8. Link the Cookie Policy page from the footer so it's reachable without the consent banner.
