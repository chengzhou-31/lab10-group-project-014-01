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

//Lets the pages use the style sheet
app.use(express.static(__dirname + "/resources"));


//The user whether or not they are logged in or not
//Add more values
//BUG: User undefined if not logged in?
const user = {
    username: undefined,
    email: undefined,
    phone: undefined,
    id: undefined,
};


//The index page should just render the home page
app.get("/", (req, res) => {
    res.redirect("/home");
});


//Login page
//Loads the login page when the page is attempted to be accessed
app.get("/login", (req, res) => {
    //There is no reason to login if you're already logged in
    if(req.session.user){
        res.redirect('/home');
    } else {
        //Otherwise load the page 
        const query = 'SELECT username FROM users;';

        db.any(query).then(data => {
            console.log(data);
            res.render('pages/login', {
                logged_in: req.session.user,
                users: data
            });
        }).catch(error => {
            res.render('pages/login', {
                error: true,
                message: error.message,
                logged_in: req.session.user,
                user: [{username: 'jake'}]
            });
        });
    }
});


//When the user attempts to login, send a request to the database to check if the user is valid
// Used when the user attempts to submit a login request
app.post("/login", async (req, res) => {
    //Get the username
    const username = req.body.username;
    const query = `SELECT * FROM users WHERE username = $1;`;

    const users = await db.any('SELECT username FROM users;');
    console.log(users);

    //Process the log in
    db.any(query, [username]).then(async (data) => {
        //Check that the username exists
        if(data[0].username){
            //Get the password they enter and compare it to the database
            const match = await bcrypt.compare(req.body.password, data[0].password);
            if(match){
                //Then save the data if it was the proper login
                const user = {
                    username: username,
                    email: data[0].email,
                    phone: data[0].phone,
                    id: data[0].user_id
                }
                req.session.user = user;
                req.session.save();
                res.redirect('/home');
            } else {
                //Otherwise just reload the page
                throw new Error(`Incorrect username or password.`); 
            }
        } else {
            res.redirect('/login');
        }
    }).catch(error => {
        res.render("pages/login", {
            error: true,
            message: error.message,
            logged_in: req.session.user,
            users: users
        });
    });
});



