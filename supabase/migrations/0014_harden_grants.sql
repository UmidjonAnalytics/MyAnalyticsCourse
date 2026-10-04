-- 0014: defense in depth for table privileges. Run after 0013. Safe to run again.
--
-- Supabase gives the "anon" role full privileges on new tables by default. Row Level Security already
-- blocks every anonymous INSERT/UPDATE/DELETE (there are no policies allowing them), but TRUNCATE is
-- not covered by RLS. Anonymous visitors only ever read, so their write privileges are removed, and
-- nobody but the database owner may TRUNCATE. Logged-in users keep exactly the grants given in the
-- earlier migrations (writes are still limited by RLS policies).

do $$
declare t record;
begin
  -- Tables and views (a view runs with its owner's rights, so it must not be writable either).
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', t.relname);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t.relname);
  end loop;
end $$;

-- Tables created later start the same way.
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;
