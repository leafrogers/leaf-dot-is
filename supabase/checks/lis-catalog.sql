-- Read-only catalog snapshot. No row data, trigger arguments, or credentials.
-- Column positions count visible columns, excluding dropped-column catalog gaps.
-- Sorting uses C collation for consistent output across database locales.
-- Identity sequence configuration is included; current sequence values are not.
SELECT jsonb_build_object(
  'schema', (SELECT jsonb_build_object('owner', pg_get_userbyid(nspowner), 'acl', nspacl::text)
    FROM pg_namespace WHERE nspname = 'lis'),
  'relations', (SELECT jsonb_agg(jsonb_build_object(
    'name', c.relname, 'kind', c.relkind, 'owner', pg_get_userbyid(c.relowner),
    'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity, 'acl', c.relacl::text,
    'persistence', c.relpersistence, 'options', c.reloptions,
    'comment', obj_description(c.oid, 'pg_class')) ORDER BY c.relname COLLATE "C")
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'lis' AND c.relkind IN ('r', 'S', 'v', 'm', 'p', 'f')),
  'columns', (SELECT jsonb_agg(jsonb_build_object(
    'table', c.relname, 'position', (SELECT count(*) FROM pg_attribute a2
      WHERE a2.attrelid = c.oid AND a2.attnum > 0 AND a2.attnum <= a.attnum AND NOT a2.attisdropped), 'name', a.attname,
    'type', format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull,
    'identity', a.attidentity, 'generated', a.attgenerated,
    'default', pg_get_expr(d.adbin, d.adrelid),
    'collation', co.collname, 'comment', col_description(c.oid, a.attnum)) ORDER BY c.relname COLLATE "C", a.attnum)
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    LEFT JOIN pg_collation co ON co.oid = a.attcollation
    WHERE n.nspname = 'lis' AND c.relkind IN ('r', 'v', 'm', 'p', 'f') AND a.attnum > 0 AND NOT a.attisdropped),
  'constraints', (SELECT jsonb_agg(jsonb_build_object(
    'table', c.conrelid::regclass::text, 'name', c.conname,
    'definition', pg_get_constraintdef(c.oid), 'validated', c.convalidated,
    'deferrable', c.condeferrable, 'deferred', c.condeferred) ORDER BY c.conrelid::regclass::text COLLATE "C", c.conname COLLATE "C")
    FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'lis'),
  'indexes', (SELECT jsonb_agg(jsonb_build_object(
    'table', tablename, 'name', indexname, 'definition', indexdef) ORDER BY tablename COLLATE "C", indexname COLLATE "C")
    FROM pg_indexes WHERE schemaname = 'lis'),
  'sequences', (SELECT jsonb_agg(jsonb_build_object(
    'name', sequencename, 'owner', sequenceowner, 'type', data_type,
    'start', start_value, 'min', min_value, 'max', max_value,
    'increment', increment_by, 'cycle', cycle, 'cache', cache_size) ORDER BY sequencename COLLATE "C")
    FROM pg_sequences WHERE schemaname = 'lis'),
  'policies', (SELECT jsonb_agg(to_jsonb(p) - 'schemaname' ORDER BY tablename COLLATE "C", policyname COLLATE "C")
    FROM pg_policies p WHERE schemaname = 'lis'),
  'functions', (SELECT jsonb_agg(jsonb_build_object(
    'name', p.proname, 'definition', pg_get_functiondef(p.oid),
    'owner', pg_get_userbyid(p.proowner), 'acl', p.proacl::text) ORDER BY p.proname COLLATE "C", p.oid::regprocedure::text COLLATE "C")
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'lis'),
  'default_privileges', (SELECT jsonb_agg(jsonb_build_object(
    'owner', pg_get_userbyid(d.defaclrole), 'type', d.defaclobjtype, 'acl', d.defaclacl::text)
    ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C", d.defaclobjtype)
    FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace WHERE n.nspname = 'lis'),
  'triggers_without_arguments', (SELECT jsonb_agg(jsonb_build_object(
    'table', c.relname, 'name', t.tgname, 'function', t.tgfoid::regprocedure::text,
    'enabled', t.tgenabled, 'type', t.tgtype) ORDER BY c.relname COLLATE "C", t.tgname COLLATE "C")
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'lis' AND NOT t.tgisinternal)
) AS catalog;
