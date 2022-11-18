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

// make sure that the server is listening for client requests (listening on port 3000)
app.listen(3000);
console.log('Server is listening on port 3000');


app.get('/', (req, res) => {
    res.render('pages/home');
});


app.get('/profile', (req, res) => {
    res.render('pages/profile');
});


app.get('/login', (req,res) => {
  res.render('pages/login');
});


app.post('/login', async (req, res) => {
  const query = "SELECT * FROM users WHERE username = $1;"
  db.one(query, [req.body.username])
      .then( async (valid) => {
        //const match = await bcrypt.compare(req.body.password, valid.password);
        if (req.body.password === valid.password){ //change back to match later
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
