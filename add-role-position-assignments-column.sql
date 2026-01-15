-- Agregar columna assignments a role_position_presets para almacenar personal fijo por puesto
ALTER TABLE role_position_presets
ADD COLUMN IF NOT EXISTS assignments jsonb DEFAULT '{}'::jsonb;

ALTER TABLE role_position_presets
ADD COLUMN IF NOT EXISTS fixed_employee_ids jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN role_position_presets.assignments IS 'Asignaciones fijas de colaboradores por puesto dentro del generador de roles';
COMMENT ON COLUMN role_position_presets.fixed_employee_ids IS 'Identificadores de colaboradores marcados como fijos en la configuración de puestos';
