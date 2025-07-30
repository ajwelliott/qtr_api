const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes/index');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Enable CORS for front-end dev server
app.use(cors({
  origin: 'http://localhost:5173', // adjust for your front end
  credentials: true
}));

// ✅ Increase request body size limits to handle large payloads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ✅ Mount all routes under /
app.use('/', routes);

// ✅ Optional: test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'CORS is working! 🧩' });
});

// ✅ Start server once — on all interfaces for LAN access
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});

module.exports = app;
