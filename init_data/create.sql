DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    username Varchar(50) primary key,
    password char(50) not null
);