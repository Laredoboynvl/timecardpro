-- ============================================
-- TIMECARD PRO - DATOS INICIALES OBLIGATORIOS
-- Insertar datos básicos para el funcionamiento del sistema
-- Ejecutar DESPUÉS del script 01-create-all-tables.sql
-- ============================================

-- 1. INSERTAR OFICINAS PRINCIPALES
INSERT INTO offices (code, name, address, phone, email, manager, timezone) VALUES
('TIJ', 'Tijuana', 'Av. Revolución 1234, Tijuana, BC', '+52 664 123 4567', 'tijuana@timecard.com', 'Juan Pérez', 'America/Tijuana'),
('MXL', 'Mexicali', 'Av. López Mateos 5678, Mexicali, BC', '+52 686 987 6543', 'mexicali@timecard.com', 'María González', 'America/Tijuana'),
('ENS', 'Ensenada', 'Av. Juárez 9012, Ensenada, BC', '+52 646 555 1234', 'ensenada@timecard.com', 'Carlos Rodríguez', 'America/Tijuana'),
('TEC', 'Tecate', 'Av. Hidalgo 3456, Tecate, BC', '+52 665 777 8899', 'tecate@timecard.com', 'Ana Martínez', 'America/Tijuana'),
('NLA', 'Nuevo Laredo', 'Av. Guerrero 7890, Nuevo Laredo, TAM', '+52 867 444 5566', 'nuevolardo@timecard.com', 'Luis Hernández', 'America/Mexico_City'),
('MTY', 'Monterrey', 'Av. Constitución 2468, Monterrey, NL', '+52 81 333 7788', 'monterrey@timecard.com', 'Patricia López', 'America/Mexico_City'),
('CDMX', 'Ciudad de México', 'Av. Insurgentes 1357, CDMX', '+52 55 222 9900', 'cdmx@timecard.com', 'Roberto Silva', 'America/Mexico_City'),
('GDL', 'Guadalajara', 'Av. Chapultepec 8642, Guadalajara, JAL', '+52 33 111 2233', 'guadalajara@timecard.com', 'Elena Ramírez', 'America/Mexico_City');

-- 2. INSERTAR DÍAS FESTIVOS NACIONALES MEXICANOS 2025
INSERT INTO holidays (name, date, office_code, is_national, description) VALUES
-- Días festivos nacionales (aplican a todas las oficinas)
('Año Nuevo', '2025-01-01', NULL, true, 'Año Nuevo'),
('Día de la Constitución', '2025-02-03', NULL, true, 'Primer lunes de febrero'),
('Natalicio de Benito Juárez', '2025-03-17', NULL, true, 'Tercer lunes de marzo'),
('Viernes Santo', '2025-04-18', NULL, true, 'Viernes Santo'),
('Día del Trabajo', '2025-05-01', NULL, true, 'Día del Trabajo'),
('Día de la Independencia', '2025-09-16', NULL, true, 'Grito de Independencia'),
('Día de la Revolución', '2025-11-17', NULL, true, 'Tercer lunes de noviembre'),
('Navidad', '2025-12-25', NULL, true, 'Navidad'),

-- Días festivos adicionales comunes
('Día de Reyes', '2025-01-06', NULL, false, 'Día de los Reyes Magos'),
('Día de la Candelaria', '2025-02-02', NULL, false, 'Día de la Candelaria'),
('Día de San Valentín', '2025-02-14', NULL, false, 'Día del Amor y la Amistad'),
('Día de la Bandera', '2025-02-24', NULL, false, 'Día de la Bandera'),
('Jueves Santo', '2025-04-17', NULL, false, 'Jueves Santo'),
('Día de las Madres', '2025-05-10', NULL, false, 'Día de las Madres'),
('Día del Padre', '2025-06-15', NULL, false, 'Día del Padre'),
('Día de Muertos', '2025-11-02', NULL, false, 'Día de los Fieles Difuntos'),
('Día de la Virgen de Guadalupe', '2025-12-12', NULL, false, 'Día de la Virgen de Guadalupe'),
('Nochebuena', '2025-12-24', NULL, false, 'Nochebuena'),
('Fin de Año', '2025-12-31', NULL, false, 'Fin de Año');

-- 3. INSERTAR EMPLEADOS DE EJEMPLO
INSERT INTO employees (employee_number, name, email, phone, position, hire_date, office_code, salary) VALUES
-- Empleados Tijuana
('TIJ-0001', 'Juan Carlos Pérez González', 'juan.perez@timecard.com', '+52 664 111 2233', 'supervisor', '2020-01-15', 'TIJ', 25000.00),
('TIJ-0002', 'María Elena López Martínez', 'maria.lopez@timecard.com', '+52 664 222 3344', 'analista', '2021-03-20', 'TIJ', 18000.00),
('TIJ-0003', 'Carlos Roberto Silva Hernández', 'carlos.silva@timecard.com', '+52 664 333 4455', 'analista', '2022-06-10', 'TIJ', 19000.00),
('TIJ-0004', 'Ana Patricia Rodríguez Flores', 'ana.rodriguez@timecard.com', '+52 664 444 5566', 'spoc', '2019-11-05', 'TIJ', 22000.00),

