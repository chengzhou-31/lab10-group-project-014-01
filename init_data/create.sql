DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    user_id SERIAL primary key,
    username varchar(50) not null,
    password varchar(50) not null,
    email varchar(50) not null,
    name varchar(50) not null,
    phone varchar(11) not null
);

CREATE TABLE tickets (
    ticket_id SERIAL primary key,
    price real not null,
    event_type varchar(50),
    location varchar(50),
    date date,
    time time
);

CREATE TABLE reviews (
    review_id SERIAL primary key,
    date date,
    rating real,
    review varchar(500)
);

-- Seller to tickets
CREATE TABLE users_to_tickets (
    user_id not null,
    ticket_id not null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
);

-- Buyer to tickets
CREATE TABLE tickets_to_users (
    user_id not null,
    ticket_id not null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
)

-- Shows reviews on user, not reviewer!!
CREATE TABLE users_to_reviews (
    user_id not null,
    review_id not null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (review_id) REFERENCES reviews(review_id)
);