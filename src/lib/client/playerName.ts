"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "monopoly-gasy-name";
const listeners = new Set<() => void>();
let memory: string | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(): string {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/** Pseudo mémorisé dans le navigateur pour ne pas le retaper à chaque partie. */
export function usePlayerName() {
  const name = useSyncExternalStore(subscribe, read, () => "");
  const update = useCallback((value: string) => {
    memory = value;
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // stockage indisponible : on garde la valeur en mémoire
    }
    listeners.forEach((l) => l());
  }, []);
  return [name, update] as const;
}
