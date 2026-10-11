# Monopoly Gasy

Le Monopoly classique (règles officielles, prix et loyers inchangés), avec les rues d'Antananarivo,
les gares routières, Jirama Jiro / Jirama Rano et Tsiafahy. Jouable dans un navigateur, sur
ordinateur comme sur mobile.

- **En ligne** : 2 à 6 joueurs, un code ou un lien d'invitation, pas d'inscription (pseudo seulement).
- **En local** : plusieurs joueurs sur le même appareil, sans connexion ni base de données.
- **Pions au choix** (voiture, chien, bateau, char, chapeau, botte, chat, brouette), déplacement animé case
  par case, cartes Chance / Caisse de communauté à ouvrir, confirmations avant hypothèque.

Stack : Next.js 16 (App Router, TypeScript, Tailwind) · Supabase (Postgres, Realtime, Auth anonyme, pg_cron) · Vercel.

---

## 1. Installation locale

Prérequis : Node.js 20 ou plus récent, npm.

```bash
npm install
cp .env.example .env.local   # puis remplir les 3 variables (voir étape 2)
npm run dev                  # http://localhost:3000
```

Sans variables Supabase, seul le mode local (`/local`) fonctionne.

Commandes utiles : `npm test` (tests du moteur de jeu), `npm run lint`, `npm run build`.

## 2. Configuration Supabase (plan gratuit)

> **Déjà 2 projets actifs ?** Le plan gratuit limite à 2 projets *actifs*. Deux solutions :
> - **Mettre en pause** un projet inutilisé (*Project Settings → General → Pause project*) : un projet en
>   pause ne compte plus dans la limite, et on peut le relancer plus tard.
> - **Installer le jeu dans un projet existant** : tout est préfixé (`mg_games`, `mg_players`, `mg_…`,
>   canaux `monopoly-gasy:…`) et le nettoyage ne supprime que les comptes anonymes créés par le jeu. Dans
>   ce cas, sautez l'étape 1 et, à l'étape 4, **laissez** *Allow public access* activé si l'autre
>   application utilise Realtime.

1. **Créer le projet** sur [supabase.com](https://supabase.com) → *New project*. Région conseillée :
   **West EU (Paris)**, la plus proche de Madagascar parmi les régions proposées.
2. **Activer la connexion anonyme** : *Authentication → Sign In / Providers* → activer
   **Allow anonymous sign-ins** → *Save*.
3. **Créer les tables, fonctions, règles et le nettoyage automatique** : *SQL Editor → New query*,
   coller tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) puis **Run**.
   - Si la dernière partie (pg_cron) échoue : *Integrations → Cron → Enable* (ou *Database → Extensions →
     pg_cron*), puis relancer le script (il peut être relancé sans risque).
   - Vérification : *Integrations → Cron → Jobs* doit afficher `monopoly-gasy-cleanup` (toutes les minutes).
4. **Temps réel privé** (recommandé) : *Realtime → Settings* → désactiver **Allow public access**, puis
   enregistrer. Seuls les joueurs d'une partie peuvent alors écouter son canal.
5. **Récupérer les clés** : *Project Settings → API Keys*.
   - `Publishable key` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `Secret key` → `SUPABASE_SECRET_KEY` (à garder secrète)
   - L'URL du projet (`https://xxxx.supabase.co`, visible dans *Project Settings → Data API*) →
     `NEXT_PUBLIC_SUPABASE_URL`
   - Les anciennes clés `anon` / `service_role` (onglet *Legacy API Keys*) fonctionnent aussi.

## 3. Déploiement sur Vercel

1. Pousser le projet sur GitHub.
2. Sur [vercel.com](https://vercel.com) : *Add New → Project* → importer le dépôt (framework détecté : Next.js).
3. Dans *Environment Variables*, ajouter les 3 variables de `.env.example` avec les valeurs de l'étape 2.
4. *Deploy*. Les fonctions serveur tournent à Paris (`cdg1`, voir `vercel.json`), près de la base Supabase.
5. Après un changement de variables : *Deployments → … → Redeploy*.

## 4. Fonctionnement et économie de la base

- **Une partie = une seule ligne** (`mg_games.state`, JSON). Chaque coup = 1 lecture + 1 écriture.
- Le serveur Next.js est l'**arbitre** : il lance les dés et vérifie les règles (impossible de tricher
  depuis le navigateur). Il diffuse ensuite le nouvel état via **Supabase Realtime**, sans passer par la base.
- **Présence** : chaque navigateur envoie un signal toutes les minutes.
  - Un joueur qui revient **en moins de 5 minutes** retrouve sa partie (même navigateur).
  - Au-delà de 5 minutes, il est **éliminé** et ses biens retournent à la Banque ; les autres continuent.
  - Si **plus personne** ne se manifeste pendant 5 minutes, la partie est supprimée.
- **Nettoyage automatique** (pg_cron, chaque minute) : parties terminées, parties abandonnées, comptes
  anonymes créés par le jeu (plus d'un jour, sans partie), et journal de pg_cron.

### Limites du plan gratuit à connaître

- Supabase met en **pause** un projet inactif pendant 7 jours : il faut alors cliquer sur *Restore* dans
  le tableau de bord.
- Environ 200 connexions temps réel simultanées (soit environ 200 joueurs en même temps).
- Vercel Hobby est réservé à un **usage non commercial**.

## 5. Personnaliser

| Quoi | Où |
|---|---|
| Noms des rues / quartiers | `src/game/board.ts` (les cartes reprennent automatiquement les nouveaux noms) |
| Textes des cartes Chance / Caisse de communauté | `src/game/cards.ts` |
| Argent de départ, monnaie, nombre de joueurs, délais | `src/game/constants.ts` |
| Pions (nom, couleur) | `src/game/tokens.ts` (dessins : `src/components/tokens.tsx`) |
| Illustrations (taxi-brousse, Jirama…) | `src/components/icons.tsx` |
| Vitesse des animations | `src/lib/client/playback.ts` (`STEP_MS`, `DICE_MS`) |

Les noms de rues ont été vérifiés sur OpenStreetMap ; vérifiez-les aussi sur Google Maps si besoin.

## 6. Écarts assumés avec la règle officielle

- Une faillite envers la Banque (ou une élimination pour déconnexion) rend les propriétés à la Banque,
  libres à l'achat, au lieu de les mettre aux enchères une par une.
- Les enchères sont minutées (15 s, prolongées à chaque offre) pour ne bloquer personne en ligne.
