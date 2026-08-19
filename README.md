--EventFlow Website--------

EventFlow is a full-stack event management website built with HTML, CSS, JavaScript, Node.js, Express, and SQLite. It
supports user registration, login, event creation, event browsing, bookings, favorites, contact messages, password reset, and
role-based administrator access.


--------------------1. Main Features---------------

User Features
• Create a new account
• Log in using email or username
• Select User or Admin role
• Maintain a login session
• Create and browse events
• Book events
• Mark events as favorites
• Submit contact messages
• Reset a forgotten password
• Log out

--Admin Features

• Protected Admin Dashboard
• View statistics for users, events, contacts, bookings, favorites, and sessions
• View database records
• Edit supported users, events, contacts, and bookings
• Change user passwords through the admin interface
• Delete supported records
• Delete favorites and sessions
• Normal users are denied administrator access


-------------2. Application Flow---------------

Demo Page
|
v
Login Page
|
+----------------------+
| |
User Login Admin Login
| |
v v
Index / Main Page Admin Dashboard
|
v
Events / Bookings / Favorites / Contact

--User Flow

1. Open EventFlow.
2. The Demo Page is displayed.
3. Select Login.
4. Enter credentials.
5. Select User.
6. Successful authentication opens index.html.
7. Use event-management features.
8. Logout returns to login.html.

--Admin Flow

1. Open EventFlow.
2. Select Login.
3. Enter valid administrator credentials.
4. Select Admin.
5. The backend verifies that the database account has role=admin.
6. Successful authentication opens admin.html.
7. The Admin Dashboard loads protected data.
8. Normal users cannot access administrator APIs or the Admin Dashboard.


----------------3. Technology Stack---------------

--Frontend

• HTML5
• CSS3
• JavaScript
• Tailwind CSS CDN for the current UI

--Backend

• Node.js
• Express.js
• better-sqlite3
• bcrypt
• Nodemailer
• dotenv

--Database

• SQLite

--Authentication

• Session-token authentication
• Bearer token in the Authorization header
• Role-based authorization
• bcrypt password hashing


----------------4. Project Structure-------------------

Event_Management_System-main/
n
nnn backend/
n nnn server.js
n nnn package.json
n nnn package-lock.json
n nnn eventflow.db
n
nnn frontend/
n nnn demo.html
n nnn login.html
n nnn create-account.html
n nnn index.html
n nnn admin.html
n nnn admin.js
n nnn auth.js
n nnn authGuard.js
n nnn routeGuard.js
n nnn logoutButtonSetup.js
n nnn resetPasswordModal.html
n nnn script.js
n nnn style.css
n nnn logo.png
n
nnn database.sql
nnn README.md


----------------------5. Important Files-------------------

• `frontend/demo.html` - Entry/demo page.
• `frontend/login.html` - Login interface and role selection.
• `frontend/create-account.html` - New-account registration.
• `frontend/index.html` - Main authenticated user application.
• `frontend/admin.html` - Protected administrator dashboard.
• `frontend/admin.js` - Admin authentication, statistics, records, editing, and deletion.
• `frontend/auth.js` - Login, logout, session-token, and current-user helper functions.
• `frontend/routeGuard.js` - Redirects unauthenticated users to login.
• `frontend/authGuard.js` - Page authentication protection.
• `frontend/logoutButtonSetup.js` - Logout control setup.
• `frontend/script.js` - Main application functionality and API calls.
• `frontend/style.css` - Custom styling.
• `backend/server.js` - Express server, database, authentication, sessions, events, bookings, favorites, contact, password
reset, and admin APIs.
• `database.sql` - SQLite table definitions.


------------------6. Database----------------------

EventFlow uses SQLite and stores application information locally.

--Tables

• `users` - account details, credentials, profile information, and role.
• `events` - event information and ownership.
• `contacts` - contact-form messages.
• `bookings` - event bookings and ticket information.
• `favorites` - user/event favorite relationships.
• `sessions` - authenticated login sessions.
• `password_resets` - password-reset tokens and expiration.
The `users.role` value determines access:
user
admin
Foreign keys are enabled with:
PRAGMA foreign_keys = ON;


------------------7. Requirements-----------------------

Install:
• Node.js
• npm
• Chrome, Microsoft Edge, Firefox, or another modern browser
SQLite CLI is not required for normal operation because the application uses the `better-sqlite3` Node.js package.


-------------------8. Installation and Running-------------------

Step 1 - Open the backend folder

cd "YOUR_PROJECT_PATH\backend"
Example:
cd "C:\Users\Admin\Downloads\EventFlow_Final_Logout_to_Login\Event_Management_System-main\Event_Management_System-main\backen

Step 2 - Check Node.js

node --version
npm --version

Step 3 - Install dependencies

npm install
Step 4 - Start the server

npm start
Expected message:
EventFlow server running at http://localhost:3000

Step 5 - Open the website

Open:
http://localhost:3000
Keep the backend terminal running while using the website.


-------------9. Database Setup------------------

The SQLite database is created/opened automatically when the server starts. Required tables are created by the backend
when needed.
Normally, you do not need to run SQLite commands manually.
The database stores persistent:
• Accounts
• Events
• Bookings
• Favorites
• Contact messages
• Sessions
• Password-reset information


---------------------10. Demo Account---------------

Email: demo@eventflow.com
Password: demo1234
Role: user
This account is intended for testing normal-user functionality.


---------------11. Administrator Account-------------------

An administrator must have this database value:
role = admin
Selecting Admin on the login page does not by itself make an account an administrator. The backend verifies the selected role
against the role stored in the database.


