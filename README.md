# CC Card Games

A hub of playing-card games for the browser. Currently: **5-3-2**, a three-player trick-taking game, **7-8**, a two-player one, **7 of Hearts**, for three to five, **Judgement**, for three to six, and **Steal the Jack**, for two to six. The shared look and feel, and how to add a game, are in [DESIGN.md](DESIGN.md).

Built with Next.js (App Router), plain CSS Modules, and the shared Socket.IO room service described in [docs/sop-socket.md](docs/sop-socket.md).

```bash
npm install
npm run dev     # must be served from http://localhost:3000 (the socket service's allowed origin)
```

Pick 5-3-2 on the hub, open a table, send the six-character code (or the invite link) to two friends, and deal.

## How it plays

30 cards: 8 to Ace in four suits, plus the 7 of spades and 7 of hearts. Each round has 10 hands and the three players carry targets of 5, 3 and 2 hands.

1. Everyone gets 5 cards; the player holding the **5** picks trump, then everyone gets 5 more.
2. From round 2, anyone who **won more than their target** trades with anyone who **fell short**, one trade per hand of difference. The taker draws a random card from the other player's hand, sees it, then gives back any card of their own.
3. The 5 leads. Follow suit if you can; highest trump wins, otherwise highest card of the led suit. The winner leads next.
4. After the round the targets rotate: 5 becomes 2, 3 becomes 5, 2 becomes 3. Rounds continue until you stop.

## How 7-8 plays

Same 30-card deck, two players. The **8** wants 8 of the 15 hands, the **7** wants 7, and the roles trade places after every deal.

1. Each player gets 5 cards in hand; the 8 picks trump, then everyone gets five face-down cards with a face-up card on top of each.
2. Play from your hand or any face-up table card; playing a table card flips the card beneath. Follow suit across both. The 8 leads the first hand, winners lead after.
3. Win more than your number and you earn a swap per extra hand: next deal you take either a chosen face-up card or a random hand card from the other player, and give one of yours back.
4. Deals continue until players leave.

## How 7 of Hearts plays

Full 52-card deck dealt out evenly to 3–5 players, over seven rounds.

1. The holder of the **7 of Hearts** opens the round by playing it; play goes clockwise.
2. Play a 7 to open a suit, or extend an open suit one step down or up (Ace low, King high, no wrap). If nothing fits you pass; if something fits you must play.
3. First to empty their hand goes out. Everyone else scores the value of their remaining cards (Ace 1 to King 13).
4. Lowest total after round seven wins. The host can deal once three players are seated; the table then locks to those players.

## How Judgement plays

Three to six players, as many rounds as you like. The full 52-card deck is shuffled and dealt evenly; leftover cards stay face down for the round. The first round deals 17, 13, 10 or 8 cards each (3, 4, 5 or 6 players), then each round deals one fewer down to 1, then one more back up to the first round's size, repeating.

1. Trump is Spades in round 1, then Hearts, Clubs, Diamonds, and round again. Starting with that round's starter, each player **calls** how many hands they will win, from 0 to the cards in their hand. Calls are public and final. The last player to call can't pick the number that makes the calls add up to the hands available, so somebody always misses.
2. The starter leads the first hand and play goes clockwise. Follow the led suit if you can; otherwise play anything. Highest trump wins, else highest card of the led suit. The winner leads next.
3. Win exactly your call and you score 10 plus that number (a call of 0 is worth 10); win more or fewer and you score nothing.
4. The starting seat moves one place clockwise each round. After any round the host can end the game; the highest total wins and a tie is shared.

## How Steal the Jack plays

Two to six players, the 52-card deck without the Jack of Diamonds (51 cards, all dealt). Only losses are counted.

1. One player at a time, everyone discards pairs (same rank, any suits) they pick by hand, then taps Done. Missed pairs are not flagged.
2. Each turn you take one card, blind, from the next player clockwise who still has cards, then discard any pairs and end your turn. You see their cards' backs as if sitting across from them (their order, reversed).
3. The player being picked from can drag their cards into a new order or shuffle; the host resolves the pick by a random card id, so a rearrangement can never change which card was taken.
4. Players with no cards are out and skipped. When one player still holds cards they lose the round (+1 loss); another round keeps the tally.

