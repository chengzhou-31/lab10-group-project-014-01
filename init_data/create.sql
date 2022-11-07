DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    user_id SERIAL primary key,
    username varchar(50) not null,
    password char(50) not null,
    email char(50) not null,
    name char(50) not null
);

CREATE TABLE tickets (
    ticket_id SERIAL primary key,
    price int not null,
    event_type char(50),
    location char(50),
    time real,
    date date
);

CREATE TABLE reviews (
    review_id SERIAL primary key,
    rating REAL,
    review varchar(500)
);

CREATE TABLE users_to_tickets (
    user_id not null,
    ticket_id not null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
);

CREATE TABLE users_to_reviews (
    user_id not null,
    review_id not null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (review_id) REFERENCES reviews(review_id)
);