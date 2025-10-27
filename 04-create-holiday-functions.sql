-- ============================================
-- TIMECARD PRO - FUNCIONES AUXILIARES PARA DÍAS FESTIVOS
-- Funciones para manejo automático de días festivos
-- Ejecutar DESPUÉS de crear las tablas
-- ============================================

-- Función para obtener el próximo día festivo
CREATE OR REPLACE FUNCTION get_next_holiday(office_code_param VARCHAR DEFAULT NULL)
RETURNS TABLE (
    holiday_name VARCHAR,
    holiday_date DATE,
    days_until INTEGER,
    is_national BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.name::VARCHAR as holiday_name,
        h.date as holiday_date,
        (h.date - CURRENT_DATE)::INTEGER as days_until,
        h.is_national
    FROM holidays h
    WHERE h.date >= CURRENT_DATE 
        AND (office_code_param IS NULL OR h.office_code = office_code_param OR h.office_code IS NULL)
    ORDER BY h.date ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para generar días festivos automáticamente para un año
CREATE OR REPLACE FUNCTION generate_holidays_for_year(year_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    constitution_date DATE;
    juarez_date DATE;
    revolution_date DATE;
    easter_date DATE;
    holy_thursday DATE;
    good_friday DATE;
BEGIN
    -- Calcular fechas variables para el año especificado
    
    -- Día de la Constitución (primer lunes de febrero)
    constitution_date := (year_param || '-02-01')::DATE;
    constitution_date := constitution_date + (7 - EXTRACT(DOW FROM constitution_date))::INTEGER + 1;
    
    -- Natalicio de Benito Juárez (tercer lunes de marzo)
    juarez_date := (year_param || '-03-01')::DATE;
    juarez_date := juarez_date + (7 - EXTRACT(DOW FROM juarez_date))::INTEGER + 1 + 14;
    
    -- Día de la Revolución (tercer lunes de noviembre)
    revolution_date := (year_param || '-11-01')::DATE;
    revolution_date := revolution_date + (7 - EXTRACT(DOW FROM revolution_date))::INTEGER + 1 + 14;
    
    -- Calcular Pascua (algoritmo simplificado para 2024-2030)
    CASE year_param
        WHEN 2025 THEN easter_date := '2025-04-20'::DATE;
        WHEN 2026 THEN easter_date := '2026-04-05'::DATE;
        WHEN 2027 THEN easter_date := '2027-03-28'::DATE;
        WHEN 2028 THEN easter_date := '2028-04-16'::DATE;
        WHEN 2029 THEN easter_date := '2029-04-01'::DATE;
        WHEN 2030 THEN easter_date := '2030-04-21'::DATE;
        ELSE easter_date := (year_param || '-04-15')::DATE; -- Fecha aproximada por defecto
    END CASE;
    
    holy_thursday := easter_date - INTERVAL '3 days';
    good_friday := easter_date - INTERVAL '2 days';
    
    -- Insertar días festivos fijos
    INSERT INTO holidays (name, date, office_code, is_national, description) VALUES
    ('Año Nuevo ' || year_param, (year_param || '-01-01')::DATE, NULL, true, 'Año Nuevo'),
    ('Día del Trabajo ' || year_param, (year_param || '-05-01')::DATE, NULL, true, 'Día del Trabajo'),
    ('Día de la Independencia ' || year_param, (year_param || '-09-16')::DATE, NULL, true, 'Grito de Independencia'),
    ('Navidad ' || year_param, (year_param || '-12-25')::DATE, NULL, true, 'Navidad'),
    
    -- Días festivos variables
    ('Día de la Constitución ' || year_param, constitution_date, NULL, true, 'Primer lunes de febrero'),
    ('Natalicio de Benito Juárez ' || year_param, juarez_date, NULL, true, 'Tercer lunes de marzo'),
    ('Día de la Revolución ' || year_param, revolution_date, NULL, true, 'Tercer lunes de noviembre'),
    ('Jueves Santo ' || year_param, holy_thursday::DATE, NULL, false, 'Jueves Santo'),
    ('Viernes Santo ' || year_param, good_friday::DATE, NULL, true, 'Viernes Santo'),
    
    -- Días festivos adicionales
    ('Día de Reyes ' || year_param, (year_param || '-01-06')::DATE, NULL, false, 'Día de los Reyes Magos'),
    ('Día de la Candelaria ' || year_param, (year_param || '-02-02')::DATE, NULL, false, 'Día de la Candelaria'),
    ('Día de San Valentín ' || year_param, (year_param || '-02-14')::DATE, NULL, false, 'Día del Amor y la Amistad'),
    ('Día de la Bandera ' || year_param, (year_param || '-02-24')::DATE, NULL, false, 'Día de la Bandera'),
    ('Día de las Madres ' || year_param, (year_param || '-05-10')::DATE, NULL, false, 'Día de las Madres'),
    ('Día del Padre ' || year_param, (year_param || '-06-15')::DATE, NULL, false, 'Día del Padre'),
    ('Día de Muertos ' || year_param, (year_param || '-11-02')::DATE, NULL, false, 'Día de los Fieles Difuntos'),
    ('Día de la Virgen de Guadalupe ' || year_param, (year_param || '-12-12')::DATE, NULL, false, 'Día de la Virgen de Guadalupe'),
    ('Nochebuena ' || year_param, (year_param || '-12-24')::DATE, NULL, false, 'Nochebuena'),
    ('Fin de Año ' || year_param, (year_param || '-12-31')::DATE, NULL, false, 'Fin de Año')
    
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar días festivos antiguos
CREATE OR REPLACE FUNCTION cleanup_old_holidays(years_to_keep INTEGER DEFAULT 3)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date DATE;
BEGIN
    cutoff_date := (EXTRACT(YEAR FROM CURRENT_DATE) - years_to_keep) || '-01-01';
    
    DELETE FROM holidays 
    WHERE date < cutoff_date::DATE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si una fecha es día festivo
CREATE OR REPLACE FUNCTION is_holiday(check_date DATE, office_code_param VARCHAR DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    holiday_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO holiday_count
    FROM holidays h
    WHERE h.date = check_date
        AND (office_code_param IS NULL OR h.office_code = office_code_param OR h.office_code IS NULL);
    
    RETURN holiday_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLOS DE USO DE LAS FUNCIONES
-- ============================================

-- Obtener el próximo día festivo
-- SELECT * FROM get_next_holiday();
-- SELECT * FROM get_next_holiday('TIJ');

-- Generar días festivos para un año específico
-- SELECT generate_holidays_for_year(2028);

-- Verificar si una fecha es festiva
-- SELECT is_holiday('2025-12-25');
-- SELECT is_holiday('2025-12-25', 'TIJ');

-- Limpiar días festivos antiguos (mantener solo 3 años)
-- SELECT cleanup_old_holidays(3);

-- ============================================
-- TRIGGER PARA GENERAR DÍAS FESTIVOS AUTOMÁTICAMENTE
-- ============================================

-- Función que se ejecuta diariamente para verificar días festivos
CREATE OR REPLACE FUNCTION auto_generate_holidays()
RETURNS VOID AS $$
DECLARE
    current_year INTEGER;
    next_year INTEGER;
    future_holidays_count INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    next_year := current_year + 1;
    
    -- Verificar si hay días festivos para el próximo año
    SELECT COUNT(*)
    INTO future_holidays_count
    FROM holidays
    WHERE EXTRACT(YEAR FROM date) = next_year;
    
    -- Si no hay días festivos para el próximo año, generarlos
    IF future_holidays_count = 0 THEN
        PERFORM generate_holidays_for_year(next_year);
        
        -- Log de la operación
        INSERT INTO holidays (name, date, office_code, is_national, description)
        VALUES ('Auto-generación ' || next_year, CURRENT_DATE, NULL, false, 'Días festivos generados automáticamente');
    END IF;
    
    -- Limpiar días festivos muy antiguos
    PERFORM cleanup_old_holidays(3);
END;
$$ LANGUAGE plpgsql;

-- Crear una tabla para logs de ejecución automática (opcional)
CREATE TABLE IF NOT EXISTS holiday_generation_log (
    id SERIAL PRIMARY KEY,
    execution_date DATE DEFAULT CURRENT_DATE,
    year_generated INTEGER,
    holidays_created INTEGER,
    holidays_cleaned INTEGER,
    notes TEXT
);

-- ============================================
-- FUNCIONES CREADAS EXITOSAMENTE
-- ============================================

-- Verificar que las funciones se crearon correctamente
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%holiday%'
ORDER BY routine_name;