//Register is added as modal not a page anymore
//Inserts a new user into the database successfuly. 
app.post('/register', async (req, res) => {
    //Get the data
    const name = req.body.username;
    const email = req.body.email;
    const username = req.body.username;
    const phone = req.body.phone;

    //Encrpty the password
    const hash = await bcrypt.hash(req.body.password, 10);
    const query = `INSERT INTO users (username, password, email, name, phone)
                VALUES ($1, $2, $3, $4, $5);`;

    //Then store the new account in the database
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
                        INNER JOIN seller_to_tickets st ON st.ticket_id = t.ticket_id
                        WHERE t.ticket_id = i.ticket_id LIMIT 5;`;
    
    //List of tickets that are for sale. Lists the first 10 tickets
    const forSaleQuery = `SELECT * FROM tickets t
                            INNER JOIN seller_to_tickets st ON st.ticket_id = t.ticket_id;`;


    //Finds list of tickets for events that are occuring in the future
    const comingUpQuery = `SELECT * FROM tickets t
                            INNER JOIN seller_to_tickets st ON st.ticket_id = t.ticket_id
                            WHERE CURRENT_DATE <= date
                            ORDER BY date LIMIT 5;`;

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
        // console.log(forSale);
        // console.log(comingUp);
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
app.post('/interested/add', (req, res) => {
    //Query to add the ticket.
    //Returns the data inserted
    const query = `INSERT INTO interested_in(user_id, ticket_id)
            VALUES($1, $2) RETURNING *;`;

    //Changed to session as this is only accessed if the user is logged in
    db.query(query, [req.session.user.id, req.body.ticket_id])
    .then(function(data){
        //Just reload the home
        res.redirect('/home');
    })
    .catch(err => {
        //If it can't be inserted just go to home page
        console.log(err.message);
        res.redirect('/home');
    });
});


//In the case the user is no longer interested in the ticket
app.post('/interested/remove', (req, res) => {
    //Query to remove the ticket the user is interested in
    const query = `DELETE FROM interested_in WHERE user_id = $1 AND ticket_id = $2;`;

    db.any(query, [req.session.user.id, req.body.ticket_id])
    .then(function(data) {
        //Load home page if removed
        res.redirect('/home');
    })
    .catch((err) => {
        //Error if could not be deleted
        return console.log(err);
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
    const insertTicket = `INSERT INTO seller_to_tickets (user_id, ticket_id)
                VALUES($1, $2) RETURNING *;`;

    //Insert the ticket into the database
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
        //Connect the seller to the ticket
        db.query(insertTicket, [req.session.user.id, value[0].ticket_id])
        .then( (data) =>{
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


//Remove a ticket from the database
app.post("/ticket/delete", (req, res) => {
    //Get the ticket id
    ticket_id = req.body.ticket_id;

    //Process the delete ticket through 3 different queries
    db.task("delete-ticket", (task) => {
        return task.batch([
            //Delete from the seller
            task.none(
                `DELETE FROM
                    seller_to_tickets
                WHERE
                    ticket_id = $1;`,
                    [ticket_id]
            ),
            //Delete from interested in tickets
            task.none(
                `DELETE FROM
                    interested_in
                WHERE
                    ticket_id = $1;`,
                    [ticket_id]
            ),
            //Delete from tickets
            task.none(
                `DELETE FROM
                    tickets
                WHERE
                    ticket_id = $1;`,
                    [ticket_id]              
            ),
            
            
            
        ])
    })
    .then(
        //Just load home page
        res.redirect('/home')
    ).catch((err) => {
        console.log(err.message);
        res.redirect('/home');
    });
});


// Used to view your profile
app.get('/profile/:id', (req, res) => {

    //Get the id of the profile
    const person = req.params.id;

    //Gets the users info to display
    const getUserInfo = `SELECT * FROM users WHERE user_id = $1;`;

    //Get the review for the users and who wrote them
    const getReviews = `SELECT r.review_id, r.user_id, date, rating, review FROM reviews r
                        INNER JOIN users_to_reviews ur ON ur.user_id = $1
                        WHERE ur.review_id = r.review_id;`;

    //Get the tickets they're selling
    const getSales = `SELECT * FROM tickets t
    INNER JOIN seller_to_tickets st ON t.ticket_id = st.ticket_id
    WHERE user_id = $1 LIMIT 5;`;

    //And tickets that the user is interested in
    const interestedQuery = `SELECT DISTINCT * FROM tickets t
                        INNER JOIN interested_in i ON user_id = $1
                        INNER JOIN seller_to_tickets st ON st.ticket_id = t.ticket_id
                        WHERE t.ticket_id = i.ticket_id LIMIT 5;`;


    var interested = [];

    db.task('profile-contents', async (task) => {

        //Then process the queries
        var info = await task.any(getUserInfo, [person]);
        var reviews = await task.any(getReviews, [person]);
        var selling = await task.any(getSales, [person]);
        if(req.session.user){
            interested = await task.any(interestedQuery, [req.session.user.id]);
        }
        //Passed back as an array of json's, but there is only 1 
        info = info[0];
        //We want to return these queries results
        return{info, reviews, selling, interested};

    }).then(({info, reviews, selling, interested}) => {
        //Then render the profile page with the info that was retrieved
        res.render('pages/profile', {
            logged_in: req.session.user,
            person: person,
            selling: selling,
            reviews: reviews,
            username: info.username,
            phone: info.phone,
            email: info.email,
            name: info.name,
            interested: interested,
        });
    }).catch((err) => {
        console.log(err.message);
        res.redirect('/home');
    });
});



/**
 * Used to add a review to a user. Need to implement a button that does so.
 */
app.post('/review/add', (req, res) => {
    //Insert query
    const query = `INSERT INTO reviews(user_id, date, rating, review)
                   VALUES($1, CURRENT_DATE, $2, $3) RETURNING review_id;`;

    //Who the review is for
    const applyReview = `INSERT INTO users_to_reviews(user_id, review_id) VALUES ($1, $2);`;

    //Process the insertion
    db.query(query, [req.session.user.id, req.body.rating, req.body.review])
    .then((data) => {
        //Then since the insert review returns the review_id we use that to process who the review is for
        db.query(applyReview, [req.body.id, data[0].review_id])
        .then((data) => {
            //Then just releoad the page
            res.redirect(`/profile/` + req.body.id);
        });
        
    })
    .catch((err) => {
        console.log(err.message);
    });
});


/**
 * Removes a review from the database
 */
app.post('/review/delete/:id', (req,res) => {
    //Delete the review and who wrote the review
    db.task("delete-review", (task) => {
        return task.batch([
            task.none(`DELETE FROM users_to_reviews
            WHERE review_id = $1;`, [req.params.id]),

            task.none(`DELETE FROM reviews
            WHERE review_id = $1;`, [req.params.id]),

        ])
    })
    .then(
        //Just reload the page again
        res.redirect('/profile/' + req.body.user_id)
    )
    .catch((err) => {
        res.redirect("/home", {
            error: true,
            message: err.message,
        });
    });
});

/**
 * If the user makes a change to their information
 */
app.post('/edit_profile', async(req, res) => {
    //Grab the info to store
    const name = req.body.name;
    const email = req.body.email;
    const username = req.body.username;
    const phone = req.body.phone;

    //Encrypt the new password
    const hash = await bcrypt.hash(req.body.password, 10);
    const query = `UPDATE users SET username = $1, password = $2, email = $3, name = $4, phone = $5
                WHERE user_id = ${req.session.user.id};`;

    //Then process the update
    db.oneOrNone(query, [username, hash, email, name, phone]).then(() => {
        // reload the page
        res.redirect(`/profile/` + req.body.person);
    }).catch(error => {
        res.redirect(`/profile/` + req.body.person);
    });
});


//Ticketmaster api call
// Not used
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


// Search feature
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
