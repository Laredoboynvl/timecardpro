# PASOS PARA IMPLEMENTAR LA COLUMNA office_code

## 1. Ejecutar el SQL en Supabase

Ejecuta el archivo `add-office-code-column.sql` en tu base de datos Supabase:

```sql
-- Agregar la columna office_code
ALTER TABLE employees 
ADD COLUMN office_code VARCHAR(10);

-- Agregar comentario a la columna
COMMENT ON COLUMN employees.office_code IS 'Código de la oficina donde está registrado el empleado (TIJ, CDJ, CDMX, NVL, MTY, MAM, HMO, MID)';

-- Crear índice para mejorar consultas por office_code
CREATE INDEX idx_employees_office_code ON employees(office_code);

-- Actualizar registros existentes basándose en employee_code si existe
UPDATE employees 
SET office_code = 
  CASE 
    WHEN employee_code LIKE 'TIJ%' THEN 'TIJ'
    WHEN employee_code LIKE 'CDJ%' THEN 'CDJ'
    WHEN employee_code LIKE 'CDMX%' THEN 'CDMX'
    WHEN employee_code LIKE 'NVL%' THEN 'NVL'
    WHEN employee_code LIKE 'MTY%' THEN 'MTY'
    WHEN employee_code LIKE 'MAM%' THEN 'MAM'
    WHEN employee_code LIKE 'HMO%' THEN 'HMO'
    WHEN employee_code LIKE 'MID%' THEN 'MID'
    ELSE NULL
  END
WHERE office_code IS NULL AND employee_code IS NOT NULL;
```

## 2. Códigos de Oficina a Usar

- **TIJ**: Tijuana
- **CDJ**: Ciudad Juárez  
- **CDMX**: Ciudad de México
- **NVL**: Nuevo Laredo
- **MTY**: Monterrey
- **MAM**: Matamoros
- **HMO**: Hermosillo
- **MID**: Mérida

## 3. Actualizar las Funciones

Las funciones de eliminación ya están actualizadas para usar `office_code` en lugar de UUIDs:

- `deleteAllEmployeesByOffice()` busca por `WHERE office_code = 'TIJ'`
- `deleteAllVacationRequestsByOffice()` busca empleados por office_code, luego sus vacaciones

## 4. Ventajas de este Enfoque

✅ **Más simple**: No depende de UUIDs complejos  
✅ **Más directo**: Búsqueda directa por código de oficina  
✅ **Más intuitivo**: TIJ = Tijuana, CDJ = Ciudad Juárez, etc.  
✅ **Mejor rendimiento**: Índice en office_code  
✅ **Fácil mantenimiento**: Códigos legibles y memorizables  

## 5. Para Probar

Después de ejecutar el SQL:

1. Ve a http://localhost:3001/dashboard/tij
2. Abre F12 → Console
3. Intenta los botones de eliminación
4. Verás logs como:
   ```
   🏢 Código de oficina extraído: TIJ
   📊 Empleados encontrados: 3
   👥 Empleados de TIJ: [{name: "Juan", code: "TIJ001"}, ...]
   ✅ Se eliminaron exitosamente 3 empleados de la oficina TIJ
   ```

## 6. Próximos Pasos

- Ejecutar el SQL en Supabase
- Verificar que la migración de datos funcione correctamente
- Probar las funciones de eliminación
- Actualizar la lógica de creación de empleados para incluir office_code automáticamente