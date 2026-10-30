-- The tables blocks and reactions were created with Supabase's default grants, which include the role anon
-- (signed-out visitors). Row level security already stopped any use, but anon should have no privileges here at
-- all, like every other table. The baseline migration never granted them; this brings production in line.
-- Signed-in users (role authenticated) are not touched.
revoke all on table public.blocks from anon;
revoke all on table public.reactions from anon;
