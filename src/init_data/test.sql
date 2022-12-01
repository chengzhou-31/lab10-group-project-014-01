INSERT INTO users(username, password, email, name)
VALUES('CUJohnnathan', 'cokecan21', 'john@gmail.com', 'John'),
('Abigale44','4as124agf21','abby@colorado.edu','Abby'),
('YakesDramel','drdre441','yakesdr4192@colorado.edu','Yakes'),
('Test','Test','test@colorado.edu','Test'),
('Admin','password','admin@colorado.edu','Admin');

INSERT INTO tickets(name, price, event_type, location, time, date)
VALUES('Taylor Swift', 19.99, 'concert', 'my moms house', null, '2021-11-26'),
('Joe Biden', 250, 'circus show', 'Denver', '060504', '2022-12-12'),
('Ronald Jump', 10, 'Stand up comedy', 'Boulder', null, '2022-11-26'),
('i dont do politics', 24.99 , 'Football game', 'CU stadium', '123000', '2022-12-25');

INSERT INTO reviews(rating, review)
VALUES(4.5, 'Honestly this guy stinks'),
(10, 'I have bought 15 of this guys tickets. Never fails me'),
(0, 'How am I supposed to wire money to his remote offshore account'),
(10, 'Pretty good. Good seats fairly priced tickets');

INSERT INTO seller_to_tickets(user_id, ticket_id)
VALUES(1, 1),
(1, 2),
(3, 3),
(1, 4);

INSERT INTO users_to_reviews(user_id, review_id)
VALUES(1, 2),
(1, 4),
(3, 1),
(3, 3);


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