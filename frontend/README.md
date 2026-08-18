# CivicPulse Frontend 🖥

Vite-based React Single Page Application written in TypeScript, providing dashboards and geo-plotting tools for urban and rural project verification.

---

## 🚀 Development Setup

### 1. Requirements
Ensure you have Node.js 20+ installed.

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
The client dashboard runs on **http://localhost:3000** and automatically proxies API requests to port `8000`.

---

## 📁 Source Layout

```
src/
├── components/          # Reusable layouts, buttons, sidebars, alerts
│   ├── layout/          # Application shell (Header, Sidebar, DashboardLayout)
│   └── ui/              # Atom components (styled inputs, tables, cards, dialogs)
├── contexts/            # React Contexts (ThemeContext)
├── hooks/               # Custom hooks (mobile check, event bindings)
├── lib/                 # Base utilities and formatting
│   ├── auth.ts          # LocalStorage JWT and user identity storage
│   ├── data.ts          # Core API client mappings (fetch wrappers)
│   └── utils.ts         # Tailwind/Style builders
├── pages/               # Routing targets
│   ├── Login.tsx        # Identity entry point (with quick credentials)
│   ├── Dashboard.tsx    # KPI overview, recent evidence grid, budget metrics
│   ├── Projects.tsx     # Expandable detail registry of public works
│   ├── Verifications.tsx# Photo-evidence detail reviewer & AI quality analysis
│   ├── SiteMap.tsx      # Vectorized interactive Map of NCR Delhi projects
│   ├── Reports.tsx      # Recharts budget graphs, CSV exporter, utilization tables
│   └── Settings.tsx     # Standard config toggles
└── types/               # TypeScript interface specifications
```

---

## 🔗 Dev Proxy Configuration

The SPA features a dev server proxy in `vite.config.ts`:
```ts
server: {
  port: 3000,
  proxy: {
    "/api": {
      target: "http://localhost:8000",
      changeOrigin: true,
    },
    "/uploads": {
      target: "http://localhost:8000",
      changeOrigin: true,
    }
  }
}
```
All calls to `/api/*` and `/uploads/*` are automatically forwarded to the backend running locally on port 8000.
