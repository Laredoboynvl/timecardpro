-- Agregar columna pp_supervisor_schedules a role_schedule_presets
-- Esta columna almacena los horarios del supervisor de Pick & Pack

ALTER TABLE role_schedule_presets 
ADD COLUMN IF NOT EXISTS pp_supervisor_schedules jsonb DEFAULT '[]'::jsonb;

-- Comentario para documentar la columna
COMMENT ON COLUMN role_schedule_presets.pp_supervisor_schedules IS 'Horarios del supervisor de Pick & Pack almacenados como array JSON';
