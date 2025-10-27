-- =============================================
-- SCRIPT PARA CREAR LA TABLA HOLIDAYS
-- =============================================
-- 
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard
-- 2. Ve a SQL Editor
-- 3. Copia y pega TODO este contenido
-- 4. Ejecuta el script
-- 
-- =============================================

-- Tabla: holidays
-- Almacena los días festivos configurados por cada oficina
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evitar duplicados por oficina y fecha
    UNIQUE(office_id, holiday_date)
);

-- Índices para holidays
CREATE INDEX IF NOT EXISTS idx_holidays_office ON public.holidays(office_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_active ON public.holidays(is_active);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_holidays_updated_at ON public.holidays;
CREATE TRIGGER update_holidays_updated_at
    BEFORE UPDATE ON public.holidays
    FOR EACH ROW
    EXECUTE FUNCTION public.update_holidays_updated_at();

-- Comentario en la tabla
COMMENT ON TABLE public.holidays IS 'Tabla para gestionar días festivos por oficina. Los días marcados como festivos no podrán ser tomados como vacaciones.';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Política RLS para la tabla holidays
-- Los usuarios autenticados pueden ver y gestionar holidays de su oficina
CREATE POLICY "holidays_policy" ON public.holidays
    FOR ALL USING (true)
    WITH CHECK (true);

-- =============================================
-- DATOS DE PRUEBA (OPCIONAL)
-- =============================================
-- Descomenta las siguientes líneas si quieres insertar algunos días festivos de prueba

/*
-- Obtener ID de la primera oficina
DO $$
DECLARE
    office_uuid UUID;
BEGIN
    SELECT id INTO office_uuid FROM public.offices LIMIT 1;
    
    IF office_uuid IS NOT NULL THEN
        -- Insertar días festivos básicos de México para 2024
        INSERT INTO public.holidays (office_id, name, holiday_date, description) VALUES
        (office_uuid, 'Año Nuevo', '2024-01-01', 'Celebración del Año Nuevo'),
        (office_uuid, 'Día de la Constitución', '2024-02-05', 'Conmemoración de la Constitución Mexicana'),
        (office_uuid, 'Natalicio de Benito Juárez', '2024-03-18', 'Natalicio de Benito Juárez (tercer lunes de marzo)'),
        (office_uuid, 'Día del Trabajo', '2024-05-01', 'Día Internacional del Trabajador'),
        (office_uuid, 'Día de la Independencia', '2024-09-16', 'Independencia de México'),
        (office_uuid, 'Día de la Revolución', '2024-11-18', 'Revolución Mexicana (tercer lunes de noviembre)'),
        (office_uuid, 'Navidad', '2024-12-25', 'Celebración de la Navidad')
        ON CONFLICT (office_id, holiday_date) DO NOTHING;
        
        RAISE NOTICE 'Días festivos de prueba insertados para la oficina %', office_uuid;
    ELSE
        RAISE NOTICE 'No se encontraron oficinas. Crea una oficina primero.';
    END IF;
END $$;
*/

-- =============================================
-- VERIFICACIÓN
-- =============================================
-- Verificar que la tabla se creó correctamente
SELECT 
    'holidays' as tabla_creada,
    COUNT(*) as total_registros
FROM public.holidays;

-- Mostrar estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'holidays'
ORDER BY ordinal_position;

-- =============================================
-- FIN DEL SCRIPT
-- =============================================