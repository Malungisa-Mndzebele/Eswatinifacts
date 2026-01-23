-- Add country field to data_points table for country comparison functionality

ALTER TABLE data_points 
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Eswatini';

-- Create index for country field for better query performance
CREATE INDEX IF NOT EXISTS idx_data_points_country ON data_points(country);

-- Update existing records to have Eswatini as default country
UPDATE data_points SET country = 'Eswatini' WHERE country IS NULL;
