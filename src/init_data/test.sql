INSERT INTO users(username, password, email, name, phone)
VALUES('CUJohnnathan', 'cokecan21', 'john@gmail.com', 'John', '7204495050'),
('Abigale44','4as124agf21','abby@colorado.edu','Abby'),
('YakesDramel','drdre441','yakesdr4192@colorado.edu','Yakes', '57944014172'),
('Test','Test','test@colorado.edu','Test'),
('Admin','password','admin@colorado.edu','Admin');

INSERT INTO tickets(name, price, event_type, location, time, date)
VALUES('Taylor Swift', 19.99, 'concert', 'San Francisco', null, '2023-05-15'),
('Cirque du soleil', 250, 'circus show', 'Denver', '060504', '2022-12-12'),
('PolishPolite', 5, 'Stand up comedy', 'Boulder', null, '2023-1-26'),
('CU home game', 24.99 , 'Football game', 'CU stadium', '123000', '2022-12-25'),
('Comic con', 25.50, 'Premium tickets to comic con', 'Pueblo', null, '2023-04-01'),
('The goonies', 0, 'Home concert', '1918 19th street Boulder', null, '2022-12-31'),
('Hikaru Magnus show match', 100, 'ChessBoxing event', 'New york city', null, '2022-12-15');

INSERT INTO reviews(rating, review)
VALUES(4.5, 'Honestly this guy stinks'),
(10, 'I have bought 15 of this guys tickets. Never fails me'),
(0, 'How am I supposed to wire money to his remote offshore account'),
(10, 'Pretty good. Good seats fairly priced tickets'),
(7, 'It was pretty good, but there was an additional entrance fee'),
(5, 'Over priced'),
(9, 'Really good, I just wish we were a little closer');

INSERT INTO seller_to_tickets(user_id, ticket_id)
VALUES(1, 1),
(1, 2),
(3, 3),
(1, 4),
(1,5),
(3,6),
(1,7);

INSERT INTO users_to_reviews(user_id, review_id)
VALUES(1, 2),
(1, 4),
(3, 1),
(3, 3),
(1,5),
(3,6);


INSERT INTO interested_in(user_id, ticket_id)
VALUES(1, 1),
(1,2),
(1,3),
(2,3),
(2,4),
(3,1),
(3,4),
(5,1),
(5,4);