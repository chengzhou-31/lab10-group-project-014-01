# CSCI 3308 - Group Project
## Group Details
Team Name: The Dolphins \
Recitation Number: 014 \
Team Number: 01

## Members: 
- Cheng Zhou
- Daniel Medvedev
- Diego Marrero Zilenziger
- Liam Mcchesney
- Louis Marfone
- Matthew Kachensky

## Application Details 
- App Name: **QuickTix**
- Description: Provides a platform which allows individuals to resell their tickets for events to which they cannot attend. Enables registered users to view sellers who are offering tickets, purchase tickets of interest, as well as sell their own tickets. The website will also support a review system which will ensure that scalpers and scammers are flagged.


- Vision Statement: For students who want affordable tickets, **QuickTix** connects those who cannot attend events to recuperate their losses and, in the process, provide an opportunity for others to attend their favorite events. Unlike **Ticketmaster**, **QuickTix** allows you to connect directly to the seller and builds a sense of community through the promotion of person to person transactions.


- Communication Plan: Our team will maintain communication primarily through the use of Discord. Our alternative form of communication will be by cellphone.

## API Details
- `app.get('/')`: Redirects to home
- `app.get('/home')`: When **not** logged in, shows upcoming tickets and all tickets, when logged in, shows tickets you are selling and tickets you are interested in
- `app.get('/login')`: Contains the login page and register page
- `app.post('/login')`: Send post request to db, starts session, and allows user to login
- `app.post('/register')`: Send post request to db, adds new user to it
- `app.post('/interested/add')`: Adds a ticket you are intersted in to you in the db, shows up in `/profile`
- `app.post('/interested/post')`: Deletes a ticket linked to you that you are interested in from the db
- `app.post('/tickets/add')`: Allows user to post a ticket they are selling, will show in profile and in search
- `app.post('/tickets/delete')`: Allows user to delete a ticket they post and are selling from the db
- `app.get('/profile/:id')`: Loads profile page of user that has respective `profile_id`
- `app.post('/review/add')`: Allows user to add review to another review, post request to add review on db
- `app.post('/review/delete')`: Allows user to delete review they gave to another user, post request to remove review on db
- `app.post('/edit_profiel')`: Post request to edit profile (is a modal on `/profile`). Makes changes to profile details, post request to db
- `app.get('/logout')`: Allows user to logout, ends the user session
- `app.get('/search')`: Sends all tickets to frontend, allows for searching (live)