-- Étape 2 : verrouillage de la base.
-- À appliquer APRÈS la mise en ligne du nouveau code (connexion par mot de passe).
-- L'ancien code du site (connexion par pseudo seul) cesse de fonctionner.

-- ── Plus aucun accès sans connexion ──
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

do $$
declare t text;
begin
  foreach t in array array['announcements','hair_profiles','payment_methods','services','settings','slot_requests','slots','users'] loop
    execute format('drop policy if exists "allow all" on public.%I', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ── Membres : chacun voit et modifie sa fiche, l'admin voit tout ──
create policy users_select on public.users for select to authenticated
  using (auth_id = auth.uid() or public.is_admin());
create policy users_update on public.users for update to authenticated
  using (auth_id = auth.uid() or public.is_admin())
  with check (auth_id = auth.uid() or public.is_admin());
create policy users_delete on public.users for delete to authenticated
  using (public.is_admin());
-- Pas d'insert direct : l'inscription passe par register_profile().

-- Un membre ne peut ni se donner les droits admin, ni toucher au lien de connexion.
create or replace function private.guard_users_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then return new; end if;
  if new.id is distinct from old.id
     or new.auth_id is distinct from old.auth_id
     or new.claim_attempts is distinct from old.claim_attempts then
    raise exception 'forbidden_columns';
  end if;
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    raise exception 'forbidden_columns';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_users_update on public.users;
create trigger trg_guard_users_update before update on public.users
  for each row execute function private.guard_users_update();

-- ── Créneaux ──
-- Client : voit les créneaux publiés et les siens ; peut réserver un créneau libre,
-- annuler le sien et choisir sa prestation. Tout le reste est réservé à l'admin.
create policy slots_select on public.slots for select to authenticated
  using (public.is_admin() or visible or booked_by = public.current_member_id());
create policy slots_update on public.slots for update to authenticated
  using (public.is_admin() or (visible and (booked_by is null or booked_by = public.current_member_id())))
  with check (public.is_admin() or booked_by is null or booked_by = public.current_member_id());
create policy slots_insert on public.slots for insert to authenticated
  with check (public.is_admin());
create policy slots_delete on public.slots for delete to authenticated
  using (public.is_admin());

create or replace function private.guard_slots_update()
returns trigger language plpgsql set search_path = '' as $$
declare me uuid;
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin() then return new; end if;
  me := public.current_member_id();
  if new.id is distinct from old.id or new.date is distinct from old.date or new.time is distinct from old.time
     or new.visible is distinct from old.visible or new.duration_minutes is distinct from old.duration_minutes
     or new.is_manual is distinct from old.is_manual or new.manual_client_name is distinct from old.manual_client_name
     or new.publish_at is distinct from old.publish_at
     or new.reminder_morning_sent is distinct from old.reminder_morning_sent
     or new.reminder_30min_sent is distinct from old.reminder_30min_sent then
    raise exception 'forbidden_columns';
  end if;
  if new.booked_by is distinct from old.booked_by
     and not ((old.booked_by is null and new.booked_by = me) or (old.booked_by = me and new.booked_by is null)) then
    raise exception 'forbidden_booking';
  end if;
  if new.service_id is distinct from old.service_id then
    if new.booked_by is distinct from me then raise exception 'forbidden_service'; end if;
    -- Le prix vient toujours de la prestation, jamais du client.
    new.price_charged_cents := (select price_cents from public.services where id = new.service_id and active);
    if new.service_id is not null and new.price_charged_cents is null then raise exception 'invalid_service'; end if;
  else
    new.price_charged_cents := old.price_charged_cents;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_slots_update on public.slots;
create trigger trg_guard_slots_update before update on public.slots
  for each row execute function private.guard_slots_update();

-- ── Demandes de créneau ──
create policy slot_requests_select on public.slot_requests for select to authenticated
  using (client_id = public.current_member_id() or public.is_admin());
create policy slot_requests_insert on public.slot_requests for insert to authenticated
  with check (public.is_admin() or (
    client_id = public.current_member_id() and status = 'pending'
    and admin_response is null and proposed_alternatives is null and resolved_at is null));
create policy slot_requests_update on public.slot_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy slot_requests_delete on public.slot_requests for delete to authenticated
  using (public.is_admin());

-- ── Profils capillaires : privés ──
create policy hair_profiles_select on public.hair_profiles for select to authenticated
  using (client_id = public.current_member_id() or public.is_admin());
create policy hair_profiles_insert on public.hair_profiles for insert to authenticated
  with check (client_id = public.current_member_id());
create policy hair_profiles_admin on public.hair_profiles for delete to authenticated
  using (public.is_admin());

-- ── Prestations, paiements, annonces : lecture membres, écriture admin ──
do $$
declare t text;
begin
  foreach t in array array['services','payment_methods','announcements'] loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_delete', t);
  end loop;
end $$;

-- ── Réglages : le code d'invitation reste réservé à l'admin ──
create policy settings_select on public.settings for select to authenticated
  using (public.is_admin() or key in ('chatbot_persona', 'hair_trends'));
create policy settings_insert on public.settings for insert to authenticated
  with check (public.is_admin());
create policy settings_update on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy settings_delete on public.settings for delete to authenticated
  using (public.is_admin());

-- ── Extension pg_net hors du schéma public (avertissement Supabase) ──
-- pg_net ne supporte pas `alter extension ... set schema` : le schéma est fixé
-- à l'installation. Ses fonctions vivent déjà dans le schéma `net`, seul l'objet
-- d'extension est rattaché à public. Laissé tel quel volontairement.
