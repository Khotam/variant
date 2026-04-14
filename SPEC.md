# Variant — Business Specification & User Stories

## Overview

**Variant** is an installment sales management platform for two co-investors (Khotam and Aziz). They jointly purchase products for customers and sell them at a markup, collecting payments over an agreed installment period. The app tracks deals, investments, customer payments, and per-investor profit/debt reconciliation.

---

## Glossary

| Term | Definition |
|---|---|
| **Deal** | One product purchased for one customer, funded by investors, sold on installment |
| **Cost** | The actual price paid to the retailer to acquire the product |
| **Selling Price** | The total amount the customer will pay — negotiated based on advance payment amount and installment duration |
| **Markup** | The profit added on top of cost — entered as a flat dollar amount or a percentage of cost |
| **Advance Payment** | An optional upfront payment from the customer before installments begin; a higher advance may reduce the selling price |
| **Installment** | One scheduled monthly payment from the customer |
| **Expected Contribution** | 50% of the product cost — what each investor should ideally put in per deal |
| **Deal Debt** | Per-deal shortfall when an investor contributes less than their expected 50%; owed to the other investor |
| **Net Debt** | Aggregated deal debts across all deals between two investors |
| **Debt Settlement** | A direct cash transfer between investors to partially or fully clear the net debt |

---

## Business Rules

1. All amounts are in USD.
2. Profit is always split 50/50 between investors regardless of actual investment amount.
3. Investment into each deal is always expected to be 50/50 per active investor. If one investor contributes less, the shortfall is recorded as a **deal debt** owed to the other investor.
4. **Selling price is fully negotiated per deal.** It is NOT derived mechanically from cost alone. The advance payment amount and installment duration both influence what price the customer agrees to — a higher advance typically earns the customer a lower total price. The investor enters the selling price (or markup) directly after negotiating with the customer.
5. Markup can be recorded as a flat dollar amount (`selling_price − cost`) or a percentage of cost, for reference only. The selling price field is always the authoritative value.
6. Customer monthly installment = (selling price − advance payment) / number of installment months.
7. Example: cost = $1000. Customer offers $200 advance → negotiated selling price = $1200. Monthly installment over 6 months = ($1200 − $200) / 6 = $166.67. A different customer with $0 advance might pay $1300 total over 6 months = $216.67/month.
8. There are no late fees. Missed or partial payments are tracked but not penalized.
9. A deal is considered **settled** when the total amount received from the customer equals the selling price.
10. The number of investors is dynamic. Each deal distributes the expected contribution equally among all investors who are active at the time the deal is created.

---

## Epics & User Stories

---

### Epic 1 — Authentication

**US-101 — Login**
> As an investor, I want to log in with my username and password so that I can access the platform.

Acceptance criteria:
- There are exactly two accounts: one for Khotam, one for Aziz.
- Credentials are static (configured at deployment time, stored as hashed passwords).
- After a successful login, the user is redirected to the dashboard.
- After a failed login, an error message is shown. No lockout required.
- Sessions persist until the user explicitly logs out.

**US-102 — Logout**
> As an investor, I want to log out so that my session is closed on shared devices.

**US-103 — Switch UI language**
> As an investor, I want to switch the interface between English and Uzbek so that I can use the app in my preferred language.

Acceptance criteria:
- A language toggle (EN / UZ) is always visible in the top navigation bar.
- Supported languages: **English** (default) and **Uzbek**.
- The selected language is persisted in `localStorage` and restored on next visit.
- All UI text — labels, buttons, table headers, error messages, status values, navigation — is translated.
- The customer printable statement (US-605) is also rendered in the currently active language.
- Switching language does not require a page reload.
- Implementation: `i18next` + `react-i18next`; translation keys live in `client/src/locales/en.json` and `client/src/locales/uz.json`.
- Uzbek uses **Latin script** (post-1993 reform), not Cyrillic.

---

### Epic 2 — Customer Management

**US-201 — Add a customer**
> As an investor, I want to register a new customer so that I can associate deals with them.

Acceptance criteria:
- Required fields: full name, primary phone number.
- Optional fields: secondary phone number, address, notes.
- Duplicate phone numbers should show a warning (not a hard block).

