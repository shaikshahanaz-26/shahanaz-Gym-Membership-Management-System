# Gym Membership Management System — by Shaik Shehanaz

A college project built with Node.js, Express.js, EJS, CSS and MySQL.

## Features
- Dashboard: member count, active and expired memberships, paid revenue
- Member CRUD: add, edit, search, delete
- Membership plan creation and deletion
- Subscriptions with automatic expiry date calculation based on plan duration
- Payment status updates (Pending / Paid / Failed)
- Trainer management and member assignment
- Cream + brown responsive dashboard theme

## Requirements
Install Node.js LTS, MySQL Server, MySQL Workbench, and Visual Studio Code.

## Setup and run
1. Extract the ZIP file.
2. Open the extracted `Shahanaz_Gym_Membership_Management_System` folder in VS Code.
3. In MySQL Workbench, connect to your local MySQL server.
4. Open `database/gym_membership.sql` in Workbench and click the lightning bolt ⚡ to execute it. This creates `gym_membership_db` and its tables.
5. In VS Code, open Terminal → New Terminal.
6. Run `npm install`.
7. Copy `.env.example` and rename the copy to `.env` (same project folder).
8. Open `.env` and set your MySQL credentials:
   - `DB_USER=root` (or your MySQL username)
   - `DB_PASSWORD=your actual MySQL password`
   - If your MySQL password is blank, use `DB_PASSWORD=`
   - Keep `.env` private. Do not upload it publicly.
9. Start the website with `npm start`.
10. Open Chrome and visit `http://localhost:3000`.

## Troubleshooting
- **Access denied for user**: check `DB_USER` and `DB_PASSWORD` in `.env`.
- **Unknown database**: execute the SQL file in Workbench first; verify `DB_NAME=gym_membership_db`.
- **ECONNREFUSED**: start MySQL Server and try again.
- **Port 3000 in use**: change `PORT=3001` in `.env`, restart, then visit `http://localhost:3001`.
- **npm is not recognized**: install Node.js LTS and restart VS Code.
- **Duplicate email**: each member email must be unique.

This is a college demonstration project. It does not include login/authentication; do not use it with sensitive real-world member information without adding security.
