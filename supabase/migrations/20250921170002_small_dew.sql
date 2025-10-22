/*
  # Add idpedido column to vales_delivery table

  1. Changes
    - Add `idpedido` column to `vales_delivery` table to link vouchers with orders
    - Add foreign key constraint to ensure data integrity
    - Update existing voucher generation to include order ID

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Add idpedido column to vales_delivery table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vales_delivery' AND column_name = 'idpedido'
  ) THEN
    ALTER TABLE vales_delivery ADD COLUMN idpedido INTEGER REFERENCES pedido(idpedido);
  END IF;
END $$;

-- Add index for better performance when querying by idpedido
CREATE INDEX IF NOT EXISTS idx_vales_delivery_idpedido ON vales_delivery(idpedido);