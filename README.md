# Blog Platform with Comments

A full-stack blogging platform: register/login, create/edit/delete posts, and
comment on posts — backed by MySQL.

## Stack

- **Backend:** Node.js + Express
- **Database:** MySQL (via `mysql2`)
- **Frontend:** Plain HTML/CSS/JS, no build step
- **Auth:** Passwords hashed with `crypto.scrypt`; sessions via a signed token
  (HMAC-SHA256), sent as `Authorization: Bearer <token>`

This project talks to a real MySQL server, so it needs `npm install` — Node has no
built-in MySQL client.

## Setup

**1. Create the database and tables:**
```bash
mysql -u root -p < schema.sql
```

**2. Configure environment variables:**
```bash
cp .env.example .env
```
Edit `.env` with your MySQL host/user/password and a random `JWT_SECRET`.

**3. Install dependencies and run:**
```bash
npm install
npm start
```

Open **http://localhost:3000**.

## Features

- **User registration, login, and authentication** — scrypt-hashed passwords,
  signed session tokens, protected write routes
- **Create, edit, delete posts** — only the post's author can edit or delete it
  (enforced server-side, not just hidden in the UI)
- **Comments** — any logged-in user can comment; a comment can be deleted by its
  author or by the post's author (e.g. to moderate their own post)
- **RESTful API** — clean resource-based routes (`/api/posts`,
  `/api/posts/:id/comments`, `/api/comments/:id`, etc.)
- **Search** — filter the feed by title/content client-side

## Project structure

```
blog-platform/
├── server.js
├── schema.sql              # run this against MySQL first
├── .env.example              # copy to .env and fill in
├── config/db.js              # MySQL connection pool
├── middleware/auth.js        # requireAuth / optionalAuth
├── utils/auth.js             # password hashing + session tokens
├── routes/
│   ├── auth.js                 # register, login
│   ├── posts.js                 # post CRUD + comments sub-routes
│   └── comments.js               # comment deletion
└── public/
    ├── index.html              # feed
    ├── post.html                 # single post + comments
    ├── new-post.html / edit-post.html
    ├── login.html / register.html
    ├── css/style.css
    └── js/api.js                  # shared fetch wrapper + nav rendering
```

## API reference

| Method | Route                       | Auth        | Description                          |
|--------|------------------------------|-------------|---------------------------------------|
| POST   | /api/auth/register            | —           | Create an account                     |
| POST   | /api/auth/login                | —           | Log in                                |
| GET    | /api/posts                      | —           | List posts (`?search=`)               |
| GET    | /api/posts/:id                    | —           | Get a post with its comments          |
| POST   | /api/posts                          | required    | Create a post                         |
| PUT    | /api/posts/:id                        | author only | Edit a post                           |
| DELETE | /api/posts/:id                          | author only | Delete a post                         |
| GET    | /api/posts/:id/comments                   | —           | List comments on a post               |
| POST   | /api/posts/:id/comments                     | required    | Add a comment                         |
| DELETE | /api/comments/:id                             | author* only| Delete a comment (*comment or post author) |

## Notes

- Move `JWT_SECRET` and DB credentials to real secrets before deploying anywhere
  public — `.env` is already excluded via `.gitignore`.
