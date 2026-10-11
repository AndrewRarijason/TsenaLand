"use client";

import { TokenBadge } from "@/components/tokens";
import { Button } from "@/components/ui";
import { MAX_PLAYERS, NAME_MAX_LENGTH } from "@/game/constants";
import { TOKENS } from "@/game/tokens";
import { api } from "@/lib/client/api";
import { usePlayerName } from "@/lib/client/playerName";
import { isOnlineConfigured } from "@/lib/client/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = usePlayerName();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return setError("Choisissez d'abord un pseudo.");
    setBusy(true);
    setError(null);
    try {
      const res = await api.createGame(name.trim());
      router.push(`/partie/${res.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
      setBusy(false);
    }
  };

  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return setError("Entrez le code donné par l'hôte.");
    router.push(`/partie/${c}`);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="mx-auto inline-block -rotate-6 border-4 border-white bg-[#c8102e] px-6 py-3 text-white shadow-2xl outline outline-2 outline-[#7f1d1d]">
          <div className="text-4xl font-black tracking-widest sm:text-5xl">MONOPOLY</div>
          <div className="text-lg font-black tracking-[0.6em]">GASY</div>
        </div>
        <p className="mt-6 text-sm font-medium text-emerald-50/90">Le Monopoly des rues d&apos;Antananarivo, en ligne.</p>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {TOKENS.map((t, i) => (
            <span key={t.id} className="token-selected" style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}>
              <TokenBadge token={t.id} color={t.color} size={30} />
            </span>
          ))}
        </div>
      </div>

      <section className="pop w-full rounded-3xl bg-white p-5 shadow-2xl">
        <label className="block text-sm font-semibold text-slate-700">
          Votre pseudo
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX_LENGTH))}
            placeholder="ex. Rakoto"
            maxLength={NAME_MAX_LENGTH}
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-[#c8102e]/20"
          />
        </label>

        {isOnlineConfigured ? (
          <>
            <Button size="lg" className="mt-4 w-full" disabled={busy} onClick={create}>
              {busy ? "Création…" : "Créer une partie en ligne"}
            </Button>

            <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              ou rejoindre
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && join()}
                placeholder="CODE"
                maxLength={8}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.3em] text-slate-900 uppercase outline-none focus:border-[#c8102e]"
              />
              <Button variant="secondary" size="lg" onClick={join}>
                Rejoindre
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            Le jeu en ligne n&apos;est pas encore configuré (variables Supabase manquantes, voir le README). Le mode local
            reste disponible.
          </p>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

        <Link
          href="/local"
          className="mt-4 block rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          📱 Jouer à plusieurs sur cet appareil
        </Link>
      </section>

      <ul className="w-full space-y-1 text-xs text-emerald-50/80">
        <li>• De 2 à {MAX_PLAYERS} joueurs, sans inscription : un pseudo suffit.</li>
        <li>• Partagez le code ou le lien de la partie à vos amis.</li>
        <li>• Fermé par erreur ? Revenez dans les 5 minutes pour reprendre votre partie.</li>
      </ul>
    </main>
  );
}
