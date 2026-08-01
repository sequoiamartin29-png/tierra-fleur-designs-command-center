# Tierra Fleur Designs Command Center

A separate iPad-friendly business app for Tierra Fleur Designs. This is independent from Jardin Soleil.

## Included

- Dashboard with date, live time, and optional location-based weather
- Client CRM
- Project pipeline
- Property photo sketch studio with Apple Pencil/finger/mouse drawing
- Expense tracking with uploaded receipt images or PDFs
- Estimates and invoices with print/PDF output
- Tasks and priorities
- Services and pricing library
- Business profile settings
- JSON backup and restore
- Installable PWA shell for iPad
- Uploaded estate image used as a full-screen wrapped background
- Official Tierra Fleur Designs crest placed prominently in the header and dashboard
- Built-in Learning Center with local business and design lessons

## Run in Codex or VS Code

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Build for Netlify

```bash
npm run build
```

Deploy the generated `dist` folder, or connect the repository to Netlify using:

- Build command: `npm run build`
- Publish directory: `dist`

## iPad installation

After deployment, open the app in Safari, tap Share, then **Add to Home Screen**.

## Important storage note

This starter version stores business data in the browser on the current device. Use **Business Settings → Export business backup** regularly. Receipt files are stored as embedded data and can make browser storage grow quickly. A later production upgrade should connect receipts and records to Supabase, Firebase, Google Drive, or another secure cloud database.

## Suggested next Codex upgrades

1. Add user login and encrypted cloud sync.
2. Add calendar scheduling and appointment reminders.
3. Add branded contracts, policies, and electronic signatures.
4. Add mileage tracking and tax-category reports.
5. Add inventory and plant/material purchasing lists.
6. Add before-and-after galleries for each project.
7. Add email sending for estimates and invoices.


## Learning Center

The Learning Center uses built-in local lessons and does not require an API key or paid service. Lesson history and completion progress are saved on the device with the rest of the business data.
