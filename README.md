This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Team Availability Feature

The Team Availability feature enables colleagues to log their availability, gives management a birds-eye weekly team calendar, and generates an automated daily morning report.

### Key Business Rules
- **Timezone**: All date, cut-off, and schedule logic operates in `Asia/Dhaka` timezone.
- **Weekend Days**: Friday and Saturday are non-working days by default (no entry required).
- **Colleague Window**: Entries can be created/edited between tomorrow (`today + 1`) and 7 days ahead (`today + 7`).
- **Cut-Off**: Submissions for a day close at 5:00 PM (17:00) the previous day.
- **Manager Overrides**: Managers (`admin`, `sccg-admin`, `hr`, `school-manager`) can override any entry. Overrides are audited in `AvailabilityAudit`.
- **Change Requests**: Colleagues can request urgent same-day/locked date changes with reason, notifying managers.

### Configuration (`.env.local` / Environment Variables)
| Variable | Default | Description |
| :--- | :--- | :--- |
| `AVAILABILITY_TIMEZONE` | `Asia/Dhaka` | Portal availability timezone |
| `AVAILABILITY_CUTOFF_TIME` | `17:00` | Cut-off time (HH:mm) on the previous day |
| `AVAILABILITY_WEEKEND_DAYS` | `5,6` | Non-working days (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat) |
| `AVAILABILITY_REPORT_EMAILS` | `management@mysccg.de` | Comma-separated management email recipients for morning reports |
| `AVAILABILITY_REPORT_TIME` | `08:30` | Morning report dispatch time in Asia/Dhaka |
| `CRON_SECRET` | *(optional)* | Bearer token to protect scheduled cron triggers |

### Running the Morning Report Manually
To trigger the 8:30 AM morning summary report manually (e.g. from terminal or curl):

```bash
# Standard run (skips if today is weekend or if report was already dispatched today):
curl -X POST "https://portal.mysccg.de/api/cron/availability-report"

# Force dispatch (bypasses weekend check and duplicate-run idempotency lock):
curl -X POST "https://portal.mysccg.de/api/cron/availability-report?force=true"

# With CRON_SECRET configured:
curl -X POST "https://portal.mysccg.de/api/cron/availability-report?force=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Running Tests
Run the automated business rules test suite (covering cutoff, rolling window, weekend detection, partial validation, and report calculation):

```bash
npm test
```

