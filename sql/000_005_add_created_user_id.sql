-- Add created_user_id to existing tables
-- References thlush_users(id)

ALTER TABLE thlush_menu_items
  ADD COLUMN created_user_id UUID REFERENCES thlush_users(id) ON DELETE SET NULL;

ALTER TABLE thlush_categories
  ADD COLUMN created_user_id UUID REFERENCES thlush_users(id) ON DELETE SET NULL;

ALTER TABLE thlush_bills
  ADD COLUMN created_user_id UUID REFERENCES thlush_users(id) ON DELETE SET NULL;
