// Réglages généraux du jeu. Modifier ici pour changer une valeur partout.

export const CURRENCY = "€";
export const START_CASH = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_POSITION = 10;
export const MAX_JAIL_TURNS = 3;
export const BOARD_SIZE = 40;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const TOTAL_HOUSES = 32;
export const TOTAL_HOTELS = 12;

/** Durée d'une enchère sans nouvelle offre. */
export const AUCTION_START_MS = 15_000;
/** Temps minimum restant après chaque nouvelle offre. */
export const AUCTION_EXTEND_MS = 8_000;

/** Au-delà de ce délai sans signe de vie, un joueur est éliminé. */
export const DISCONNECT_LIMIT_MS = 5 * 60_000;
/** Fréquence du « je suis encore là » envoyé par chaque navigateur. */
export const HEARTBEAT_MS = 60_000;

export const LOG_LIMIT = 80;
export const NAME_MAX_LENGTH = 16;

export const PLAYER_STYLES = [
  { token: "🚗", color: "#dc2626" },
  { token: "🎩", color: "#2563eb" },
  { token: "🐕", color: "#16a34a" },
  { token: "🚢", color: "#9333ea" },
  { token: "👢", color: "#ea580c" },
  { token: "🐈", color: "#0891b2" },
] as const;
