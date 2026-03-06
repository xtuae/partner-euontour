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
   
   ## Milestone 12: Advanced KYC & Compliance Workflow
**Objective:** Expand the KYC system to capture Passport copies and License Expiry Dates, enforce a strict 6-month validity rule, allow Admins to trigger email reminders, and allow Super Admins to upload documents on behalf of Agencies.

**Target Files:**
- **Database:** `prisma/schema.prisma`
- **Backend API:** `src/routes/admin.ts`, `src/routes/super.ts`, `src/routes/kyc.ts` (or equivalent)
- **Email System:** `src/lib/email.ts`
- **Frontend UI:** Agency Management List, KYC Verification Detail, Super Admin Proxy KYC Upload.

**Implementation Prompts:**
1. **Database Schema Update (`prisma/schema.prisma`):**
   - Update `AgencyOwnerKyc` (or your specific KYC model).
   - Add `passportUrl String?`.
   - Add `licenseExpiryDate DateTime?`.
   - Add `rejectionReason String?` (to store why it was rejected so the agency knows what to fix).
2. **Backend Validation & Email Reminders:**
   - **Reminders (`src/routes/admin.ts`):** Create `POST /admin/agencies/:id/kyc-reminder`. This queries the agency's email and triggers `sendEmail` with a "Please upload/update your KYC documents" template.
   - **Upload Endpoint (`src/routes/kyc.ts` & `src/routes/super.ts`):** Ensure the KYC upload endpoint (both for the Agency and the new Super Admin proxy route `POST /super/agencies/:id/kyc`) accepts the new `passport_image` and `license_expiry_date`.
   - **The 6-Month Rule:** Before saving the KYC data, parse the `license_expiry_date`. If it is less than 6 months (approx 180 days) from `new Date()`, return a `400 Bad Request: License must be valid for at least 6 months`.
3. **Approval / Rejection Workflow:**
   - **Reject:** Update the `PUT /super/agencies/:id/kyc/reject` endpoint to accept a `reason` in the body. Save this to the database, set status to `REJECTED`, and trigger the rejection email including the reason.
   - **Approve:** Ensure status changes to `VERIFIED`.
   - **Proxy Upload:** When a Super Admin uploads via `POST /super/agencies/:id/kyc`, set the status to `PENDING` or `UNDER_REVIEW` so it still forces a formal visual verification check and audit log.
   
   ## Milestone 13: Admin Role-Based Access Control (RBAC) & UI Layout
**Objective:** Implement strict frontend and backend segregation between `ADMIN` and `SUPER_ADMIN` roles. Hide sensitive sidebar menus, protect routes, and conditionally render CRUD buttons based on the user's role.

**Target Files:**
- **Frontend Routing:** `src/App.tsx` (or your Next.js/React router file)
- **Frontend Layout:** `src/components/layouts/DashboardLayout.tsx` (Sidebar)
- **Frontend Pages:** `AgencyManagementPage.tsx`, `TourList.tsx`
- **Backend Auth:** `src/lib/auth.ts`

**Implementation Prompts:**
1. **Sidebar Navigation (`DashboardLayout.tsx`):**
   - Access the current logged-in user's state.
   - Conditionally render the "Settings" and "Staff/Admin Management" sidebar links. These must *only* be visible if `user.role === 'SUPER_ADMIN'`.
2. **Frontend Route Protection:**
   - Ensure routes like `/super/settings` or `/super/admins` bounce the user back to the `/dashboard` or show a "403 Unauthorized" page if their role is strictly `ADMIN`.
3. **Component-Level Action Hiding:**
   - In `AgencyManagementPage.tsx`: Wrap the "Delete" action button in a conditional statement so it completely disappears for `ADMIN` users.
   - In the KYC Verification view: Allow Admins to Approve/Reject and send warnings, but ensure the "Proxy Upload" feature is restricted if you only want Super Admins handling raw documents.
4. **Backend Enforcement (`auth.ts`):**
   - Double-check the `requireRole` middleware. Ensure all routes under `/api/super/*` strictly enforce `requireRole(user, ['SUPER_ADMIN'])`. 
   - Ensure all routes under `/api/admin/*` allow `requireRole(user, ['ADMIN', 'SUPER_ADMIN'])`.
   
   ## Milestone 14: Wallet Deposit Approval Workflow
**Objective:** Allow Admins and Super Admins to review offline bank transfer receipts submitted by Agencies, and securely approve or reject them. Approval must strictly credit the Agency's wallet via a database transaction.

**Target Files:**
- **Database:** `prisma/schema.prisma`
- **Backend API:** `src/routes/admin.ts` (or `src/routes/deposits.ts`)
- **Frontend UI:** `src/features/admin/DepositManagementPage.tsx`

