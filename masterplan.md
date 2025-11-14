# FlipFlow: masterplan.md

## 1. App Overview and Objectives

**FlipFlow** is a web-based SaaS (Software as a Service) application designed for professionals. Its primary objective is to empower users to convert static PDF documents into engaging, interactive, and shareable flipbooks.

The core value proposition is to provide a more professional, branded, and engaging way for users to share documents (like brochures, portfolios, reports, and catalogs) compared to sending a simple PDF file. The application will be built on a freemium subscription model.

## 2. Target Audience

The primary target audience consists of **professionals and businesses** who need to share documents publicly in a polished format. This includes:

* **Marketers:** For sharing brochures, case studies, and digital magazines.
* **Sales Teams:** For presenting proposals, product catalogs, and sales decks.
* **Educators & Trainers:** For sharing course materials and presentations.
* **Freelancers & Creatives:** For showcasing portfolios and reports.
* **Small Businesses:** For creating digital menus, lookbooks, and guides.

## 3. Core Features and Functionality

This is broken down by what's already built and what's planned.

### Core (MVP) Functionality (Largely Implemented)

* **User Authentication:** Secure sign-up and login for users (Implemented via Supabase Auth).
* **PDF Upload:** Users can upload PDF files from their device.
* **PDF Storage (Current):** Uploaded PDFs are stored in Supabase Storage.
* **Flipbook Creation:** The app automatically generates a unique, shareable link for each uploaded PDF.
* **Interactive Viewer:** A clean, interactive flipbook viewer (powered by `dflip.js`) that renders the PDF with page-turning effects.
* **Public Sharing:** All flipbooks are public by default, accessible to anyone with the unique URL (using a `flipbooks_slug`).
* **User Dashboard:** A central hub (`/dashboard`) where authenticated users can see, manage, and delete their created flipbooks.
* **Subscription Management:** A multi-tiered subscription system that limits usage based on the user's plan (Implemented via Supabase DB).
* **Payments:** Integration with a payment gateway (Razorpay) to handle subscription purchases (Implemented via Supabase Edge Functions).
* **Basic Analytics:** A system to track the number of views for each flipbook (Implemented via `flipbook_views` table).

### Planned Features & Next Steps (High Priority)

* **Storage Migration to Cloudflare R2:** A **mandatory** migration from Supabase Storage to **Cloudflare R2**. This is a core requirement to optimize for high-bandwidth, low-cost file delivery and ensure long-term scalability.
* **Analytics Dashboard:** Fully build out the `/analytics` page to display the view counts and other basic stats for the user's flipbooks.

## 4. High-Level Technical Stack

The stack is modern, robust, and designed for rapid development.

* **Frontend:**
    * **Framework:** React
    * **Build Tool:** Vite
    * **Styling:** Tailwind CSS
    * **UI Components:** `shadcn/ui`
* **Backend (BaaS - Backend as a Service):**
    * **Provider:** Supabase
    * **Services:**
        * **Authentication:** Supabase Auth (for user login/signup)
        * **Database:** Supabase Postgres (for storing user data, flipbook metadata, subscriptions)
        * **Serverless Functions:** Supabase Edge Functions (for payment logic)
* **File Storage:**
    * **Current:** Supabase Storage
    * **Required Migration Target:** **Cloudflare R2** (for scalable, low-cost object storage)
* **Flipbook Technology:**
    * **Library:** `dflip.js` (handles the client-side PDF rendering and flipbook effect)
* **Payments:**
    * **Provider:** Razorpay

## 5. Conceptual Data Model

Based on the existing Supabase migrations, the database is structured as follows:

* **`users` (Managed by Supabase Auth):** Stores user authentication info.
* **`profiles`:** Stores additional user data (e.g., full name, avatar, `subscription_id`).
* **`flipbooks`:**
    * `id` (Primary Key)
    * `user_id` (Foreign Key to `users`)
    * `title` (text)
    * `pdf_url` (text, path to the file in storage)
    * `slug` (text, for the public URL)
    * `is_public` (boolean, defaults to `true`)
    * `created_at` (timestamp)
* **`products`:**
    * `id` (Primary Key)
    * `name` (e.g., "Pro Plan")
    * `description` (text)
* **`prices`:**
    * `id` (Primary Key)
    * `product_id` (Foreign Key to `products`)
    * `amount` (integer)
    * `currency` (e.g., "inr")
    * `interval` (e.g., "month", "year")
