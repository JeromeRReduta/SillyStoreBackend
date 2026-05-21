DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS cart_items;

DROP TYPE IF EXISTS user_role;
CREATE TYPE user_role AS ENUM('client', 'admin');
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    pw_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'client'
);

DROP TYPE IF EXISTS order_status;
CREATE TYPE order_status AS ENUM('pending', 'completed', 'canceled');

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    user_id INT NOT NULL REFERENCES users ON DELETE CASCADE,
    status order_status NOT NULL DEFAULT 'pending'
);

DROP INDEX IF EXISTS pending_order;
CREATE UNIQUE INDEX pending_order
ON orders (user_id)
WHERE status = 'pending';

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    image_src TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price MONEY NOT NULL -- price amount w/ 2 decimals, but as large as we can before we get to 2^32 - 1 or 4-byte int max

);

CREATE TABLE cart_items (
    order_id INT NOT NULL REFERENCES orders ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products ON DELETE CASCADE,
    quantity INT NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

CREATE VIEW order_view AS 
    SELECT
        o.id,
        TO_CHAR(o.date, 'yyyy-mm-dd') AS date,
        o.user_id,
        status
    FROM orders AS o;

CREATE VIEW product_view AS
    SELECT
        p.id,
        p.image_src,
        p.title,
        p.description,
        p.price::decimal::float8
    FROM products AS p;

CREATE VIEW user_view AS 
    SELECT * FROM users; -- for now, just get whatever user has

CREATE VIEW cart_item_view AS 
    SELECT
        c.order_id,
        c.product_id,
        o.status,
        o.user_id AS creator_id,
        p.description,
        p.image_src,
        p.price::decimal::float8,
        c.quantity,
        p.title
    FROM
        cart_items AS c
    JOIN
        orders AS o
            ON c.order_id = o.id
    JOIN
        products AS p
            ON c.product_id = p.id;