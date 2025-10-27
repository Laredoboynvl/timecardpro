-- Script para configurar automáticamente las tablas de asistencia
-- Este script verifica si las tablas existen antes de crearlas

-- Verificar si la tabla attendance_types existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_types') THEN
        -- Crear tabla de tipos de asistencia
        CREATE TABLE attendance_types (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(10) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            color VARCHAR(7) NOT NULL,
            hours_value DECIMAL(4,2) DEFAULT 8.00,
            is_paid BOOLEAN DEFAULT true,
            requires_approval BOOLEAN DEFAULT false,
            is_system BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabla attendance_types creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla attendance_types ya existe';
        
        -- Verificar y agregar columna hours_value si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'hours_value') THEN
            ALTER TABLE attendance_types ADD COLUMN hours_value DECIMAL(4,2) DEFAULT 8.00;
            RAISE NOTICE 'Columna hours_value agregada a attendance_types';
        ELSE
            RAISE NOTICE 'Columna hours_value ya existe en attendance_types';
        END IF;
        
        -- Verificar y agregar otras columnas que podrían faltar
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'is_paid') THEN
            ALTER TABLE attendance_types ADD COLUMN is_paid BOOLEAN DEFAULT true;
            RAISE NOTICE 'Columna is_paid agregada a attendance_types';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'requires_approval') THEN
            ALTER TABLE attendance_types ADD COLUMN requires_approval BOOLEAN DEFAULT false;
            RAISE NOTICE 'Columna requires_approval agregada a attendance_types';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'is_system') THEN
            ALTER TABLE attendance_types ADD COLUMN is_system BOOLEAN DEFAULT false;
            RAISE NOTICE 'Columna is_system agregada a attendance_types';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'is_active') THEN
            ALTER TABLE attendance_types ADD COLUMN is_active BOOLEAN DEFAULT true;
            RAISE NOTICE 'Columna is_active agregada a attendance_types';
        END IF;
    END IF;
END $$;

-- Verificar si la tabla attendance_records existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_records') THEN
        -- Crear tabla de registros de asistencia
        CREATE TABLE attendance_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            office_id VARCHAR(10) NOT NULL,
            attendance_date DATE NOT NULL,
            attendance_type_id UUID NOT NULL REFERENCES attendance_types(id),
            notes TEXT,
            created_by UUID,
            approved_by UUID,
            approved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(employee_id, attendance_date)
        );
        
        RAISE NOTICE 'Tabla attendance_records creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla attendance_records ya existe';
    END IF;
END $$;

-- Verificar si la tabla monthly_attendance_comments existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'monthly_attendance_comments') THEN
        -- Crear tabla para comentarios mensuales
        CREATE TABLE monthly_attendance_comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            office_id VARCHAR(10) NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
            employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
            general_comments TEXT,
            employee_comments TEXT,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(office_id, year, month, employee_id)
        );
        
        RAISE NOTICE 'Tabla monthly_attendance_comments creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla monthly_attendance_comments ya existe';
    END IF;
END $$;

-- Insertar tipos de asistencia predeterminados (solo si no existen)
-- Primero verificamos qué columnas existen para adaptar el INSERT
DO $$
DECLARE
    has_hours_value BOOLEAN;
    has_is_paid BOOLEAN;
    has_requires_approval BOOLEAN;
    has_is_system BOOLEAN;
    insert_sql TEXT;
