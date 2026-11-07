import type { RandomInt } from "@/lib/cards/cards";
import { RuleError } from "@/lib/cards/rules";
import {
  type Identity,
  deriveSharedKey,
  open,
  samePublicKey,
  seal,
  secureRandomInt,
} from "./crypto";
import { cleanName, uniqueName } from "./names";
import type { RoomConnector, RoomLink } from "./room";
import type { TableStorage } from "./storage";
import type { TableViewOf } from "./view";
import { type CommonAction, type ToGuest, type Wire, parseToHost } from "./wire";

/**
 * Everything the host needs to know about a particular game. The engine is pure: each call
 * returns a new game state or throws a RuleError.
 */
export interface HostEngine<G, GV, A extends { type: string }> {
  /** Seats at the table; seat 0 is the host. */
  seats: number;
  /**
   * Fewest players that can start. Omit when every seat must be filled. Otherwise the host may
   * deal once this many are seated, and empty seats are dropped for the rest of the game.
   */
  minSeats?: number;
  /** When set, the game can only be dealt with exactly one of these many players seated. */
  allowedSeats?: readonly number[];
  /** Shown when the host tries to deal before enough seats are filled. */
  startError: string;
  /** `players` is the number of seats actually filled at the start. */
  newGame(randomInt: RandomInt, players: number): G;
  act(game: G, seat: number, action: A, randomInt: RandomInt): G;
  /** What `seat` is allowed to see of the game. */
  view(game: G, seat: number): GV;
  parseAction(action: Record<string, unknown>): A | null;
  /** A step the table takes by itself after a delay, such as sweeping a finished trick. */
  auto?(game: G): { delayMs: number; run(game: G): G } | null;
}

interface SeatRecord {
  id: string | null;
  name: string | null;
  pk: JsonWebKey | null;
  key: CryptoKey | null;
}

interface Snapshot<G> {
  v: number;
  game: G | null;
  seats: { id: string | null; name: string | null; pk: JsonWebKey | null }[];
}

export interface HostCallbacks<V> {
  onView(view: V): void;
  onConnection(online: boolean): void;
  onNotice(message: string): void;
}

export interface HostOptions<G, GV, A extends { type: string }> {
  engine: HostEngine<G, GV, A>;
  storage: TableStorage;
  code: string;
  identity: Identity;
  name: string;
  connect: RoomConnector;
  callbacks: HostCallbacks<TableViewOf<GV>>;
  randomInt?: RandomInt;
  /** Save the table to sessionStorage so a page refresh can resume it. */
  persist?: boolean;
}

const isCommon = (action: { type: string }): action is CommonAction =>
  action.type === "start" || action.type === "leave" || action.type === "sync";

const emptySeat = (): SeatRecord => ({ id: null, name: null, pk: null, key: null });

/**
 * The host's browser is the game server. It owns the only copy of the full game state,
 * validates every action with the engine, and sends each player only their own view,
 * sealed so that nobody else in the shared room can read it.
 */
export class HostSession<G, GV, A extends { type: string }> {
  private seats: SeatRecord[];
  private game: G | null = null;
  private v = 0;
  private present = new Set<string>();
  private link: RoomLink | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private readonly randomInt: RandomInt;

  constructor(private readonly opts: HostOptions<G, GV, A>) {
    this.randomInt = opts.randomInt ?? secureRandomInt;
    this.seats = Array.from({ length: opts.engine.seats }, emptySeat);
    this.seats[0] = {
      id: opts.identity.id,
      name: cleanName(opts.name),
      pk: opts.identity.pub,
      key: null,
    };
    this.restore();
  }

  start() {
    this.link = this.opts.connect({
      onConnect: () => {
        this.opts.callbacks.onConnection(true);
        this.announce();
        this.publish();
      },
      onDisconnect: () => this.opts.callbacks.onConnection(false),
      onStatus: (users) => this.handleStatus(users),
      onWire: (wire) => void this.handleWire(wire),
    });
  }

  /** Drops the connection but keeps the table, so a refresh can resume it. */
  stop() {
    this.stopped = true;
    this.clearTimer();
    this.link?.close();
    this.link = null;
  }

