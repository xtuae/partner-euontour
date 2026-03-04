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