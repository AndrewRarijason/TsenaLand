// Noms des objets Supabase du jeu (voir supabase/schema.sql). Tout est préfixé
// pour pouvoir partager un projet Supabase avec une autre application.

export const GAMES_TABLE = "mg_games";
export const PLAYERS_TABLE = "mg_players";
export const HEARTBEAT_RPC = "mg_heartbeat";

/** Canal temps réel privé d'une partie. */
export const gameTopic = (gameId: string) => `monopoly-gasy:${gameId}`;

/** Marque posée sur les comptes anonymes créés par le jeu (nettoyage ciblé). */
export const APP_TAG = "monopoly-gasy";
