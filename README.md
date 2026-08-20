# InsightPulse 📊⚡

<img width="1918" height="871" alt="Screenshot" src="https://github.com/user-attachments/assets/de3d979a-8c66-4fa7-9ad0-2afe9c32a4a5" />

---

InsightPulse is a modern web-based enterprise survey and interactive interview platform designed for creating, managing, sharing, and running structured participant interviews through a polished, responsive interface.

The application combines a flexible survey builder, sequential participant sessions, dynamic visual themes, persistent cloud-backed workspace data, secure creator authentication, public shareable interview links, respondent limits, AI-powered analysis, question generation, translation tools, and browser-based audio feedback.

Originally created as a single-file frontend experiment, InsightPulse has evolved into a full **Next.js + Supabase application** while preserving much of the original frontend experience and UI architecture.

---

## 🌐 Live Website

InsightPulse is deployed online using Vercel.

**Live site:**  
https://insight-pulse-nu.vercel.app/

---

## 🎯 About the Project

InsightPulse allows creators to design and run interactive surveys and interviews while also providing a public sharing system that lets respondents participate without creating an account.

The platform now has two primary experiences:

**Creator Mode** — Build surveys, configure participants, customize branding and themes, manage shared interview links, review responses, configure AI, and control the application.

**Respondent Mode** — Open a public interview link, answer questions without signing in, submit responses, and receive a completion screen.

Creator accounts are handled through **Supabase Authentication**, while respondents remain anonymous and never need an account.

The platform also synchronizes creator workspace state through Supabase, allowing important application state to persist across devices rather than relying exclusively on browser storage.

---

## 🚀 Features

### 📊 Survey Builder

* **Flexible Question Builder:** Create surveys using multiple question types.
* **Multiple Choice Questions:** Add custom selectable answer options.
* **Likert Scale:** Built-in 5-point agreement scale.
* **Free Text Questions:** Collect detailed open-ended participant responses.
* **Dynamic Question Management:** Add, edit, configure, and organize questions directly inside the creator interface.
* **Question Ordering:** Survey questions are preserved in the order configured by the creator.
* **Company Branding:** Set a company name that flows throughout participant-facing experiences.
* **Session Titles:** Optionally give interviews custom titles.

---

### 👥 Participant Management

* **Configurable Participant Count:** Choose predefined participant counts or enter a custom amount.
* **Sequential Interviews:** Run participant interviews one at a time.
* **Automatic Progression:** Completed participants advance through the interview workflow.
* **Live Progress Tracking:** Shows participant and question progress during interviews.
* **Persistent Responses:** Responses remain available throughout the active session.
* **Partial Sessions:** Interviews can be ended early while preserving collected responses.
* **Session-Based Workflow:** Designed for structured real-world interview sessions.

---

### 🔗 Shareable Interviews

InsightPulse supports creating public interview links that can be shared with respondents.

Creators can:

* **Generate Unique Links:** Create a unique public URL for an interview.
* **Snapshot Interview Content:** The questions and company information are stored with the shared interview at creation time.
* **Set Respondent Limits:** Choose how many respondents a shared link can accept.
* **Copy Links Easily:** Copy generated links directly from the share manager.
* **View Link Status:** See whether a link is open, closed, or has reached its respondent cap.
* **End Interviews Early:** Immediately stop a shared interview.
* **Reopen Interviews:** Re-enable a previously ended shared interview.
* **View Link Results:** View responses collected through a specific shared interview.
* **Delete Shared Interviews:** Permanently remove old share links and their collected responses.

Respondents do **not** need an InsightPulse account.

Public interviews are available through routes such as:

```text
https://insight-pulse-nu.vercel.app/i/<slug>
```

---

### 🧮 Respondent Cap Protection

Shared interviews use a server-side response counter and an atomic PostgreSQL slot-claim function.

This prevents race conditions where multiple respondents submit at nearly the same time and accidentally exceed the configured respondent limit.

The database locks the shared interview row while claiming a response slot, ensuring the cap is enforced correctly even under concurrent submissions.

---

### 🔐 Authentication

Creator features require an authenticated account.

InsightPulse supports:

* **Google OAuth**
* **Email + Password authentication**
* **Supabase Auth session management**
* **Protected creator API routes**
* **Creator-only share management**

Respondents remain anonymous and never need to sign in.

Creator authentication and user sessions are handled through **Supabase Auth**.

---

### 🛡️ Bot Protection

Email-based creator authentication is protected using **Cloudflare Turnstile**.

