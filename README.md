# Urban Property Connect React App

This folder has been converted from a Stitch HTML export into a Vite React app.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. The app uses hash routes, so screens are available at URLs like:

```text
http://localhost:5173/#/home
http://localhost:5173/#/login_1
http://localhost:5173/#/property_details_desktop_1
```

Use the floating screen switcher in the top-left corner to search and open any exported Stitch screen.

## Build

```bash
npm run build
```

Each Stitch `code.html` file is lazy-loaded as a separate screen chunk, keeping the initial React bundle smaller while preserving the original exported markup and styles.