**US-202 — View customer list**
> As an investor, I want to see a list of all customers so that I can find and manage them.

Acceptance criteria:
- Table shows: name, phone, number of active deals, total outstanding balance.
- Searchable by name or phone number.

**US-203 — View customer profile**
> As an investor, I want to open a customer's profile to see all their deals and payment history.

Acceptance criteria:
- Shows customer details.
- Lists all deals for that customer with status (active / settled).
- Shows total paid and total remaining across all deals.

**US-204 — Edit customer**
> As an investor, I want to edit a customer's contact details.

---

### Epic 3 — Deal Management

**US-301 — Create a deal**
> As an investor, I want to record a new deal so that the system tracks what was bought, for whom, and how it will be repaid.

Acceptance criteria:
- Required fields:
  - Customer (select from existing customers or create inline)
  - Product name
  - Product cost (what was paid to the retailer)
  - Advance payment amount (default 0) — entered **before** selling price because it affects the negotiated price
  - Selling price — the total the customer will pay, entered directly by the investor after negotiation; this accounts for advance amount and installment duration
  - Installment duration (months): free entry, common shortcuts: 3, 6, 9, 12, 18, 24
  - Deal start date
- Optional fields:
  - Markup display: system shows derived markup = selling price − cost and markup % = markup / cost × 100, for reference only
  - Store / retailer name
  - Product photo (image upload, stored in S3)
  - Receipt photo (image upload, stored in S3)
  - Additional notes / metadata (free text)
- Calculated and displayed live as the investor types, before saving:
  - Markup amount and markup % (derived, read-only)
  - Monthly installment = (selling price − advance payment) / months
  - Full payment schedule: list of due dates and amount per installment
- Investor contributions section (required before saving):
  - For each active investor: how much they are contributing to this deal
  - System shows expected contribution (cost / number of investors) and flags any shortfall as a debt
- After saving, the system creates the full payment schedule and deal investment records automatically.

**US-302 — View deal details**
> As an investor, I want to see full details of a deal including investment breakdown, payment schedule, and uploaded documents.

Acceptance criteria:
- Shows all deal fields.
- Shows investor contributions and any debt.
- Shows the payment schedule with each installment's status: pending / paid / partial / missed.
- Shows product and receipt photos if uploaded.
- Shows deal status: **Active** or **Settled**.

**US-303 — Edit a deal**
> As an investor, I want to edit a deal's non-financial metadata (store name, notes, photos) after creation.

Acceptance criteria:
- Financial fields (cost, markup, installment months) are locked after the first customer payment has been recorded, to preserve history integrity.
- Metadata fields (store name, notes, photos) are always editable.

**US-304 — View all deals**
> As an investor, I want to see a list of all deals across all customers.

Acceptance criteria:
- Table shows: customer name, product name, cost, selling price, advance paid, monthly installment, start date, total received, remaining balance, status.
- Filterable by status (active / settled) and by investor.
- Sortable by start date and remaining balance.

---

### Epic 4 — Investment Tracking

**US-401 — Record investor contributions for a deal**
> As an investor, I want to record how much each investor actually contributed to a deal so that debts can be calculated.

Acceptance criteria:
- When creating or viewing a deal, each investor's actual contribution is entered.
- Expected contribution = cost / 2.
- If an investor contributed less than expected, the shortfall is shown as a **debt** that investor owes to the other.
- Example: cost = $1000. Khotam puts in $300, Aziz puts in $700. Expected = $500 each. Khotam's debt to Aziz = $200.
- Debt is tracked per deal and aggregated in the dashboard.

**US-402 — View investor balance summary**
> As an investor, I want to see a summary of total debts between investors across all deals so that we can reconcile at any time.

Acceptance criteria:
- Shows net debt position: e.g. "Khotam owes Aziz $200 across 3 deals".
- Drills down to list the individual deals contributing to the debt, showing per-deal expected vs actual contribution and the resulting debt for each.
- Also shows total debt settlements made to date, so the remaining uncleared debt is always visible.

