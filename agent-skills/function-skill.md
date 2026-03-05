# Agent Skill: EuOnTour Super Admin Control Center

## Project Context
We are building the **Super Admin** layer for the EuOnTour Partner Platform. The Super Admin is the central authority responsible for Agency Governance, Financial Oversight, System Communication, and Global Tour Inventory control.

**Tech Stack Constraints:**
- **Database:** PostgreSQL via Prisma (Neon Serverless with `@prisma/adapter-neon`).
- **Storage:** Vercel Blob (`@vercel/blob`) for all file uploads.
- **Emails:** Brevo API (via `src/lib/email.ts`).
- **Frontend:** React, Vite, TailwindCSS.

## Role Segregation Matrix

| Feature Domain | **Super Admin** (The Owner) | **Admin** (The Operator) | **Agency** (The Partner) |
| :--- | :--- | :--- | :--- |
| **Governance** | **Approve/Reject KYC** (Final Decision)<br>**Block/Ban Agencies** (Hard Stop) | Review submitted docs<br>Flag suspicious accounts | Submit KYC docs<br>Update Profile |
| **Finance** | **View Any Agency Ledger**<br>**Manual Credit/Debit** (Adjustments)<br>**Approve Deposits** (Final) | Verify Bank Receipts (Step 1)<br>View Daily transaction flow | **View Own Ledger**<br>Top-up Wallet<br>Download Invoices |
| **Tour Inventory** | **Delete Tours** (Soft Delete)<br>**Enable/Disable** (Global)<br>**Trigger WP Sync** | **Enable/Disable** (Operational)<br>*(Cannot Delete)* | **View Available Tours** Only<br>Book Tours |
| **Communication**| **Push Notifications** (Broadcast/Target)<br>**Trigger Emails** | Send Support Replies | Receive Notifications<br>Receive Emails |

---

## Development Milestones

### Milestone 1: Agency Governance (The Gatekeeper)
**Objective:** Implement strict controls for managing agency lifecycles.
**Target Files:** `src/routes/super.ts`, `src/lib/auth.ts`, `prisma/schema.prisma`

**Implementation Prompts:**
1.  **Status Management:** Create `PUT /super/agencies/:id/status`.
    * **Body:** `{ status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' }`.
    * **Logic:** If status is `BLOCKED` or `SUSPENDED`, immediately find all active `RefreshToken`s for users belonging to that agency and set `revoked = true` to force logout.
    * **Audit:** Log `AGENCY_STATUS_CHANGE`.
2.  **KYC Decision:** Create `PUT /super/agencies/:id/kyc`.
    * **Body:** `{ action: 'APPROVE' | 'REJECT', reason?: string }`.
    * **Logic:** Update `Agency.verification_status` AND `AgencyOwnerKyc.status`.
    * **Email:** Trigger `EMAIL_TEMPLATES.KYC_APPROVED_AGENCY` or `KYC_REJECTED_AGENCY`.

### Milestone 2: Financial Oversight (The Auditor)
**Objective:** Provide a granular view of financial history and manual override capabilities.
**Target Files:** `src/routes/super.ts`

**Implementation Prompts:**
1.  **Ledger View:** Create `GET /super/finance/ledger/:agencyId`.
    * **Query:** Fetch `WalletLedger` records for the specific agency.
    * **Features:** Support pagination (`skip`, `take`) and sorting (`created_at: desc`).
2.  **Manual Adjustment:** Enhance `POST /super/wallet/adjust`.
    * **Transaction:** Must use `prisma.$transaction` to create a `WalletLedger` entry (Type: `MANUAL_ADJUSTMENT`) and update `Agency.wallet_balance` atomically.

### Milestone 3: Communication Engine (The Broadcaster)
**Objective:** Build a system to notify agencies via In-App alerts and Email.
**Target Files:** `prisma/schema.prisma`, `src/routes/notifications.ts`, `src/routes/super.ts`