Turnstile is used to reduce automated sign-up and sign-in abuse while keeping the authentication experience lightweight for legitimate users.

---

### 💾 Cloud Data Persistence

InsightPulse now supports cloud-backed creator workspace persistence through Supabase.

The creator's legacy application state can be synchronized to their account, allowing important configuration to survive across devices.

Persistent workspace data can include:

* Company configuration
* Survey questions
* Participant configuration
* Participant responses
* Interview progress
* Theme preferences
* Application settings
* AI configuration

Local browser storage is still used by parts of the legacy application, while authenticated state synchronization provides an additional cloud-backed persistence layer.

---

## 🎨 Dynamic Theme Engine

InsightPulse includes a built-in theme system capable of instantly restyling the application.

Available themes include:

* ☀️ **Light**
* 🌙 **Dark**
* 💜 **Neon**
* 🌈 **Bright**
* 🌿 **Nature**
* 😌 **Relaxing**
* 🤖 **Tech**

Themes can be changed dynamically during normal application usage and interviews.

---

## 🔊 Audio Feedback

InsightPulse uses the browser's **Web Audio API** to generate lightweight interface sound effects.

Audio feedback can be used for:

* Button interactions
* Form transitions
* Survey actions
* Interface events
* Submission feedback

A built-in sound toggle allows users to disable interface audio when needed.

No external audio files are required for the core interface sound system.

---

## 🤖 Gemini AI

InsightPulse includes optional integration with the **Google Gemini API** for AI-powered survey analysis, question generation, and application assistance.

### 🧠 Response Synthesis

Gemini can analyze collected responses and generate insights such as:

* Overall sentiment
* Common themes
* Recurring opinions
* Key observations
* Response trends
* Statistical summaries
* Participant feedback patterns

### ✍️ Question Generation

Creators can provide a topic or description and have Gemini generate interview questions.

This can help quickly create surveys for:

* Workplace research
* Customer feedback
* Product research
* Employee surveys
* Company culture research
* General interview workflows

### 🎛️ Smart App Control

The AI assistant can interpret conversational commands and control supported parts of the application.

Examples include:

> "Switch to Neon theme."

> "Set participants to 10."

> "Generate questions about workplace burnout."

> "Summarize response trends."

This combines natural-language interaction with application state control.

---

## 🌍 Interview Translation

InsightPulse includes interview translation support using the **MyMemory Translation API**.

Supported languages include a range of commonly used languages such as:

* English
* Danish
* German
* French
* Spanish
* Italian
* Portuguese
* Dutch
* Polish
* Russian
* Arabic
* Hindi
* Japanese
* Korean
* Chinese
* Turkish
* Swedish
* Persian
* and others

Translation is available directly from the participant interview interface.

---

## 📈 Response Management

InsightPulse supports several ways of reviewing collected responses.

### 📊 Standard Results

The creator dashboard can display collected responses from interview sessions and provides tools for reviewing participant feedback.

### 🔗 Shared Interview Results

Each shareable interview has its own response collection.

Creators can open the results for a specific shared link and review aggregated response information based on the questions used by that link.

### 📦 Export

Response data can also be exported as JSON from the creator interface.

---

## 🗑️ Share Management

Creators can manage their previously generated public interviews directly from the share manager.

Each share can be:

* Copied
* Opened through its public URL
* Reviewed through its results
* Ended early
* Reopened
* Permanently deleted

Deleting a shared interview also removes the responses associated with that shared interview through the database relationship.

---

## 🖥️ Responsive Interface

The application is designed to work across different screen sizes.

The responsive UI adapts:

* Navigation
* Survey forms
* Question cards
* Participant progress indicators
* Modals
* AI controls
* Theme controls
* Authentication UI
* Share management
* Admin panels
* Public respondent interviews

The goal is to keep both the creator and respondent experiences clean and usable on desktop and smaller displays.

---

## 🏗️ Architecture

InsightPulse began as a single-file frontend application and was later migrated into a Next.js application.

The current architecture combines the newer platform layer with the preserved legacy frontend.

```text
Next.js Application
        │
        ├── Creator Workspace
        │      │
        │      ├── Supabase Authentication
        │      ├── Workspace State Sync
        │      ├── Survey Builder
        │      ├── AI Assistant
        │      └── Share Manager
        │
        ├── Public Respondent Routes
        │      │
        │      └── /i/[slug]
        │
        ├── Server API Routes
        │      │
        │      ├── Authentication
        │      ├── Workspace State
        │      ├── Shared Interviews
        │      ├── Responses
        │      └── Gemini Proxy
        │
        ├── Supabase
        │      │
        │      ├── Auth
        │      ├── PostgreSQL
        │      └── Atomic response-slot claiming
        │
        └── Preserved Legacy Frontend
               │
               ├── HTML
               ├── CSS
               ├── JavaScript
               ├── Themes
               ├── Interview UI
               └── Audio / UI systems
```

