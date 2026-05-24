# SillyStoreBackend

This is the backend portion of my Silly Store Project. This covers 2 things:

1. Database implementation. As of writing this, it's [Postgres](https://www.postgresql.org/).
2. A backend API. As of writing this, it's mainly done through [Express](https://expressjs.com/) middleware.

# How to host locally

1. Set up postgres database

```
$ npm i postgres
$ createdb -U YOUR_USERNAME silly_store_db
$ npm run db:schema
```

For optional seeding:

```
$ npm run db:seed
```

2. Set up .env.production file. See [.env.example](SillyStoreCommon/.env.example) for reference.
3. `npm run start` and start making http requests!

# More Info

- [DATABASE SCHEMA as doc](docs/DbResponses.md)
- [DATABASE SCHEMA FILE](src/infrastructure/psql/setup/schema.sql)
- [BACKEND API DOCS](docs/backendApi_current.md)