**Implementation Prompts:**
1.  **Database:** Add `Notification` model:
    ```prisma
    model Notification {
      id        String   @id @default(uuid())
      agencyId  String?  // Relation to Agency
      userId    String?  // Relation to User (optional specific target)
      title     String
      message   String
      read      Boolean  @default(false)
      createdAt DateTime @default(now())
      // ... relations
    }
    ```
2.  **API:** Create `POST /super/notify`.
    * **Body:** `{ targetAgencyId: string, title: string, message: string }`.
    * **Logic:** Create `Notification` record AND trigger `sendEmail` with the message content.

### Milestone 4: Tour Inventory Control (The Supplier)
**Objective:** Global management of the product catalog.
**Target Files:** `prisma/schema.prisma`, `src/routes/super.ts`

**Implementation Prompts:**
1.  **Database:** Update `Tour` model to add `deletedAt DateTime?`.
2.  **Global Status:** Create `PUT /super/tours/:id/status` (Enable/Disable).
3.  **Soft Delete:** Create `DELETE /super/tours/:id`.
    * **Logic:** Set `deletedAt = now()`, `active = false`. Do NOT delete the row physically to preserve Booking history.

---

## Coding Standards & Constraints
-   **Strict Types:** Always use Zod schemas for request validation.
-   **Transactions:** Any logic modifying financial data (Wallet/Ledger) MUST use `prisma.$transaction`.
-   **Audit Logs:** Every write action by a Super Admin must create an `AuditLog` entry.
-   **File Storage:** ALWAYS use `@vercel/blob`. Never use local file system (`fs`).
-   **Database:** Use `prisma` instance configured with `@prisma/adapter-neon` from `src/lib/db/prisma.ts`.

## Milestone 5: Super Admin Dashboard, Notifications, & Header Polish
**Objective:** Replace hardcoded dummy data with real backend metrics on the dashboard, activate the notification system, and implement a functional profile dropdown for logging out and accessing settings.

**Target Files:**
- **Frontend:** `frontend/src/features/admin/AdminDashboard.tsx`, `frontend/src/app/layouts/Header.tsx`, `frontend/src/features/notifications/NotificationsPage.tsx`
- **Backend:** `src/routes/notifications.ts` (New/Update), `src/routes/admin.ts`

**Implementation Prompts:**
1. **Real Dashboard Data:**
   - **Backend Verification:** Ensure `GET /api/admin/finance/metrics` in `src/routes/admin.ts` correctly returns the financial stats.
   - **Frontend Update:** In `AdminDashboard.tsx`, implement a `useEffect` with `apiFetch('/api/admin/finance/metrics')` to retrieve data. Map the returned `totalWalletBalance`, `pendingSuperAdminDeposits`, and transaction trends to the UI cards, replacing all hardcoded mock data.
2. **Notifications System:**
   - **Backend API:** Create/Update `src/routes/notifications.ts` to include:
     - `GET /notifications`: Fetch notifications where `userId` matches the logged-in user or `agencyId` matches their agency (if applicable), ordered by `createdAt` descending.
     - `PUT /notifications/:id/read`: Mark a specific notification as `read: true`.
   - **Frontend UI:** Update `Header.tsx` to fetch the unread notification count. Update `NotificationsPage.tsx` to fetch the full list of notifications and trigger the "mark as read" API when a notification is clicked or viewed.
3. **Profile Menu & Logout:**
   - **Frontend UI:** In `Header.tsx`, wrap the User Avatar/Profile Icon in a dropdown component or relative positioned menu.
   - **Links:** Add a "Profile Settings" link pointing to `/super-admin/settings` (or the appropriate settings route).
   - **Logout:** Add a "Logout" button. Import `useAuth` from `AuthContext.tsx` and attach the `logout()` function to the button's `onClick` handler.

   ## Milestone 6: KYC Verification & Deposit Management (Real Data Integration)
**Objective:** Connect the frontend deposit and KYC review pages to the real backend APIs, allowing Super Admins to process financial top-ups and identity approvals securely.

