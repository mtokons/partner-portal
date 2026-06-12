/**
 * bKash Checkout URL (mode 0011) — simplest payment collection, no agreement needed.
 * Official docs: https://developer.bka.sh/docs/checkout-url-process-overview
 *
 * Required env vars:
 *   BKASH_APP_KEY        – App Key from bKash merchant onboarding
 *   BKASH_APP_SECRET     – App Secret from bKash merchant onboarding
 *   BKASH_USERNAME       – Username from bKash merchant onboarding
 *   BKASH_PASSWORD       – Password from bKash merchant onboarding
 *   BKASH_SANDBOX        – "true" for sandbox (default: production)
 *   SCCG_BKASH_NUMBER    – SCCG's bKash merchant number shown to partners
 *
 * NOTE: Requires a registered bKash merchant account (not a personal wallet).
 */

const BASE =
  process.env.BKASH_SANDBOX === "true"
    ? "https://tokenized.sandbox.bka.sh"
    : "https://tokenized.pay.bka.sh";

const APP_KEY = () => process.env.BKASH_APP_KEY ?? "";
const APP_SECRET = () => process.env.BKASH_APP_SECRET ?? "";
const USERNAME = () => process.env.BKASH_USERNAME ?? "";
const PASSWORD = () => process.env.BKASH_PASSWORD ?? "";

export function isBkashConfigured(): boolean {
  return !!(APP_KEY() && APP_SECRET() && USERNAME() && PASSWORD());
}

// ── Token cache (per Node.js process) ──────────────────────────────────────
let _cache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.token;

  const res = await fetch(`${BASE}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: USERNAME(),
      password: PASSWORD(),
    },
    body: JSON.stringify({ app_key: APP_KEY(), app_secret: APP_SECRET() }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`bKash token grant HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.id_token) throw new Error(`bKash token grant failed: ${JSON.stringify(data)}`);

  _cache = {
    token: data.id_token,
    // Subtract 2-minute buffer before actual expiry
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 120) * 1000,
  };
  return _cache.token;
}

// ── Payment creation ────────────────────────────────────────────────────────
export interface BkashCreateParams {
  /** Amount in BDT (e.g. 1500.00) */
  amount: number;
  /** Partner email / ID — shown in Bkash dashboard */
  payerReference: string;
  /** Unique invoice reference (max 20 chars) */
  merchantInvoiceNumber: string;
  /** Full absolute URL Bkash will redirect to after payment */
  callbackURL: string;
}

export interface BkashPaymentIntent {
  paymentID: string;
  bkashURL: string;
}

export async function createPayment(p: BkashCreateParams): Promise<BkashPaymentIntent> {
  const token = await getToken();

  const res = await fetch(`${BASE}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "x-app-key": APP_KEY(),
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: p.payerReference.slice(0, 40),
      callbackURL: p.callbackURL,
      amount: p.amount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: p.merchantInvoiceNumber.slice(0, 20),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`bKash create HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.statusCode !== "0000") throw new Error(`bKash create: ${data.statusMessage}`);

  return { paymentID: data.paymentID, bkashURL: data.bkashURL };
}

// ── Execute payment (called in callback after user pays) ────────────────────
export interface BkashExecuteResult {
  paymentID: string;
  trxID: string;
  customerMsisdn: string;
  amount: string;
  merchantInvoiceNumber: string;
  paymentExecuteTime: string;
}

export async function executePayment(paymentID: string): Promise<BkashExecuteResult> {
  const token = await getToken();

  const res = await fetch(`${BASE}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "x-app-key": APP_KEY(),
    },
    body: JSON.stringify({ paymentID }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`bKash execute HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.statusCode !== "0000") throw new Error(`bKash execute: ${data.statusMessage}`);

  return data as BkashExecuteResult;
}
