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

One folder per domain in `src`: `auth`, `users`, `categories`, `products`, `stock`, `orders`, plus `common` (shared helpers), `config` and `health`.

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
| GET    | `/store/products`                      | public | `page, limit, search, categoryId, sort`, active only  |
| GET    | `/store/products/:slug`                | public | active only                                          |
| GET    | `/store/categories`                    | public | only categories with active products                |
| POST   | `/store/orders`                        | public | checkout for guests and signed in customers          |
| GET    | `/store/orders/track`                  | public | `orderNumber, email` must match                      |
| GET    | `/store/orders/mine`                   | user   | own orders, `page, limit`                            |
| PATCH  | `/store/orders/:orderNumber/cancel`    | user   | own order, pending only, puts stock back            |
| GET    | `/admin/orders[/:id]`                  | admin  | `page, limit, search, status`                        |
| PATCH  | `/admin/orders/:id`                    | admin  | `{ status?, paymentStatus? }`                        |

# Stock

`stock_movements` is an append only ledger and `products.stockQuantity` is the running total. The only code that changes stock is `StockService.applyMovement`: it locks the product row, refuses to go below zero, updates the quantity and writes the ledger row in one transaction. Checkout calls it with a `sale` movement inside the order transaction, and cancelling an order calls it with a `return` movement.

Errors have the shape `{ statusCode, message, error }`, which is what the front end `Requester` reads.

# Orders

Checkout is `POST /store/orders` with `{ items: [{ productId, quantity }], fullName, email, phone, addressLine, city, postalCode?, notes? }`. Prices, names and SKUs are read from the database and copied onto the order lines, the client never sends a price. It runs in one transaction: if any line is unavailable or short on stock, nothing is saved and no stock moves. Payment is cash on delivery (`paymentMethod: cod`), and `SHIPPING_FEE` (env) is a flat delivery fee.

Public routes read the bearer token when one is sent, so a signed in customer's order is linked to their account and a guest's is not. A bad token never blocks checkout.

Status flow: `pending -> confirmed -> shipped -> delivered`, and `pending | confirmed -> cancelled`. Cancelling restores stock. Delivering marks a COD order as paid. Setting an order to the status it already has does nothing.
