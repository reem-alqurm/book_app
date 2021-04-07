'use strict';

// Application Dependencies
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');


// Application Setup
const app = express();
const DATABASE_URL = process.env.DATABASE_URL;
const client = new pg.Client(DATABASE_URL);
const PORT = process.env.PORT || 3001;

// Application Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));

// API Routes
// Renders the home page
app.get('/', renderHomePage);

// Renders the search form
app.get('/searches/new', showForm);

// Creates a new search to the Google Books API
app.post('/searches', createSearch);

app.post('/books', addBook );
app.get('/books/:id([0-9]+)', getSingleBook);

app.put('/updateBook/:id([0-9]+)', putSingleBook);
app.delete('/book/:id([0-9]+)', deleteSingleBook);

// Catch-all
app.use('*', (request, response) => response.status(404).send('This route does not exist'));

client.connect().then(() => {
  app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));
});

// HELPER FUNCTIONS
// Only show part of this to get students started
function Book(info) {
  const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';
  this.booktitle = info.title || 'No title available'; // shortcircuit
  this.img = (info.imageLinks && info.imageLinks.thumbnail)? info.imageLinks.thumbnail: placeholderImage;
  this.description = info.description || 'No description available';
  this.authors = info.authers || 'No authers available';
  this.isbn = (info.industryIdentifiers && info.industryIdentifiers[0].identifier) ? info.industryIdentifiers[0].identifier : 'No ISBN Available';

}

// Note that .ejs file extension is not required

function renderHomePage(request, response) {
  const sqlString = 'SELECT * FROM book;';
  client.query(sqlString)
    .then(result => {
      const books = result.rows;
      // console.log(books)
      response.render('pages/index', { books: books, total: result.rowCount })
    })

    .catch(internalserverError(response));

}

function getSingleBook(request, response) {
  const id = request.params.id;
  const sqlString = 'SELECT * FROM book WHERE id=$1;';
  const sqlArray = [id];
  client.query(sqlString,sqlArray).then(result => {
      response.render('pages/books/show', { book: result.rows[0] })}).catch(internalserverError(response));
  }

function addBook (request, response) {
  const book = request.body;
  const sql = 'INSERT INTO book (img,booktitle,authors , book_description,isbn ) VALUES ($1, $2, $3, $4, $5) RETURNING id;';
  const values = [book.img, book.booktitle, book.authors, book.description, book.isbn];
  client.query(sql, values)
  .then(result => {
    const ejsObject = { book: request.body };
    response.redirect(`/books/${result.rows[0].id}`);
  }).catch(internalserverError(response));
}


function showForm(request, response) {
        response.render('pages/searches/new');
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


     
       // Delete Book Route
  function deleteSingleBook (request, response)
  {
    const id = request.params.id;
    const sql = 'DELETE FROM book WHERE id=$1;';
    client.query(sql, [id]).then(result => {
      response.redirect('/');
    })
    .catch(internalserverError(response));
  }

  // Update Book Route
  function putSingleBook(request, response){
    console.log("hellllo"); 
     const id = request.params.id;
    const book =request.body
    const sql = 'UPDATE book SET img=$1, booktitle=$2, authors=$3, book_description=$4, isbn=$5 WHERE id=$6;';
    const sqlArr =[book.image, book.title, book.author, book.description, book.isbn, id];
    console.log(sqlArr);
    client.query(sql, sqlArr).then(result => {
    response.redirect(`/`);
    })
    .catch(internalserverError(response));
  }


function internalserverError(response) {
        return (error) => {
          console.log(error);
          response.status(500).send('somthing Went wrong');
        }
}