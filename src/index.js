// import libraries
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


//The user whether or not they are logged in or not
//Add more values
//BUG: User undefined if not logged in?
const user = {
    username: undefined,
    email: undefined,
    id: undefined,
};


//The index page should just render the home page
app.get("/", (req, res) => {
    res.redirect("/home");
});


//Login page
//Loads the login page when the page is attempted to be accessed
app.get("/login", (req, res) => {
    if(req.session.user){
        res.redirect('/home');
    } else {
        res.render('pages/login', {
            logged_in: req.session.user
        });
    }
});


//When the user attempts to login, send a request to the database to check if the user is valid
// Used when the user attempts to submit a login request
app.post("/login", async (req, res) => {
    const username = req.body.username;
    const query = `SELECT * FROM users WHERE username = $1;`;

    //Do the database query
    // db.one(query, [username])
    // .then(async (valid) => {
    //     // const match = await bcrypt.compare(req.body.password, password);
    //     //Change if to if(match) when ready

    //     //Then if a result is found check the password
    //     if(req.body.password === valid.password){
    //         //If they do match then store session data
    //         user.username = username;
    //         user.email = valid.email;
    //         user.id = valid.user_id;

    //         //Then save it as a session and go to the homepage
    //         req.session.user = user;
    //         req.session.save();
    //         res.redirect("/home");
    //     }
    // })
    // //In case the database cannot process the request in any fasion.
    // .catch(err => {
    //     console.log(err);
    //     res.render('pages/login', {message: "Unknown login"});
    // });
    db.any(query, [username]).then(async (data) => {
        if(data[0].username){
            const match = await bcrypt.compare(req.body.password, data[0].password);
            if(match){
                // user.username = username;
                // user.email = data[0].email;
                // user.id = data[0].user_id;
                const user = {
                    username: username,
                    email: data[0].email,
                    id: data[0].id
                }

                // req.session.user = {
                //     api_key: process.env.API_KEY,
                // };
                req.session.user = user;
                req.session.save();
                res.redirect('/home');
            } else {
                throw new Error(`Incorrect username or password.`); 
            }
        } else {
            res.redirect('/login');
        }
    }).catch(error => {
        res.render("pages/login", {
            error: true,
            message: error.message,
            logged_in: req.session.user
        });
    });
});



//Register is added as modal not a page anymore
//Inserts a new user into the database successfuly. 
app.post('/register', async (req, res) => {
    const name = req.body.username;
    const email = req.body.email;
    const username = req.body.username;
    const phone = req.body.phone;
    if(req.body.password != req.body.passwordConf){
        throw new Error('Password does not match');
    }
    console.log(req.body.password);
    const hash = await bcrypt.hash(req.body.password, 10);
    const query = `INSERT INTO users (username, password, email, name, phone)
                VALUES ($1, $2, $3, $4, $5);`;

    db.one(query, [username, hash, email, name, phone]).then(
        res.redirect('/login')
    ).catch(error => {
        res.render("pages/login", {
            logged_in: req.session.user,
            error: true,
            message: error.message,
            logged_in: req.session.user
        });
    });
});


//The home page should send a list of stuff to display.
/**Should send:
 * If the user is logged in req.session.user.logged_in
 * A list of tickets the user is interested in
 * A list of tickets that are for sale
 * A list of tickets for shows/games that are coming up soon
 * Added list of tickets that the user is selling if any
 */
