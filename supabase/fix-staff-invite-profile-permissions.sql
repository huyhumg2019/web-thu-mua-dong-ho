-- The invite-staff Edge Function uses the server-side service_role key to
-- verify the caller's profile and set the invited user's staff role.
-- This project does not currently grant service_role any privileges on profiles.
-- Keep access limited to the three columns used by this function.
begin;

grant select (id, full_name, role)
  on public.profiles to service_role;
grant insert (id, full_name, role)
  on public.profiles to service_role;
grant update (id, full_name, role)
  on public.profiles to service_role;

commit;
