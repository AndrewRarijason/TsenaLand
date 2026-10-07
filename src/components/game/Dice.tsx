"use client";

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

export function Dice({ values, seq }: { values: [number, number]; seq: number }) {
  // La clé change à chaque lancer : l'animation rejoue.
  return (
    <div className="flex gap-[2cqw]" key={seq}>
      <Die value={values[0]} rolling />
      <Die value={values[1]} rolling />
    </div>
  );
}