**US-403 — Record a debt settlement between investors**
> As an investor, I want to record when one investor pays the other to settle part or all of their debt, so the balance is updated.

Acceptance criteria:
- Form fields: payer (investor), payee (investor), amount, date, optional note.
- A settlement does not need to match any specific deal — it is a free-form transfer between investors.
- After recording, the net debt displayed in the dashboard and investor summary updates immediately.
- Settlements are listed in a ledger view (date, payer, payee, amount, note) so the full reconciliation history is visible.
- Settlements can be edited or deleted (recalculates net debt).

---

### Epic 5 — Payment Tracking

**US-501 — Record a customer payment**
> As an investor, I want to record when a customer makes a payment so that the outstanding balance stays up to date.

Acceptance criteria:
- Select the deal, then select the installment(s) being paid.
- Enter the amount received and the date.
- A payment can be:
  - **Full**: amount equals the installment amount.
  - **Partial**: amount is less than the installment amount — installment status becomes "partial", remaining balance carried.
  - **Overpayment**: amount exceeds one installment — excess is applied to the next installment(s) automatically.
- Payment is logged with date, amount, and which installment(s) it covers.
- If total received equals selling price, deal status automatically changes to **Settled**.

**US-502 — Mark a payment as missed**
> As an investor, I want to mark an installment as missed when the due date passes and no payment was received.

Acceptance criteria:
- Installments past their due date with no payment are automatically flagged as **Overdue** in the UI.
- An investor can also manually mark one as "Missed" with an optional note.
- No fee is applied.

**US-503 — View payment history for a deal**
> As an investor, I want to see every payment ever made against a deal in chronological order.

Acceptance criteria:
- Table shows: date, amount, installment number covered, payment status.

**US-504 — Edit or delete a payment record**
> As an investor, I want to correct a mistakenly entered payment.

Acceptance criteria:
- Any payment can be edited (amount, date) or deleted.
- Editing/deleting recalculates the affected installment statuses.

---

### Epic 6 — Dashboard & Reports

**US-601 — Main dashboard**
> As an investor, I want a dashboard that gives me an at-a-glance view of the business health.

Acceptance criteria, widgets:

| Widget | Description |
|---|---|
| **Total invested** | Sum of all investor contributions across all active deals |
| **Total expected return** | Sum of selling prices across all active deals |
| **Total received** | Sum of all customer payments received to date |
| **Total outstanding** | Total expected return − total received |
| **Active deals** | Count of deals with status = Active |
| **Settled deals** | Count of deals with status = Settled |
| **Overdue installments** | Count of installments that are past due date and unpaid |
| **Upcoming payments** | List of installments due in the next 30 days |
| **Investor debt summary** | Net debt between Khotam and Aziz |

**US-602 — Per-investor profit summary**
> As an investor, I want to see my individual profit position so that I know what I've earned.

Acceptance criteria:
- For each investor: total contributed, expected return (50% of total selling prices), amount received so far (50% of total payments), pending return.
- Broken down by deal if desired.

**US-603 — Overdue payments report**
> As an investor, I want a list of all overdue installments grouped by customer so that I can follow up.

Acceptance criteria:
- Shows: customer name, phone, deal / product, installment number, due date, days overdue, amount due.
- Sorted by days overdue descending.

**US-604 — Deal profitability report**
> As an investor, I want to see the profitability of each deal.

Acceptance criteria:
- Shows: product, cost, selling price, markup amount, markup %, status, amount collected, profit collected so far.

**US-605 — Customer printable payment statement**
> As an investor, I want to generate a printable payment statement for a customer so that they have a formal document of their deal terms and payment schedule.

Acceptance criteria:
- Triggered from a deal's detail page via a "Print / Export PDF" button.
- The document includes:
  - Business name ("Variant") and generation date
  - Customer full name and phone number
  - Product name, selling price, advance payment, installment amount, number of months
  - Full payment schedule table: installment number, due date, amount due, amount paid, status
  - Summary row: total due, total paid, remaining balance
- The document is formatted for A4 print / PDF export (browser print dialog or server-rendered PDF).
- Does NOT include investor names, cost price, or markup — this is a customer-facing document only.

