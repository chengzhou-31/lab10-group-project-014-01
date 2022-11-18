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
    logged_in: false,
    username: undefined,
    email: undefined,
    id: undefined,
};


//Login page
//Loads the login page when the page is attempted to be accessed
app.get("/login", (req, res) => {
    res.render('pages/login');
});


//When the user attempts to login, send a request to the database to check if the user is valid
app.post("/login", async (req, res) => {
    const username = req.body.username;
    //Get the user from the database given the username is correct.
    const query = `SELECT * FROM users WHERE username = $1;`;

    //Do the database query
    db.one(query, [username])
    .then(async (valid) => {
        //Then if a result is found check the password
        if(req.body.password === valid.password){
            //If they do match then store session data
            user.logged_in = true;
            user.username = username;
            user.email = valid.email;
            user.id = valid.user_id;

            //Then save it as a session and go to the homepage
            req.session.user = user;
            req.session.save();
            res.redirect("/home");
        }
        //Otherwise if the passwords don't match do nothing?
        //Update to actually do something?
    })
    //In case the database cannot process the request in any fasion.
    .catch(err => {
        console.log(err);
        res.render('pages/login', {message: "Unknown login"});
    });
});



//The index page should just render the home page
app.get("/", (req, res) => {
    res.redirect("/home");
});


//The home page should send a list of stuff to display.
/**Should send:
 * If the user is logged in req.session.user.logged_in
 * A list of tickets the user is interested in
 * A list of tickets that are for sale
 * A list of tickets for shows/games that are coming up soon
 */
app.get("/home", (req, res) => {
    //Need to test
    //Might return an error if not logged in?
    const interestedQuery = `SELECT * FROM tickets t
                        INNER JOIN interested_in i ON user_id = $1
                        WHERE t.ticket_id = i.ticket_id;`;
    const forSaleQuery = `SELECT * FROM tickets LIMIT 10;`;


    //Finds if the current date is between the current month and next month?
    const comingUpQuery = `SELECT * FROM tickets 
                        WHERE CURRENT_DATE BETWEEN date_trunc('month', CURRENT_DATE) AND (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 second');`;


    var logged = false;
    console.log(req.session.user);
    if(req.session.user === undefined){
        logged = false;
    } else {
        logged = true;
    }
    // Do all of the queries
    db.task('Homepage-contents', async (task) => {
        //Check if the user is logged in.
        var interested = [];
        //If they aren't there is nothing to display for interested
        if(!logged){
            interested = [];
        } else {
            //If they are process the query
            interested = await task.any(interestedQuery, [req.session.user.id]);
        }

        const forSale = await task.any(forSaleQuery);
        const comingUp = await task.any(comingUpQuery);
        // Does the queries and will wait until all have been completed before proceeding
        return {interested, forSale, comingUp};
    })
    .then(({interested, forSale, comingUp}) => {
        // Then render the home page with the results from the query.
        res.render("pages/home", {
            logged_in: logged,
            interested: interested,
            tickets_for_sale: forSale,
            upcoming_events: comingUp,
        });
    })
    .catch((err) => {
        console.log(err.message);
        // What to do if an error occurs.
    });
});








//Adds a ticket to the database
//TODO: Find what pages shouild be redirected to/rendered when complete or fails
//TODO: Test it to make sure it kinda works,
//TODO: Fill in the values that are passed to run the queries
app.post('/ticket/add', (req, res) =>{
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
    db.task("delete-ticket", (task) => {
        return task.batch([
            task.none(
                `DELETE FROM
                    tickets
                WHERE
                    ticket_id = $1;`,
                    []              //List of params aka ticket id
            ),
            task.none(
                `DELETE FROM
                    interested_in
                WHERE
                    ticket_id = $1;`,
                    []
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






//Ticketmaster api call
//TODO: add pages to load
//TODO: add results to pass
//Should only be used when trying to find some tickets?
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
    res.render("/home");
});





// make sure that the server is listening for client requests (listening on port 3000)
app.listen(3000);
console.log('Server is listening on port 3000');


//Log in already matched and updated to what we would need
//Shouldn't need this
app.get('/login', (req,res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  const query = "SELECT * FROM users WHERE username = $1;"
  db.one(query, [req.body.username])
      .then( async (valid) => {
        //const match = await bcrypt.compare(req.body.password, valid.password);
        if (req.body.password === valid.password){ //change back to match later
        console.log("It worked");
          req.session.user = {
            api_key: process.env.API_KEY,
          };
          req.session.save();
          res.redirect('/home');
        }

      })
      .catch( err => {
        console.log(err);
        res.render('pages/login', {message: "Username and Password do not match."});
      })
});


app.get('/search', (req, res) => {
    const query = "SELECT * FROM tickets;";

    db.any(query).then(data => {
        res.render('pages/search', {
            search_results: data
        });
    }).catch(error => {
        res.render("pages/register", {
            error: true,
            message: error.message,
        });
    });
});

// app.get('/search_results', (req, res) => {
//     const re = new RegExp(req.body.searchInput, )
//     var query = `SELECT * FROM tickets`;
//     var count = 0;

//     if (req.body.event_type){
//         query = query + `WHERE event_type = '${req.body.event_type}'`;
//         count = 1;
//     }
    
//     if (req.body.location){
//         if (count){
//             query = query + `AND location = '${req.body.location}'`;
//         }
//         else {
//             query = query + `WHERE location = '${req.body.location}'`;
//             count = 1;
//         }
//     }

//     if (req.body.price){
//         if (count){
//             query = query + `AND price <= '${req.body.price}'`;
//         }
//         else {
//             query = query + `WHERE price <= '${req.body.price}'`;
//             count = 1;
//         }
//     }
    
//     if (req.body.date){
//         if (count){
//             query = query + `AND date = '${req.body.date}'`;
//         }
//         else {
//             query = query + `WHERE date = '${req.body.date}'`;
//             count = 1;
//         }
//     }

//     if (req.body.time){
//         if (count){
//             query = query + `AND time = '${req.body.time}'`;
//         }
//         else {
//             query = query + `WHERE time = '${req.body.time}'`;
//             count = 1;
//         }
//     }

//     query = query + `AND tickets.event_type ~* $1 AND tickets.location ~* $1;`;
//     const values = [re];

//     db.one(query, values)
//       .then((results) =>{
//         res.render("pages/search_results", {results});
//       })
//       .catch((err) => {
//         res.render("pages/search", {
//             results: [],
//             error: true,
//             message: err.message,
//         });
//       });
// });
