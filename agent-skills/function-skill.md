# Agent Skill: EuOnTour Partner Platform Development

## Context & Architecture
You are assisting a Full Stack Web Developer in building the EuOnTour Partner API and Frontend.
The project is a Node.js/TypeScript backend using Prisma ORM (PostgreSQL) and a React/Vite frontend.
The core functionalities revolve around an Agency Wallet system where agencies can top up funds via manual bank transfer or online payments, and use those funds to book tours synchronized from a WordPress site (`euontour.com`).

**Tech Stack Constraints:**
- **Database:** PostgreSQL via Prisma (`@prisma/client`)
- **Storage:** Vercel Blob (`@vercel/blob`) for all file uploads (e.g., bank receipts, KYC documents, tour images).
- **Emails:** Brevo API (Custom implementation in `src/lib/email.ts`)
- **Frontend:** React, Vite, TailwindCSS

---

## Milestone 1: Complete Email Notifications
**Objective:** Replace the placeholder comments in the deposit workflow with actual email dispatch logic.
**Target Files:** `src/routes/deposits.ts`, `src/lib/email.ts`

**Agent Prompt for Implementation:**
> "Review `src/routes/deposits.ts`. Locate the `POST /deposits` (Submit), `PUT /deposits/[id]/verify` (Admin), and `PUT /deposits/[id]/approve` (Super Admin) blocks where comments like `// Email loop...` or `// Email...` exist.
> 1. Import `sendEmail` and `EMAIL_TEMPLATES` from `../lib/email.js`.
> 2. For `POST /deposits`: Fetch all users where `role === 'ADMIN'`. Map over them and call `sendEmail` using `EMAIL_TEMPLATES.DEPOSIT_SUBMITTED_ADMIN`.
> 3. For `PUT /deposits/[id]/verify`: If verified, fetch all users where `role === 'SUPER_ADMIN'` and send `EMAIL_TEMPLATES.DEPOSIT_VERIFIED_SUPER_ADMIN`. If rejected, fetch the agency owner's user record and send an appropriate rejection email.
> 4. For `PUT /deposits/[id]/approve`: Fetch the agency owner's user record and send `EMAIL_TEMPLATES.DEPOSIT_APPROVED` with the new updated `wallet_balance`."

## Milestone 2: WordPress Tour Synchronization 
**Objective:** Create a webhook endpoint to receive Tour data from the WordPress site and update the Prisma database.
**Target Files:** `prisma/schema.prisma`, `src/routes/webhooks.ts` (New File)

**Agent Prompt for Implementation:**
> "We need to sync tours from a WordPress site to our database. 
> 1. Update `prisma/schema.prisma`: In the `Tour` model, add a new field `wp_tour_id Int @unique` and a field `image_url String?`. Run `npx prisma generate`.
> 2. Create a new file `src/routes/webhooks.ts`. 
> 3. Implement a `POST /webhooks/wp-tours` route. This route should expect a JSON payload containing `{ wp_tour_id, name, price, active, image_url }`.
> 4. Use `prisma.tour.upsert()` to create or update the tour based on the `wp_tour_id`. 
> 5. *Optional constraint:* If the webhook provides a raw image buffer instead of a URL, you MUST use `@vercel/blob`'s `put()` method to upload the image and save the returned Vercel Blob URL to the database.
> 6. Add basic security to the route: require a specific `x-webhook-secret` header that matches a `WP_WEBHOOK_SECRET` environment variable."

## Milestone 3: Online Payments Integration & Deposit UI
**Objective:** Add an automated online wallet top-up flow that bypasses manual admin verification, and update the UI to handle both Manual (Blob upload) and Online top-ups.
**Target Files:** `src/routes/wallet.ts`, `src/routes/webhooks.ts`, `frontend/src/features/wallet/DepositPage.tsx`

**Agent Prompt for Implementation (Backend):**
> "Implement an online payment flow for wallet top-ups.
> 1. In `src/routes/wallet.ts`, create a `POST /wallet/topup/online` endpoint. It should accept an `amount`. Return a mock or real checkout URL (e.g., Stripe/Razorpay session creation).
> 2. In `src/routes/webhooks.ts`, create a `POST /webhooks/payments` endpoint to listen for successful payment events.
> 3. Inside the payment success webhook, use a Prisma `$transaction` to:
>    - Create a new `Deposit` record with `status: 'APPROVED'` and `bank_reference` set to the payment gateway's transaction ID. Note: No `proof_url` is needed here since it's automated.
>    - Create a `WalletLedger` record of type `CREDIT` for the agency.
>    - Increment the `wallet_balance` on the `Agency` model.
>    - Trigger the `DEPOSIT_APPROVED` email."

**Agent Prompt for Implementation (Frontend UI):**
> "Update the UI to support the new online payment method alongside the existing manual bank transfer.
> 1. Open `frontend/src/features/wallet/DepositPage.tsx`.
> 2. Convert the UI into a tabbed interface using existing UI components (`Tabs`).
> 3. **Tab 1: 'Manual Bank Transfer'**: Ensure this form uses `FormData` and `multipart/form-data` to send the `proof_image` file to the backend, because the backend relies on `@vercel/blob` to process this file.
> 4. **Tab 2: 'Pay Online'**: This should be a simpler form asking only for the `amount`. On submit, it should send a standard JSON POST request to the new `POST /wallet/topup/online` API endpoint and redirect the user to the returned checkout URL."

## Coding Standards & Constraints for the Agent
- **File Uploads:** ALWAYS use `@vercel/blob`. Never use `fs`, `multer` (for disk storage), or AWS S3. 
- **Strict Types:** Always use TypeScript interfaces for request bodies, `FormData` parsing, and webhook payloads.
- **Transactions:** Any logic that modifies the `WalletLedger` MUST also update the `Agency.wallet_balance` inside the exact same `prisma.$transaction([])` block to ensure financial data integrity.
- **Audit Logs:** Whenever a deposit state changes or an online payment succeeds, insert a record into the `AuditLog` table capturing the `actor_id` (System or User) and the `action`.
- **Response Format:** Standardize API responses to return `Response.json({ data: ... })` for success and `Response.json({ error: ... }, { status: 4xx })` for failures.