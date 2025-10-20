const express = require('express');
const { google } = require('googleapis');
// ... (rest of your imports)

const app = express();
app.use(cors());
app.use(express.json());

// --- NEW TEST ROUTE ---
app.get('/api/test', (req, res) => {
  console.log('---!!! TEST ENDPOINT WAS SUCCESSFULLY HIT !!!---');
  res.status(200).json({ message: 'The API is alive!' });
});
// ----------------------

// ... (rest of your code, including the /api/login route and module.exports)