-- Étape 1 : préparation de la connexion sécurisée.
-- Sans effet sur le site actuel : ajoute des colonnes et des fonctions,
-- ne retire aucun accès. À appliquer AVANT la mise en ligne du nouveau code.

-- ── Lien entre un membre et son compte de connexion Supabase Auth ──
alter table public.users add column if not exists auth_id uuid unique references auth.users(id) on delete set null;
alter table public.users add column if not exists claim_attempts integer not null default 0;

-- ── Secrets hors API (schéma non exposé par PostgREST) ──
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.secrets (name text primary key, value text not null);
revoke all on private.secrets from public, anon, authenticated;
insert into private.secrets (name, value) values
  ('notify_secret', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  ('admin_claim_code', upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)))
on conflict (name) do nothing;

-- ── Envoi de notifications depuis la base (triggers, cron) ──
create or replace function private.send_push(p_targets jsonb, p_title text, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_targets is null or jsonb_array_length(p_targets) = 0 then return; end if;
  perform net.http_post(
    url := 'https://incomparable-profiterole-678573.netlify.app/.netlify/functions/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', (select value from private.secrets where name = 'notify_secret')
    ),
    body := jsonb_build_object('player_ids', p_targets, 'title', p_title, 'message', p_message)
  );
end $$;
revoke all on function private.send_push(jsonb, text, text) from public, anon, authenticated;

create or replace function public.notify_slot_released()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.booked_by is not null and new.booked_by is null then
    perform private.send_push(
      (select jsonb_agg(onesignal_id) from public.users where onesignal_id is not null and notif_released is not false),
      'Créneau libéré',
      'Un créneau vient de se libérer le ' || to_char(to_date(new.date, 'YYYY-MM-DD'), 'DD/MM') || ' à ' || new.time
    );
  end if;
  return new;
end $$;

create or replace function public.notify_slots_visible_batch_ins()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cnt integer;
begin
  select count(*) into cnt from new_table where visible = true and coalesce(is_manual, false) = false;
  if cnt = 0 then return null; end if;
  perform private.send_push(
    (select jsonb_agg(onesignal_id) from public.users where onesignal_id is not null and notif_available is not false and is_admin is not true),
    case when cnt = 1 then 'Nouveau créneau disponible' else cnt || ' nouveaux créneaux disponibles' end,
    'De nouveaux créneaux viennent d''être publiés, réservez vite !'
  );
  return null;
end $$;

create or replace function public.notify_slots_visible_batch_upd()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cnt integer;
begin
  select count(*) into cnt
  from new_table n join old_table o on o.id = n.id
  where n.visible = true and (o.visible is distinct from true) and coalesce(n.is_manual, false) = false;
  if cnt = 0 then return null; end if;
  perform private.send_push(
    (select jsonb_agg(onesignal_id) from public.users where onesignal_id is not null and notif_available is not false and is_admin is not true),
    case when cnt = 1 then 'Nouveau créneau disponible' else cnt || ' nouveaux créneaux disponibles' end,
    'De nouveaux créneaux viennent d''être publiés, réservez vite !'
  );
  return null;
end $$;

select cron.alter_job(jobid, command := $cmd$
  do $do$
  declare r record;
  begin
    for r in
      select s.id, s.time, u.onesignal_id
      from public.slots s join public.users u on u.id = s.booked_by
      where s.reminder_morning_sent = false
        and u.onesignal_id is not null and u.notif_reminder is not false
        and s.date = to_char((now() at time zone 'Europe/Paris'), 'YYYY-MM-DD')
        and (now() at time zone 'Europe/Paris')::time >= time '07:00'
    loop
      perform private.send_push(jsonb_build_array(r.onesignal_id), 'Rendez-vous aujourd''hui',
        'Rappel : vous avez rendez-vous aujourd''hui à ' || r.time);
      update public.slots set reminder_morning_sent = true where id = r.id;
    end loop;

    for r in
      select s.id, s.time, u.onesignal_id
      from public.slots s join public.users u on u.id = s.booked_by
      where s.reminder_30min_sent = false
        and u.onesignal_id is not null and u.notif_reminder is not false
        and (s.date || ' ' || s.time)::timestamp <= (now() at time zone 'Europe/Paris') + interval '30 minutes'
        and (s.date || ' ' || s.time)::timestamp > (now() at time zone 'Europe/Paris')
    loop
      perform private.send_push(jsonb_build_array(r.onesignal_id), 'Rendez-vous dans 30 minutes',
        'Votre rendez-vous est à ' || r.time || ', à tout de suite !');
      update public.slots set reminder_30min_sent = true where id = r.id;
    end loop;
  end;
  $do$;
$cmd$) from cron.job where jobname = 'albarber-reminders';