app.get("/home", (req, res) => {
    //List of tickets user is interested in
    const interestedQuery = `SELECT DISTINCT * FROM tickets t
                        INNER JOIN interested_in i ON user_id = $1
                        WHERE t.ticket_id = i.ticket_id LIMIT 5;`;
    
    //List of tickets that are for sale. Lists the first 10 tickets
    const forSaleQuery = `SELECT * FROM tickets LIMIT 5;`;


    //Finds if the current date is between the current month and next month?
    //Need more test cases for when the date is outside 1 month from now
    const comingUpQuery = `SELECT * FROM tickets
                        WHERE (EXTRACT(MONTH FROM date) BETWEEN EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(MONTH FROM CURRENT_DATE)) 
                        AND (EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)) LIMIT 5;`;
    //List of tickets the user is selling
    const sellingQuery = `SELECT * FROM tickets t
                          INNER JOIN seller_to_tickets st ON t.ticket_id = st.ticket_id
                          WHERE user_id = $1 LIMIT 5;`;

    // Do all of the queries
    db.task('Homepage-contents', async (task) => {
        //Check if the user is logged in.
        var interested = [];
        var selling = [];
        //If they aren't there is nothing to display for interested
        if(req.session.user){
            //If they are process the query
            interested = await task.any(interestedQuery, [req.session.user.id]);
            selling = await task.any(sellingQuery, [req.session.user.id]);
        }
        //Other queries that should always be processed
        const forSale = await task.any(forSaleQuery);
        const comingUp = await task.any(comingUpQuery);
        // Does the queries and will wait until all have been completed before proceeding
        return {interested, selling, forSale, comingUp};
    })
    .then(({interested, selling, forSale, comingUp}) => {
        // Then render the home page with the results from the query.
        res.render("pages/home", {
            logged_in: req.session.user,
            interested: interested,
            selling: selling,
            tickets_for_sale: forSale,
            upcoming_events: comingUp,
        });
    })
    .catch((err) => {
        console.log(err.message);
        // What to do if an error occurs.
    });
});


//If a user is interedted in a ticket it should be added to the DB
//BUG: Users can click the button multiple times to keep adding same ticket
//To their interested in
//Temp solution: Made it so when pulling from the DB it only selects distinct
//Should check if the insertion is unique and not repetitive
app.post('/interested/add', (req, res) => {
    //Query to add the ticket.
    //Returns the data inserted
    const query = `INSERT INTO interested_in(user_id, ticket_id)
            VALUES($1, $2) RETURNING *;`;

    //Changed to session as this is only accessed if the user is logged in
    db.query(query, [req.session.user.id, req.body.ticket_id])
    .then(function(data){
        //Just returns to console/log that it was inserted
        // res.status(201).json({
        //     status: 'success',
        //     data: data,
        //     message: 'New ticket interested in',
        // });
        res.redirect('/home');
    })
    .catch(err => {
        //If it can't be inserted just render home
        console.log(err.message);
        res.redirect('/home');
    });
});


//In the case the user is no longer interested in the ticket
app.post('/interested/remove', (req, res) => {
    //Query to remove the ticket the user is interested in
    const query = `DELETE FROM interested_in WHERE user_id = $1 AND ticket_id = $2;`;

    db.any(query, [req.body.user.id, req.body.ticket_id])
    .then(function(data) {
        //If successful, we return that it was removed
        res.status(200).json({
            status: 'Removed successfuly',
            data: data,
            message: 'Removed',
        });
        res.redirect('/home');
    })
    .catch((err) => {
        //Error if could not be deleted
        return console.log(err);
    });
});


app.get('/add', (req,res) => {
    res.render('pages/add',{
        logged_in: req.session.user,
    });
});


//Adds a ticket to the database
app.post('/ticket/add', (req, res) =>{
    //Grab the user who is adding a ticket
    const user = req.body.username;
    var price = parseFloat(req.body.price);
    var time = req.body.time;
    if(time.length == 0){
        time = null;
    }
    //Insert the ticket into the ticket table
    const insert = `INSERT INTO tickets (name, price, event_type, location, date, time)
                   VALUES ($1, $2, $3, $4, $5, $6) returning ticket_id;`;
    
    //Link the ticket to the user who added it.
    //TODO: ticket_id needs to be looked at
    const insertTicket = `INSERT INTO seller_to_tickets (user_id, ticket_id)
                VALUES($1, $2) RETURNING *;`;

    db.query(insert, [
        req.body.title,
        price,
        req.body.type,
        req.body.loc,
        req.body.date,
        time,
        user,
    ])
    .then( (value) =>{
        db.query(insertTicket, [req.session.user.id, value[0].ticket_id])
        .then( (data) =>{
            // res.status(201).json({
            //     data: data,
            //     message: 'Success',
            // });
            res.redirect('/home')
        })
        .catch((err) => {
            res.render('pages/home', {
                logged_in: req.session.user,
                error: true,
                message: err.message,
            })
        })
    })
    .catch((err) => {
        res.render('pages/home', {
            logged_in: req.session.user,
            error: true,
            message: err.message,
        });
    });
});


