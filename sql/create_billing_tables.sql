-- Customers table
CREATE TABLE thlush_customers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills table
CREATE TABLE thlush_bills (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES thlush_customers(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  total_tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill items table
CREATE TABLE thlush_bill_items (
  id BIGSERIAL PRIMARY KEY,
  bill_id BIGINT NOT NULL REFERENCES thlush_bills(id) ON DELETE CASCADE,
  menu_item_id BIGINT REFERENCES thlush_menu_items(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  sgst DECIMAL(5, 2) NOT NULL DEFAULT 0,
  cgst DECIMAL(5, 2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