* **`subscriptions`:**
    * `id` (Primary Key)
    * `user_id` (Foreign Key to `users`)
    * `price_id` (Foreign Key to `prices`)
    * `status` (e.g., "active", "canceled")
    * `current_period_end` (timestamp)
* **`flipbook_views`:**
    * `id` (Primary Key)
    * `flipbook_id` (Foreign Key to `flipbooks`)
    * `viewed_at` (timestamp)
    * (Potential future columns: `ip_address_hash`, `user_agent`)

## 6. User Interface Design Principles

* **Clean & Modern:** The UI (using `shadcn/ui` and Tailwind) is clean, minimal, and professional, putting the user's content first.
* **Responsive:** The app, especially the viewer, must work flawlessly on both desktop and mobile devices.
* **Intuitive:** The user flow for uploading a PDF and getting a shareable link should be simple and require minimal steps.
* **Fast:** Use skeleton loaders (as seen in `DashboardSkeleton.tsx`) to provide good perceived performance while data is loading.

## 7. Security Considerations

* **Row Level Security (RLS):** Supabase's RLS is **critical**. It's already implemented to ensure:
    * Users can only see and manage their *own* flipbooks.
    * Users can only access their *own* subscription and profile data.
* **Public vs. Private:** The `is_public` flag on the `flipbooks` table is key. RLS rules must be in place so that only public flipbooks are viewable without authentication.
* **Storage Access:** Storage policies (for both Supabase Storage and the future R2 bucket) must be set up so that users can only upload files (and only to their own folder) and that public read access is granted for the PDF files.
* **Environment Variables:** All secret keys (Supabase keys, Razorpay secrets, Cloudflare R2 keys) **must** be kept in `.env` files and never hard-coded in the client-side app.

## 8. Monetization (Subscription Tiers)

The business model is freemium, based on the provided CSV file:

| Plan Name | Max Flipbooks | Max File Size (per upload) |
| :--- | :--- | :--- |
| **Free** | 1 | ~1.5MB - 2MB |
| **Starter** | 5 | 5MB |
| **Hobby** | 10 | 10MB |
| **Business** | 20 | 25MB |
| **Pro** | Unlimited | 49MB |

## 9. Development Milestones

* **Milestone 1: Core MVP (90% Complete)**
    * [x] User Auth
    * [x] PDF Upload & Storage (Supabase)
    * [x] Client-side Flipbook Viewer
    * [x] Public Sharing
    * [x] User Dashboard
    * [x] Subscription & Payment Logic
* **Milestone 2: Launch Readiness (Required Next Steps)**
    * [ ] **(High Priority)** Refactor file handling logic to use Cloudflare R2 instead of Supabase Storage. This includes upload, delete, and read operations.
    * [ ] **(High Priority)** Perform a one-time migration of any existing files from Supabase Storage to the new R2 bucket.
    * [ ] Complete the Analytics dashboard to show `flipbook_views` data.
    * [ ] Thoroughly test the payment and subscription flow.
    * [ ] Finalize UI/UX polishing and mobile responsiveness checks.

## 10. Potential Challenges and Solutions

* **Challenge:** Large PDF files may be slow to load in the viewer.
    * **Solution:** This is why the file size limits per plan are smart. For future "Pro" tiers, we could explore server-side PDF optimization or pre-rendering (e.g., converting PDF pages to images) upon upload, but this adds complexity.
* **Challenge:** `dflip.js` is a third-party library. It might have bugs or limitations.
    * **Solution:** Be familiar with its documentation. For the future, we could explore other viewer libraries if `dflip.js` becomes too restrictive.
* **Challenge:** Scaling costs for file storage and bandwidth.
    * **Solution:** The **planned and required migration to Cloudflare R2** is the designated solution for this. It's designed for high-volume, low-cost object storage, decoupling file bandwidth costs from the Supabase platform.

## 11. Future Expansion Possibilities

These are ideas for *after* the core app and R2 migration are launched and stable:

* **Advanced Analytics:** Integrate Google Analytics or a similar tool to provide pros with deep insights (e.g., viewer location, time spent per page, click-through-rates).
* **Viewer Customization:** Allow "Pro" users to add their own branding:
    * Custom logos in the viewer.
    * Custom background colors or images.
    * Removing any "Powered by FlipFlow" branding.
* **Custom Domains:** Allow users to host their flipbooks on their own domain (e.g., `brochure.mycompany.com`).
* **More Page Effects:** As you mentioned, add more visual effects for page turns to sell as a premium feature.
* **Private/Password-Protected Flipbooks:** A common professional request for sensitive documents.