/**
 * CV export utilities — A4 PDF (multi-page with margins) and DOCX generation.
 *
 * ROOT-CAUSE FIX (Tailwind CSS v4 + html2canvas):
 *
 * Tailwind v4 stores its colour palette as CSS custom properties in `:root`:
 *   :root { --color-slate-500: oklch(0.55 0.01 248); }
 *
 * html2canvas reads these via `CSSStyleSheet.cssRules[i].cssText` — it does NOT
 * fetch the CSS file at runtime; it queries the already-parsed CSSOM.
 * Its internal CSS parser does not support oklch / oklab / lab / lch and throws:
 *   "Attempting to parse an unsupported color function 'oklab'"
 *
 * Fix: before calling html2canvas, walk the CSSOM of the live document, find
 * every rule whose cssText contains an unsupported colour function, delete it,
 * and re-insert a sanitised version. Restore the originals afterwards so the
 * page UI is unaffected. The same sanitisation is re-applied inside `onclone`
 * for the cloned document that html2canvas actually renders.
 *
 * The `window.fetch` patch is kept as a belt-and-suspenders measure in case any
 * path in a future html2canvas version does use fetch.
 */

/* A4 at 96 DPI */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const A4_MARGIN_PX = 57; // ~15 mm
export const A4_CONTENT_WIDTH_PX = A4_WIDTH_PX - A4_MARGIN_PX * 2;
export const A4_CONTENT_HEIGHT_PX = A4_HEIGHT_PX - A4_MARGIN_PX * 2;

export interface CvExportData {
  name: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  nationality: string;
  birthDate: string;
  website: string;
  profileSummary: string;
  skills: string[];
  experience: { company: string; role: string; period: string; details: string }[];
  education: { school: string; degree: string; period: string }[];
  customSections: { title: string; content: string }[];
}

/* ─────────────────────────────────────────────────────────────────────────────
   Colour sanitisation helpers
───────────────────────────────────────────────────────────────────────────── */

/**
 * Matches oklch / oklab / lab / lch colour functions including those with
 * slash-separated alpha components, e.g. `oklch(0.5 0.1 200 / 50%)`.
 */
const COLOR_FUNC_RE =
  /\b(?:oklch|oklab|lab|lch|color-mix|light-dark|color|hwb)\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/gi;

function sanitizeCssText(css: string): string {
  COLOR_FUNC_RE.lastIndex = 0;
  return css.replace(COLOR_FUNC_RE, "rgba(0,0,0,0.87)");
}

type RemovedRule = { owner: CSSStyleSheet | CSSGroupingRule; index: number; text: string };

/** Walk a CSSRuleList, delete every rule whose cssText contains an unsupported
 *  colour function, re-insert a sanitised copy at the same index, and record
 *  the originals so they can be restored later. */
function sanitizeRuleList(
  rules: CSSRuleList,
  owner: CSSStyleSheet | CSSGroupingRule,
  removed: RemovedRule[]
): void {
  // Walk in reverse so deletions don't shift indices of earlier items.
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (!rule) continue;

    // Recurse into grouping rules (@layer, @media, @supports, etc.)
    if ("cssRules" in rule && rule.cssRules) {
      sanitizeRuleList(
        rule.cssRules as CSSRuleList,
        rule as CSSGroupingRule,
        removed
      );
    }

    COLOR_FUNC_RE.lastIndex = 0;
    if (!rule.cssText || !COLOR_FUNC_RE.test(rule.cssText)) continue;

    const originalText = rule.cssText;
    const sanitizedText = sanitizeCssText(originalText);

    try {
      owner.deleteRule(i);
      owner.insertRule(sanitizedText, i);
      // Record the original so it can be restored after capture.
      removed.push({ owner, index: i, text: originalText });
    } catch {
      // Some rules (e.g. @charset, @namespace) may reject re-insertion — skip.
    }
  }
}

/** Apply sanitisation to all accessible stylesheets in a document.
 *  Returns the list of modified rules so `restoreStylesheets` can undo them. */
function sanitizeStylesheets(doc: Document): RemovedRule[] {
  const removed: RemovedRule[] = [];
  Array.from(doc.styleSheets).forEach((sheet) => {
    try {
      sanitizeRuleList(sheet.cssRules, sheet, removed);
    } catch {
      // Cross-origin sheet — not accessible, ignore.
    }
  });
  return removed;
}

