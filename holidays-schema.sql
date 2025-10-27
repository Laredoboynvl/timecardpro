-- Script SQL para crear la tabla de días festivos
-- Para ejecutar en Supabase SQL Editor

-- Tabla: holidays
-- Almacena los días festivos configurados por cada oficina
CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_holidays_office ON holidays(office_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_active ON holidays(is_active);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION update_holidays_updated_at();

-- Comentario en la tabla
COMMENT ON TABLE holidays IS 'Tabla para gestionar días festivos por oficina. Los días marcados como festivos no podrán ser tomados como vacaciones.';