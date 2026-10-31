# CC Card Games: Design Guide

The visual and interaction language for every game in the hub. Each game plays differently, but they should all feel like the same place: **a card table in a coffee house, late evening, with friends.** When a new game needs a UI decision, check this document first; when it needs something this document doesn't cover, add it here.

Source of truth for values is [app/globals.css](app/globals.css) (tokens) and [app/layout.tsx](app/layout.tsx) (fonts). This document explains the intent behind them.

---

## 1. Product

**What it is.** A hub of playing-card games, played online with friends: 5-3-2, 7-8, 7 of Hearts, Judgement and Steal the Jack so far. Pick a game, open a table, share a six-character code (or link), play.

**Who it's for.** Small groups of friends, mostly on phones, often in the same room or on a call. Sessions are casual and social.

**Principles**

1. **Warm, not flashy.** It should feel like a real table: near-black espresso wood, a pool of lamp light, bone-coloured cards, a cup-ring left behind. No neon, no gradients-for-gradients'-sake, no casino glitz.
2. **The cards are the interface.** Cards are big, readable and tactile. Chrome stays quiet so the table does the talking.
3. **Phone first.** Every screen works one-handed at 360px wide, then grows. Tap targets are at least 44px.
4. **Friends, not accounts.** A name and a code are the whole onboarding. Never block play behind sign-up.
5. **Consistent front door, bespoke table.** Landing pages, buttons, dialogs and status screens are shared and identical in feel. The table itself may add whatever each game needs, but stays on the same surface, with the same cards and the same tokens.

**Voice.** Friendly, short, a little playful, table-talk rather than software-talk: "Open a table", "Pulling up a chair…", "Who's sitting down?", "Back to the table". No exclamation-mark enthusiasm, no jargon, no blame in errors ("That isn't a table code", not "Invalid input").

---

## 2. Visual language

### 2.1 Colour

All colours are CSS custom properties on `:root`. Use the tokens, never raw hex, in game code.

| Token | Value | Use |
| --- | --- | --- |
| `--roast-hi` / `--roast-mid` / `--roast-lo` | `#1c1512` / `#130e0c` / `#0b0807` | The table and page: lit centre, mid, and edge/fallback background |
| `--surface` | `#181210` | Flat dark surface |
| `--rail` / `--rail-hi` | `#241b16` / `#35281f` | Rail and edge tones |
| `--crema` | `#e2b072` | The single accent: primary actions, turn rings, focus, highlights |
| `--crema-dim` | `#8d6e4b` | Muted accent: borders, empty beans |
| `--on-crema` | `#1a0f06` | Text on a crema fill |
| `--paper` / `--paper-edge` | `#f2eadc` / `#ddd0b9` | Card faces, secondary chips |
| `--ink` | `#1b1512` | Text on paper, black suits |
| `--red` | `#c8402f` | Red suits |
| `--text` | `#f0e7da` | Primary text (warm off-white) |
| `--text-dim` | `#a89a8a` | Secondary text |
| `--panel` | `#171110` | Panel fill |
| `--panel-line` | `rgba(240, 228, 210, 0.11)` | Hairline borders, dividers |
| `--good` / `--warn` | `#8fcf9e` / `#eba062` | Positive and cautionary feedback |

**Rules**

- Espresso is the world; crema is the single accent. Do not introduce a second accent colour. A game that needs to tell things apart (players, teams) uses card suits, shapes or labels first, and crema/paper/roast tints second.
- Text on the dark surface uses `--text` or `--text-dim`. Text on paper or crema uses `--ink` or `--on-crema`.
- Pure white and pure black are never used for surfaces or text.
- Red suit glyphs on dark surfaces use a lifted red (`#e0705f`) so they stay readable; on paper use `--red`.
- Keep contrast at WCAG AA or better; don't go dimmer than `--text-dim`.

### 2.2 Typography

Fonts load in `app/layout.tsx` via `next/font/google`.

| Role | Font | Variable | Use |
| --- | --- | --- | --- |
| Display | **Bricolage Grotesque** (600, one weight on purpose) | `--font-head` | Titles, big numerals, token glyphs, card indices, table codes |
| UI | **Geist** | `--font-body` | Everything else |

- Display type is used sparingly: page titles, game names, big numbers, the join code. Never for paragraphs or buttons.
- Buttons and key labels are weight 700. Body is 400, small labels 600.
- Body 16px/1.45. Page titles use `clamp()` so they scale from phone to desktop (hub title: `clamp(44px, 9vw, 68px)`).

### 2.3 Surfaces and depth