/** Restore the original (unsanitised) rules. Must be called after capture. */
function restoreStylesheets(removed: RemovedRule[]): void {
  // Walk in forward order (they were collected in reverse during deletion).
  removed.forEach(({ owner, index, text }) => {
    try {
      owner.deleteRule(index);
      owner.insertRule(text, index);
    } catch {
      // Best-effort restore; ignore failures.
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   fetch patch (belt-and-suspenders)
───────────────────────────────────────────────────────────────────────────── */

function installXhrPatch(): () => void {
  if (typeof window === "undefined") return () => {};
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...args: any[]) {
    (this as any)._url = typeof url === "string" ? url : url.href;
    return (originalOpen as any).apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this;
    const url = (xhr as any)._url || "";
    const looksLikeCss = /\.css(\?|$)/.test(url) || url.includes("/_next/static/css/");
    
    if (looksLikeCss) {
      const originalOnReadyStateChange = xhr.onreadystatechange;
      xhr.onreadystatechange = function (event: Event) {
        if (xhr.readyState === 4) {
          try {
            const rawText = xhr.responseText;
            const clean = sanitizeCssText(rawText);
            Object.defineProperty(xhr, "responseText", {
              get() { return clean; },
              configurable: true
            });
          } catch {}
        }
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(xhr, [event]);
        }
      };
    }
    return originalSend.apply(this, [body]);
  };

  return () => {
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
  };
}

function installFetchPatch(): () => void {
  if (typeof window === "undefined") return () => {};
  const original = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
    const response = await original(...args);
    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof URL
        ? args[0].href
        : (args[0] as Request).url;
    const ct = response.headers.get("content-type") ?? "";
    if (ct.includes("text/css") || /\.css(\?|$)/.test(url) || url.includes("/_next/static/css/")) {
      try {
        const text = await response.clone().text();
        return new Response(sanitizeCssText(text), {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers),
        });
      } catch { /* fall through */ }
    }
    return response;
  };
  return () => { window.fetch = original; };
}

function installNetworkPatches(): () => void {
  const restoreFetch = installFetchPatch();
  const restoreXhr = installXhrPatch();
  return () => {
    restoreFetch();
    restoreXhr();
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   saveBlob
───────────────────────────────────────────────────────────────────────────── */

async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const ext = filename.split(".").pop() ?? "";
      const mime =
        ext === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const fh = await (
        window as Window & { showSaveFilePicker: (o: object) => Promise<FileSystemFileHandle> }
      ).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: ext.toUpperCase(), accept: { [mime]: [`.${ext}`] } }],
      });
      const w = await fh.createWritable();
      await w.write(await blob.arrayBuffer());
      await w.close();
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────────────────────────────
   generateCvPdfBlob — main export function
───────────────────────────────────────────────────────────────────────────── */