---

## 🛠️ Tools & Technologies Used

* **Next.js 14** — Application framework and server-side API routes
* **React 18** — Application shell and platform integration
* **JavaScript** — Application logic and legacy state management
* **HTML5** — Interface structure
* **CSS3** — Responsive UI, animations, themes, and visual design
* **Supabase** — Authentication, PostgreSQL database, and server-side persistence
* **Supabase SSR / Client Libraries** — Authentication and browser/server integration
* **Cloudflare Turnstile** — Bot protection for creator authentication
* **Google Gemini API** — AI analysis, question generation, and assistant functionality
* **MyMemory API** — Interview translation
* **Web Audio API** — Dynamic interface sound effects
* **localStorage** — Legacy client-side persistence
* **Vercel** — Deployment and hosting
* **GitHub** — Source control and project hosting
* **VS Code** — Development environment
* **AI Assistance** — Development, debugging, architecture, and UI/UX iteration

---

## 📁 Project Structure

```text
insightpulse/
│
├── app/
│   ├── api/                # Server API routes
│   ├── i/[slug]/           # Public shared interview route
│   ├── login/              # Creator authentication
│   └── ...
│
├── components/
│   └── AppShell.js         # Next.js shell for the preserved legacy app
│
├── lib/
│   ├── supabase/           # Supabase clients and server helpers
│   └── ...
│
├── public/
│   └── legacy/
│       ├── app.js          # Original application logic
│       ├── features.js     # New feature layer
│       ├── app.css         # Legacy styling
│       └── body.html       # Preserved application markup
│
├── supabase-schema.sql     # Database schema
├── .env.example            # Environment variable template
├── next.config.js          # Next.js configuration
├── package.json            # Project dependencies and scripts
└── README.md               # Project documentation
```

The legacy frontend is intentionally preserved inside `public/legacy` while the newer Next.js platform layer provides authentication, APIs, persistence, sharing, and server-side functionality.

---

## 🔑 Environment Variables

The project uses environment variables for platform configuration.

A template is provided in:

```text
.env.example
```

Typical configuration includes values for:

```text
Supabase
Cloudflare Turnstile
Google Gemini
```

Sensitive credentials should never be committed to GitHub.

---

## ▶️ How to Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/ArtinSHF/InsightPulse.git
cd InsightPulse
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create:

```text
.env.local
```

using `.env.example` as a reference.

Add the required Supabase, Turnstile, and optional AI configuration values.

### 4. Set up Supabase

Create a Supabase project and run:

```text
supabase-schema.sql
```

inside:

```text
Supabase Dashboard → SQL Editor
```

The schema creates the tables and database functions required by the application.

### 5. Start the development server

```bash
npm run dev
```

The application should then be available at:

```text
http://localhost:3000
```

---

## ☁️ Vercel Deployment

InsightPulse is designed to work with Vercel and GitHub.

### Deploy with GitHub

1. Push the repository to GitHub.
2. Open Vercel.
3. Import the GitHub repository.
4. Make sure the project uses the **Next.js** framework preset.
5. Add the required environment variables.
6. Deploy.

After the repository is connected, new commits pushed to the production branch can automatically trigger new Vercel deployments.

---

## 🔄 Application Flow

### Creator Flow

```text
Creator
   │
   ▼
Sign In / Sign Up
   │
   ├── Google OAuth
   └── Email + Password
          │
          ▼
     Supabase Auth
          │
          ▼
    Creator Workspace
          │
          ├── Configure Company
          ├── Configure Participants
          ├── Create Questions
          ├── Configure AI
          └── Create Share Link
                     │
                     ▼
             Public Interview URL
```

### Respondent Flow

```text
Public Share Link
        │
        ▼
   Fetch Shared Interview
        │
        ▼
  Respondent Interview
        │
        ├── Question 1
        ├── Question 2
        ├── Question 3
        └── ...
                │
                ▼
          Submit Answers
                │
                ▼
      Atomic Slot Claim
                │
         ┌──────┴──────┐
         │             │
       Success       Closed
         │             │
         ▼             ▼
    Thank You       Closed Screen
```

---

## 🧩 Supported Question Types