select cron.alter_job(jobid, command := $cmd$
  do $do$
  declare
    avail_count integer;
    already_notified boolean;
    slot_list text;
  begin
    select count(*) into avail_count
    from public.slots
    where visible = true and booked_by is null and is_manual = false
      and (date || ' ' || time)::timestamp > (now() at time zone 'Europe/Paris');

    select (value = 'true') into already_notified from public.settings where key = 'low_availability_notified';

    if avail_count <= 3 and avail_count > 0 and not coalesce(already_notified, false) then
      select string_agg(to_char(to_date(date, 'YYYY-MM-DD'), 'DD/MM') || ' à ' || time, ', ' order by date, time)
      into slot_list
      from public.slots
      where visible = true and booked_by is null and is_manual = false
        and (date || ' ' || time)::timestamp > (now() at time zone 'Europe/Paris');

      perform private.send_push(
        (select jsonb_agg(onesignal_id) from public.users where onesignal_id is not null and notif_available is not false and is_admin is not true),
        'Plus que ' || avail_count || ' créneau(x) disponible(s) !',
        'Réservez vite : ' || coalesce(slot_list, '')
      );
      update public.settings set value = 'true' where key = 'low_availability_notified';
    elsif avail_count > 3 then
      update public.settings set value = 'false' where key = 'low_availability_notified';
    end if;
  end;
  $do$;
$cmd$) from cron.job where jobname = 'albarber-low-availability';

-- ── Fonctions utilisées par le site ──

-- Profil du membre connecté (null si pas connecté ou compte pas encore relié).
create or replace function public.current_member()
returns public.users language sql stable security definer set search_path = '' as $$
  select * from public.users where auth_id = auth.uid()
$$;

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.users where auth_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.users where auth_id = auth.uid()), false)
$$;

-- Avant connexion : le pseudo existe-t-il, a-t-il déjà un mot de passe ?
-- `email` est l'adresse technique de connexion (…@membres.albarber.app), pas l'email du client.
create or replace function public.login_status(p_username text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object(
        'exists', true,
        'claimed', u.auth_id is not null,
        'locked', u.claim_attempts >= 5,
        'has_email', coalesce(trim(u.email), '') <> '',
        'email', a.email)
     from public.users u left join auth.users a on a.id = u.auth_id
     where u.username = lower(trim(p_username))),
    jsonb_build_object('exists', false))
$$;

create or replace function public.check_invite(p_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.settings where key = 'invite_code' and value = upper(trim(p_code)))
$$;

