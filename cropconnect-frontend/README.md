# CropConnect — Frontend

Field-to-phone IoT platform for modern farming. Real sensors measure soil, water
and climate; a multilanguage app and web dashboard turn that data into decisions
farmers can act on instantly.

## Tech stack
- React 18 + Create React App (`react-scripts`)
- Tailwind CSS 3 + `tailwindcss-animate`
- Radix UI primitives (`@radix-ui/react-label`, `react-slot`, `react-tabs`)
- `lucide-react` icons, `sonner` toasts
- `axios` for API calls, `react-router-dom` for routing

## Run locally

```bash
# 1. Install dependencies
yarn install        # or: npm install

# 2. (Optional) Configure backend URL
echo "REACT_APP_BACKEND_URL=https://cropconnect01-production.up.railway.app/api" > .env

# 3. Start dev server
yarn start          # opens http://localhost:3000
```

## Build for production

```bash
yarn build          # output in ./build
```

## Project layout

```
src/
├── App.js                 # mounts <LandingPage />
├── App.css                # base wrapper styles
├── index.js               # CRA entry, renders <App />
├── index.css              # global tokens, fonts, tailwind layers
├── lib/
│   └── utils.js           # cn() classname helper
├── components/
│   ├── ui/                # shadcn-style primitives
│   │   ├── button.jsx
│   │   ├── input.jsx
│   │   ├── label.jsx
│   │   ├── tabs.jsx
│   │   └── textarea.jsx
│   └── landing/           # marketing page sections
│       ├── Header.jsx
│       ├── Hero.jsx
│       ├── LiveSensorCard.jsx
│       ├── ImpactStats.jsx
│       ├── PrototypeSection.jsx
│       ├── FeaturesSection.jsx
│       ├── MobileAppSection.jsx
│       ├── HowItWorks.jsx
│       ├── BenefitsSection.jsx
│       ├── GoalsSection.jsx
│       ├── EcosystemSection.jsx
│       ├── ContactSection.jsx
│       └── Footer.jsx
└── pages/
    └── LandingPage.jsx    # composes all sections in order
```

## Production setup
- Set `REACT_APP_BACKEND_URL` to your deployed FastAPI backend URL before building.
- New signups open a sensor setup flow. The generated `sensorDeviceId` must be used by ESP32 nodes when posting telemetry.
- Contact enquiries post to `/api/enquiries`; if SMTP is not configured, the form opens a pre-filled email to `cropconnectco@gmail.com`.
- AI chat posts to `/api/ai/chat`; configure `OPENAI_API_KEY` on the backend for GPT answers, and `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` for Google search context.
- Live weather comes from `/api/weather/forecast`.
- Fonts are pulled from Google Fonts (Fraunces / DM Sans / JetBrains Mono).
