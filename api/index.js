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
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// === API ENDPOINTS ===

// Register a new user
app.post('/api/register', async (req, res) => {
    // ... (The code for this endpoint is correct and remains the same)
    const { username, fullName, role, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    try {
      const sheets = await getGoogleSheetsClient();
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      const newUserId = `user_${Date.now()}`;
      const newUserRow = [newUserId, username, fullName, role, password_hash];
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: 'Users!A:E',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [newUserRow] },
      });
      res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) { res.status(500).send('Server Error'); }
});
  
// Log in a user
app.post('/api/login', async (req, res) => {
    // ... (The code for this endpoint is correct and remains the same)
  const { username, password } = req.body;
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Users!A:E',
    });
    const users = response.data.values || [];
    const user = users.find(row => row[1] === username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const storedHash = user[4];
    const isMatch = await bcrypt.compare(password, storedHash);
    if (isMatch) {
      res.json({ 
        message: 'Login successful!',
        user: { id: user[0], username: user[1], fullName: user[2], role: user[3] } 
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) { res.status(500).send('Server Error'); }
});

// --- THIS IS THE IMPORTANT CHANGE ---
// We remove the app.listen() and export the app instead for Vercel
module.exports = app;