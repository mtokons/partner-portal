import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const htmlPath = path.resolve('docs/user-manual/sccg-end-user-manual.html');
const pdfPath = path.resolve('docs/user-manual/SCCG-End-User-Manual-Partner-Customer.pdf');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });

  await page.goto(pathToFileURL(htmlPath).toString(), { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm',
    },
  });

  await browser.close();
  console.log('PDF exported to', pdfPath);
}

run().catch((err) => {
  console.error('Failed to export user manual PDF:', err);
  process.exit(1);
});