**Implementation Prompts:**
1. **Database Schema (`prisma/schema.prisma`):**
   - Ensure a `DepositRequest` model exists with fields: `id`, `agencyId`, `amount` (Float), `receiptUrl` (String), `referenceNumber` (String?), `status` (Enum: PENDING, APPROVED, REJECTED), `rejectionReason` (String?), and timestamps.
   - Ensure the `Wallet` and `WalletLedger` models are ready to receive credits.
2. **Backend API Logic:**
   - `GET /admin/deposits`: Fetch all deposits (allow filtering by status `?status=PENDING`). Include the associated Agency name.
   - `POST /admin/deposits/:id/approve`: **CRITICAL:** Use `prisma.$transaction`. 
     1. Find the deposit and verify it is currently `PENDING`.
     2. Update the deposit status to `APPROVED`.
     3. Increment the Agency's `Wallet` balance by the deposit `amount`.
     4. Create a `WalletLedger` entry logging the credit (type: 'DEPOSIT', amount, description: 'Bank transfer approved').
   - `POST /admin/deposits/:id/reject`: Update deposit status to `REJECTED` and save the `rejectionReason` provided in the request body.
3. **Frontend Admin UI:**
   - Create a 'Deposit Approvals' page.
   - Display a data table of all pending deposits (Date, Agency Name, Amount, Ref Number).
   - Include a 'View Receipt' button that opens the `receiptUrl` image in a new tab or a modal.
   - Add 'Approve' and 'Reject' buttons. 
   - The 'Reject' button must open a small prompt asking for the rejection reason before submitting.
  
  
   ## Milestone 15: Agency-Facing Deposit & Wallet Interface
**Objective:** Provide Agencies with a dedicated Wallet Dashboard to view their balance, track transaction history, and submit offline bank transfer receipts for Admin approval.

**Target Files:**
- **Backend API:** `src/routes/agency.ts` (or `src/routes/wallet.ts`)
- **Frontend UI:** `frontend/src/features/agency/WalletPage.tsx`

**Implementation Prompts:**
1. **Backend Endpoints (`src/routes/agency.ts`):**
   - `GET /agency/wallet`: Return the logged-in agency's current `Wallet` balance, their `WalletLedger` history (sorted by newest first), and their recent `DepositRequest` history.
   - `POST /agency/deposits`: Accept `amount` (Float), `referenceNumber` (String), and an uploaded image/PDF file (`receiptUrl`). 
   - **Upload Logic:** The endpoint must securely upload the receipt file to Vercel Blob (or your chosen storage), generate a public URL, and then create a new `DepositRequest` in Prisma with `status = 'PENDING'` linked to the `agencyId`.
2. **Frontend Wallet Dashboard (`WalletPage.tsx`):**
   - **Top Section:** Display a prominent "Current Balance: €X.XX" card. Add a primary button: "Top Up Wallet".
   - **Top Up Modal:** When clicked, open a form with:
     - Amount sent (Number input).
     - Bank Reference / Transaction ID (Text input).
     - Receipt Upload (File input).
   - **History Tables:** Use tabs or stacked tables to display:
     - *Approved Transactions (Ledger):* Shows historical deposits and booking deductions.
     - *Pending Top-Ups:* Shows the status of recently submitted `DepositRequests` so the agency knows they are waiting for Admin approval.

## Milestone 16: Agency Booking History & PDF Invoices
**Objective:** Create a dashboard for Agencies to track all past and upcoming tour bookings, and provide an automated PDF invoice generator for their accounting records.

**Target Files:**
- **Backend API:** `src/routes/agency.ts` (or `src/routes/bookings.ts`)
- **Frontend UI:** `frontend/src/features/agency/BookingHistoryPage.tsx`
- **PDF Utility:** `frontend/src/utils/generateInvoice.ts` (or similar)

**Implementation Prompts:**
1. **Backend Booking Fetch (`src/routes/agency.ts`):**
   - Create `GET /agency/bookings`. 
   - Fetch all `Booking` records where `agencyId` matches the logged-in user's agency.
   - Include the related `Tour` data (name, duration) and order it by `createdAt` descending.
2. **Frontend Booking Dashboard (`BookingHistoryPage.tsx`):**
   - Build a data table displaying: Booking Date, Tour Name, Travel Date, Passengers (Adults/Children), Total Paid, and Sync Status (`wp_order_id`).
   - Add an 'Actions' column with a 'Download Invoice' button.
3. **Frontend PDF Generation:**
   - Install a lightweight frontend PDF library like `jspdf` and `jspdf-autotable` (or `html2pdf.js`).
   - Create a utility function that takes the booking object and generates a professional B2B invoice.
   - **Crucial:** The invoice must clearly display the Agency's Name, the EuOnTour company details, the Booking ID, the Tour Name, Travel Date, and the **exact B2B Wallet amount deducted** (not the retail price).

   ## Milestone 17: Super Admin Analytics & Financial Dashboard
