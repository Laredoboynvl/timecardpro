-- Investigar problema de María de Jesús Medina Escalera
-- Script SQL para encontrar inconsistencias en los datos

-- 1. Buscar empleada
SELECT 
  id,
  name,
  first_name,
  last_name,
  hire_date,
  office_id
FROM employees 
WHERE 
  (first_name ILIKE '%maria%' AND last_name ILIKE '%medina%')
  OR name ILIKE '%maria%medina%'
  OR name ILIKE '%medina%escalera%';

-- 2. Buscar ciclos de vacaciones con días usados > 0
SELECT 
  vc.id,
  vc.employee_id,
  e.name as employee_name,
  vc.cycle_start_date,
  vc.cycle_end_date,
  vc.years_of_service,
  vc.days_earned,
  vc.days_used,
  vc.days_available,
  vc.is_expired,
  vc.created_at,
  vc.updated_at
FROM vacation_cycles vc
JOIN employees e ON vc.employee_id = e.id
WHERE 
  (e.first_name ILIKE '%maria%' AND e.last_name ILIKE '%medina%')
  OR e.name ILIKE '%maria%medina%'
  OR e.name ILIKE '%medina%escalera%'
ORDER BY vc.cycle_start_date DESC;

-- 3. Buscar solicitudes de vacaciones para la empleada
SELECT 
  vr.id,
  vr.employee_id,
  e.name as employee_name,
  vr.start_date,
  vr.end_date,
  vr.days_requested,
  vr.status,
  vr.reason,
  vr.created_at,
  vr.approved_at
FROM vacation_requests vr
JOIN employees e ON vr.employee_id = e.id
WHERE 
  (e.first_name ILIKE '%maria%' AND e.last_name ILIKE '%medina%')
  OR e.name ILIKE '%maria%medina%'
  OR e.name ILIKE '%medina%escalera%'
ORDER BY vr.created_at DESC;

-- 4. Comparar datos: empleados con días usados pero sin solicitudes
SELECT 
  e.name,
  e.id as employee_id,
  SUM(vc.days_used) as total_days_used_in_cycles,
  COUNT(vr.id) as total_vacation_requests,
  COALESCE(SUM(vr.days_requested), 0) as total_days_in_requests
FROM employees e
LEFT JOIN vacation_cycles vc ON e.id = vc.employee_id
LEFT JOIN vacation_requests vr ON e.id = vr.employee_id
WHERE 
  (e.first_name ILIKE '%maria%' AND e.last_name ILIKE '%medina%')
  OR e.name ILIKE '%maria%medina%'
  OR e.name ILIKE '%medina%escalera%'
GROUP BY e.id, e.name
HAVING SUM(vc.days_used) > COALESCE(SUM(vr.days_requested), 0);