**Target Files:**
- **Frontend:** `frontend/src/features/admin/AdminDepositsPage.tsx`, `frontend/src/features/admin/SuperAdminVerificationDetail.tsx`
- **Backend:** `src/routes/deposits.ts`, `src/routes/admin.ts`

**Implementation Prompts:**
1. **Real Deposit Management:**
   - **Frontend UI (`AdminDepositsPage.tsx`):** Implement a `useEffect` to fetch `GET /api/deposits`. 
   - Remove dummy data. Map the response to display the agency name, amount, bank reference, status, and a link/button to view the `proof_url`.
   - Implement action buttons for "Verify" (Admin) and "Approve" (Super Admin).
   - Wire the "Verify" button to `PUT /api/deposits/:id/verify` (body: `{ status: 'VERIFIED' | 'REJECTED' }`).
   - Wire the "Approve" button to `PUT /api/deposits/:id/approve`.
2. **KYC Verification Details:**
   - **Frontend UI (`SuperAdminVerificationDetail.tsx`):** Extract the `:id` from the route parameters.
   - Fetch the specific KYC record via `GET /api/admin/agency-verifications/:id` (you will need to add this specific GET route to `src/routes/admin.ts` if it doesn't exist, returning the `AgencyOwnerKyc` record and associated `Agency` data).
   - Display the uploaded documents (`idFrontUrl`, `idBackUrl`, `selfieUrl`).
   - Wire the "Approve" and "Reject" buttons to `PUT /api/admin/agency-verifications/:id/approve` and `/reject` respectively. On success, redirect the user back to the verification list.

---

## Database Management: Updating Prisma in Neon DB
Since the project uses Neon (Serverless PostgreSQL) and the `@prisma/adapter-neon` driver, schema updates must be explicitly pushed to the database whenever `prisma/schema.prisma` is modified.

**Standard Workflow for AI Agent / Developer:**
1. **Modify Schema:** Make changes to `prisma/schema.prisma` (e.g., adding `deletedAt` to Tours or the `Notification` model).
2. **Generate Client:** Run `npx prisma generate` to update the local TypeScript types.
3. **Push to Neon DB:** - *For safe, trackable changes (Recommended):* Run `npx prisma migrate dev --name descriptive_update_name`. This creates a migration file and applies it to Neon.
   - *For rapid prototyping (Destructive, use with caution):* Run `npx prisma db push`. This forces the Neon database schema to match your local Prisma file without creating a migration history.

   ## Milestone 7: WordPress Tour Sync (Backend Implementation)
**Objective:** Implement a secure, automated synchronization pipeline to fetch tours from the `euontour.com` WordPress REST API and update the local Prisma database.

**Target Files:**
- **Backend Sync Logic:** `src/lib/sync.ts` (New File)
- **Manual Trigger:** `src/routes/super.ts`
- **Automated Cron:** `api/cron-sync.ts` (New File) and `vercel.json`

**Implementation Prompts:**
1. **The Sync Function (`src/lib/sync.ts`):**
   - Create a new file for external synchronization logic.
   - Implement an exported asynchronous function `syncToursFromWordPress()`.
   - **Authentication:** Use the `jsonwebtoken` library to sign a payload (e.g., `{ source: 'partner-platform' }`) using `process.env.WP_JWT_SECRET` with a short expiration (e.g., `5m`).
   - **Fetch:** Use `axios` or native `fetch` to make a GET request to `https://euontour.com/wp-json/partner/v1/tours`, passing the generated JWT in the `Authorization: Bearer <token>` header.
   - **Database Update:** Iterate over the returned tours array. Use `prisma.tour.upsert()` to create or update each tour based on its `wp_tour_id`. Ensure `name`, `price`, `active`, and `image_url` are mapped correctly. Wrap the database operations in a try/catch block and log the results.
2. **Super Admin Manual Trigger (`src/routes/super.ts`):**
   - Add a new endpoint: `POST /super/tours/sync`.
   - When called, execute `await syncToursFromWordPress()`.
   - Create an `AuditLog` entry: `action: 'MANUAL_TOUR_SYNC'`.
   - Return `{ success: true, message: "Sync completed" }`.
3. **Vercel Cron Job Setup:**
   - **API Endpoint (`api/cron-sync.ts`):** Create a serverless function dedicated to the cron job. This route MUST check the `Authorization` header against `process.env.CRON_SECRET` to prevent unauthorized execution. If authorized, call `syncToursFromWordPress()`.
   - **Vercel Config (`vercel.json`):** Update the `vercel.json` file to include a `"crons"` array. Schedule the `/api/cron-sync` endpoint to run daily (e.g., `"0 0 * * *"`).

   ## Milestone 8: Dynamic Agency Discount Configuration
**Objective:** Allow Super Admins to dynamically set the global agency discount percentage (e.g., 5%, 10%, 15%) from the dashboard, and apply this setting during the WordPress tour synchronization.

**Target Files:**
- **Backend Sync:** `src/lib/sync.ts`
- **Frontend UI:** `frontend/src/features/admin/AdminSettingsPage.tsx`

**Implementation Prompts:**
1. **Backend Sync Logic (`src/lib/sync.ts`):**
   - Before the `for (const tour of tours)` loop, query the `SystemSettings` table for a key named `AGENCY_DISCOUNT_PERCENTAGE`.
   - `const discountSetting = await prisma.systemSettings.findUnique({ where: { key: 'AGENCY_DISCOUNT_PERCENTAGE' } });`
   - Parse the value into a float. If the setting doesn't exist, default to `10` (10%).
   - Convert the percentage to a decimal multiplier (e.g., `10` becomes `0.10`).
   - Inside the loop, calculate the `agencyNetPrice` using this dynamic multiplier instead of a hardcoded value.
2. **Frontend UI (`AdminSettingsPage.tsx`):**
   - Implement a `useEffect` to fetch current settings from `GET /api/super/system/settings`.
   - Create a form with an input field for "Global Agency Discount (%)".
   - When the user clicks "Save", send a `PUT /api/super/system/settings` request with the payload: `{ settings: [{ key: 'AGENCY_DISCOUNT_PERCENTAGE', value: String(discountValue) }] }`.
   - Show a success toast or message upon saving.

   ## Milestone 9: Admin & Agency Staff Management (Full CRUD)
**Objective:** Allow Super Admins to perform full Create, Read, Update, and Delete operations for internal Admin staff and partner Agencies directly from the dashboard.

**Target Files:**
- **Backend API:** `src/routes/super.ts`
- **Frontend UI (Admins):** `frontend/src/features/super/AdminManagementPage.tsx` (New)
- **Frontend UI (Agencies):** `frontend/src/features/super/AgencyManagementPage.tsx` (Update existing list to include Create/Edit/Delete actions)

**Implementation Prompts:**
1. **Backend Admin CRUD (`src/routes/super.ts`):**
   - `GET /super/admins`: Fetch all users where `role = 'ADMIN'`.
   - `POST /super/admins`: Create a new `User` with `role = 'ADMIN'`. Hash the provided password using `bcryptjs`.
   - `PUT /super/admins/:id`: Update name, email, or active status.
   - `DELETE /super/admins/:id`: Soft delete or completely remove the Admin user.
2. **Backend Agency CRUD (`src/routes/super.ts`):**
   - `GET /super/agencies`: (Already exists, ensure it returns all necessary fields).
   - `POST /super/agencies`: Requires a Prisma `$transaction`. Create the `Agency` record first, then create the `User` record (with `role = 'AGENCY'`, linking it to the new `agency_id`), and hash the password.
   - `PUT /super/agencies/:id`: Update agency details (company name, contact info, etc.).
   - `DELETE /super/agencies/:id`: Soft delete the agency (set `status = 'BLOCKED'` or `deletedAt = now()`) and revoke all associated user tokens.
3. **Frontend UI:**
   - Create tables to list Admins and Agencies.
   - Implement modals/dialogs with forms for "Create New" and "Edit".
   - Add confirmation prompts for the "Delete" action using standard UI components.

   ## Milestone 10: Granular Agency Management & Proxy Booking
**Objective:** Differentiate Agency CRUD permissions between Super Admin (Create, Edit, Disable, Delete) and Admin (Create, Edit, Disable). Enable Super Admins to create bookings on behalf of any agency.

**Target Files:**
- **Backend API (Super Admin):** `src/routes/super.ts`
- **Backend API (Admin):** `src/routes/admin.ts`
- **Backend API (Bookings):** `src/routes/bookings.ts`
- **Frontend UI:** Agency List pages, Booking/Checkout flow for Super Admin.

**Implementation Prompts:**
1. **Backend Agency CRUD Separation:**
   - **Shared Logic:** Extract the Agency creation logic (Prisma `$transaction` to create `Agency` + `User` with bcrypt) into a shared service function, as both `POST /super/agencies` and `POST /admin/agencies` will use it.
   - **Super Admin (`src/routes/super.ts`):** Must have `DELETE /super/agencies/:id`. Protect this strictly with `requireRole(user, ['SUPER_ADMIN'])`. This should perform a soft delete (`deletedAt = now()`) and revoke the agency's tokens.
   - **Admin (`src/routes/admin.ts`):** Must have `POST`, `PUT` (edit), and `PUT /status` (disable), but **NO** `DELETE` route.
2. **Super Admin Proxy Booking:**
   - **Backend Update (`src/routes/bookings.ts`):** In the `POST /bookings` endpoint, allow an optional `targetAgencyId` in the body. If the user making the request is a `SUPER_ADMIN`, use this `targetAgencyId` instead of their own ID. Deduct the funds from the *target agency's* wallet and link the booking to them.
3. **Frontend UI Adjustments:**
   - **Agency Tables:** Render the "Delete" button conditionally on the frontend. Only show it if the logged-in user's role is `SUPER_ADMIN`.
   - **Booking Flow:** When a Super Admin browses the Tour catalog and clicks "Book", present a dropdown to select *which* Agency this booking belongs to before proceeding to checkout.
   ## Milestone 11: Two-Way Booking Sync (WooCommerce & Tourfic)
**Objective:** Push successful bookings from the Partner Platform to WordPress by programmatically creating WooCommerce orders to block out Tourfic calendar dates and inventory.

**Target Files:**
- **Database:** `prisma/schema.prisma`
- **Backend Bookings:** `src/routes/bookings.ts`
- **Backend Sync Logic:** `src/lib/wp-booking-sync.ts` (New)

**Implementation Prompts:**
1. **Database Update (`prisma/schema.prisma`):**
   - Add a field `wp_order_id String?` to the `Booking` model to store the WooCommerce order ID returned by WordPress.
   - Add a boolean flag `wp_sync_pending Boolean @default(true)` to the `Booking` model to handle retries if the initial sync fails.
2. **Node.js Sync Service (`src/lib/wp-booking-sync.ts`):**
   - Create a function `pushBookingToWordPress(bookingId: string)`.
   - Fetch the full booking details from Prisma (including the related Tour's `wp_tour_id`, travel dates, and passenger counts).
   - Generate a JWT using `process.env.WP_JWT_SECRET`.
   - Make a `POST` request to `https://euontour.com/wp-json/partner/v1/bookings` containing the payload.
   - If successful, update the Prisma `Booking` record with `wp_order_id` and set `wp_sync_pending = false`.
3. **Booking Route Integration (`src/routes/bookings.ts`):**
   - In the `POST /bookings` endpoint (after the `prisma.$transaction` successfully deducts the wallet and creates the local booking), trigger `pushBookingToWordPress(newBooking.id)` asynchronously. Do NOT `await` it in a way that blocks the user's HTTP response. Let it run in the background so the checkout feels instant.