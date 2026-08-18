# InsightPulse 📊⚡

<img width="1918" height="871" alt="Screenshot" src="https://github.com/user-attachments/assets/de3d979a-8c66-4fa7-9ad0-2afe9c32a4a5" />

---

InsightPulse is a modern web-based enterprise survey and interactive interview platform designed for creating, managing, and running structured participant interviews through a polished, responsive interface.

The application combines a flexible survey builder, sequential participant sessions, dynamic visual themes, persistent interview data, audio feedback, and optional Google Gemini AI integration for analyzing responses and generating intelligent interview questions.

Built as a single-file frontend application, InsightPulse is designed as both a functional survey tool and a frontend engineering experiment focused on UI/UX, state management, browser APIs, responsive design, and AI-assisted workflows.

## 🌐 Live Website

InsightPulse is deployed online using Vercel.

**Live site:**  https://https://insight-pulse-nu.vercel.app/

---

## 📸 Screenshots

### Admin Dashboard

<img width="1861" height="927" alt="InsightPulse Admin Dashboard" src="YOUR_ADMIN_SCREENSHOT_URL_HERE" />

### Survey / Interview Mode

<img width="1861" height="927" alt="InsightPulse Interview Mode" src="YOUR_INTERVIEW_SCREENSHOT_URL_HERE" />

### Theme System

<img width="1861" height="927" alt="InsightPulse Theme Selector" src="YOUR_THEME_SCREENSHOT_URL_HERE" />

### AI Assistant

<img width="1861" height="927" alt="InsightPulse AI Assistant" src="YOUR_AI_SCREENSHOT_URL_HERE" />

---

## 🎯 About the Project

InsightPulse allows users to create and run interactive surveys and interviews without requiring a traditional backend.

The platform has two primary experiences:

**Admin Mode** — Build and configure surveys, manage participants, customize company branding, configure AI settings, and control the application.

**Interview Mode** — Run the survey sequentially with participants while tracking progress, collecting responses, and dynamically changing the visual experience.

The application stores survey configuration, interview progress, and participant responses locally so the session can continue without losing progress after a page refresh.

---

## 🚀 Features

### 📊 Survey Builder

* **Flexible Question Builder:** Create surveys using multiple question types.
* **Multiple Choice Questions:** Add custom answer options such as A, B, C, D, etc.
* **Likert Scale:** Built-in 5-point agreement scale from Strongly Agree to Strongly Disagree.
* **Free Text Questions:** Collect detailed open-ended participant responses.
* **Dynamic Question Management:** Add and configure questions directly inside the admin interface.
* **Company Branding:** Set the target company name and automatically display it throughout participant-facing forms.

---

### 👥 Participant Management

* **Configurable Participant Count:** Choose predefined participant numbers or enter a custom amount.
* **Sequential Interviews:** Participants complete the survey one at a time.
* **Automatic Progression:** Submitting one participant automatically advances the interview session.
* **Live Progress Tracking:** Clearly shows the current participant and overall completion progress.
* **Persistent Responses:** Participant answers remain available throughout the active session.
* **Session-Based Workflow:** Designed for conducting real-world interviews on a single device.

---

### 🎨 Dynamic Theme Engine

InsightPulse includes a built-in theme system capable of instantly restyling the entire application.

Available themes include:

* ☀️ **Light**
* 🌙 **Dark**
* 💜 **Neon**
* 🌈 **Bright**
* 🌿 **Nature**
* 😌 **Relaxing**
* 🤖 **Tech**

Themes dynamically affect both the administration dashboard and participant interview experience.

Users can also change themes while an interview session is active.

---

### 🔊 Audio Feedback

InsightPulse uses the browser's **Web Audio API** to generate lightweight interface sound effects.

Audio feedback can be used for:

* Button interactions
* Form transitions
* Survey submissions
* Interface actions

A built-in mute/unmute control allows users to disable the effects whenever needed.

No external audio files are required for the interface sound system.

---

## 🤖 Gemini AI Assistant

InsightPulse includes optional integration with the **Google Gemini API** for AI-powered survey analysis and automation.

### 🧠 Response Synthesis

The AI assistant can analyze submitted participant responses and generate insights such as:

* Overall sentiment
* Common themes
* Recurring opinions
* Key observations
* Response trends
* Statistical summaries
* Participant feedback patterns

### ✍️ Question Generation

Users can provide a topic or description and have the AI generate tailored interview questions.

This can help quickly create surveys for different research topics, companies, products, or customer-feedback scenarios.

### 🎛️ Smart App Control

The AI assistant can also interpret conversational commands to control parts of the application.

For example:

> "Switch to Neon theme and summarize response trends."

This allows the AI assistant to combine application control with response analysis.

---

## 🔐 Gemini API Configuration

InsightPulse provides an interface for configuring a Google Gemini API key and selecting the desired Gemini model.

Example supported models include:

* `gemini-2.5-flash`
* `gemini-2.5-pro`

The API configuration is intended for personal or controlled usage.

**Important:** Because this is a frontend-only application, API keys entered into the browser should be treated as exposed to the client. For production enterprise deployment, API requests should ideally be routed through a secure backend or serverless API layer rather than exposing the key directly in the browser.

---

## 💾 Data Persistence

InsightPulse uses browser-based storage to maintain application state during use.

