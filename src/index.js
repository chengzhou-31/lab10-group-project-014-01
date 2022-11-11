const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');

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

      })
});

