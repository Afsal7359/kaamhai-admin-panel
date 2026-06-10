# Kaamhai Admin Panel — Design Document

A web admin dashboard for the Kaamhai platform (job marketplace + workforce/HR management).
Built with **React 18 + Vite**, talking to the existing Express/MongoDB backend (`appbackend`, port 5000).

---

## 1. Goals

1. **Manage everything in the database** — every Mongoose collection is browsable and editable
   through a generic **Database Manager**, plus curated, purpose-built screens for the
   high-traffic entities (users, employers, job posts, offers, verifications, payments).
2. **Operational visibility** — analytics dashboard, API logs, verification queues.
3. **Zero new auth surface** — reuses the existing `/admin/login` (phone + password → JWT)
   and the `protect + admin` middleware on every API call.

---

## 2. Information Architecture / Sitemap

```
/login                      Public. Phone + password.
/                           Dashboard (analytics)
/employees                  Job-seeker users (list, search, filters, edit)
/employers                  Business owners (list, search)
/job-posts                  Job posts (list, edit, payment link, B2C calls toggle)
/offer-letters              Offer letters (list, status filter)
/verifications              Tab 1: User manual ID verifications (approve / reject)
                            Tab 2: Employer documents (approve / reject)
/payments                   Payment lookup + create job-post payment links
/point-rewards              Wallet point reward settings (list, upsert)
/api-logs                   API logs with filters + status breakdown
/database                   DATABASE MANAGER — every collection:
/database/:model            browse / search / sort / paginate documents
                            view & edit raw JSON, create, delete
```

### Navigation model

Fixed left sidebar (collapsible on small screens) + top bar.
Sidebar groups:

| Group      | Items |
|------------|------------------------------------------------------------|
| Overview   | Dashboard |
| People     | Employees, Employers |
| Hiring     | Job Posts, Offer Letters |
| Moderation | Verifications |
| Finance    | Payments, Point Rewards |
| System     | API Logs, **Database Manager** |

---

## 3. Layout & Wireframes

### App shell

```
┌─────────────┬──────────────────────────────────────────────────┐
│             │  Topbar:  Page title          ⟳ refresh   Admin ▾ │
│  KAAMHAI    ├──────────────────────────────────────────────────┤
│  ADMIN      │                                                  │
│             │   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│ ● Dashboard │   │ Stat   │ │ Stat   │ │ Stat   │ │ Stat   │    │
│   Employees │   └────────┘ └────────┘ └────────┘ └────────┘    │
│   Employers │                                                  │
│   Job Posts │   ┌──────────────────────────────────────────┐   │
│   Offers    │   │              Chart / Table               │   │
│   Verif.    │   └──────────────────────────────────────────┘   │
│   Payments  │                                                  │
│   Rewards   │                                                  │
│   API Logs  │                                                  │
│   Database  │                                                  │
└─────────────┴──────────────────────────────────────────────────┘
```

### List pages (Employees / Employers / Job Posts / Offers / Logs)

```
[ Search……………… ] [ start date ] [ end date ] [ filter ▾ ] [ Apply ]
┌──────────────────────────────────────────────────────────────┐
│ Name      Phone        City      Verified   Created    ⋯     │
│ ───────────────────────────────────────────────────────────  │
│ row …                                            [View][Edit]│
└──────────────────────────────────────────────────────────────┘
              ◀ Prev   Page 3 / 41 (812 total)   Next ▶
```

Row click → right-side **detail drawer / modal** with full document, tabs for
related data, and inline edit forms where a dedicated API exists.

### Database Manager

```
/database                       /database/:model
┌──────────────┐                [ Search field ] [ sort ▾ ] [ + New document ]
│ users   12k  │                ┌──────────────────────────────────────────┐
│ branches 220 │                │ _id        (3-4 key columns)    updated  │
│ payments 8k  │  → click       │ row …                        [Edit][Del] │
│ …(70 models) │                └──────────────────────────────────────────┘
└──────────────┘                Edit = modal with formatted JSON editor,
                                PATCH on save. Del = confirm, then DELETE.
```

---

## 4. Visual Design

### Color tokens (CSS variables)

| Token            | Value     | Use |
|------------------|-----------|------------------------------|
| `--bg`           | `#f4f6fb` | App background |
| `--surface`      | `#ffffff` | Cards, tables, modals |
| `--sidebar`      | `#101828` | Sidebar background (dark) |
| `--sidebar-act`  | `#1d2939` | Active/hover nav item |
| `--primary`      | `#4f46e5` | Buttons, links, active states (indigo) |
| `--primary-soft` | `#eef2ff` | Soft chip / selected bg |
| `--text`         | `#101828` | Primary text |
| `--text-soft`    | `#667085` | Secondary text |
| `--border`       | `#e4e7ec` | Card & table borders |
| `--success`      | `#039855` | Verified / paid / approved badges |
| `--warning`      | `#dc6803` | Pending badges |
| `--danger`       | `#d92d20` | Rejected / failed / delete |

### Typography
- System font stack (`Inter, -apple-system, Segoe UI, Roboto, sans-serif`).
- Page title 20px/600 · section title 16px/600 · body 14px · table 13px.

### Components
- **StatCard** — label, big number, optional delta/footnote.
- **DataTable** — generic table: column defs, loading skeleton, empty state.
- **Badge** — status pill, color derived from value (paid/pending/rejected…).
- **Modal** — centered dialog (confirm, forms, JSON editor).
- **Pagination** — prev/next + page x of y + total count.
- **FiltersBar** — search input + date range + select filters + Apply.
- **JsonEditor** — pretty-printed `<textarea>` with parse validation on save.