export async function generateCvPdfBlob(element: HTMLElement): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  /* 1. Install fetch and XHR patches */
  const restoreNetwork = installNetworkPatches();

  /* 2. Sanitise the live document's CSSOM so html2canvas never sees
        unsupported colour functions when it reads cssRules.cssText */
  const removedRules = sanitizeStylesheets(document);

  /* 3. Reposition element so html2canvas can fully paint it */
  const saved: Record<string, string> = {};
  const overrides: Record<string, string> = {
    position: "fixed",
    top: "0",
    left: "0",
    zIndex: "-9999",
    width: `${A4_WIDTH_PX}px`,
    maxWidth: `${A4_WIDTH_PX}px`,
    minHeight: "auto",
    boxShadow: "none",
    borderRadius: "0",
    overflow: "visible",
    transform: "none",
  };
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = (element.style as unknown as Record<string, string>)[k];
    (element.style as unknown as Record<string, string>)[k] = v;
  }

  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 300));

  /* 4. Capture */
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        // 1. Remove all asynchronous link stylesheets to avoid late-loading crashes
        clonedDoc.querySelectorAll("link[rel='stylesheet']").forEach((link) => {
          link.remove();
        });

        // 2. Synchronously clone and inject already-sanitized stylesheets from active document
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            const cssText = rules.map(rule => rule.cssText).join("\n");
            const clean = sanitizeCssText(cssText);
            const styleEl = clonedDoc.createElement("style");
            styleEl.textContent = clean;
            clonedDoc.head.appendChild(styleEl);
          } catch {
            // Read-only/inaccessible cross-origin sheet - ignore
          }
        });

        // 3. Sanitise any remaining inline style blocks
        clonedDoc.querySelectorAll("style").forEach((s) => {
          s.innerHTML = sanitizeCssText(s.innerHTML);
        });

        // 4. Sanitise inline style= attributes
        clonedDoc.querySelectorAll("[style]").forEach((el) => {
          const orig = el.getAttribute("style") ?? "";
          const clean = sanitizeCssText(orig);
          if (clean !== orig) el.setAttribute("style", clean);
        });

        // 5. Force capture-friendly layout
        Object.assign(clonedEl.style, {
          position: "static",
          top: "",
          left: "",
          zIndex: "",
          boxShadow: "none",
          borderRadius: "0",
          overflow: "visible",
          width: `${A4_WIDTH_PX}px`,
          maxWidth: `${A4_WIDTH_PX}px`,
          minHeight: "auto",
          backgroundColor: "#ffffff",
          transform: "none",
        });
      },
    });
  } finally {
    restoreNetwork();
    restoreStylesheets(removedRules);
    for (const [k, v] of Object.entries(saved)) {
      (element.style as unknown as Record<string, string>)[k] = v ?? "";
    }
  }

  /* 5. Slice canvas into A4 pages → PDF blob */
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  // The element already has 57px (≈15 mm) inner padding — no extra PDF margin.
  const slicePx = Math.floor((pageH / pageW) * canvas.width);
  let y = 0;
  let page = 0;

  while (y < canvas.height) {
    if (page > 0) pdf.addPage();
    const h = Math.min(slicePx, canvas.height - y);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    const hmm = (h * pageW) / canvas.width;
    // jsPDF v4: addImage(data, format, x, y, w, h)
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, hmm);
    y += slicePx;
    page++;
  }

  return pdf.output("blob") as Blob;
}

/** Convenience: generate PDF and immediately trigger a browser download. */
export async function exportCvToPdf(element: HTMLElement, filename: string): Promise<void> {
  const blob = await generateCvPdfBlob(element);
  await saveBlob(blob, filename);
}

/* ─────────────────────────────────────────────────────────────────────────────
   exportCvToDocx
───────────────────────────────────────────────────────────────────────────── */

export async function exportCvToDocx(data: CvExportData, filename: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } =
    await import("docx");

  const heading = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
    });

  const body = (text: string) =>
    new Paragraph({ children: [new TextRun({ text, size: 22 })], spacing: { after: 120 } });

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      children: [new TextRun({ text: data.name || "CV", bold: true, size: 48 })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
    }),
  ];

  if (data.title) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.title, size: 24, color: "444444" })],
        spacing: { after: 200 },
      })
    );
  }

  const contact = [data.email, data.phone, data.address, data.website].filter(Boolean);
  if (contact.length) children.push(body(contact.join("  |  ")));

  const details = [
    data.nationality && `Nationality: ${data.nationality}`,
    data.birthDate && `Born: ${data.birthDate}`,
  ].filter(Boolean) as string[];
  if (details.length) children.push(body(details.join("  |  ")));

  if (data.profileSummary) {
    children.push(heading("Profile"));
    children.push(body(data.profileSummary));
  }
  if (data.skills.length) {
    children.push(heading("Skills"));
    children.push(body(data.skills.join(", ")));
  }
  if (data.experience.length) {
    children.push(heading("Experience"));
    for (const exp of data.experience) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.role} at ${exp.company}`, bold: true, size: 22 }),
            new TextRun({ text: `  (${exp.period})`, size: 20, color: "666666" }),
          ],
          spacing: { before: 120, after: 60 },
        })
      );
      if (exp.details) children.push(body(exp.details));
    }
  }
  if (data.education.length) {
    children.push(heading("Education"));
    for (const edu of data.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.degree, bold: true, size: 22 }),
            new TextRun({ text: ` — ${edu.school}  (${edu.period})`, size: 22 }),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }
  for (const sec of data.customSections) {
    if (!sec.title) continue;
    children.push(heading(sec.title));
    for (const line of sec.content.split("\n")) children.push(body(line));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 850, right: 850, bottom: 850, left: 850 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  await saveBlob(blob, filename);
}
