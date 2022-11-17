DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    user_id SERIAL primary key,
    username varchar(50) not null,
    password varchar(50) not null,
    email varchar(50) not null,
    name varchar(50) not null,
    phone varchar(11)
);

DROP TABLE IF EXISTS tickets CASCADE;
CREATE TABLE tickets (
    ticket_id SERIAL primary key,
    name varchar(100) not null,
    price real not null,
    event_type varchar(50),
    location varchar(50),
    date date,
    time time
);

DROP TABLE IF EXISTS reviews CASCADE;
CREATE TABLE reviews (
    review_id SERIAL primary key,
    date date,
    rating real,
    review varchar(500)
);

-- Seller to tickets
DROP TABLE IF EXISTS seller_to_tickets CASCADE;
CREATE TABLE seller_to_tickets (
    user_id int not null,
    ticket_id int not null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
);

-- Buyer to tickets
DROP TABLE IF EXISTS buyer_to_tickets CASCADE;
CREATE TABLE buyer_to_tickets (
    user_id int,
    ticket_id int not null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
);

-- Shows reviews on user, not reviewer!!
DROP TABLE IF EXISTS users_to_reviews CASCADE;
CREATE TABLE users_to_reviews (
    user_id int not null,
    review_id int not null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (review_id) REFERENCES reviews(review_id)
);

-- Lists the tickets that a user is interested in
DROP TABLE IF EXISTS interested_in (
    user_id int NOT NULL,
    ticket_id int NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);