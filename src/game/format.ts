import { CURRENCY } from "./constants";

export function money(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} ${CURRENCY}`;
}
