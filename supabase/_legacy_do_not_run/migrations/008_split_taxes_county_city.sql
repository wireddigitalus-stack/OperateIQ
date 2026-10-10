-- Alter property_details to split taxes into county and city taxes
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS taxes_county_annual NUMERIC(10,2) DEFAULT 0;
ALTER TABLE property_details ADD COLUMN IF NOT EXISTS taxes_city_annual NUMERIC(10,2) DEFAULT 0;
