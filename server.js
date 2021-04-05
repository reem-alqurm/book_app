'use strict';

// Application Dependencies
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');

// Application Setup
const app = express();
const DATABASE_URL = process.env.DATABASE_URL;
const client = new pg.Client(DATABASE_URL);
const PORT = process.env.PORT || 3001 ;

// Application Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

// API Routes
// Renders the home page
app.get('/', renderHomePage);

// Renders the search form
app.get('/searches/new', showForm);

// Creates a new search to the Google Books API
app.post('/searches', createSearch);

// app.post('/books', addBook);
// app.get('/books/:id', getSingleBook);


// Catch-all
app.get('*', (request, response) => response.status(404).send('This route does not exist'));

client.connect().then(()=>{
app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));});

// HELPER FUNCTIONS
// Only show part of this to get students started
function Book(info) {
  const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';
  this.title = info.title || 'No title available'; // shortcircuit
  this.img=info.imageLinks|| placeholderImage;
  this.description = info.description|| 'No description available';
  this.authers= info.authers|| 'No authers available';
  this.isbn = info.industryIdentifiers[0].identifier || 'No ISBN Available' ;

}

// Note that .ejs file extension is not required

function renderHomePage(request, response) {
  const sqlString = 'SELECT * FROM book;';
  client.query(sqlString)
  .then(result => {
    response.render('pages/index.ejs', {books: result.rows})
  }) .catch(internalserverError(response));

}
function addBook (request, response) {
  const sqlString = 'INSERT INTO book (img, bookTitle, authors, book_description, isbn) VALUES ($1, $2, $3, $4, $5) RETURNING id;';
  const sqlArray = [request.body.img, request.body.bookTitle, request.body.authors, request.body.book_description, request.body.isbn];
  client.query(sqlString, sqlArray)
  .then(result => {
    const ejsObject = { book: request.body };
    response.render('pages/books/detail.ejs', ejsObject);
  })}
// function getSingleBook (req, res) {
//   const sqlString = 'SELECT * FROM book WHERE id=$1;';
//   const sqlArr = [req.params.id];

//   client.query(sqlString, sqlArr)
//   .then( result => {
//     const ejsObject = { books: result.rows[0] };
//     res.render('pages/books/detail.ejs', ejsObject);
//   })
//   .catch(errorThatComesBack => {
//     res.render('pages/error.ejs');
//     console.log(errorThatComesBack);
//   });
// };

function showForm(request, response) {
  response.render('pages/searches/new.ejs');
}

// No API key required
// Console.log request.body and request.body.search
function createSearch(request, response) {
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  // console.log(request.body);
  // console.log(request.body.search);
  
  // can we convert this to ternary?
  if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
  if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }

  superagent.get(url)
    .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
    .then(results => response.render('pages/show', { searchResults: results })).catch(internalserverError(response));
}
function internalserverError(response){
    return (error)=>{
        console.log(error);
        response.status(500).send('somthing Went wrong');
    }
}