//Just a test case for above for postman
app.post('/ticket/add/test', (req, res) =>{
    //Grab the user who is adding a ticket
    const user = req.body.username;

    //Insert the ticket into the ticket table
    const insert = `INSERT INTO tickets (price, event_type, location, date, time)
                   VALUES ($1, $2, $3, $4, $5) returning *;`;
    
    //Link the ticket to the user who added it.
    //TODO: ticket_id needs to be looked at
    const insertTicket = `INSERT INTO users_to_tickets (user_id, ticket_id)
                VALUES((SELECT user_id FROM users WHERE $1 = username), (SELECT max(ticket_id) FROM tickets));`;

    db.query(insert, [
        req.body.price,
        req.body.type,
        req.body.loc,
        req.body.data,
        req.body.time,
        user,
    
    ]) //Fill in what is passed in
    .then(
        function(data) {
            res.status(201).json({
                status: 'Adeed',
                data: data,
                message: 'added yes',
            })
        }
        //db.query(insertTicket, [user]) //Fill in what is passed in
        //.then(function (data) { 
        // }
        )
        .catch((err) => {
            res.render('page', {
                error: true,
                message: err.message,
            })
        })
    .catch((err) => {
        res.render('page', {
            error: true,
            message: err.message,
        });
    });
});


//Remove a ticket from the database
app.post("/ticket/delete", (req, res) => {
    ticket_id = req.params.ticket_id;
    db.task("delete-ticket", (task) => {
        return task.batch([
            task.none(
                `DELETE FROM
                    tickets
                WHERE
                    ticket_id = $1;`,
                    [ticket_id]              //List of params aka ticket id
            ),
            task.none(
                `DELETE FROM
                    interested_in
                WHERE
                    ticket_id = $1;`,
                    [ticket_id]
            ),
            
        ]);
    })
    .then(
        //What do to after the ticket has been removed, if it was removed
    )
    .catch((err) => {
        res.render("/userpage", {
            courses: [],
            error: true,
            message: err.message,
        });
    });
});


/**
 *  Query for finding reviews for a specific user
    const reviewsQuery = `SELECT * FROM reviews r
                     INNER JOIN users_to_reviews ur ON r.review_id = ur.review_id
                     WHERE user_id = $1;`;
 */
/**
 * Used to add a review to a user. Need to implement a button that does so.
 */
app.post('/review/add', (req, res) => {
    const query = `INSERT INTO reviews(date, rating, review)
                   VALUES(NULL, $1, $2) RETURNING *;`;
    db.query(query, [req.body.rating, req.body.review])
    .then((data) => {
        res.status(201).json({
            status: 'success',
            data: data,
            message: 'New ticket interested in',
        });
    })
    .catch((err) => {
        console.log(err.message);
    });
});


/**
 * Removes a review from the database
 * Currently unuseable
 */
app.delete('/review/delete', (req,res) => {
    db.task("delete-review", (task) => {
        return task.batch([
            task.none(
                `DELETE FROM
                    reviews
                WHERE
                    review_id = $1;`,
                    [req.params.review_id]
            ),
            task.none(
                `DELETE FROM
                    users_to_reviews
                WHERE
                    review_id = $1;`,
                    [req.params.review_id]
            ),
            
        ]);
    })
    .then(
        (data) => {
            res.status(200).json({
                status: 'removed',
                data: data,
                message: 'Deleted successfully'
            });
    })
    .catch((err) => {
        res.redirect("/home", {
            error: true,
            message: err.message,
        });
    });
});


//Ticketmaster api call
//TODO: add pages to load
//TODO: add results to pass
//Should only be used when trying to find some tickets?
//Maybe not used
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


//When the user logs out. Should render a logout page, or notify the user that they logged out
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/home");
});


// make sure that the server is listening for client requests (listening on port 3000)
app.listen(3000);
console.log('Server is listening on port 3000');


app.get('/search', (req, res) => {
    const query = "SELECT * FROM tickets;";

    db.any(query).then(data => {
        res.render('pages/search', {
            search_results: data,
            logged_in: req.session.user,
        });
    }).catch(error => {
        res.render("pages/register", {
            error: true,
            message: error.message,
        });
    });
});