BEGIN
    -- Verificar qué columnas existen
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'hours_value') INTO has_hours_value;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'is_paid') INTO has_is_paid;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'requires_approval') INTO has_requires_approval;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'is_system') INTO has_is_system;
    
    -- Construir el INSERT dinámico basado en las columnas que existen
    insert_sql := 'INSERT INTO attendance_types (code, name, description, color';
    
    IF has_hours_value THEN
        insert_sql := insert_sql || ', hours_value';
    END IF;
    
    IF has_is_paid THEN
        insert_sql := insert_sql || ', is_paid';
    END IF;
    
    IF has_requires_approval THEN
        insert_sql := insert_sql || ', requires_approval';
    END IF;
    
    IF has_is_system THEN
        insert_sql := insert_sql || ', is_system';
    END IF;
    
    insert_sql := insert_sql || ') SELECT * FROM (VALUES ';
    
    -- Agregar los valores
    insert_sql := insert_sql || '(''R'', ''Día Regular'', ''Día de trabajo normal'', ''#22c55e''';
    IF has_hours_value THEN insert_sql := insert_sql || ', 8.00'; END IF;
    IF has_is_paid THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_requires_approval THEN insert_sql := insert_sql || ', false'; END IF;
    IF has_is_system THEN insert_sql := insert_sql || ', false'; END IF;
    insert_sql := insert_sql || '),';
    
    insert_sql := insert_sql || '(''I'', ''Incapacidad'', ''Incapacidad médica'', ''#ef4444''';
    IF has_hours_value THEN insert_sql := insert_sql || ', 0.00'; END IF;
    IF has_is_paid THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_requires_approval THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_is_system THEN insert_sql := insert_sql || ', false'; END IF;
    insert_sql := insert_sql || '),';
    
    insert_sql := insert_sql || '(''LM'', ''Licencia Médica'', ''Licencia por motivos médicos'', ''#f59e0b''';
    IF has_hours_value THEN insert_sql := insert_sql || ', 0.00'; END IF;
    IF has_is_paid THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_requires_approval THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_is_system THEN insert_sql := insert_sql || ', false'; END IF;
    insert_sql := insert_sql || '),';
    
    insert_sql := insert_sql || '(''ANR'', ''Ausencia No Remunerada'', ''Ausencia sin goce de sueldo'', ''#6b7280''';
    IF has_hours_value THEN insert_sql := insert_sql || ', 0.00'; END IF;
    IF has_is_paid THEN insert_sql := insert_sql || ', false'; END IF;
    IF has_requires_approval THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_is_system THEN insert_sql := insert_sql || ', false'; END IF;
    insert_sql := insert_sql || '),';
    
    insert_sql := insert_sql || '(''AA'', ''Ausencia Administrativa'', ''Ausencia por motivos administrativos'', ''#8b5cf6''';
    IF has_hours_value THEN insert_sql := insert_sql || ', 8.00'; END IF;
    IF has_is_paid THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_requires_approval THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_is_system THEN insert_sql := insert_sql || ', false'; END IF;
    insert_sql := insert_sql || '),';
    
    insert_sql := insert_sql || '(''V'', ''Vacaciones'', ''Día de vacaciones aprobado'', ''#06b6d4''';
    IF has_hours_value THEN insert_sql := insert_sql || ', 8.00'; END IF;
    IF has_is_paid THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_requires_approval THEN insert_sql := insert_sql || ', false'; END IF;
    IF has_is_system THEN insert_sql := insert_sql || ', true'; END IF;
    insert_sql := insert_sql || '),';
    
    insert_sql := insert_sql || '(''F'', ''Día Festivo'', ''Día feriado oficial'', ''#ec4899''';
    IF has_hours_value THEN insert_sql := insert_sql || ', 8.00'; END IF;
    IF has_is_paid THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_requires_approval THEN insert_sql := insert_sql || ', false'; END IF;
    IF has_is_system THEN insert_sql := insert_sql || ', true'; END IF;
    insert_sql := insert_sql || '),';
    
    insert_sql := insert_sql || '(''D'', ''Descanso'', ''Día de descanso (domingo)'', ''#94a3b8''';
    IF has_hours_value THEN insert_sql := insert_sql || ', 0.00'; END IF;
    IF has_is_paid THEN insert_sql := insert_sql || ', true'; END IF;
    IF has_requires_approval THEN insert_sql := insert_sql || ', false'; END IF;
    IF has_is_system THEN insert_sql := insert_sql || ', true'; END IF;
    insert_sql := insert_sql || ')';
    
    -- Terminar el comando con la condición WHERE
    insert_sql := insert_sql || ') AS t(code, name, description, color';
    
    IF has_hours_value THEN
        insert_sql := insert_sql || ', hours_value';
    END IF;
    
    IF has_is_paid THEN
        insert_sql := insert_sql || ', is_paid';
    END IF;
    
    IF has_requires_approval THEN
        insert_sql := insert_sql || ', requires_approval';
    END IF;
    
    IF has_is_system THEN
        insert_sql := insert_sql || ', is_system';
    END IF;
    
    insert_sql := insert_sql || ') WHERE NOT EXISTS (SELECT 1 FROM attendance_types WHERE attendance_types.code = t.code);';
    
    -- Ejecutar el INSERT dinámico
    EXECUTE insert_sql;
    
    RAISE NOTICE 'Tipos de asistencia insertados (si no existían)';
    RAISE NOTICE 'Columnas detectadas - hours_value: %, is_paid: %, requires_approval: %, is_system: %', 
                 has_hours_value, has_is_paid, has_requires_approval, has_is_system;
                 
    -- Actualizar valores de hours_value para tipos existentes si la columna existe pero los valores son NULL
    IF has_hours_value THEN
        UPDATE attendance_types SET hours_value = 8.00 WHERE code IN ('R', 'AA', 'V', 'F') AND hours_value IS NULL;
        UPDATE attendance_types SET hours_value = 0.00 WHERE code IN ('I', 'LM', 'ANR', 'D') AND hours_value IS NULL;
        RAISE NOTICE 'Valores de hours_value actualizados para tipos existentes';
    END IF;