- **Page ground** (`FeltPage`): a warm lamp pool high in the frame over a radial roast gradient, plus a faint cup-ring in the corner. The component keeps its old name.
- **Panel**: `--panel` fill, 1px `--panel-line` border, 16px radius, 380px max width. In-table panels (lobby, summaries, pickers) add a `0 24px 60px rgba(0,0,0,.55)` shadow. Tiles on the hub use the same recipe.
- **In-game table** (`TableShell`): radial roast gradient, a lamp pool and cup-ring over the middle, and a soft vignette. Reference: `TableShell.module.css`.
- **Radii**: 16px panels, tiles and dialogs, 12px buttons and inputs, 999px chips, pills and plates, 7% of card width on cards.
- **Scrollbars** are global and inconspicuous: thin, transparent track, faint crema thumb. Defined once in `globals.css`; don't restyle per component.
- Shadows are warm-black and soft, with a small tight shadow underneath to sit things on the table. No coloured glows except crema.

### 2.4 Cards

`PlayingCard` is shared by every game and is the visual anchor.

- Ratio **5:7**. Size by setting `--cw` on the card or any ancestor; everything inside scales with it. Inside the card, `--u` is 1% of its width.
- Bone-coloured face (`--paper`) with ink/red pips and corner indices.
- Supports ranks **2 to Ace** (Ace is rank 14) and all four suits. Games that use a partial deck simply don't deal the others.
- Face-down cards are flat vector posters in four roast tones, mirrored in both axes so they read the same way up: `back="lattice"` (default, the "Sunrise" rings) or `back="rosette"` (the "Diamond"). 7-8 uses the rosette for every concealed card; other games use the default.
- Props for state: `disabled` (can't play now), `selected`, `fresh` (just received), `trump` (a small crema notch under the corner index), `faceDown`.
- Render as a `<button>` when interactive (pass `onClick`), a labelled `role="img"` otherwise. Every card has an accessible name ("Queen of Hearts").
- Hands are fanned with overlap (5-3-2, 7-8, Judgement; Judgement sizes the fan to fit up to 16 cards on a phone), or shown flat and wrapped so every card stays readable (7 of Hearts). Playable cards rise and wear a crema ring; unplayable ones dim.
- `FlipCard` is a decorative card that turns face up on hover, used on landing pages.

### 2.5 Tokens (`BrassToken`)

`BrassToken` is a round coaster seen from above: a dark disc with a crema ring and a serif numeral or glyph in crema. It is the hub's recurring "game piece". Use it for game emblems (5-3-2 is three tokens, Judgement is a J and a spade), score markers and target chips. Size via `--token`. Tokens sit slightly rotated and uneven, as if dropped on the table. (The component name is historical.)

### 2.6 Iconography

Minimal. Suits are inline SVG (`SuitIcon`). Prefer words ("Rules", "Leave") over icon-only buttons; where an icon-only control is unavoidable it needs an `aria-label` and a 44px target.

---

## 3. Motion

Motion should feel like cards being handled: quick, springy, physical.

| Token | Value | Use |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default: entrances, hover, layout |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Things dropped on the table (tokens, titles, badges) |

- Entrances: **deal in** (cards fly in from above, staggered ~30-90ms) and **drop** (tokens/titles fall and settle, ~0.8s). Content panels **rise** (~16-20px, 0.5-0.6s).
- Trick games: a played card is **tossed** from its player's side of the table, the winner's card **pulses** with a ring and sparks, and the hand is **swept** towards the winner after a ~2.3s pause. A "+1" floats off the winner's plate.
- Hover on interactive surfaces: lift 2px. Press: sink 1px and scale to 0.98.
- Durations: 150-280ms for feedback, 500-800ms for scene-setting entrances. Nothing blocks input.
- Animate `transform`-family properties (`translate`, `rotate`, `scale`) and `opacity` only.
- **Always honour `prefers-reduced-motion`.** The global rule in `globals.css` collapses durations; don't add motion that depends on it to convey information.

---

## 4. Layout and responsive behaviour

- **Mobile first**, 360px baseline. Use `100dvh`, not `100vh`, and respect `env(safe-area-inset-*)` (the viewport is `viewport-fit: cover`).
- Page gutters 20px. Content max-widths: panels 380px, hub grid 980px, dialogs 520px.
- **Game landing**: single column on phones (hero, then panel); at 900px+ two columns (hero 520px | panel 380px) centred with a fluid gap.
- **Hub fold**: the first row of game tiles must be visible without scrolling on a typical laptop and on phones. The hero is compact; at 760px+ the words sit beside the card fan, on phones the fan stacks under them at a smaller size. The fan is never hidden.
- **Hub grid**: `repeat(auto-fit, minmax(min(100%, 300px), 1fr))`. New games flow in automatically.
- **In-game table** fills the viewport (`100dvh`, no page scroll) as a three-row grid: header, a flexible board, and the player's hand along the bottom. The hand stays within thumb reach.
- On touch devices a card takes two taps to play (select, then confirm), so a stray touch never plays one.
- No horizontal page scroll at any width.

---

## 5. Screens every game has

Each game ships the same set of screens, built from shared components, so a player who knows one knows them all.

| Screen | Route | Built from |
| --- | --- | --- |
| **Hub** | `/` | `Hub`, `GameTile` (data from `games/registry.tsx`) |
| **Game landing** | `/games/<slug>` | `GameHome` (`GameLanding` + `Panel`, `TextField`, `Button`, `Divider`) |
| **Table / room** | `/games/<slug>/room/[code]` | `RoomClient`, then a game-specific `Table` inside `TableShell` |
| **Rules** | modal on the table | `RulesDialog` |
| **Status / error** | any | `StatusScreen` |

### Landing page anatomy

1. Quiet "‹ All games" back link, top left.
2. **Emblem** (the game's token mark, dropping in), **tagline** (one sentence, ≤ 28ch), optional **card fan** showing something characteristic of the game's deck.
3. **Panel** with: name field (remembered between visits), a primary "Open a table" button, a `Divider` ("or join friends"), a code field plus secondary "Join".

### Table header

Left: wordmark in display type. Middle: game state (round, a `TrumpChip` paper pill). Right: **Rules** and **Leave** as small pill buttons; "Leave" asks to confirm by changing its label to "Leave table?" for 3 seconds rather than opening a modal. Connection trouble shows as a small amber pulsing dot beside Rules (words on hover or focus), not a banner. Rejected moves appear as a brief notice under the header.

### Table panels

The waiting room (`Lobby`), trump chooser, round summaries and final results are panels sitting on the table, styled by `TablePanel.module.css` (`panel`, `title`, `hint`, `fine`, `primary`). A host-only destructive action (such as ending a game) uses the same "ask again for 3 seconds" pattern as Leave.

### Branding

The CoffeeCoders logo (`public/coffeecoders_logo.png`, white line-art with a transparent background, made for dark surfaces) appears at the top of the hub, and a quiet `Watermark` ("Built by CoffeeCoders", 60% opacity, full on hover) closes the hub and every game landing page. It is deliberately absent from the in-game table, where nothing should compete with the cards.

### Status screens

Centre-aligned on the dark ground: optional shuffling-cards animation while busy, a display-type title, one dim sentence of explanation, and at most one button. Always give a way out.

---

## 6. Component inventory

Shared, game-agnostic building blocks. Use these before writing new CSS.

| Component | Path | Purpose |
| --- | --- | --- |
| `PlayingCard`, `FlipCard`, `SuitIcon` | `components/cards/` | Cards, a hover-flip decorative card, and suit glyphs |
| `FeltPage` | `components/ui/` | Full-height espresso background for any top-level page |
| `Panel` | `components/ui/` | Container for forms and content |
| `Button`, `ButtonLink` | `components/ui/` | Primary (crema) and secondary (outlined) call-to-action |
| `TextField` | `components/ui/` | Labelled input; `variant="code"` for join codes |
| `Divider` | `components/ui/` | Hairline with centred label |
| `BrassToken` | `components/ui/` | Round coaster emblem/marker |
| `Watermark` | `components/ui/` | "Built by CoffeeCoders" credit with logo, linking to coffeecoders.cc |
| `BackLink` | `components/ui/` | Quiet "‹ label" link up one level |
| `GameLanding` | `components/ui/` | The shared game front door layout |
| `RulesDialog` | `components/ui/` | Native `<dialog>` sheet; game supplies title and content. Takes an `id` so a second dialog (a scoreboard) can sit beside the rules |
| `StatusScreen` | `components/ui/` | Full-screen message with optional back button |
| `Hub`, `GameTile` | `components/hub/` | Landing page and per-game tiles |
| `TableShell`, `TrumpChip` | `components/table/` | Table surface, header (wordmark, state, Rules, Leave), alerts and notices for any table |
| `Seat`, `Lobby`, `TrumpPicker` | `components/table/` | Nameplate (left, right, top, me; target tally for fixed-target games), waiting room, trump chooser |
| `GameHome`, `RoomClient`, `NameGate` | `components/table/` | Shared landing page and room route for multiplayer games |
| `TablePanel.module.css` | `components/table/` | Shared panel, title, hint and primary-button styles for on-table panels |
| Variable player counts | `lib/net/host.ts`, `Lobby` | An engine may set `minSeats`; the host can then deal once that many are seated and drops empty seats (`newGame` receives the player count). `Lobby` takes `minPlayers` |

Shared logic lives in `lib/`:

- `lib/cards/cards.ts`: suits, ranks, names, shuffle, sort.
- `lib/cards/tricks.ts`: follow-suit and trick-winner rules (used by 5-3-2 and Judgement).
- `lib/cards/rules.ts`: `RuleError`.
- `lib/net/`: host and guest sessions, encryption, socket transport, storage.
- `lib/hooks/`: `useClientValue` (hydration-safe browser values) and `useFlip` (slides cards when a hand re-sorts).

---

## 7. Accessibility

- Visible focus on everything interactive: 2px `--crema` outline, 3px offset (global `:focus-visible`).
- Tap targets ≥ 44px. Inputs and primary buttons are 50px tall.
- Cards and emblems have text alternatives; decorative flourishes (`fan`, dividers, chevrons) are `aria-hidden`.
- Use real elements: `<button>` for actions, `<a>`/`Link` for navigation, `<dialog>` for modals (focus trapping and Esc come free), `<label>` on every input.
- Never rely on colour alone: red/black suits also differ by shape; turn/state is also conveyed in text, and a player's standing against their call is given as numbers and an accessible label as well as colour.
- Respect `prefers-reduced-motion` (see §3).

---

## 8. Adding a new game: checklist

1. **Code** goes under `games/<slug>/`: `components/`, `game/` (pure rules, no React, no networking), and `net/` if it's multiplayer. Keep rules deterministic and testable.
2. **Routes** under `app/games/<slug>/`: `page.tsx` (landing) and `room/[code]/page.tsx` for multiplayer tables. Set `metadata.title` to the game name (the site adds the " · Card Games by CoffeeCoders" suffix).
3. **Landing** is `GameHome` with the game's emblem, a one-sentence tagline, and a fan of characteristic cards. Name field first, "Open a table" primary, join by code secondary.
4. **Emblem**: build a small `Emblem<Name>` from `BrassToken`s that accepts a `size` and an `animated` flag. Use the same component on the landing page and the hub tile.
5. **Register** the game in `games/registry.tsx` (slug, title, tagline, facts, emblem, cards). The hub picks it up automatically.
6. **Rules**: write a short `<ol>` and show it through `RulesDialog`. Lead each item with a bold phrase.
7. **Table**: use `TableShell`, `PlayingCard` for every card, the header pattern (§5) and the Leave-confirm behaviour. Reuse `lib/cards/tricks.ts` for trick-taking rules.
8. **Net**: write an engine (pure), a `view.ts` that projects what one seat may see, a `protocol.ts` for actions, and a `table.ts` adapter for the shared host/guest sessions. Hidden information never leaves the host except in the owner's view. An `auto` step handles timed transitions such as sweeping a finished trick.
9. **Storage and rooms** are namespaced by game: `"<slug>cards"` for storage, `roomIdFor` prefixes (`"<slug>cards:<code>"`) for socket rooms, because the socket service is shared with other projects.
10. **Don't fork shared components.** If one almost fits, extend it with a prop (and update §6) rather than copying it.
11. **Check**: works at 360px, no horizontal scroll, keyboard-reachable, reduced motion respected, copy follows §1's voice.

---

## 9. Game-specific table layouts

Tables share the surface, cards and header, but arrange players to suit the game.

| Game | Players | Layout |
| --- | --- | --- |
| 5-3-2 | 3 | Opponents left and right with fanned card backs; trick cards toss from each side; your plate with a target tally above your hand |
| 7-8 | 2 | Opponent across the top; both players' table cards in the middle |
| 7 of Hearts | 3-5 | Opponents as compact `Seat`s in a row above the board, clockwise; four suit runs as vertical columns; your hand is never overlapped and wraps onto extra rows |
| Judgement | 3-6 | Opponents spread on an ellipse around the middle (`ring.ts` gives each seat a direction from the centre); each played card rests and is tossed towards its player; trump badge top left, scores top right, your call panel and fanned hand along the bottom. Uses its own `Plate` (name, called / won, card count, "Starts"/"Leads" tag) because a 16-hand tally doesn't fit `Seat` |

| Steal the Jack | 2-6 | Opponents as compact `Seat`s in a row (dimmed with `isOut` once their hand is empty); a face-up discard pile in the middle; when it's your pick, the other player's backs appear above the pile as seen from across the table (their order reversed); your cards in a straight, draggable line (two rows past 13 cards) with Discard pair / Done / Shuffle above |

`Plate` and the ring layout are Judgement-specific for now; promote them to `components/table/` when a second game needs a seats-around-the-table layout.

---

## 10. Not yet defined

Things no game has needed yet. Decide and record them here when one does:

- Spectator and rejoin states in the lobby
- Scoreboards and end-of-game summaries as a shared component (7 of Hearts and Judgement each have their own sheet in the same panel style)
- Single-player or bot opponents
- Sound and haptics (phones get a short vibration on your turn, nothing more)
- Light theme (the product is deliberately dark-only for now)
