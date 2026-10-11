"use client";

import { useConfirm } from "@/components/confirm";
import { GameHeader, HeaderButton } from "@/components/GameHeader";
import { GameView } from "@/components/game/GameView";
import { TokenPicker } from "@/components/game/TokenPicker";
import { Button, Panel, PlayerChip } from "@/components/ui";
import { MAX_PLAYERS, MIN_PLAYERS, NAME_MAX_LENGTH } from "@/game/constants";
import { TOKENS } from "@/game/tokens";
import type { GameState } from "@/game/types";
import { usePlayerName } from "@/lib/client/playerName";
import { isOnlineConfigured } from "@/lib/client/supabase";
import { useOnlineGame } from "@/lib/client/useOnlineGame";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

export function OnlineGame({ code }: { code: string }) {
  if (!isOnlineConfigured) {
    return (
      <Centered>
        <p className="text-slate-700">Le jeu en ligne n&apos;est pas configuré sur ce serveur (voir le README).</p>
        <HomeLink />
      </Centered>
    );
  }
  return <OnlineGameInner code={code} />;
}

function OnlineGameInner({ code }: { code: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const game = useOnlineGame(code);
  const { state, status, error, member, userId } = game;
  const controlled = useMemo(() => (userId ? [userId] : []), [userId]);

  const leave = async () => {
    const finished = state?.status === "finished";
    if (!finished) {
      const ok = await confirm({
        title: "Quitter la partie ?",
        tone: "danger",
        icon: "🚪",
        message:
          state?.status === "playing" ? (
            <>
              Vous serez <b>éliminé</b> et vos biens retourneront à la Banque.
            </>
          ) : (
            "Vous quitterez le salon."
          ),
        confirmLabel: "Quitter",
      });
      if (!ok) return;
      try {
        await game.send({ type: "leave" });
      } catch {
        // on quitte quand même
      }
    }
    router.push("/");
  };

  if (status === "loading" || (status === "ready" && !state)) {
    return (
      <Centered>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#c8102e]" />
        <p className="text-sm text-slate-600">Chargement de la partie {code}…</p>
      </Centered>
    );
  }

  if (status === "missing" || status === "error" || !state) {
    return (
      <Centered>
        <div className="text-4xl">🔍</div>
        <p className="font-semibold text-slate-800">{error ?? "Partie introuvable."}</p>
        {status === "error" && (
          <Button variant="secondary" onClick={() => game.refresh()}>
            Réessayer
          </Button>
        )}
        <HomeLink />
      </Centered>
    );
  }

  if (!member) {
    const me = userId ? state.players.find((p) => p.id === userId) : undefined;
    if (state.status === "lobby") return <JoinForm state={state} code={code} onJoin={game.join} />;
    return (
      <Centered>
        <div className="text-4xl">🎲</div>
        <p className="font-semibold text-slate-800">
          {me ? "Vous avez été éliminé de cette partie (déconnexion ou départ)." : "Cette partie a déjà commencé."}
        </p>
        <HomeLink />
      </Centered>
    );
  }

  const header = (
    <GameHeader right={<HeaderButton onClick={leave}>{state.status === "finished" ? "Accueil" : "Quitter"}</HeaderButton>}>
      <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-xs font-bold tracking-widest ring-1 ring-white/20">
        {code}
      </span>
      <span
        className={`h-2 w-2 rounded-full ${game.realtimeOk ? "bg-emerald-400 shadow-[0_0_0_3px_rgb(52_211_153/0.25)]" : "animate-pulse bg-amber-400"}`}
        title={game.realtimeOk ? "Connecté en temps réel" : "Connexion temps réel en cours…"}
      />
    </GameHeader>
  );

  if (state.status === "lobby") {
    return <Lobby state={state} code={code} userId={userId!} online={game.online} send={game.send} header={header} />;
  }

  return (
    <GameView
      state={state}
      controlled={controlled}
      send={(action) => game.send(action)}
      now={game.now}
      online={game.online}
      mode="online"
      header={header}
    />
  );
}

function Lobby({
  state,
  code,
  userId,
  online,
  send,
  header,
}: {
  state: GameState;
  code: string;
  userId: string;
  online: Set<string>;
  send: ReturnType<typeof useOnlineGame>["send"];
  header: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isHost = state.hostId === userId;
  const me = state.players.find((p) => p.id === userId);
  const link = typeof window !== "undefined" ? `${window.location.origin}/partie/${code}` : "";
  const takenBy = Object.fromEntries(state.players.filter((p) => p.id !== userId).map((p) => [p.token, p.name]));

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Monopoly Gasy", text: `Rejoins ma partie de Monopoly Gasy (code ${code})`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // partage annulé
    }
  };

  const act = async (action: Parameters<typeof send>[0], failure: string) => {
    setBusy(true);
    setError(null);
    try {
      await send(action);
    } catch (e) {
      setError(e instanceof Error ? e.message : failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-3 py-4">
      {header}
      <Panel className="pop">
        <p className="text-center text-sm font-semibold text-slate-600">Code de la partie</p>
        <p className="my-1 text-center font-mono text-4xl font-black tracking-[0.35em] text-slate-900">{code}</p>
        <Button variant="secondary" className="mt-2 w-full" onClick={share}>
          {copied ? "Lien copié ✓" : "🔗 Partager le lien d'invitation"}
        </Button>
      </Panel>

      <Panel title="Votre pion" icon="♟️" className="pop" accent={me?.color}>
        <TokenPicker
          value={me?.token ?? null}
          takenBy={takenBy}
          disabled={busy}
          onChange={(token) => token !== me?.token && act({ type: "chooseToken", token }, "Impossible de changer de pion.")}
        />
      </Panel>

      <Panel title={`Joueurs (${state.players.length}/${MAX_PLAYERS})`} icon="👥" className="pop">
        <ul className="space-y-2">
          {state.players.map((p) => (
            <li key={p.id} className="fade-in flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${online.has(p.id) ? "bg-emerald-500" : "bg-slate-300"}`} />
                <PlayerChip token={p.token} color={p.color} name={p.name + (p.id === userId ? " (vous)" : "")} size={30} />
              </div>
              {p.id === state.hostId && <span className="text-xs font-bold text-amber-700">👑 Hôte</span>}
            </li>
          ))}
        </ul>
        {isHost ? (
          <Button
            size="lg"
            className={`mt-4 w-full ${state.players.length >= MIN_PLAYERS ? "pulse-cta" : ""}`}
            disabled={busy || state.players.length < MIN_PLAYERS}
            onClick={() => act({ type: "start" }, "Impossible de lancer la partie.")}
          >
            {state.players.length < MIN_PLAYERS ? "En attente d'un autre joueur…" : "Lancer la partie"}
          </Button>
        ) : (
          <p className="mt-4 text-center text-sm text-slate-600">En attente du lancement par l&apos;hôte…</p>
        )}
        {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      </Panel>
    </div>
  );
}

function JoinForm({
  state,
  code,
  onJoin,
}: {
  state: GameState;
  code: string;
  onJoin: (name: string, token?: string) => Promise<void>;
}) {
  const [name, setName] = usePlayerName();
  const takenBy = Object.fromEntries(state.players.map((p) => [p.token, p.name]));
  const [token, setToken] = useState<string>(() => TOKENS.find((t) => !takenBy[t.id])?.id ?? TOKENS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const host = state.players.find((p) => p.id === state.hostId);
  const full = state.players.length >= MAX_PLAYERS;

  const submit = async () => {
    if (!name.trim()) return setError("Choisissez un pseudo.");
    setBusy(true);
    setError(null);
    try {
      await onJoin(name.trim(), takenBy[token] ? undefined : token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de rejoindre.");
      setBusy(false);
    }
  };

  return (
    <Centered>
      <h1 className="text-xl font-black text-slate-900">Rejoindre la partie {code}</h1>
      {host && (
        <p className="text-sm text-slate-600">
          Partie créée par {host.name} · {state.players.length}/{MAX_PLAYERS} joueurs
        </p>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, NAME_MAX_LENGTH))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Votre pseudo"
        maxLength={NAME_MAX_LENGTH}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-[#c8102e]/20"
      />
      <div className="w-full text-left">
        <p className="mb-2 text-sm font-semibold text-slate-700">Choisissez votre pion</p>
        <TokenPicker value={token} takenBy={takenBy} onChange={setToken} disabled={busy} />
      </div>
      <Button size="lg" className="w-full" disabled={busy || full} onClick={submit}>
        {full ? "Partie complète" : busy ? "Connexion…" : "Rejoindre"}
      </Button>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <HomeLink />
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-8">
      <div className="pop flex w-full flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-2xl">
        {children}
      </div>
    </main>
  );
}

function HomeLink() {
  return (
    <Link href="/" className="text-sm font-semibold text-[#c8102e] hover:underline">
      ← Retour à l&apos;accueil
    </Link>
  );
}