END $$;

-- Crear índices si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_records_employee_date') THEN
        CREATE INDEX idx_attendance_records_employee_date ON attendance_records(employee_id, attendance_date);
        RAISE NOTICE 'Índice idx_attendance_records_employee_date creado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_records_office_date') THEN
        CREATE INDEX idx_attendance_records_office_date ON attendance_records(office_id, attendance_date);
        RAISE NOTICE 'Índice idx_attendance_records_office_date creado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendance_records_date') THEN
        CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date);
        RAISE NOTICE 'Índice idx_attendance_records_date creado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_monthly_comments_office_date') THEN
        CREATE INDEX idx_monthly_comments_office_date ON monthly_attendance_comments(office_id, year, month);
        RAISE NOTICE 'Índice idx_monthly_comments_office_date creado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_monthly_comments_employee') THEN
        CREATE INDEX idx_monthly_comments_employee ON monthly_attendance_comments(employee_id);
        RAISE NOTICE 'Índice idx_monthly_comments_employee creado';
    END IF;
END $$;

-- Configurar RLS y políticas de seguridad
DO $$
BEGIN
    -- Habilitar RLS si no está habilitado
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'attendance_types' AND rowsecurity = true) THEN
        ALTER TABLE attendance_types ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado para attendance_types';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'attendance_records' AND rowsecurity = true) THEN
        ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado para attendance_records';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'monthly_attendance_comments' AND rowsecurity = true) THEN
        ALTER TABLE monthly_attendance_comments ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado para monthly_attendance_comments';
    END IF;
END $$;

