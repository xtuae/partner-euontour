EuOnTour – UI HTML Reference (ui-html)
Purpose of This Folder

The ui-html folder contains all static HTML screens and assets for the EuOnTour internal dashboard system.

This folder is the single source of truth for UI and UX and serves as:

A visual and structural design contract

A reference for React (Vite) component extraction

A handoff artifact for frontend and backend teams

A UI freeze point (no redesigns allowed hereafter)

⚠️ Do not modify these files once React development begins.

What This Folder Is (and Is Not)
✅ This folder IS:

A complete set of static HTML UI screens

A reference implementation of layouts, spacing, and components

A design system expressed in Tailwind CSS v3 classes

❌ This folder IS NOT:

A production build

A Vite or React application

A place to add business logic or APIs

Folder Structure
ui-html/
│
├── assets/
│   ├── images/        (logos, icons, placeholders)
│   ├── fonts/         (if any custom fonts are added)
│   └── documents/     (PDFs or sample uploads)
│
├── auth/              (authentication screens)
│   ├── login.html
│   ├── register.html
│   └── forgot-password.html
│
├── agency/            (agency-facing dashboard)
│   ├── dashboard-home.html
│   ├── dashboard-shell.html
│   ├── wallet-ledger.html
│   ├── deposit-screen.html
│   ├── tour-booking.html
│   ├── booking-management.html
│   ├── notifications.html
│   ├── verification-detail.html
│   ├── settings.html
│   ├── security-settings.html
│   └── support.html
│
├── admin/             (admin-level screens)
│   ├── admin-verification.html
│   ├── admin-finance.html
│   ├── admin-oversight.html
│   ├── admin-agency-detail.html
│   ├── admin-users.html
│   └── admin-audit.html
│
├── super-admin/       (system-level control)
│   ├── super-admin-home.html
│   └── super-admin-navigation.html
│
├── system/
│   ├── activity-log.html
│   └── components.html   (UI components & design reference)
│
└── README.md

Design System Rules (Mandatory)

All screens follow the same design principles:

Color Palette

Primary (Brand Red): #B11226

Text (Black): #1A1A1A

Secondary Text: #4B4B4B

Borders: #E5E7EB

Section Backgrounds: #F5F5F5

Main Background: #FFFFFF

No additional colors may be introduced.

Typography

Font: Inter (or system-ui fallback)

Page titles: text-xl font-semibold

Section titles: text-sm font-medium

Body text: text-sm

Muted text: text-xs text-gray-500

Layout & Components

White background throughout

Card-based layout (rounded-lg, border, shadow-sm)

Sidebar + top header layout

Tables for data-heavy screens

Modals for confirmations

No gradients

No marketing visuals

No decorative animations

Tailwind CSS Usage

Tailwind CSS v3 utilities only

Tailwind CDN is used only for preview

Inline Tailwind config in <script> is temporary

No Tailwind v4 syntax is allowed

During React/Vite integration, Tailwind must be installed via PostCSS and the CDN removed.

JavaScript Usage in HTML

Inline JavaScript is used only for demo purposes, such as:

Sidebar toggling

Modal open/close

Password visibility toggle

Success message simulation

These scripts:

Must NOT be reused in production

Must be replaced with React state and handlers

Role-Based UI Coverage
Agency

Wallet & deposits

Tour booking

Booking management

Verification submission

Notifications

Settings & security

Support

Admin

Deposit approval

Verification review

Agency oversight

Finance views

User management

Audit logs

Super Admin

System-wide dashboard

Agency control

Admin user management

Financial oversight

Verification overrides

System settings

React + Vite Conversion Guidelines

When converting this UI to React:

Do NOT modify files inside ui-html

Extract reusable components:

Sidebar

Header

Card

Table

Button

Modal

Match Tailwind tokens exactly

Implement role-based routing and guards

Replace inline JS with React logic

Use components.html as the UI reference

Change Policy (Very Important)
UI CHANGES AFTER THIS POINT ARE NOT ALLOWED


Any UI change must be approved at architecture level

Backend or business logic changes do NOT require UI changes

This ensures predictable delivery and cost control

Final Notes

This folder represents a completed UI phase.

Once approved:

Design is frozen

Engineering begins

Focus shifts to performance, security, and scalability