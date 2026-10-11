"use client";

import { useEffect, useState } from "react";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div className={`die${rolling ? " rolling" : ""}`} aria-label={`Dé : ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={PIPS[value]?.includes(i) ? "pip" : ""} />
      ))}
    </div>
  );
}

const face = () => 1 + Math.floor(Math.random() * 6);

/** Les faces défilent pendant le lancer, puis s'arrêtent sur le résultat. */
function RollingDice({ values, animate }: { values: [number, number]; animate: boolean }) {
  const [faces, setFaces] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!animate) return;
    const tick = setInterval(() => setFaces([face(), face()]), 70);
    const stop = setTimeout(() => {
      clearInterval(tick);
      setFaces(null);
    }, 560);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
  }, [animate]);

  const shown = faces ?? values;
  const rolling = faces !== null;
  return (
    <div className={`dice-pair${values[0] === values[1] && !rolling && animate ? " double" : ""}`}>
      <Die value={shown[0]} rolling={rolling} />
      <Die value={shown[1]} rolling={rolling} />
    </div>
  );
}

export function Dice({ values, rollKey }: { values: [number, number]; rollKey: number }) {
  // La clé change à chaque lancer : l'animation rejoue.
  return <RollingDice key={rollKey} values={values} animate={rollKey > 0} />;
}
