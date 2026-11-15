# payout-service

Pays the organizers: it keeps their bank account and creates the transfers of what they earned
(sales minus commission). Port **8086**. Node 20+ / Express / PostgreSQL (`payout_db`).

It does **not** store payments. It reads them from the `/internal` routes of the
payment-service (header `X-Internal-Key`) and asks it to mark them as "paid out".

## Run

```
copy .env.example .env      (then edit .env: DB_PASSWORD, same JWT_SECRET and INTERNAL_KEY as the other services)
npm install
npm test
npm start
```

Create the empty database `payout_db` first (pgAdmin or `psql -U postgres -c "CREATE DATABASE payout_db;"`).
The tables are created at startup. Amounts are stored in **millimes** (45 TND = 45000)
and returned in **dinars** (TND) by the API, like in the payment-service.

## How a payout works

1. The organizer registers his bank account (`PUT /api/payout-accounts/me`).
2. The admin creates a payout for an organizer (`POST /api/admin/payouts`): all the successful
   payments not yet paid out are taken, and the payout starts as `linking`.
3. The payout-service asks the payment-service to link these payments to the payout. When it
   confirms, the payout becomes `pending`. Payments can then never be paid twice.
4. The admin sends the bank transfer, then confirms it (`PATCH /api/admin/payouts/{id}/pay`): `paid`.

| Status | Meaning |
|---|---|
| `linking` | created, link with payment-service not confirmed yet (retry: `POST /api/admin/payouts/{id}/relink`) |
| `pending` | payments linked, transfer not confirmed yet |
| `paid` | transfer confirmed by an admin |
| `cancelled` | payment-service refused the link (nothing was linked, the payments are free again) |

## Routes (through the gateway)

| Role | Route | What |
|---|---|---|
| ORGANIZER | `GET /api/payout-accounts/me` | his bank account (IBAN masked) |
| ORGANIZER | `PUT /api/payout-accounts/me` | create or replace it (`holderName`, `bankName`, `iban`) |
| ORGANIZER | `GET /api/payouts/balance` | earned, paid out, still to pay |
| ORGANIZER | `GET /api/payouts/me` | his payouts |
| ORGANIZER, ADMIN | `GET /api/payouts/{id}` | one payout with its payments (an organizer sees only his own) |
| ADMIN | `GET /api/admin/payouts?status=&organizerId=` | all payouts |
| ADMIN | `GET /api/admin/payouts/balances` | what each organizer is owed, and who can be paid now |
| ADMIN | `POST /api/admin/payouts` | `{ "organizerId": 3 }` create a payout |
| ADMIN | `PATCH /api/admin/payouts/{id}/pay` | confirm the transfer (optional `{ "bankReference": "VIR-42" }`) |
| ADMIN | `POST /api/admin/payouts/{id}/relink` | retry the link of a `linking` payout |

The identity always comes from the JWT (never from the body). The full IBAN is never returned.
`npm run token -- ADMIN 1` prints a test token.
