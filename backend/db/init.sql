DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS matches;

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id),
    po_item_description TEXT NOT NULL,
    catalog_item_id INTEGER NOT NULL,
    catalog_item_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

GRANT ALL PRIVILEGES ON TABLE purchase_orders TO public;
GRANT ALL PRIVILEGES ON TABLE purchase_order_items TO public;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public; 