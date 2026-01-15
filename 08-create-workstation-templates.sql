-- Tabla para plantillas de puestos operativos
create table if not exists role_workstation_templates (
  id uuid primary key default uuid_generate_v4(),
  office_id uuid not null references offices(id) on delete cascade,
  name text not null,
  distribution jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists role_workstation_templates_office_name_idx
  on role_workstation_templates (office_id, lower(name));

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_role_workstation_templates_updated_at') then
    create trigger set_role_workstation_templates_updated_at
      before update on role_workstation_templates
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;
