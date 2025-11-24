/*
  # Add unique constraint to perfil_menu table
  
  1. Changes
    - Add unique constraint on (idperfil, idmenu) columns in perfil_menu table
    - This will enable proper upsert operations in the application
    
  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Add unique constraint to perfil_menu table
ALTER TABLE perfil_menu 
ADD CONSTRAINT uk_perfil_menu UNIQUE (idperfil, idmenu);