-- Crear políticas RLS si no existen
DO $$
BEGIN
    -- Políticas para attendance_types
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_types' AND policyname = 'attendance_types_select_policy') THEN
        CREATE POLICY "attendance_types_select_policy" ON attendance_types FOR SELECT USING (true);
        RAISE NOTICE 'Política attendance_types_select_policy creada';
    END IF;
    
    -- Políticas para attendance_records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'attendance_records_select_policy') THEN
        CREATE POLICY "attendance_records_select_policy" ON attendance_records FOR SELECT USING (true);
        RAISE NOTICE 'Política attendance_records_select_policy creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'attendance_records_insert_policy') THEN
        CREATE POLICY "attendance_records_insert_policy" ON attendance_records FOR INSERT WITH CHECK (true);
        RAISE NOTICE 'Política attendance_records_insert_policy creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'attendance_records_update_policy') THEN
        CREATE POLICY "attendance_records_update_policy" ON attendance_records FOR UPDATE USING (true);
        RAISE NOTICE 'Política attendance_records_update_policy creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'attendance_records_delete_policy') THEN
        CREATE POLICY "attendance_records_delete_policy" ON attendance_records FOR DELETE USING (true);
        RAISE NOTICE 'Política attendance_records_delete_policy creada';
    END IF;
    
    -- Políticas para monthly_attendance_comments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'monthly_attendance_comments' AND policyname = 'monthly_comments_select_policy') THEN
        CREATE POLICY "monthly_comments_select_policy" ON monthly_attendance_comments FOR SELECT USING (true);
        RAISE NOTICE 'Política monthly_comments_select_policy creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'monthly_attendance_comments' AND policyname = 'monthly_comments_insert_policy') THEN
        CREATE POLICY "monthly_comments_insert_policy" ON monthly_attendance_comments FOR INSERT WITH CHECK (true);
        RAISE NOTICE 'Política monthly_comments_insert_policy creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'monthly_attendance_comments' AND policyname = 'monthly_comments_update_policy') THEN
        CREATE POLICY "monthly_comments_update_policy" ON monthly_attendance_comments FOR UPDATE USING (true);
        RAISE NOTICE 'Política monthly_comments_update_policy creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'monthly_attendance_comments' AND policyname = 'monthly_comments_delete_policy') THEN
        CREATE POLICY "monthly_comments_delete_policy" ON monthly_attendance_comments FOR DELETE USING (true);
        RAISE NOTICE 'Política monthly_comments_delete_policy creada';
    END IF;
END $$;

-- Crear función para actualizar updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_attendance_types_updated_at') THEN
        CREATE TRIGGER update_attendance_types_updated_at 
            BEFORE UPDATE ON attendance_types 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_attendance_types_updated_at creado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_attendance_records_updated_at') THEN
        CREATE TRIGGER update_attendance_records_updated_at 
            BEFORE UPDATE ON attendance_records 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_attendance_records_updated_at creado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_monthly_comments_updated_at') THEN
        CREATE TRIGGER update_monthly_comments_updated_at 
            BEFORE UPDATE ON monthly_attendance_comments 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_monthly_comments_updated_at creado';
    END IF;
END $$;

-- Verificar la configuración final
SELECT 
    'attendance_types' as tabla,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_types') THEN 'EXISTE' ELSE 'NO EXISTE' END as estado,
    (SELECT count(*) FROM attendance_types WHERE 1=1) as registros
UNION ALL
SELECT 
    'attendance_records' as tabla,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_records') THEN 'EXISTE' ELSE 'NO EXISTE' END as estado,
    COALESCE((SELECT count(*) FROM attendance_records WHERE 1=1), 0) as registros
UNION ALL
SELECT 
    'monthly_attendance_comments' as tabla,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'monthly_attendance_comments') THEN 'EXISTE' ELSE 'NO EXISTE' END as estado,
    COALESCE((SELECT count(*) FROM monthly_attendance_comments WHERE 1=1), 0) as registros;

-- Mostrar tipos de asistencia creados
SELECT 'Tipos de asistencia configurados:' as mensaje;

-- Mostrar tipos con información adaptativa según las columnas existentes
DO $$
DECLARE
    query_sql TEXT;
    has_hours_value BOOLEAN;
BEGIN
    -- Verificar si existe la columna hours_value
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_types' AND column_name = 'hours_value') INTO has_hours_value;
    
    IF has_hours_value THEN
        query_sql := 'SELECT code, name, color, hours_value FROM attendance_types ORDER BY code';
    ELSE
        query_sql := 'SELECT code, name, color, ''N/A'' as hours_value FROM attendance_types ORDER BY code';
    END IF;
    
    -- Ejecutar la consulta
    EXECUTE 'CREATE TEMP TABLE temp_attendance_display AS ' || query_sql;
END $$;

SELECT * FROM temp_attendance_display;
DROP TABLE temp_attendance_display;