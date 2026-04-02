-- Add created_user_id to existing tables
-- References auth.users(id) from Supabase Auth

ALTER TABLE thlush_menu_items
  ADD COLUMN created_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE thlush_categories
  ADD COLUMN created_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE thlush_bills
  ADD COLUMN created_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
