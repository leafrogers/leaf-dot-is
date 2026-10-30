do $$
declare
  duplicate_identity record;
  existing_constraint text;
  has_nulls_not_distinct_constraint boolean;
begin
  select title, title_parent, timestamp, type_id
    into duplicate_identity
    from lis.me_events
    group by title, title_parent, timestamp, type_id
    having count(*) > 1
    limit 1;

  if found then
    raise exception
      'Cannot enforce Me Event identity: duplicate identity exists (title %, parent %, timestamp %, type %)',
      duplicate_identity.title,
      duplicate_identity.title_parent,
      duplicate_identity.timestamp,
      duplicate_identity.type_id;
  end if;

  select exists (
    select 1
      from pg_constraint existing
      join pg_class relation on relation.oid = existing.conrelid
      join pg_namespace schema on schema.oid = relation.relnamespace
      join pg_index index_definition on index_definition.indexrelid = existing.conindid
      where existing.contype = 'u'
        and schema.nspname = 'lis'
        and relation.relname = 'me_events'
        and index_definition.indnullsnotdistinct
        and existing.conkey = array[
          (select attnum from pg_attribute where attrelid = relation.oid and attname = 'title'),
          (select attnum from pg_attribute where attrelid = relation.oid and attname = 'title_parent'),
          (select attnum from pg_attribute where attrelid = relation.oid and attname = 'timestamp'),
          (select attnum from pg_attribute where attrelid = relation.oid and attname = 'type_id')
        ]
  ) into has_nulls_not_distinct_constraint;

  if has_nulls_not_distinct_constraint then
    return;
  end if;

  select existing.conname
    into existing_constraint
    from pg_constraint existing
    join pg_class relation on relation.oid = existing.conrelid
    join pg_namespace schema on schema.oid = relation.relnamespace
    where existing.contype = 'u'
      and schema.nspname = 'lis'
      and relation.relname = 'me_events'
      and existing.conkey = array[
        (select attnum from pg_attribute where attrelid = relation.oid and attname = 'title'),
        (select attnum from pg_attribute where attrelid = relation.oid and attname = 'title_parent'),
        (select attnum from pg_attribute where attrelid = relation.oid and attname = 'timestamp'),
        (select attnum from pg_attribute where attrelid = relation.oid and attname = 'type_id')
      ];

  if existing_constraint is not null then
    execute format(
      'alter table lis.me_events drop constraint %I',
      existing_constraint
    );
  end if;

  alter table lis.me_events
    add constraint me_events_identity_key
    unique nulls not distinct (title, title_parent, timestamp, type_id);
end;
$$;