---

## 5. Page Specs → API mapping

All requests: `Authorization: Bearer <JWT>` + signature-bypass headers
(`postman: 1`, `platform: ios` in dev; HMAC `x-signature` in prod — see §7).
Base URL from `VITE_API_URL` (default `http://localhost:5000`).

| Page | Endpoint(s) |
|------|-------------|
| Login | `POST /admin/login` → `{ token, data.admin }` stored in localStorage |
| Dashboard | `GET /admin/UserAnalytics?startDate&endDate` — stat cards + bar chart of verification funnel, B2B/B2C activity |
| Employees | `GET /admin/UsersListPaginated?page&limit&search&startDate&endDate&aadharVerified&profileVerified&appliedJobs&currentEmployee` · detail: `GET /admin/userDetails?id=` · edit: `POST /admin/updateBasicDetails`, `POST /admin/workPreferenceDetails` |
| Employers | `GET /admin/businessOwnerListPaginated?page&limit&search&startDate&endDate` |
| Job Posts | `GET /admin/jobPostList?page&limit&search&paymentStatus&sortBy&sortOrder` · `POST /admin/editJobPostManager` · `POST /admin/updatePostDate` · `POST /admin/enableandDisableCalls` · `POST /admin/jobPostPaymentLink` |
| Offer Letters | `GET /admin/getOfferLetter?page&limit&search&status` |
| Verifications (users) | `GET /admin/pendingVerifications` · `POST /admin/verify-user` · `POST /admin/reject-verification` |
| Verifications (employer docs) | `GET /admin/employer-documents?status=` · `PATCH /admin/employer-document/:id/approve` · `PATCH /admin/employer-document/:id/reject` |
| Payments | `POST /admin/paymentDetailsFind` · `POST /admin/jobPostPaymentLink` |
| Point Rewards | `GET /admin/point-rewards` · `POST /admin/point-rewards` |
| API Logs | `GET /admin/apiLogs?name&status&statusCode&dateFrom&dateTo&page&limit` |
| **Database Manager** | **New generic API** (added in `appbackend`): `GET /admin/db/collections` · `GET /admin/db/:model?page&limit&search&sortBy&sortOrder` · `GET /admin/db/:model/:id` · `POST /admin/db/:model` · `PATCH /admin/db/:model/:id` · `DELETE /admin/db/:model/:id` |

### Database Manager backend (new, in `appbackend/controllers/admin/dbAdminController.js`)

- Enumerates `mongoose.modelNames()` at request time → always covers every model (70+).
- List endpoint: pagination, `search` (regex across string paths), `sortBy/sortOrder`,
  optional `filter` (JSON, sanitized — `$`-operator keys stripped).
- Update: `$set` of body, `runValidators`, **password & __v fields stripped**.
- Create: `new Model(body).save()` so schema hooks (e.g. hashing) run.
- Delete: soft delete (`isDeleted: true`) when the schema has that path, hard delete
  with `?hard=true`.
- Everything behind existing `protect + admin` middleware.

---

## 6. State & Data Flow

- **Auth**: `AuthContext` — token + admin profile in `localStorage` (`kh_admin_token`,
  `kh_admin_profile`). Axios interceptor attaches the token; a 401 response clears
  storage and redirects to `/login`.
- **Server state**: simple `useFetch`-style hooks per page (axios + useState/useEffect).
  No global cache library — every page owns its query params (page, search, filters)
  and refetches on change.
- **Mutations**: optimistic-free; on success → toast + refetch list.

---

## 7. Backend request gate (signature)

`server.js` blocks requests unless either:
- non-prod **and** header `postman` (or `platform: ios`) present → the client always
  sends `postman: 1, platform: ios`; or
- header `versioncode >= "3.1.0"` **and** valid HMAC `x-signature`
  (`HMAC_SHA256(deviceId|platform|appVersion|appName|packageName|timestamp, APP_SECRET)`).

The API client signs requests with Web Crypto **when** `VITE_APP_SECRET`,
`VITE_APP_NAME`, `VITE_PACKAGE_NAME` are configured (production deployments);
otherwise it relies on the dev bypass. For production, also add the panel's origin
to `ALLOWED_ORIGINS` on the backend.

---

## 8. Project structure

```
adminfrontend/
├── DESIGN.md                ← this file
├── index.html
├── package.json
├── vite.config.js
├── .env.example             VITE_API_URL, optional signing vars
└── src/
    ├── main.jsx             Router + AuthProvider
    ├── App.jsx              Route table (protected layout)
    ├── api/
    │   ├── client.js        axios instance, auth + signature interceptors
    │   └── endpoints.js     typed wrappers for every admin API
    ├── context/AuthContext.jsx
    ├── components/          Layout, Sidebar, Topbar, DataTable, StatCard,
    │                        Badge, Modal, Pagination, FiltersBar, JsonEditor, Toast
    ├── pages/               Login, Dashboard, Employees, Employers, JobPosts,
    │                        OfferLetters, Verifications, Payments, PointRewards,
    │                        ApiLogs, Database, DatabaseCollection
    └── styles/index.css     design tokens + component styles
```

---

## 9. Run

```bash
# backend (terminal 1)
cd appbackend && npm run dev          # port 5000

# admin panel (terminal 2)
cd adminfrontend
npm install
npm run dev                           # http://localhost:5173
```

Login with an Admin row from the `admins` collection (phone + password).