-- Empleados Mexicali
('MXL-0001', 'Luis Fernando García Morales', 'luis.garcia@timecard.com', '+52 686 111 7788', 'supervisor', '2020-08-12', 'MXL', 24000.00),
('MXL-0002', 'Patricia Isabel Martínez Cruz', 'patricia.martinez@timecard.com', '+52 686 222 8899', 'analista', '2021-12-03', 'MXL', 17500.00),
('MXL-0003', 'Roberto Alejandro Mendoza Torres', 'roberto.mendoza@timecard.com', '+52 686 333 9900', 'analista', '2023-02-14', 'MXL', 18500.00),

-- Empleados Nuevo Laredo
('NLA-0001', 'Elena Sofía Ramírez Gutiérrez', 'elena.ramirez@timecard.com', '+52 867 111 5544', 'supervisor', '2019-04-18', 'NLA', 26000.00),
('NLA-0002', 'Diego Andrés Vargas Jiménez', 'diego.vargas@timecard.com', '+52 867 222 6655', 'analista', '2022-09-25', 'NLA', 19500.00),
('NLA-0003', 'Carmen Alejandra Ruiz Delgado', 'carmen.ruiz@timecard.com', '+52 867 333 7766', 'spoc', '2021-07-08', 'NLA', 21000.00),

-- Empleados CDMX
('CDMX-0001', 'Fernando José Castro Moreno', 'fernando.castro@timecard.com', '+52 55 111 3322', 'supervisor', '2018-10-30', 'CDMX', 28000.00),
('CDMX-0002', 'Gabriela María Torres Sandoval', 'gabriela.torres@timecard.com', '+52 55 222 4433', 'analista', '2023-01-16', 'CDMX', 20000.00);

-- 4. INSERTAR CICLOS DE VACACIONES PARA TODOS LOS EMPLEADOS
-- Función para calcular días de vacaciones según antigüedad
-- 1 año: 12 días, 2 años: 14 días, 3 años: 16 días, 4 años: 18 días, 5 años: 20 días, etc.

-- Ciclos para empleados con diferentes antigüedades
-- Juan Carlos Pérez (TIJ-0001) - 5 años = 20 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-01-15', '2026-01-14', 20, 20 
FROM employees WHERE employee_number = 'TIJ-0001';

-- María Elena López (TIJ-0002) - 4 años = 18 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-03-20', '2026-03-19', 18, 18 
FROM employees WHERE employee_number = 'TIJ-0002';

-- Carlos Roberto Silva (TIJ-0003) - 3 años = 16 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-06-10', '2026-06-09', 16, 16 
FROM employees WHERE employee_number = 'TIJ-0003';

-- Ana Patricia Rodríguez (TIJ-0004) - 6 años = 22 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-11-05', '2026-11-04', 22, 22 
FROM employees WHERE employee_number = 'TIJ-0004';

-- Luis Fernando García (MXL-0001) - 5 años = 20 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-08-12', '2026-08-11', 20, 20 
FROM employees WHERE employee_number = 'MXL-0001';

-- Patricia Isabel Martínez (MXL-0002) - 4 años = 18 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-12-03', '2026-12-02', 18, 18 
FROM employees WHERE employee_number = 'MXL-0002';

-- Roberto Alejandro Mendoza (MXL-0003) - 2 años = 14 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-02-14', '2026-02-13', 14, 14 
FROM employees WHERE employee_number = 'MXL-0003';

-- Elena Sofía Ramírez (NLA-0001) - 6 años = 22 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-04-18', '2026-04-17', 22, 22 
FROM employees WHERE employee_number = 'NLA-0001';

-- Diego Andrés Vargas (NLA-0002) - 3 años = 16 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-09-25', '2026-09-24', 16, 16 
FROM employees WHERE employee_number = 'NLA-0002';

-- Carmen Alejandra Ruiz (NLA-0003) - 4 años = 18 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-07-08', '2026-07-07', 18, 18 
FROM employees WHERE employee_number = 'NLA-0003';

-- Fernando José Castro (CDMX-0001) - 7 años = 24 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-10-30', '2026-10-29', 24, 24 
FROM employees WHERE employee_number = 'CDMX-0001';

-- Gabriela María Torres (CDMX-0002) - 2 años = 14 días
INSERT INTO vacation_cycles (employee_id, cycle_year, start_date, end_date, total_days, remaining_days) 
SELECT id, 2025, '2025-01-16', '2026-01-15', 14, 14 
FROM employees WHERE employee_number = 'CDMX-0002';

-- ============================================
-- DATOS INICIALES INSERTADOS CORRECTAMENTE
-- ============================================

-- Verificar datos insertados
SELECT 'Oficinas creadas:' as tipo, COUNT(*) as cantidad FROM offices
UNION ALL
SELECT 'Empleados creados:', COUNT(*) FROM employees
UNION ALL
SELECT 'Días festivos:', COUNT(*) FROM holidays
UNION ALL
SELECT 'Ciclos de vacaciones:', COUNT(*) FROM vacation_cycles;