## Code layout

| Path | What it is |
| --- | --- |
| `app/` | Routes: `/` (the hub), `/games/532` (5-3-2 landing) and `/games/532/room/[code]` (a table). |
| `games/registry.tsx` | The list of games shown on the hub. Add an entry to add a tile. |
| `games/532/game/` | Pure 5-3-2 rules (`engine.ts`), deck (`deck.ts`), and the per-player view projection (`view.ts`). No React, no networking. |
| `games/532/net/`, `games/78/net/` | Each game's actions (`protocol.ts`) and its adapter (`table.ts`) that plugs its rules into the shared sessions. |
| `games/78/`, `games/7hearts/`, `games/judgement/` | 7-8, 7 of Hearts and Judgement: same layout as 5-3-2 (`game/` rules and view, `net/`, `components/`). |
| `lib/net/` | Shared multiplayer: `host.ts` and `guest.ts` sessions, `crypto.ts`, `room.ts` (Socket.IO transport), `wire.ts`, `storage.ts` and the `useTable` hook. |
| `components/table/` | Shared table pieces: `TableShell`, `Seat`, `Lobby`, `TrumpPicker`, `GameHome`, `RoomClient`, `NameGate`. |
| `games/532/components/` | The 5-3-2 table UI: `Table`, `Hand`, `Seat`, `TrickArea`, `Overlays`, `Lobby`, the landing page and rules. |
| `components/ui/` | Shared building blocks every game uses: `GameLanding`, `Panel`, `Button`, `TextField`, `RulesDialog`, `StatusScreen`... |
| `components/cards/` | `PlayingCard` and suit icons, shared by all games. |
| `components/hub/` | The hub landing page and game tiles. |
| `lib/cards/`, `lib/hooks/` | Game-agnostic card types and helpers (including `tricks.ts`: follow-suit and trick-winner rules shared by 5-3-2 and Judgement), and shared React hooks. |

## Multiplayer design

The socket service is a plain broadcast relay: it has no game logic, no authentication, and every message reaches everyone in the room. So:

- **The host's browser is the game server.** It runs the game's engine (`games/<slug>/game/engine.ts`), holds the only copy of the full state (including the undealt cards), and validates every action: whose turn it is, follow-suit, trump, exchanges. Guests only send intents (`play`, `trump`, `give`, `ready`) and render the view they receive.
- **Hands are private.** Each guest and the host agree a key with ECDH (P-256) and every message that carries a view or an action is sealed with AES-GCM. Anyone else in the room, including someone who guesses the room code, sees only ciphertext. A forged action fails to decrypt, so it can't impersonate a player. The first host a guest hears from is pinned for that session.
- **Random draws** for exchanges use `crypto.getRandomValues` on the host; the drawn card is revealed only to the player who earned the exchange.
- **Disconnects.** The host watches the room's `status` events. If a seated player drops mid-game the table pauses; they rejoin by reopening the link (same tab keeps the seat, a new tab can take over a vacant one). Before the game starts a departing player simply frees their seat. If the host drops, guests see a banner and the game resumes when the host reloads (the host's table state is kept in `sessionStorage`). "Leave" by the host ends the table for everyone.
- Guests ask the host for the current view every 5 seconds, so a dropped message can't leave anyone stuck.

### Limits worth knowing

- Because the host runs the game, a determined host could read the full state in their own browser. Players have to trust the host the way they would trust whoever deals at a real table.
- Identity is per browser tab (`sessionStorage`); there are no accounts.
- The socket service only accepts the origins listed in the SOP (`http://localhost:3000`, `http://127.0.0.1:3000`, `https://coffeecoders.cc`).
- Connection settings default to the values in the SOP and can be overridden with `NEXT_PUBLIC_SOCKET_URL` and `NEXT_PUBLIC_SOCKET_PATH`.