  /** Ends the table for everyone. */
  async close() {
    const sends = this.seats.map((s, i) => (i > 0 && s.id ? this.sendTo(i, { k: "closed" }) : null));
    await Promise.all(sends);
    this.opts.storage.clearTable(this.opts.code);
    this.stop();
  }

  /** The host's own moves go through the same validation path as everyone else's. */
  act(action: A | CommonAction) {
    this.handleAction(0, action);
  }

  // ------------------------------------------------------------ persistence

  private restore() {
    if (!this.opts.persist) return;
    const saved = this.opts.storage.loadSnapshot(this.opts.code) as Snapshot<G> | null;
    if (!saved || saved.seats?.[0]?.id !== this.opts.identity.id) return;
    this.v = saved.v;
    this.game = saved.game;
    // A game dealt with fewer than the maximum seats was saved without the empty ones.
    if (saved.game) this.seats = this.seats.slice(0, saved.seats.length);
    saved.seats.forEach((s, i) => {
      if (i > 0) this.seats[i] = { id: s.id, name: s.name, pk: s.pk, key: null };
    });
  }

  private persist() {
    if (!this.opts.persist) return;
    const snapshot: Snapshot<G> = {
      v: this.v,
      game: this.game,
      seats: this.seats.map(({ id, name, pk }) => ({ id, name, pk })),
    };
    this.opts.storage.saveSnapshot(this.opts.code, snapshot);
  }

  // ------------------------------------------------------------------ state

  private isConnected(seat: number): boolean {
    const id = this.seats[seat].id;
    return id !== null && (seat === 0 || this.present.has(id));
  }

  private get paused(): boolean {
    return this.game !== null && this.seats.some((_, i) => !this.isConnected(i));
  }

  private viewFor(seat: number): TableViewOf<GV> {
    return {
      v: this.v,
      code: this.opts.code,
      you: seat,
      seats: this.seats.map((s, i) => ({ name: s.name, connected: this.isConnected(i) })),
      game: this.game ? this.opts.engine.view(this.game, seat) : null,
      paused: this.paused,
    };
  }

  /** Sends every connected player their own view and arms any automatic step. */
  private publish() {
    if (this.stopped) return;
    this.v += 1;
    this.persist();
    this.opts.callbacks.onView(this.viewFor(0));
    for (let seat = 1; seat < this.seats.length; seat++) {
      if (this.seats[seat].id && this.isConnected(seat)) {
        void this.sendTo(seat, { k: "view", view: this.viewFor(seat) });
      }
    }
    this.scheduleAuto();
  }

