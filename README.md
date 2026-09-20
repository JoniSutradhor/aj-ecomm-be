# aj-ecomm-be

AJ e-commerce back end, a REST API.

- **NestJS** (CommonJS, TypeScript)
- **PostgreSQL** with **TypeORM**
- **JWT** auth (`passport-jwt`, `bcryptjs`), roles `admin` / `customer`

# Development

Needs a running PostgreSQL.

```
nvm use
npm install
cp .env.example .env     # then set DB_* and JWT_SECRET
npm run start:dev
```

The API is served under `/api` (default `http://localhost:8080/api`, matching `VITE_API_URL` in the front end).

On first start an admin account is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if no admin exists.

`DB_SYNCHRONIZE=true` creates and alters tables from the entities. Use it in development only, switch to migrations before production.

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server with watch (same as `start:dev`) |
| `npm run build`     | Build to `dist`                       |
| `npm run start:prod`| Run the build                         |
| `npm run typecheck` | `tsc --noEmit`                        |
| `npm run lint`      | oxlint                                |
| `npm run test`      | Jest                                  |

# Structure

One folder per domain in `src`: `auth`, `users`, `categories`, `products`, `stock`, plus `common` (shared helpers), `config` and `health`.

Every route needs a valid token unless marked `@Public()`. Admin routes use `@Roles(UserRole.ADMIN)`.

# API

| Method | Path                                   | Access | Notes                                                |
| ------ | -------------------------------------- | ------ | ---------------------------------------------------- |
| GET    | `/health`                              | public | DB check                                             |
| POST   | `/auth/login`                          | public | `{ user, token }`                                    |
| POST   | `/auth/register`                       | public | creates a customer, `{ user, token }`               |
| GET    | `/auth/session`                        | user   | `{ user }`                                           |
| CRUD   | `/admin/categories`                    | admin  | list includes `productCount`                         |
| GET    | `/admin/products`                      | admin  | `page, limit, search, status, categoryId, lowStock`  |
| CRUD   | `/admin/products[/:id]`                | admin  | `initialStock` on create, stock is not editable here |
| GET    | `/admin/stock/summary`                 | admin  | units, low / out of stock counts, inventory value    |
| GET    | `/admin/stock/movements`               | admin  | `page, limit, productId, type`                       |
| POST   | `/admin/stock/adjust`                  | admin  | `{ productId, type, delta, reason? }`                |

# Stock

`stock_movements` is an append only ledger and `products.stockQuantity` is the running total. The only code that changes stock is `StockService.applyMovement`: it locks the product row, refuses to go below zero, updates the quantity and writes the ledger row in one transaction. Orders will call it with a `sale` movement inside the order transaction.

Errors have the shape `{ statusCode, message, error }`, which is what the front end `Requester` reads.