Persistent state can include:

* Company configuration
* Survey questions
* Participant configuration
* Participant responses
* Interview progress
* Theme preferences
* Application settings

This allows the application to recover from normal page refreshes without requiring a traditional database.

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
* Admin panels

The goal is to keep both administration and participant experiences clean and usable on desktop and smaller displays.

---

## 🛠️ Tools & Technologies Used

* **HTML5** — Application structure
* **CSS3** — Responsive UI, animations, themes, and visual design
* **JavaScript** — Application logic and state management
* **Web Audio API** — Dynamic interface sound effects
* **localStorage** — Client-side persistence
* **Google Gemini API** — AI analysis and question generation
* **Vercel** — Deployment
* **GitHub** — Source control and project hosting
* **VS Code** — Development environment
* **AI Assistance** — Development, debugging, architecture, and UI/UX iteration

---

## ▶️ How to Run Locally

InsightPulse is completely contained inside a single HTML file.

### Option 1 — Open Directly

Download or clone the repository and open:

```text
index.html
```

in a modern web browser.

### Option 2 — VS Code + Live Server

Recommended for development:

1. Clone the repository.
2. Open the project in VS Code.
3. Install the **Live Server** extension.
4. Right-click `index.html`.
5. Select **Open with Live Server**.

The application should open at an address similar to:

```text
http://127.0.0.1:5500/index.html
```

---

## ☁️ Vercel Deployment

InsightPulse can be deployed directly to Vercel without a traditional build system.

### Deploy with GitHub

1. Push the repository to GitHub.
2. Open Vercel.
3. Import the GitHub repository.
4. Select the project.
5. Deploy.

Because the application is a standalone HTML project, no complicated build configuration is required.

After deployment, Vercel provides a public URL for accessing the application.

---

## 📁 Project Structure

```text
insightpulse/
│
├── index.html        # Complete InsightPulse application
├── README.md         # Project documentation
└── screenshots/      # Optional project screenshots
```

The entire application is intentionally contained inside `index.html`, including:

```text
HTML
CSS
JavaScript
Application State
Theme System
Survey Builder
Interview Mode
AI Integration
Web Audio Feedback
Persistence
```

---

## 🔄 Application Flow

```text
Admin Dashboard
       │
       ├── Set Company
       │
       ├── Configure Participants
       │
       ├── Create Questions
       │
       ├── Configure AI
       │
       └── Start Interview
               │
               ▼
        Participant 1
               │
             Submit
               │
               ▼
        Participant 2
               │
             Submit
               │
              ...
               │
               ▼
        Final Participant
               │
             Submit
               │
               ▼
       Response Analysis
               │
               ▼
        Gemini AI Insights
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

Themes are applied dynamically without requiring a page reload.

---

## 📌 Status

**Active development / Experimental Portfolio Project**

InsightPulse is currently designed as a frontend-focused survey and interview platform.

Future development could include:

* Secure backend API integration
* Database-backed survey storage
* Multi-user authentication
* Organization and team accounts
* Cloud-based response synchronization
* Advanced analytics dashboards
* Exporting responses to CSV/JSON
* Role-based permissions
* Server-side Gemini API integration
* Real-time collaborative interviews

---

## ⚠️ Important Security Note

InsightPulse is primarily a client-side application.

If a Gemini API key is entered directly into the frontend, it may be accessible to users through browser developer tools or network requests.

For a real enterprise deployment, sensitive API credentials should **not** be embedded directly in the client application.

A recommended production architecture would be:

```text
InsightPulse Frontend
        │
        ▼
Secure Backend / Vercel Function
        │
        ▼
Google Gemini API
```

This keeps sensitive credentials on the server rather than exposing them to the browser.

---

## 🧠 What I Learned

Building InsightPulse provided hands-on experience with:

* **Complex Frontend State Management:** Managing survey configuration, participants, responses, themes, AI settings, and application state in a single-page application.
* **Dynamic UI Architecture:** Creating multiple application modes that share the same underlying state.
* **Design Systems:** Building a reusable theme engine capable of restyling the entire application instantly.
* **Responsive UI/UX:** Designing interfaces that remain usable across different screen sizes.
* **Browser APIs:** Using the Web Audio API to generate interface feedback without external audio assets.
* **Client-Side Persistence:** Using localStorage to preserve important application state.
* **AI Integration:** Connecting a frontend application to Google's Gemini API for analysis and automated content generation.
* **Conversational Application Control:** Designing AI interactions that can interpret commands and modify application state.
* **Survey Architecture:** Creating a flexible question system supporting multiple question formats.
* **Sequential Workflows:** Building participant-by-participant interview execution and progress tracking.
* **Single-File Application Architecture:** Organizing a complete application containing HTML, CSS, JavaScript, state management, UI systems, and integrations inside one file.

---

## 📜 License

This project is an independent development and portfolio project.

Feel free to explore the code and use it as inspiration for your own frontend experiments.

---

## ⭐ Support

If you found InsightPulse interesting, consider giving the repository a ⭐ on GitHub!

Built with HTML, CSS, JavaScript, and a ridiculous amount of frontend engineering. 🚀
<img width="1918" height="871" alt="Screenshot" src="https://github.com/user-attachments/assets/f760e794-ff58-4358-ae08-0b2bee2365bf" />
