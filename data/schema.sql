DROP TABLE IF EXISTS book;

CREATE TABLE book (
  id SERIAL PRIMARY KEY,
  img VARCHAR(255),
  bookTitle VARCHAR(255),
  authors VARCHAR(255),
  book_description TEXT,
  isbn VARCHAR(255)
);