**Objective:** Provide Super Admins with a real-time overview of platform financial health, including total wallet liabilities, realized revenue, pending deposits, and top-performing agencies.

**Target Files:**
- **Backend API:** `src/routes/super.ts` (or `src/routes/analytics.ts`)
- **Frontend UI:** `frontend/src/features/super/DashboardOverview.tsx` (Update the existing blank dashboard)

**Implementation Prompts:**
1. **Backend Analytics Endpoint (`src/routes/super.ts`):**
   - Create `GET /super/analytics`.
   - **Total Liabilities:** Use `prisma.wallet.aggregate` to sum the `balance` of all active wallets.
   - **Total Revenue:** Use `prisma.booking.aggregate` to sum the total amount of all successful bookings.
   - **Pending Deposits:** Use `prisma.depositRequest.count` where `status = 'PENDING'`.
   - **Top Agencies:** Use `prisma.booking.groupBy` to find the `agencyId` with the highest total spend or booking count, then join with the Agency table to get their names.
2. **Frontend Dashboard UI (`DashboardOverview.tsx`):**
   - **KPI Cards:** Build four high-visibility cards at the top of the dashboard: 
     - "Total Realized Revenue"
     - "Wallet Liabilities (Floating Funds)"
     - "Pending Deposit Approvals"
     - "Total Active Agencies"
   - **Data Visualization:** Install a charting library like `recharts` or `chart.js`. Create a bar chart showing "Revenue over the last 30 days" or "Bookings by Top 5 Agencies".
   - **Quick Actions:** Add a small table showing the 5 most recent activities (e.g., latest bookings or latest approved deposits) with quick links to view them.

## Milestone 18: Transactional Emails for Wallet Deposits
**Objective:** Automatically send professional, branded HTML emails to agencies when their offline deposit requests are either approved (funds credited) or rejected (action required).

**Target Files:**
- **Email Service:** `src/lib/email.ts` (or your existing mailer utility)
- **Backend API:** `src/routes/admin.ts` (or `src/routes/deposits.ts`)

**Implementation Prompts:**
1. **Create Email Templates (`src/lib/email.ts`):**
   - **Template 1 (Deposit Approved):** Create a function `sendDepositApprovedEmail(email, agencyName, amount, newBalance)`. The HTML template should say: "Great news! Your wallet deposit of €[Amount] has been approved and credited. Your new balance is €[NewBalance]. You are ready to book tours."
   - **Template 2 (Deposit Rejected):** Create a function `sendDepositRejectedEmail(email, agencyName, amount, reason)`. The HTML template should say: "There was an issue with your recent deposit request of €[Amount]. Reason: [Reason]. Please log in to your dashboard to upload a new receipt or contact support."
