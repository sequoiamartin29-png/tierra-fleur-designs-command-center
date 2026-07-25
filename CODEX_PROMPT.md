# Codex continuation prompt

You are improving the existing React/Vite app named **Tierra Fleur Designs Command Center**. Keep it separate from the Jardin Soleil gardening app.

Design rules:
- Preserve the elegant French château garden background and the cream, olive, gold, and soft rose business aesthetic.
- Keep the interface easy to use on an iPad with Apple Pencil support.
- Do not remove working features.
- Keep all screens responsive and touch friendly.

Current features:
- Dashboard with time, date, geolocation weather, and business summary
- Clients, projects, tasks, services, expenses, receipts, estimates/invoices, settings
- A canvas sketch studio for drawing over uploaded client property photos
- Local browser storage and JSON backup
- PWA installation support

Next priorities:
1. Replace localStorage receipt handling with Supabase Storage and Postgres.
2. Add authentication and secure multi-device sync.
3. Add appointment calendar and reminders.
4. Add reusable branded proposal, contract, policy, and invoice templates.
5. Add client project folders containing photos, sketches, notes, measurements, estimates, receipts, and completion images.
6. Add a report page for revenue, expenses, profit, mileage, and tax categories.
7. Preserve all existing data structures or provide migrations.

Before changing code, inspect the whole project and explain the smallest safe implementation plan. Then implement and test it.
