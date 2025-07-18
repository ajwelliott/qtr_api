const express = require('express');
const cors = require('cors'); // ✅ Add this
const dotenv = require('dotenv');
const routes = require('./routes/index');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Enable CORS for Vite dev server
app.use(cors({
  origin: 'http://localhost:5173', // Vite runs on 5173
  credentials: true
}));

// ✅ Parse JSON bodies
app.use(express.json());

// ✅ Register API routes
app.use('/api', routes);

// ✅ Optional: test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'CORS is working! 🧩' });
});

// ✅ Start the server unless running tests
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
