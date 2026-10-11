"use client";

import { BOARD_SIZE } from "@/game/constants";
import type { DeckName, GameEvent, GameState } from "@/game/types";
import { useEffect, useState, useSyncExternalStore } from "react";

// Rejoue les événements d'un coup (dés, déplacement case par case, carte tirée)
// avant d'afficher le nouvel état : le pion avance réellement d'une case à l'autre,
// et l'achat ou le loyer n'apparaissent qu'une fois le pion arrivé.

const STEP_MS = 210;
const FAST_STEP_MS = 70;
const DICE_MS = 700;
const OTHER_CARD_MS = 4000;

export interface CardPrompt {
  event: Extract<GameEvent, { kind: "card" }>;
  deck: DeckName;
  /** Carte tirée par un joueur de cet écran : il doit l'ouvrir lui-même. */
  mine: boolean;
  revealed: boolean;
}

export interface PlaybackSnapshot {
  /** État à afficher (l'ancien tant que l'animation n'est pas finie). */
  view: GameState | null;
  /** Positions affichées pendant l'animation. */
  positions: Record<string, number>;
  movingId: string | null;
  jumpingId: string | null;
  dice: [number, number] | null;
  diceKey: number;
  card: CardPrompt | null;
  busy: boolean;
}

const actualPositions = (s: GameState) => Object.fromEntries(s.players.map((p) => [p.id, p.position]));

class Playback {
  private snapshot: PlaybackSnapshot = {
    view: null,
    positions: {},
    movingId: null,
    jumpingId: null,
    dice: null,
    diceKey: 0,
    card: null,
    busy: false,
  };
  private listeners = new Set<() => void>();
  private latest: GameState | null = null;
  private lastSeq: number | null = null;
  private queue: GameEvent[] = [];
  private running = false;
  private attached = false;
  private controlled: string[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private wake: (() => void) | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<PlaybackSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  attach() {
    this.attached = true;
    if (this.queue.length) void this.run();
    else if (this.latest && this.snapshot.busy) this.finish(this.latest);
    return () => {
      this.attached = false;
      this.timers.forEach(clearTimeout);
      this.timers.clear();
      this.wake?.();
    };
  }

  setControlled(ids: string[]) {
    this.controlled = ids;
  }

  sync(state: GameState) {
    this.latest = state;
    const seq = state.eventSeq ?? 0;
    const events = state.events ?? [];
    // Premier affichage, ou nouvelle partie : pas d'animation rétroactive.
    if (this.lastSeq === null || seq < this.lastSeq) {
      this.lastSeq = seq;
      this.queue = [];
      this.set({ view: state, positions: actualPositions(state), dice: state.dice, card: null });
      return;
    }
    const prev = this.lastSeq;
    const fresh = events.filter((e) => e.seq > prev);
    this.lastSeq = seq;
    // Événements manqués (onglet en veille…) : on saute directement au résultat.
    const gap = fresh.length > 0 && fresh[0].seq > prev + 1;
    if (gap || fresh.length > 30) {
      this.queue = [];
      this.set({ view: state, positions: actualPositions(state), dice: state.dice });
      return;
    }
    if (fresh.length) {
      this.queue.push(...fresh);
      void this.run();
    } else if (!this.running) {
      this.set({ view: state, positions: actualPositions(state) });
    }
  }

  openCard() {
    if (this.snapshot.card) this.set({ card: { ...this.snapshot.card, revealed: true } });
  }

  closeCard() {
    this.wake?.();
  }

  private fast() {
    return typeof document !== "undefined" && document.visibilityState === "hidden";
  }

  private wait(ms: number) {
    if (this.fast()) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const id = setTimeout(() => {
        this.timers.delete(id);
        resolve();
      }, ms);
      this.timers.add(id);
    });
  }

  private async run() {
    if (this.running || !this.attached) return;
    this.running = true;
    this.set({ busy: true });
    try {
      while (this.queue.length && this.attached) {
        const e = this.queue.shift()!;
        if (e.kind === "roll") {
          this.set({ dice: e.dice, diceKey: this.snapshot.diceKey + 1 });
          await this.wait(DICE_MS);
        } else if (e.kind === "move") {
          await this.move(e);
        } else {
          await this.showCard(e);
        }
      }
    } finally {
      this.running = false;
      if (this.attached && this.latest) this.finish(this.latest);
    }
  }

  private finish(state: GameState) {
    this.set({
      busy: false,
      view: state,
      positions: actualPositions(state),
      movingId: null,
      jumpingId: null,
      card: null,
    });
  }

  private async move(e: Extract<GameEvent, { kind: "move" }>) {
    const setPos = (pos: number) => this.set({ positions: { ...this.snapshot.positions, [e.playerId]: pos } });
    if (e.mode === "jump") {
      this.set({ jumpingId: e.playerId });
      setPos(e.to);
      await this.wait(650);
      this.set({ jumpingId: null });
      return;
    }
    const dir = e.mode === "forward" ? 1 : -1;
    const step = this.queue.length > 6 ? FAST_STEP_MS : STEP_MS;
    let pos = e.from;
    this.set({ movingId: e.playerId });
    while (pos !== e.to && this.attached) {
      pos = (pos + dir + BOARD_SIZE) % BOARD_SIZE;
      setPos(pos);
      await this.wait(step);
    }
    this.set({ movingId: null });
    await this.wait(180);
  }

  private async showCard(e: Extract<GameEvent, { kind: "card" }>) {
    const mine = this.controlled.includes(e.playerId);
    if (!mine && this.fast()) return;
    this.set({ card: { event: e, deck: e.deck, mine, revealed: !mine } });
    await new Promise<void>((resolve) => {
      this.wake = () => {
        this.wake = null;
        resolve();
      };
      if (!mine) {
        const id = setTimeout(() => this.wake?.(), OTHER_CARD_MS);
        this.timers.add(id);
      }
    });
    this.set({ card: null });
    await this.wait(150);
  }
}

/** Animation des coups pour un écran de jeu. */
export function usePlayback(state: GameState, controlled: string[]) {
  const [playback] = useState(() => new Playback());
  const snap = useSyncExternalStore(playback.subscribe, playback.getSnapshot, playback.getSnapshot);

  useEffect(() => playback.attach(), [playback]);
  useEffect(() => {
    playback.setControlled(controlled);
    playback.sync(state);
  }, [playback, state, controlled]);

  return {
    ...snap,
    view: snap.view ?? state,
    positions: snap.view ? snap.positions : actualPositions(state),
    dice: snap.view ? snap.dice : state.dice,
    openCard: () => playback.openCard(),
    closeCard: () => playback.closeCard(),
  };
}
