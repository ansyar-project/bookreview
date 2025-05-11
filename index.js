import express from 'express';
import bodyParser from 'body-parser';
import pool, { migrate } from './db.js';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

let books = [];
let booksDisplay = [];

async function fetchBooks() {
  try {
    const result = await pool.query('SELECT books.*, review FROM books LEFT JOIN reviews ON books.id = reviews.book_id');
    books = result.rows;
    // console.log(books);
    console.log(`Successfully fetched ${books.length} books from the database`);
  } catch (error) {
    console.error('Error fetching books:', error);
  }
};

async function init() {
  await migrate();
  app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
//   await fetchBooks();
};



const API_BASE_URL = process.env.API_BOOK_URL;

app.get('/', async (req, res) => {
    await fetchBooks();
    books.forEach(book => {
        book.image_url = `${API_BASE_URL}${book.image_url}`;
        book.read_date_text = new Date(book.read_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    });
    res.render('index', { books: books });
});

app.get("/add-review", async (req, res) => {
  res.render("add-review");
}
);

async function saveReview(book) {
  try {
    const result = await pool.query(
      'INSERT INTO books (title, "ISBN", image_url, rating, read_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', 
      [book.title, book.ISBN, `/${book.ISBN}-L.jpg`, `${book.rating}`,book.read_date, new Date(), new Date()]);
    const bookId = result.rows[0].id;
    await pool.query(
      'INSERT INTO reviews (book_id, review) VALUES ($1, $2)', 
      [bookId, book.review]);
      return bookId;
  } catch (error) {
    console.error('Error saving review:', error);
    return null;
  }
  
};

app.post("/add-review", async (req, res) => {
    const book = req.body;
    try {
        const book_id = await saveReview(book);
        console.log(`Review added for book ID ${book_id}`);
        res.redirect('/');
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/edit-review", (req, res) => {
  const bookId = parseInt(req.query.id);
  // console.log(bookId);
  // console.log(booksDisplay);
  const book = books.find(b => b.id === bookId);
  // console.log(book.read_date);
  
  res.render("edit-review", {book: book})
});

async function editReview(book, bookId) {
  try {
    const query1 = `
        UPDATE books
        SET title = $1, "ISBN" = $2, rating = $3, read_date = $4, updated_at = $5, image_url = $6
        WHERE id = $7 RETURNING id;
      `;

    const query2 = `
        UPDATE reviews
        SET review = $1
        WHERE book_id = $2 RETURNING book_id;
      `
    const result = await pool.query(query1,[book.title,book.ISBN,book.rating,book.read_date,new Date(),`/${book.ISBN}-L.jpg`,bookId]);
    const result2 = await pool.query(query2,[book.review,bookId]);

    console.log(`Review edited for book ID ${result.rows[0].id}`);
    return bookId;
  } catch (err) {
    console.error('Error editing review:', err);
    // res.status(500).send('Internal Server Error');
    return null;
  }
};

app.post("/edit-review", async (req, res) => {
  const bookId = parseInt(req.query.id);
  const book = req.body;

  const result = await editReview(book,bookId);

  if (result) {
    res.redirect('/');
  } else {
    res.status(500).send("Internal Server Error");
  }
});
  
async function deleteReview(bookId) {
  try {
    const query1 = `
        DELETE FROM reviews 
        WHERE book_id = $1;
      `;
    const query2 = `
        DELETE FROM books 
        WHERE id = $1;
      `;

    await pool.query(query1,[bookId]);
    await pool.query(query2,[bookId]);
    console.log(`Successfully deleted book with ID ${bookId}`);
    return true;
  } catch (error) {
    console.log("Error deleting books: ", error);
    return false;
  }
};

app.get("/delete-review", async (req,res) => {
  const bookId = parseInt(req.query.id);
  const result = await deleteReview(bookId);
  if (result) {
    res.redirect("/");
  }
  else {
    res.status(500).send("Internal Server Error");
  }
});
 
app.get("/health", (req,res) => 
{
  res.status(200).send("OK");
});


init();