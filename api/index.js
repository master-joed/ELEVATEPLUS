// Import all required packages
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Function to authenticate with Google Sheets
async function getGoogleSheetsClient() {
  console.log('--- 1. Attempting to get Google Sheets client. ---');
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https.googleapis.com/auth/spreadsheets'],
  });
  console.log('--- 2. GoogleAuth object created. ---');
  const sheets = google.sheets({ version: 'v4', auth });
  console.log('--- 3. Google Sheets client successfully created. ---');
  return sheets;
}

// Log in a user
app.post('/api/login', async (req, res) => {
  console.log('--- LOGIN ENDPOINT HIT ---');
  const { username, password } = req.body;
  console.log(`--- Attempting login for user: ${username} ---`);

  try {
    const sheets = await getGoogleSheetsClient();

    console.log('--- 4. Fetching user data from Google Sheet. ---');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Users!A:E',
    });
    console.log('--- 5. Successfully fetched data from sheet. ---');

    const users = response.data.values || [];
    const user = users.find(row => row && row[1] === username);

    if (!user) {
      console.log(`--- User not found: ${username} ---`);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    console.log(`--- User found: ${username}. Comparing password. ---`);

    const storedHash = user[4];
    const isMatch = await bcrypt.compare(password, storedHash);

    if (isMatch) {
      console.log(`--- Password MATCH for user: ${username}. Login successful. ---`);
      res.json({ 
        message: 'Login successful!',
        user: { id: user[0], username: user[1], fullName: user[2], role: user[3] } 
      });
    } else {
      console.log(`--- Password NO MATCH for user: ${username}. ---`);
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    console.error('---!!! CRITICAL ERROR IN LOGIN FUNCTION !!!---', error);
    res.status(500).send('Server Error');
  }
});

// We are not including the /register endpoint for this debug version to keep it clean

module.exports = app;