| Question Type   | Description                      |
| :-------------- | :------------------------------- |
| Multiple Choice | Custom selectable answer options |
| Likert Scale    | 5-point agreement rating         |
| Free Text       | Open-ended written response      |

These question types can be combined within the same survey.

---

## 🎨 Theme Overview

| Theme    | Style                                    |
| :------- | :--------------------------------------- |
| Light    | Clean professional business UI           |
| Dark     | Dark enterprise interface                |
| Neon     | Cyberpunk-inspired visual style          |
| Bright   | Colorful and energetic interface         |
| Nature   | Green, organic-inspired aesthetic        |
| Relaxing | Soft and calm visual design              |
| Tech     | Futuristic technology-inspired interface |

Themes are applied dynamically without requiring a full page reload.

---

## 🔐 Security & Privacy

InsightPulse now uses server-side APIs and authentication rather than being purely client-side.

Important protections include:

* Supabase Auth for creator accounts
* Owner checks on creator-only API routes
* Cloudflare Turnstile for email authentication
* Server-side access to Supabase service-role functionality
* Anonymous respondent submissions through controlled API routes
* Database-level response-cap enforcement
* Server-side Gemini API proxying
* Row-level security enabled on Supabase tables
* No public database policy for direct respondent access

Sensitive credentials should still be kept in environment variables and never committed to the repository.

---

## ⚠️ Important Security Note

The application uses a server-side architecture for sensitive integrations.

Gemini requests can be routed through a Next.js server API route so that server-side credentials do not need to be embedded directly into the browser.

Supabase service-role credentials must also remain server-side.

The general production architecture is:

```text
Browser
   │
   ▼
Next.js Application
   │
   ├── Supabase Server APIs
   ├── Gemini Server Proxy
   └── Share / Response APIs
          │
          ▼
       Supabase
```

This keeps sensitive credentials away from public client-side code.

---

## 📌 Status

**Active development / Experimental Portfolio Project**

InsightPulse has evolved from a simple single-file frontend experiment into a full-stack survey and interview platform.

Current functionality includes:

* Survey creation
* Participant interviews
* Themes
* Audio feedback
* Gemini AI
* Google authentication
* Email/password authentication
* Cloudflare Turnstile
* Supabase persistence
* Public share links
* Anonymous respondents
* Respondent limits
* Atomic response-cap protection
* End/reopen share links
* Delete share links
* Per-link results
* Translation support
* JSON export
* Vercel deployment

Future development could include:

* Organization and team accounts
* Advanced analytics dashboards
* More export formats
* Richer collaboration tools
* Role-based permissions
* More detailed survey analytics
* Additional authentication providers
* Improved respondent analytics
* Real-time collaborative interviews
* Custom branding and organization settings

---

## 🧠 What I Learned

Building InsightPulse provided hands-on experience with:

* **Next.js Architecture:** Migrating an existing frontend application into a modern Next.js project.
* **Complex Frontend State Management:** Managing survey configuration, participants, responses, themes, AI settings, and application state.
* **Authentication Systems:** Implementing account creation, sign-in, sessions, OAuth, and protected creator features.
* **Supabase:** Using hosted PostgreSQL, authentication, server-side APIs, and database functions.
* **Public Share Systems:** Designing shareable interview links that work without requiring respondents to create accounts.
* **Database Concurrency:** Using an atomic PostgreSQL function to safely enforce respondent limits.
* **Dynamic UI Architecture:** Connecting a preserved legacy frontend to a newer platform layer.
* **Design Systems:** Building a reusable theme engine capable of restyling the application instantly.
* **Responsive UI/UX:** Designing interfaces that remain usable across different screen sizes.
* **Browser APIs:** Using the Web Audio API for interface feedback.
* **Client + Cloud Persistence:** Combining legacy local browser state with authenticated cloud synchronization.
* **AI Integration:** Connecting Gemini to survey generation, analysis, and conversational application control.
* **API Architecture:** Creating server-side routes for authentication, sharing, responses, AI, and state management.
* **Bot Protection:** Integrating Cloudflare Turnstile into authentication flows.
* **Sequential Workflows:** Building participant-by-participant interview execution and progress tracking.
* **Legacy Migration:** Preserving an existing application while progressively moving functionality into a modern full-stack architecture.

---

## 📜 License

This project is an independent development and portfolio project.

Feel free to explore the code and use it as inspiration for your own web development experiments.

---

## ⭐ Support

If you found InsightPulse interesting, consider giving the repository a ⭐ on GitHub!

Built with Next.js, React, Supabase, JavaScript, Gemini, and a ridiculous amount of frontend engineering. 🚀