  private scheduleAuto() {
    if (this.timer || !this.game || this.paused) return;
    const step = this.opts.engine.auto?.(this.game);
    if (!step) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.stopped || !this.game || this.paused) return;
      // The game may have moved on while we waited; only run the step that was scheduled.
      const current = this.opts.engine.auto?.(this.game);
      if (!current) return;
      this.game = current.run(this.game);
      this.publish();
    }, step.delayMs);
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  // ---------------------------------------------------------------- sending

  private announce() {
    const { identity } = this.opts;
    this.link?.send({ t: "host", id: identity.id, pk: identity.pub });
  }

  private async keyFor(seat: number): Promise<CryptoKey | null> {
    const rec = this.seats[seat];
    if (!rec.pk) return null;
    rec.key ??= await deriveSharedKey(this.opts.identity.priv, rec.pk);
    return rec.key;
  }

  private async sendTo(seat: number, payload: ToGuest<TableViewOf<GV>>) {
    const to = this.seats[seat].id;
    const key = await this.keyFor(seat);
    if (!to || !key || !this.link) return;
    const box = await seal(key, payload);
    this.link?.send({ t: "box", from: this.opts.identity.id, to, ...box });
  }

  private notify(seat: number, message: string) {
    if (seat === 0) this.opts.callbacks.onNotice(message);
    else void this.sendTo(seat, { k: "error", message });
  }

  // --------------------------------------------------------------- receiving

  private handleStatus(users: string[]) {
    const next = new Set(users);
    const changed = next.size !== this.present.size || users.some((u) => !this.present.has(u));
    this.present = next;
    if (!this.game) {
      // Before the game starts a vanished guest simply gives up their seat.
      for (let i = 1; i < this.seats.length; i++) {
        const id = this.seats[i].id;
        if (id && !next.has(id)) this.seats[i] = emptySeat();
      }
    }
    if (changed) this.publish();
  }

  private async handleWire(wire: Wire) {
    if (wire.t === "hello") this.handleHello(wire);
    else if (wire.t === "box" && wire.to === this.opts.identity.id) await this.handleBox(wire);
  }

  private handleHello(hello: Extract<Wire, { t: "hello" }>) {
    const { identity } = this.opts;
    if (hello.id === identity.id) return;
    const known = this.seats.findIndex((s) => s.id === hello.id);
    if (known >= 0) {
      // A returning player must hold the same key, otherwise anyone could claim their seat.
      const pk = this.seats[known].pk;
      if (!pk || !samePublicKey(pk, hello.pk)) return;
    } else {
      let slot = this.seats.findIndex((s, i) => i > 0 && s.id === null);
      // Mid-game, a newcomer may take over a seat whose player has dropped (e.g. a lost tab).
      if (slot < 0 && this.game) slot = this.seats.findIndex((_, i) => i > 0 && !this.isConnected(i));
      if (slot < 0) {
        this.link?.send({ t: "full", to: hello.id });
        return;
      }
      const others = this.seats.filter((_, i) => i !== slot).map((s) => s.name);
      this.seats[slot] = {
        id: hello.id,
        name: uniqueName(cleanName(hello.name), others),
        pk: hello.pk,
        key: null,
      };
    }
    this.present.add(hello.id);
    this.link?.send({ t: "host", id: identity.id, pk: identity.pub, to: hello.id });
    this.publish();
  }

  private async handleBox(box: Extract<Wire, { t: "box" }>) {
    const seat = this.seats.findIndex((s, i) => i > 0 && s.id === box.from);
    if (seat < 0) return;
    const key = await this.keyFor(seat);
    if (!key) return;
    const message = parseToHost(await open(key, box), this.opts.engine.parseAction);
    // A forged sender fails to decrypt; a replayed action is harmless because the engine re-validates it.
    if (message && this.seats[seat].id === box.from) this.handleAction(seat, message.action);
  }

  // ---------------------------------------------------------------- actions

  private handleAction(seat: number, action: A | CommonAction) {
    try {
      this.apply(seat, action);
    } catch (error) {
      if (error instanceof RuleError) this.notify(seat, error.message);
      else throw error;
    }
  }

  private apply(seat: number, action: A | CommonAction) {
    const { engine } = this.opts;
    if (isCommon(action) && action.type === "leave") {
      this.leave(seat);
      return;
    }
    if (isCommon(action) && action.type === "sync") {
      if (seat !== 0) void this.sendTo(seat, { k: "view", view: this.viewFor(seat) });
      return;
    }
    if (isCommon(action) && action.type === "start") {
      if (seat !== 0) throw new RuleError("Only the host can start the game.");
      if (this.game) throw new RuleError("The game has already started.");
      const seated = this.seats.filter((s) => s.id !== null).length;
      const needed = engine.minSeats ?? this.seats.length;
      if (engine.allowedSeats && !engine.allowedSeats.includes(seated)) throw new RuleError(engine.startError);
      if (seated < needed || !this.seats.every((s, i) => s.id === null || this.isConnected(i))) {
        throw new RuleError(engine.startError);
      }
      this.seats = this.seats.filter((s) => s.id !== null);
      this.game = engine.newGame(this.randomInt, this.seats.length);
      this.publish();
      return;
    }
    if (!this.game) throw new RuleError("The game hasn't started.");
    if (this.paused) throw new RuleError("Waiting for a player to come back.");

    this.game = engine.act(this.game, seat, action as A, this.randomInt);
    this.publish();
  }

  private leave(seat: number) {
    if (seat === 0) return; // the host ends the table with close()
    const { name } = this.seats[seat];
    // Mid-game the seat keeps its name so the table can pause and wait for a replacement.
    this.seats[seat] = this.game ? { id: null, name, pk: null, key: null } : emptySeat();
    this.publish();
  }
}