2. **Wire Up the Approval Route (`src/routes/admin.ts`):**
   - In `POST /admin/deposits/:id/approve`, right after the `prisma.$transaction` successfully commits and the wallet is updated, query the associated `User` record to get the agency's email address.
   - Call `sendDepositApprovedEmail()` asynchronously (using `.catch(console.error)` so it doesn't block the API response if the email server is slow).
3. **Wire Up the Rejection Route (`src/routes/admin.ts`):**
   - In `POST /admin/deposits/:id/reject`, after updating the database status, fetch the agency's email.
   - Call `sendDepositRejectedEmail()`, passing in the `rejectionReason` provided by the Admin.


## Milestone 19: Global Booking Management & Wallet Refunds
**Objective:** Provide Super Admins with a global booking dashboard to monitor all agency sales. Enable a secure cancellation workflow that automatically refunds the agency's wallet and logs the transaction.

**Target Files:**
- **Backend API:** `src/routes/super.ts` (or `src/routes/bookings.ts`)
- **Frontend UI:** `frontend/src/features/super/GlobalBookingsPage.tsx`
- **Notifications:** `src/lib/email.ts` and `AppNotification` creation.

**Implementation Prompts:**
1. **Global Bookings API (`src/routes/super.ts`):**
   - Create `GET /super/bookings`. Fetch all bookings globally, ordered by newest first. `include` the related `Agency` (name) and `Tour` (title).
2. **Cancellation & Refund API:**
   - Create `POST /super/bookings/:id/cancel`.
   - **CRITICAL:** Use `prisma.$transaction`.
     1. Find the booking and ensure it is currently `CONFIRMED`.
     2. Update the booking status to `CANCELLED`.
     3. Read the `total_amount_paid` from the booking.
     4. Increment the associated Agency's `Wallet.balance` by that exact amount.
     5. Create a `WalletLedger` record (type: 'REFUND', amount: `total_amount_paid`, description: 'Refund for cancelled booking ID X').
3. **Automated Notifications:**
   - Inside the cancellation route, trigger a `sendBookingCancelledEmail` to the agency.
   - Create an `AppNotification` alerting the agency that their wallet has been refunded.
4. **Super Admin UI (`GlobalBookingsPage.tsx`):**
   - Build a comprehensive data table showing: Booking ID, Agency Name, Tour Name, Travel Date, Amount, and Status.
   - Add a 'Cancel Booking' action button. 
   - When clicked, open a strict confirmation modal: "Are you sure you want to cancel this booking? €[Amount] will be automatically refunded to [Agency Name]'s wallet."

   ## Milestone 20: Universal Image Viewer & Receipt Archiving
**Objective:** Create a reusable fullscreen image modal (lightbox) and implement it across all KYC documents and Deposit history tables so users and admins can easily view high-resolution files.

**Target Files:**
- **New Component:** `frontend/src/components/ui/ImageModal.tsx`
- **Wallet UI:** `frontend/src/features/agency/WalletPage.tsx`
- **Admin Deposit UI:** `frontend/src/features/admin/DepositManagementPage.tsx`
- **KYC UI:** `frontend/src/features/admin/VerificationDetailPage.tsx` and Agency `VerificationPage.tsx`

**Implementation Prompts:**
1. **Create the Universal Modal (`ImageModal.tsx`):**
   - Build a React component that takes `isOpen`, `imageUrl`, `altText`, and `onClose` props.
   - Use a fixed, full-screen overlay (`fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4`).
   - The image should be `max-w-full max-h-full object-contain`.
   - Add a prominent "Close" (X) button in the top right corner.
2. **Archived Deposit Receipts (Agency & Admin):**
   - In both `WalletPage` (Agency) and `DepositManagementPage` (Admin), add a 'Receipt' column to the Deposit history tables.
   - If `deposit.receiptUrl` exists, render a 'View Receipt' button (or a small thumbnail) that, when clicked, opens the `ImageModal` with that URL.
3. **Fullscreen KYC Documents:**
   - In the KYC Verification views (both for the Admin reviewing and the Agency viewing their own approved docs), wrap all document images (ID Front, ID Back, Selfie, License) in a clickable wrapper.
   - When clicked, trigger the `ImageModal` to view the document in high resolution. Include an `onMouseOver` effect (like a magnifying glass cursor or slight scale transform) so the user knows the image is clickable.

   ## Milestone 21: B2B Pricing Engine & Omnichannel Notifications
**Objective:** Upgrade the booking logic to calculate per-person pricing, apply dynamic agency discounts, and add 19% MWST. Implement a live price breakdown on the frontend and trigger dual email/in-app notifications for both the Agency and Superadmin.

**Target Files:**
- **Database:** `prisma/schema.prisma`
- **Backend Booking Logic:** `src/routes/bookings.ts` (or `agency.ts`)
- **Frontend Checkout:** `frontend/src/features/agency/NewBooking.tsx`
- **Email Service:** `src/lib/email.ts`

**Implementation Prompts:**
1. **Database Update (`schema.prisma`):**
   - Update the `Booking` model to store the financial breakdown: add `subtotal Float`, `discountAmount Float`, `vatAmount Float`, and ensure `guests Int` exists.
2. **Backend Pricing Engine (`POST /api/bookings`):**
   - Fetch the `Tour` base price.
   - Calculate `subtotal = tour.price * guests`.
   - Fetch the global `AGENCY_DISCOUNT_PERCENTAGE` (e.g., 10%).
   - Calculate `discountAmount = subtotal * (discount / 100)`.
   - Calculate `netPrice = subtotal - discountAmount`.
   - Calculate 19% MWST: `vatAmount = netPrice * 0.19`.
   - Calculate `finalTotal = netPrice + vatAmount`.
   - Deduct `finalTotal` from the Wallet and save all breakdown fields to the `Booking` record.
3. **Omnichannel Notifications:**
   - **Emails:** Trigger `sendBookingConfirmation(agencyEmail)` and `sendNewBookingAlert(superAdminEmail)` with the full price breakdown.
   - **In-App:** Create `AppNotification` records for the `agencyId` AND create a global notification record flagged for the `SUPER_ADMIN` dashboard.
4. **Frontend Price Summary (`NewBooking.tsx`):**
   - Add a dynamic "Order Summary" box above the Confirm button.
   - Use `useEffect` to watch the `selectedTour` and `numberOfGuests` state. Calculate and display the Subtotal, Discount, 19% MWST, and Final Total in real-time so the agency knows exactly what will be deducted from their wallet.