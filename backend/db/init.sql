CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    po_item TEXT NOT NULL,
    catalog_item_id INTEGER NOT NULL,
    catalog_item_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 