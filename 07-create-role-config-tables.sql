-- Tablas para persistir configuraciones del generador de roles
create table if not exists role_schedule_presets (
  id uuid primary key default uuid_generate_v4(),
  office_id uuid not null references offices(id) on delete cascade,
  name text not null,
  shift_name text not null,
  start_time text not null,
  end_time text not null,
  schedule_matrix jsonb not null,
  pp_supervisor_schedules jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists role_schedule_presets_office_name_idx
  on role_schedule_presets (office_id, lower(name));

create table if not exists role_position_presets (
  id uuid primary key default uuid_generate_v4(),
  office_id uuid not null references offices(id) on delete cascade,
  name text not null,
  slots jsonb not null,
  assignments jsonb not null default '{}'::jsonb,
  fixed_employee_ids jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists role_position_presets_office_name_idx
  on role_position_presets (office_id, lower(name));

create table if not exists role_attribute_presets (
  id uuid primary key default uuid_generate_v4(),
  office_id uuid not null references offices(id) on delete cascade,
  name text not null,
  attributes jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists role_attribute_presets_office_name_idx
  on role_attribute_presets (office_id, lower(name));

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_role_schedule_presets_updated_at') then
    create trigger set_role_schedule_presets_updated_at
      before update on role_schedule_presets
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_role_position_presets_updated_at') then
    create trigger set_role_position_presets_updated_at
      before update on role_position_presets
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_role_attribute_presets_updated_at') then
    create trigger set_role_attribute_presets_updated_at
      before update on role_attribute_presets
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;
