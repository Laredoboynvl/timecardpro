-- ============================================
-- TIMECARD PRO - DÍAS FESTIVOS MÚLTIPLES AÑOS
-- Insertar días festivos para 2025 y 2026
-- Ejecutar DESPUÉS de crear las tablas y datos iniciales
-- ============================================

-- Eliminar días festivos existentes si los hay
DELETE FROM holidays WHERE date >= '2025-01-01';

-- DÍAS FESTIVOS 2025
INSERT INTO holidays (name, date, office_code, is_national, description) VALUES
-- Días festivos nacionales 2025 (aplican a todas las oficinas)
('Año Nuevo 2025', '2025-01-01', NULL, true, 'Año Nuevo'),
('Día de la Constitución 2025', '2025-02-03', NULL, true, 'Primer lunes de febrero'),
('Natalicio de Benito Juárez 2025', '2025-03-17', NULL, true, 'Tercer lunes de marzo'),
('Viernes Santo 2025', '2025-04-18', NULL, true, 'Viernes Santo'),
('Día del Trabajo 2025', '2025-05-01', NULL, true, 'Día del Trabajo'),
('Día de la Independencia 2025', '2025-09-16', NULL, true, 'Grito de Independencia'),
('Día de la Revolución 2025', '2025-11-17', NULL, true, 'Tercer lunes de noviembre'),
('Navidad 2025', '2025-12-25', NULL, true, 'Navidad'),

-- Días festivos adicionales comunes 2025
('Día de Reyes 2025', '2025-01-06', NULL, false, 'Día de los Reyes Magos'),
('Día de la Candelaria 2025', '2025-02-02', NULL, false, 'Día de la Candelaria'),
('Día de San Valentín 2025', '2025-02-14', NULL, false, 'Día del Amor y la Amistad'),
('Día de la Bandera 2025', '2025-02-24', NULL, false, 'Día de la Bandera'),
('Jueves Santo 2025', '2025-04-17', NULL, false, 'Jueves Santo'),
('Día de las Madres 2025', '2025-05-10', NULL, false, 'Día de las Madres'),
('Día del Padre 2025', '2025-06-15', NULL, false, 'Día del Padre'),
('Día de Muertos 2025', '2025-11-02', NULL, false, 'Día de los Fieles Difuntos'),
('Día de la Virgen de Guadalupe 2025', '2025-12-12', NULL, false, 'Día de la Virgen de Guadalupe'),
('Nochebuena 2025', '2025-12-24', NULL, false, 'Nochebuena'),
('Fin de Año 2025', '2025-12-31', NULL, false, 'Fin de Año'),

-- DÍAS FESTIVOS 2026
-- Días festivos nacionales 2026 (aplican a todas las oficinas)
('Año Nuevo 2026', '2026-01-01', NULL, true, 'Año Nuevo'),
('Día de la Constitución 2026', '2026-02-02', NULL, true, 'Primer lunes de febrero'),
('Natalicio de Benito Juárez 2026', '2026-03-16', NULL, true, 'Tercer lunes de marzo'),
('Jueves Santo 2026', '2026-04-02', NULL, false, 'Jueves Santo'),
('Viernes Santo 2026', '2026-04-03', NULL, true, 'Viernes Santo'),
('Día del Trabajo 2026', '2026-05-01', NULL, true, 'Día del Trabajo'),
('Día de la Independencia 2026', '2026-09-16', NULL, true, 'Grito de Independencia'),
('Día de la Revolución 2026', '2026-11-16', NULL, true, 'Tercer lunes de noviembre'),
('Navidad 2026', '2026-12-25', NULL, true, 'Navidad'),