--------------12. Check User Roles--------------------

If the `sqlite3` command is not installed, use Node.js from the backend folder:
node -e "const Database=require('better-sqlite3'); const db=new Database('./eventflow.db'); console.log(db.prepare('SELECT id
The administrator account should show:
role: 'admin'


----------------13. Authentication---------------

Login uses:
POST /api/auth/login
The backend verifies:
1. Email/username
2. Password
3. Selected role
The password is checked with bcrypt. A session token is then created and returned.
Normal users are sent to:
/index.html
Administrators are sent to:
/admin.html


------------------14. Session Authentication----------------

The frontend sends the session token as:
Authorization: Bearer -session-token-
The backend checks the token against the `sessions` table and verifies expiration. Expired sessions are removed.


-------------------15. Admin Authorization---------------

Administrator APIs verify:
1. A valid authentication token exists.
2. The session belongs to a valid user.
3. The user's database role is `admin`.
Unauthenticated users receive an authentication error. Authenticated non-admin users receive an administrator-access error.


--------------16. Main API Endpoints-----------------

--Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password
--Admin
GET /api/admin/records
DELETE /api/admin/records/:table/:id
Other application APIs handle events, bookings, favorites, and contact messages. Their implementation is defined in
`backend/server.js`.


-----------------17. Password Reset------------

The password-reset process generates a time-limited token. If SMTP is configured, the reset link can be sent by email.
Without SMTP, the link can be logged by the server for local development.
Typical SMTP environment variables:
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
Never commit real SMTP credentials to source control.


-------18. Logout---------------

Logout sends a request to the backend, clears client-side authentication information, and redirects the user to:
/login.html


-------------19. Important Rule: Do Not Open HTML Directly----------

Do not double-click `index.html`, `login.html`, or `admin.html`.
Do not use:
file:///...
Use:
http://localhost:3000
The Node.js server must be running because the frontend communicates with backend APIs.


------------------20. Common Problems----------------

`node` or `npm` is not recognized
Install Node.js and reopen PowerShell.

--------PowerShell blocks npm-----

You can use:
npm.cmd install
npm.cmd start

----------`sqlite3` is not recognized-------

SQLite CLI is not required. Use the Node.js database-check command above.

--------Port 3000 is already in use--------

Stop the previous server/process using port 3000 and run:
npm start

-----Admin login opens the user page-------

Check the database and confirm the administrator has:
role: 'admin'
Also confirm the Login Page sends `role: 'admin'`.

-------Admin page immediately redirects---------

Possible causes:
• Expired session
• Missing token
• Stale browser storage
• Invalid account role
• `/api/auth/me` returning an authentication error
Check browser Developer Tools (`F12`), especially Console and Network, and inspect `/api/auth/me`.

-------Tailwind warning-----------

The current UI uses the Tailwind CDN. A browser warning about `cdn.tailwindcss.com` is a production-build warning and is
not necessarily an application failure. For production, use the Tailwind CLI/PostCSS workflow.


---------------21. Database Backup------------

Before major database changes:
Copy-Item .\eventflow.db .\eventflow_backup.db
Only delete/reset the database when you intentionally want to remove stored development data.


-----------------22. Development Workflow-----------------

1. Stop the server with `Ctrl + C`.
2. Edit the required file.
3. Save changes.
4. Run `npm start`.
5. Open/refresh `http://localhost:3000`.
6. Test the feature.
7. Check browser Console and Network if something fails.


------------------23. Testing Checklist--------------

User
• [ ] Open Demo Page
• [ ] Open Login Page
• [ ] Create account
• [ ] Log in as user
• [ ] Open main application
• [ ] Create event
• [ ] Book event
• [ ] Add/remove favorite
• [ ] Submit contact form
• [ ] Log out
• [ ] Confirm redirect to Login Page
Admin
• [ ] Log in with administrator credentials
• [ ] Select Admin
• [ ] Open Admin Dashboard
• [ ] Confirm statistics
• [ ] View records
• [ ] Edit a supported record
• [ ] Delete a test record
• [ ] Confirm normal user cannot access Admin Dashboard


------------24. Security Notes--------------
This project is suitable primarily for development, learning, and demonstration. Before public production deployment, review
HTTPS, secure session/cookie configuration, CSRF protection, rate limiting, input validation, secret management, SMTP
security, database backups, logging, access-control auditing, and production Tailwind builds.

Never commit passwords, SMTP credentials, API keys, or other secrets.


------------25. Quick Start------------------
cd "YOUR_PROJECT_PATH\backend"
npm install
npm start
Then open:
http://localhost:3000


------------26. Final Application Flow------------------
+----------------+
| Demo Page |
+-------+--------+
|
v
+----------------+
| Login Page |
+-------+--------+
|
+-----------+-----------+
| |
User credentials Admin credentials
| |
v v
+----------------+ +-------------------+
| Index Page | | Admin Dashboard |
+-------+--------+ +---------+---------+
| |
+-------+--------+ |
| | | v
v v v Admin Data
Events Bookings Favorites / Edit / Delete
| | |
+-------+--------+
|
v
Contact / Logout
|
v
Login Page


------------27. Project Summary-------------
EventFlow is a Node.js and SQLite event-management application providing user registration, role-based login, administrator
authorization, a protected Admin Dashboard, events, bookings, favorites, contact messages, sessions, password reset, and
persistent SQLite storage.
The recommended way to run it is:

npm install

npm start

Then open:
http://localhost:3000
Do not open the HTML files directly from the file system.


----------28. License / Project Status---------------------
EventFlow is intended for development, demonstration, and learning purposes. Review and strengthen security configuration
before dep