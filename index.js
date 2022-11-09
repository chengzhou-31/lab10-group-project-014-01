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
  
  
  //const db = pgp(dbConfig);
  
  // test your database
  db.connect()
    .then(obj => {
      console.log('Database connection successful'); // you can view this message in the docker compose logs
      obj.done(); // success, release the connection;
    })
    .catch(error => {
      console.log('ERROR:', error.message || error);
    });


app.set('view engine', 'ejs');

app.use(bodyParser.json());

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

app.listen(3000);
console.log('Server is listening on port 3000');


// Login API
app.get('/', (req,res) =>{
  res.redirect('/login');
});

app.get('/login', (req,res) => {
  res.render('pages/login');
});

app.post('/login', async (req,res) => {
  const query = "SELECT * FROM users WHERE username = $1;"
  db.one(query, [req.body.username])
    .then( async (valid) => {
      
      const match = await bcrypt.compare(req.body.password, valid.password); 
      if (match){
        req.session.user = {
          api_key: process.env.API_KEY,
        };
        req.session.save();
        res.redirect('/discover');
      }
      else{
        res.redirect('/register');
      }
     

    })
    .catch( err => {
      console.log(err);
      res.render('pages/register', {message: "User does not exist, please create one."});
    })
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to register page.
    return res.redirect('/register');
  }
  next();
};

// Authentication Required
app.use(auth);