-- Días festivos adicionales comunes 2026
('Día de Reyes 2026', '2026-01-06', NULL, false, 'Día de los Reyes Magos'),
('Día de la Candelaria 2026', '2026-02-02', NULL, false, 'Día de la Candelaria'),
('Día de San Valentín 2026', '2026-02-14', NULL, false, 'Día del Amor y la Amistad'),
('Día de la Bandera 2026', '2026-02-24', NULL, false, 'Día de la Bandera'),
('Día de las Madres 2026', '2026-05-10', NULL, false, 'Día de las Madres'),
('Día del Padre 2026', '2026-06-15', NULL, false, 'Día del Padre'),
('Día de Muertos 2026', '2026-11-02', NULL, false, 'Día de los Fieles Difuntos'),
('Día de la Virgen de Guadalupe 2026', '2026-12-12', NULL, false, 'Día de la Virgen de Guadalupe'),
('Nochebuena 2026', '2026-12-24', NULL, false, 'Nochebuena'),
('Fin de Año 2026', '2026-12-31', NULL, false, 'Fin de Año'),

-- DÍAS FESTIVOS 2027 (para asegurar continuidad)
-- Días festivos nacionales 2027 (aplican a todas las oficinas)
('Año Nuevo 2027', '2027-01-01', NULL, true, 'Año Nuevo'),
('Día de la Constitución 2027', '2027-02-01', NULL, true, 'Primer lunes de febrero'),
('Natalicio de Benito Juárez 2027', '2027-03-15', NULL, true, 'Tercer lunes de marzo'),
('Jueves Santo 2027', '2027-03-25', NULL, false, 'Jueves Santo'),
('Viernes Santo 2027', '2027-03-26', NULL, true, 'Viernes Santo'),
('Día del Trabajo 2027', '2027-05-01', NULL, true, 'Día del Trabajo'),
('Día de la Independencia 2027', '2027-09-16', NULL, true, 'Grito de Independencia'),
('Día de la Revolución 2027', '2027-11-15', NULL, true, 'Tercer lunes de noviembre'),
('Navidad 2027', '2027-12-25', NULL, true, 'Navidad'),

-- Días festivos adicionales comunes 2027
('Día de Reyes 2027', '2027-01-06', NULL, false, 'Día de los Reyes Magos'),
('Día de la Candelaria 2027', '2027-02-02', NULL, false, 'Día de la Candelaria'),
('Día de San Valentín 2027', '2027-02-14', NULL, false, 'Día del Amor y la Amistad'),
('Día de la Bandera 2027', '2027-02-24', NULL, false, 'Día de la Bandera'),
('Día de las Madres 2027', '2027-05-10', NULL, false, 'Día de las Madres'),
('Día del Padre 2027', '2027-06-15', NULL, false, 'Día del Padre'),
('Día de Muertos 2027', '2027-11-02', NULL, false, 'Día de los Fieles Difuntos'),
('Día de la Virgen de Guadalupe 2027', '2027-12-12', NULL, false, 'Día de la Virgen de Guadalupe'),
('Nochebuena 2027', '2027-12-24', NULL, false, 'Nochebuena'),
('Fin de Año 2027', '2027-12-31', NULL, false, 'Fin de Año');

-- ============================================
-- VERIFICACIÓN DE DÍAS FESTIVOS INSERTADOS
-- ============================================

-- Contar días festivos por año
SELECT 
    EXTRACT(YEAR FROM date) as año,
    COUNT(*) as total_dias_festivos,
    COUNT(CASE WHEN is_national = true THEN 1 END) as nacionales,
    COUNT(CASE WHEN is_national = false THEN 1 END) as adicionales
FROM holidays 
WHERE date >= '2025-01-01' AND date <= '2027-12-31'
GROUP BY EXTRACT(YEAR FROM date)
ORDER BY año;

-- Mostrar próximos días festivos
SELECT 
    name,
    date,
    CASE WHEN is_national THEN 'Nacional' ELSE 'Adicional' END as tipo,
    EXTRACT(DOW FROM date) as dia_semana,
    date - CURRENT_DATE as dias_hasta
FROM holidays 
WHERE date >= CURRENT_DATE 
ORDER BY date 
LIMIT 10;