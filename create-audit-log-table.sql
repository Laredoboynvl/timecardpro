-- Tabla para audit log (registro de actividades)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  office_id UUID NOT NULL REFERENCES offices(id),
  action VARCHAR(100) NOT NULL,
  details TEXT,
  entity_type VARCHAR(50), -- 'employee', 'vacation_request', 'vacation_cycle', 'holiday', etc.
  entity_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_office_id ON audit_logs(office_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Comentarios
COMMENT ON TABLE audit_logs IS 'Registro de todas las acciones realizadas por los usuarios del sistema';
COMMENT ON COLUMN audit_logs.action IS 'Acción realizada: CREATE_EMPLOYEE, UPDATE_EMPLOYEE, DELETE_EMPLOYEE, CREATE_VACATION, APPROVE_VACATION, etc.';
COMMENT ON COLUMN audit_logs.details IS 'Detalles adicionales de la acción en formato JSON o texto libre';