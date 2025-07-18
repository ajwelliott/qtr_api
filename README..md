![Tests](https://github.com/ajwelliott/qtr_api/actions/workflows/test.yml/badge.svg)

# 🐎 QTR API – Horse Racing Data Service

Welcome to **QTR API**, a powerful Node.js + Express + SQL Server API designed for delivering structured horse racing data — including meetings, runners, scratchings, race results, and form history. Built with scalability and speed in mind.

---

## 📦 Features

- RESTful endpoints for racing data
- Efficient SQL Server queries
- Modular controller architecture
- Searchable endpoints with filters
- Jest + Supertest for API testing
- CI-ready with GitHub Actions
- Easy deployment-ready structure

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ajwelliott/qtr_api.git
cd qtr_api

2. Install Dependencies
    npm install

3. Create your .env file
    cp .env.example .env

4. Start the development server
    npm run dev
    Server will run at http://localhost:3000 by default.

🧪 Running Tests
    The project uses Jest and Supertest for API testing:
        npm test
    To debug open handles:
        npm test --detectOpenHandles

📁 Project Structure
    node-api-sqlserver/
├── controllers/           # All route logic
├── routes/                # Route definitions
├── db/                    # SQL Server connection config
├── tests/                 # Jest + Supertest test files
├── .env                   # Your environment variables
├── app.js                 # Entry point
├── README.md              # This file!

📄 Example API Endpoints
| Method | Endpoint                         | Description                           |
| ------ | -------------------------------- | ------------------------------------- |
| GET    | `/api/meetings`                  | Returns list of meetings + races      |
| GET    | `/api/scratchings`               | All scratchings                       |
| GET    | `/api/meetings/:id/scratchings`  | Scratchings for a specific meeting    |
| GET    | `/api/runners/:runnerId/profile` | Profile for a specific runner         |
| GET    | `/api/runners/:runnerId/history` | Form history for runner               |
| GET    | `/api/form-history`              | Filtered form history (by name, date) |
| GET    | `/api/results/:raceId`           | Results for a specific race           |
| GET    | `/api/results`                   | All results                           |

Many endpoints support query parameters for pagination or filtering.

🔐 Environment Variables (.env)
PORT=3000
DB_USER=your_username
DB_PASSWORD=your_password
DB_SERVER=your_sql_server
DB_DATABASE=your_database

🛠 CI/CD: GitHub Actions
This project includes a pre-configured CI pipeline:

.github/workflows/nodejs.yml

name: Run Tests
on:
  push:
    branches: [ "main" ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

📡 Deployment Options
Render.com

Railway.app

Azure App Service (SQL Server-native)

🙋‍♂️ Author
Aaron J. Elliott
GitHub @ajwelliott

📘 License
MIT — free to use and modify ✌️