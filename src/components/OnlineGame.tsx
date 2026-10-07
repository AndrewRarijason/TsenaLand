"use client";

import { GameHeader, HeaderButton } from "@/components/GameHeader";
import { GameView } from "@/components/game/GameView";
import { Button, Panel, PlayerChip } from "@/components/ui";
import { MAX_PLAYERS, MIN_PLAYERS, NAME_MAX_LENGTH } from "@/game/constants";
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
  const game = useOnlineGame(code);
  const { state, status, error, member, userId } = game;
  const controlled = useMemo(() => (userId ? [userId] : []), [userId]);

  const leave = async () => {
    const finished = state?.status === "finished";
    const msg =
      state?.status === "playing"
        ? "Quitter la partie ? Vous serez éliminé et vos biens retourneront à la Banque."
        : "Quitter la partie ?";
    if (!finished && !confirm(msg)) return;
    if (!finished) {
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#c8102e]" />
        <p className="text-sm text-slate-600">Chargement de la partie {code}…</p>
      </Centered>
    );
  }

  if (status === "missing" || status === "error" || !state) {
    return (
      <Centered>
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
        className={`h-2 w-2 rounded-full ${game.realtimeOk ? "bg-emerald-400" : "bg-amber-400"}`}
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
  const link = typeof window !== "undefined" ? `${window.location.origin}/partie/${code}` : "";

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

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await send({ type: "start" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de lancer la partie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-3 py-4">
      {header}
      <Panel>
        <p className="text-center text-sm font-semibold text-slate-600">Code de la partie</p>
        <p className="my-1 text-center font-mono text-4xl font-black tracking-[0.35em] text-slate-900">{code}</p>
        <Button variant="secondary" className="mt-2 w-full" onClick={share}>
          {copied ? "Lien copié ✓" : "🔗 Partager le lien d'invitation"}
        </Button>
      </Panel>
      <Panel title={`Joueurs (${state.players.length}/${MAX_PLAYERS})`}>
        <ul className="space-y-2">
          {state.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${online.has(p.id) ? "bg-emerald-500" : "bg-slate-300"}`} />
                <PlayerChip token={p.token} color={p.color} name={p.name + (p.id === userId ? " (vous)" : "")} />
              </div>
              {p.id === state.hostId && <span className="text-xs font-bold text-amber-700">Hôte</span>}
            </li>
          ))}
        </ul>
        {isHost ? (
          <Button size="lg" className="mt-4 w-full" disabled={busy || state.players.length < MIN_PLAYERS} onClick={start}>
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

function JoinForm({ state, code, onJoin }: { state: GameState; code: string; onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = usePlayerName();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const host = state.players.find((p) => p.id === state.hostId);

  const submit = async () => {
    if (!name.trim()) return setError("Choisissez un pseudo.");
    setBusy(true);
    setError(null);
    try {
      await onJoin(name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de rejoindre.");
      setBusy(false);
    }
  };

  return (
    <Centered>
      <h1 className="text-xl font-black text-slate-900">Rejoindre la partie {code}</h1>
      {host && <p className="text-sm text-slate-600">Partie créée par {host.name} · {state.players.length}/{MAX_PLAYERS} joueurs</p>}
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, NAME_MAX_LENGTH))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Votre pseudo"
        maxLength={NAME_MAX_LENGTH}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900"
      />
      <Button size="lg" className="w-full" disabled={busy || state.players.length >= MAX_PLAYERS} onClick={submit}>
        {state.players.length >= MAX_PLAYERS ? "Partie complète" : busy ? "Connexion…" : "Rejoindre"}
      </Button>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <HomeLink />
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
      <div className="flex w-full flex-col items-center gap-3 rounded-3xl bg-white/95 p-6 text-center shadow-2xl">{children}</div>
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
