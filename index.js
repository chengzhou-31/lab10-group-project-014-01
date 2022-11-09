const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');

// database configuration
const dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// test your database
db.connect()
    .then(obj => {
        console.log('Database connection successful'); // you can view this message in the docker compose logs
        obj.done(); // success, release the connection;
    })
    .catch(error => {
        console.log('ERROR:', error.message || error);
});

// set view engine to ejs
app.set('view engine', 'ejs');

// specify the usage of JSON for parsing request body
app.use(bodyParser.json());

// initialize session variables
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false,
    })
);
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);


//Adds a ticket to the database
//TODO: Find what pages shouild be redirected to/rendered when complete or fails
//TODO: Test it to make sure it kinda works,
//TODO: Fill in the values that are passed to run the queries
app.post('/addTicket', (req, res) =>{
    //Grab the user who is adding a ticket
    const user = req.body.username;

    //Insert the ticket into the ticket table
    const insert = `INSERT INTO tickets (price, event_type, location, date, time)
                   VALUES ($1, $2, $3, $3, $4, $5);`;
    
    //Link the ticket to the user who added it.
    //TODO: ticket_id needs to be looked at
    const insertTicket = `INSERT INTO users_to_tickets (user_id, ticket_id)
                VALUES((SELECT user_id FROM users WHERE ${user} = username), (SELECT max(ticket_id) FROM tickets));`;

    db.query(insert, []) //Fill in what is passed in
    .then(
        db.query(insertTicket, []) //Fill in what is passed in
        .then(
            res.redirect('/page')
        )
        .catch((err) => {
            res.render('page', {
                error: true,
                message: err.message,
            })
        })
    )
    .catch((err) => {
        res.render('page', {
            error: true,
            message: err.message,
        });
    });
});

app.get('/ticketmaster', (req, res) => {
    axios({
        url: `https://app.ticketmaster.com/discovery/v2/events.json`,
            method: 'GET',
            dataType:'json',
            params: {
                "apikey": req.session.user.api_key,
                "keyword": "Taylor Swift",
                "size": 20,
            }
    })
    .then(results => {
        res.render('Page', {
            results: results.data._embedded.events,
        });
    })
    .catch(err => {
        console.log(err.message);
        res.render('page',{
            results: [],
            message: err.message
        })
    })


});


// make sure that the server is listening for client requests (listening on port 3000)
app.listen(3000);
console.log('Server is listening on port 3000');

app.get('/', (req, res) => {
    res.render('pages/home');
});