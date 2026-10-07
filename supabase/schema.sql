-- =====================================================================
-- Monopoly Gasy : schéma Supabase
-- À exécuter dans Supabase > SQL Editor > New query > Run.
-- Le script peut être relancé sans danger (il est idempotent).
--
-- Tout est préfixé « mg_ » / « monopoly-gasy » : le jeu peut donc être installé
-- dans un projet Supabase déjà utilisé par une autre application sans la gêner.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- Une partie = une seule ligne ; tout l'état du jeu est dans `state` (JSON).
-- ---------------------------------------------------------------------
create table if not exists public.mg_games (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  status      text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  version     integer not null default 0,
  state       jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.mg_players (
  game_id       uuid not null references public.mg_games (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  joined_at     timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  primary key (game_id, user_id)
);

create index if not exists mg_players_user_idx on public.mg_players (user_id);
create index if not exists mg_players_last_seen_idx on public.mg_players (last_seen_at);

-- Aucun accès direct depuis le navigateur : seul le serveur Next.js (clé secrète)
-- lit et écrit ces tables. RLS activé sans politique = tout est refusé aux clients.
alter table public.mg_games enable row level security;
alter table public.mg_players enable row level security;

-- ---------------------------------------------------------------------
-- 2. Appartenance à une partie (utilisé par les règles temps réel)
-- ---------------------------------------------------------------------
create or replace function public.mg_is_member(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.mg_players gp
    where gp.user_id = (select auth.uid())
      and 'monopoly-gasy:' || gp.game_id::text = p_topic
  );
$$;

revoke all on function public.mg_is_member(text) from public, anon;
grant execute on function public.mg_is_member(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Signal de présence (« je suis encore là »), appelé chaque minute
--    par chaque navigateur. Renvoie la liste des joueurs absents > 5 min.
-- ---------------------------------------------------------------------
create or replace function public.mg_heartbeat(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_stale uuid[];
begin
  if v_uid is null then
    return jsonb_build_object('ok', false);
  end if;

  update public.mg_players
     set last_seen_at = now()
   where game_id = p_game_id
     and user_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  select coalesce(array_agg(user_id), '{}')
    into v_stale
    from public.mg_players
   where game_id = p_game_id
     and last_seen_at < now() - interval '5 minutes';

  return jsonb_build_object('ok', true, 'stale', to_jsonb(v_stale));
end;
$$;

revoke all on function public.mg_heartbeat(uuid) from public, anon;
grant execute on function public.mg_heartbeat(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Temps réel : canaux privés « monopoly-gasy:<id> » réservés aux joueurs
--    de la partie. Les joueurs peuvent recevoir les messages et signaler leur
--    présence, mais pas diffuser d'état (seul le serveur le fait).
--    Ces règles ne concernent que les canaux du jeu.
-- ---------------------------------------------------------------------
drop policy if exists "monopoly_gasy_receive" on realtime.messages;
create policy "monopoly_gasy_receive"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.mg_is_member((select realtime.topic()))
  );

drop policy if exists "monopoly_gasy_presence" on realtime.messages;
create policy "monopoly_gasy_presence"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and public.mg_is_member((select realtime.topic()))
  );

-- ---------------------------------------------------------------------
-- 5. Nettoyage automatique (toutes les minutes)
--    - parties terminées
--    - parties où plus personne ne s'est manifesté depuis 5 minutes
--    - comptes anonymes créés PAR LE JEU (marqués app = monopoly-gasy),
--      de plus d'un jour et sans partie : les comptes des autres
--      applications du projet ne sont jamais touchés
--    - journal d'exécution de pg_cron (sinon il grossit indéfiniment)
-- ---------------------------------------------------------------------
create or replace function public.mg_cleanup()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.mg_games
   where status = 'finished'
     and updated_at < now() - interval '1 minute';

  delete from public.mg_games g
   where g.updated_at < now() - interval '5 minutes'
     and not exists (
       select 1
         from public.mg_players p
        where p.game_id = g.id
          and p.last_seen_at > now() - interval '5 minutes'
     );

  begin
    delete from auth.users u
     where u.is_anonymous
       and u.raw_user_meta_data ->> 'app' = 'monopoly-gasy'
       and u.created_at < now() - interval '1 day'
       and not exists (select 1 from public.mg_players p where p.user_id = u.id);
  exception when others then
    raise notice 'Nettoyage des comptes anonymes ignoré : %', sqlerrm;
  end;

  begin
    delete from cron.job_run_details where end_time < now() - interval '1 day';
  exception when others then
    raise notice 'Nettoyage du journal pg_cron ignoré : %', sqlerrm;
  end;
end;
$$;

revoke all on function public.mg_cleanup() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Planification avec pg_cron
--    Si cette partie échoue, activez d'abord « Cron » dans
--    Supabase > Integrations (ou Database > Extensions > pg_cron), puis relancez.
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'monopoly-gasy-cleanup',
  '* * * * *',
  $$select public.mg_cleanup();$$
);
