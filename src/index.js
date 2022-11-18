const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');


//Database config - not sure if required:
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);


app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.use(
    session({
      secret: "XASDASDA",
      saveUninitialized: true,
      resave: true,
    })
  );
  
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.listen(3000);
console.log('Server is listening on port 3000');

app.get('/', (req, res) =>{
    res.redirect('/test');
});

app.get('/test', (req, res) =>{
  res.render('pages/test.ejs');
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