-- Inscription : crée le profil relié au compte de connexion qui vient d'être créé.
create or replace function public.register_profile(p_invite text, p_username text, p_first text, p_last text, p_email text)
returns public.users language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_user text := lower(trim(p_username));
  r public.users;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.users where auth_id = uid) then raise exception 'already_linked'; end if;
  if not public.check_invite(p_invite) then raise exception 'invalid_invite'; end if;
  if v_user !~ '^[a-z0-9_]{2,20}$' then raise exception 'invalid_username'; end if;
  if coalesce(trim(p_first), '') = '' or length(p_first) > 60
     or coalesce(trim(p_last), '') = '' or length(p_last) > 60
     or coalesce(trim(p_email), '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(p_email) > 200 then
    raise exception 'invalid_fields';
  end if;
  insert into public.users (username, first, last, email, is_admin,
    notif_available, notif_released, notif_reminder, notif_confirm, auth_id)
  values (v_user, trim(p_first), trim(p_last), lower(trim(p_email)), false, true, true, true, true, uid)
  returning * into r;
  return r;
end $$;

-- Première connexion d'un membre existant : relie son profil au compte de connexion
-- qui vient d'être créé, si l'email donné correspond à celui enregistré.
-- Le profil admin exige en plus le code admin. 5 essais ratés bloquent le profil.
-- En cas d'échec, le compte de connexion tout juste créé est supprimé.
create or replace function public.claim_profile(p_username text, p_email text, p_admin_code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.users;
  reason text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_authenticated'); end if;
  if exists (select 1 from public.users where auth_id = uid) then
    return jsonb_build_object('ok', false, 'reason', 'already_linked');
  end if;

  select * into r from public.users where username = lower(trim(p_username)) for update;
  if not found then reason := 'not_found';
  elsif r.auth_id is not null then reason := 'already_claimed';
  elsif r.claim_attempts >= 5 then reason := 'locked';
  elsif coalesce(trim(r.email), '') = '' then reason := 'no_email';
  elsif lower(trim(r.email)) <> lower(trim(coalesce(p_email, ''))) then reason := 'email';
  elsif coalesce(r.is_admin, false) and coalesce(p_admin_code, '') = '' then reason := 'admin_code_required';
  elsif coalesce(r.is_admin, false)
        and upper(trim(p_admin_code)) <> (select value from private.secrets where name = 'admin_claim_code') then
    reason := 'admin_code';
  end if;

  if reason is not null then
    if reason in ('email', 'admin_code') then
      update public.users set claim_attempts = claim_attempts + 1 where id = r.id;
    end if;
    delete from auth.users where id = uid;
    return jsonb_build_object('ok', false, 'reason', reason);
  end if;

  update public.users set auth_id = uid, claim_attempts = 0 where id = r.id returning * into r;
  return jsonb_build_object('ok', true, 'member', to_jsonb(r));
end $$;

-- Supprime le compte de connexion du membre connecté s'il n'est relié à aucun profil
-- (inscription interrompue).
create or replace function public.discard_orphan_auth()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from public.users where auth_id = auth.uid()) then return; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Admin : retire le mot de passe d'un membre (oubli). Il refera sa première connexion.
create or replace function public.admin_reset_access(p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_member = public.current_member_id() then raise exception 'cannot_reset_self'; end if;
  select auth_id into a from public.users where id = p_member;
  update public.users set auth_id = null, claim_attempts = 0 where id = p_member;
  if a is not null then delete from auth.users where id = a; end if;
end $$;

-- Identifiants push des admins, pour prévenir d'une demande de créneau.
create or replace function public.admin_push_ids()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(onesignal_id), '[]'::jsonb)
  from public.users
  where is_admin and onesignal_id is not null and auth.uid() is not null
$$;

-- Supprimer un membre supprime aussi son compte de connexion.
create or replace function private.delete_member_auth()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.auth_id is not null then delete from auth.users where id = old.auth_id; end if;
  return old;
end $$;
drop trigger if exists trg_delete_member_auth on public.users;
create trigger trg_delete_member_auth after delete on public.users
  for each row execute function private.delete_member_auth();

-- ── Droits d'exécution ──
revoke execute on function
  public.current_member(), public.current_member_id(), public.is_admin(),
  public.login_status(text), public.check_invite(text),
  public.register_profile(text, text, text, text, text),
  public.claim_profile(text, text, text), public.discard_orphan_auth(),
  public.admin_reset_access(uuid), public.admin_push_ids()
from public, anon, authenticated;

grant execute on function public.login_status(text), public.check_invite(text) to anon, authenticated;
grant execute on function
  public.current_member(), public.current_member_id(), public.is_admin(),
  public.register_profile(text, text, text, text, text),
  public.claim_profile(text, text, text), public.discard_orphan_auth(),
  public.admin_reset_access(uuid), public.admin_push_ids()
to authenticated;