---

## Data Model (reference for implementation)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| username | text unique | |
| password_hash | text | bcrypt |
| display_name | text | e.g. "Khotam", "Aziz" |
| created_at | timestamptz | |

### `customers`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| full_name | text | |
| phone_primary | text | |
| phone_secondary | text nullable | |
| address | text nullable | |
| notes | text nullable | |
| created_at | timestamptz | |

### `deals`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| customer_id | uuid FK | |
| product_name | text | |
| cost | numeric(12,2) | paid to retailer |
| selling_price | numeric(12,2) | entered by investor after negotiation |
| markup_amount | numeric(12,2) | derived: selling_price − cost, stored for reporting |
| markup_percent | numeric(6,2) | derived: markup_amount / cost × 100, stored for reporting |
| advance_payment | numeric(12,2) | default 0 |
| installment_months | integer | |
| monthly_installment | numeric(12,2) | derived: (selling_price − advance_payment) / installment_months |
| start_date | date | |
| store_name | text nullable | |
| product_photo_url | text nullable | S3 key |
| receipt_photo_url | text nullable | S3 key |
| notes | text nullable | |
| status | enum('active','settled') | default 'active' |
| created_by | uuid FK users | |
| created_at | timestamptz | |

### `deal_investments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| deal_id | uuid FK | |
| investor_id | uuid FK users | |
| expected_contribution | numeric(12,2) | cost / 2 |
| actual_contribution | numeric(12,2) | what they put in |
| debt_amount | numeric(12,2) | expected − actual (can be negative) |

### `installments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| deal_id | uuid FK | |
| installment_number | integer | 1-based |
| due_date | date | |
| amount_due | numeric(12,2) | |
| amount_paid | numeric(12,2) | default 0 |
| status | enum('pending','paid','partial','overdue','missed') | |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| deal_id | uuid FK | |
| installment_id | uuid FK | |
| amount | numeric(12,2) | |
| payment_date | date | |
| recorded_by | uuid FK users | |
| notes | text nullable | |
| created_at | timestamptz | |

### `debt_settlements`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| payer_id | uuid FK users | investor who is paying |
| payee_id | uuid FK users | investor receiving the money |
| amount | numeric(12,2) | |
| settlement_date | date | |
| notes | text nullable | |
| recorded_by | uuid FK users | |
| created_at | timestamptz | |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite), React Router, TanStack Query, Tailwind CSS, i18next |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Auth | JWT (stateless), bcrypt for password hashing |
| File uploads | Multer → stored locally or S3-compatible bucket |
| ORM | Prisma |

---

## Project Structure (proposed)

```
variant/
├── client/               # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Customers.tsx
│   │   │   ├── CustomerDetail.tsx
│   │   │   ├── Deals.tsx
│   │   │   ├── DealDetail.tsx
│   │   │   ├── NewDeal.tsx
│   │   │   └── Reports.tsx
│   │   ├── components/
│   │   ├── api/          # TanStack Query hooks
│   │   └── lib/
├── server/               # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── customers.ts
│   │   │   ├── deals.ts
│   │   │   ├── payments.ts
│   │   │   └── dashboard.ts
│   │   ├── middleware/
│   │   ├── lib/
│   │   └── index.ts
│   └── prisma/
│       └── schema.prisma
└── SPEC.md               # this file
```

---

## Resolved Decisions

| Decision | Resolution |
|---|---|
| File storage | AWS S3 (or S3-compatible) |
| Auth complexity | Static username/password per investor, JWT sessions |
| Currency | USD only |
| Late fees | None — missed payments are tracked only |
| Customer statement | Printable/PDF per deal (US-605) |
| Investor count | Dynamic in DB, seeded with 2 (Khotam, Aziz) |
| Selling price | Manually negotiated per deal, not formula-driven |
| UI language | English (default) + Uzbek; user can switch at any time |

## Open Questions / Future Scope

- [ ] Do you want email/SMS reminders for upcoming customer installments?
- [ ] Do you need an Excel/CSV export for accounting?
- [ ] Should investors be able to manage each other's accounts from the UI, or is user management done at the DB/config level only?
