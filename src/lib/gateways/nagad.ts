/**
 * Nagad Merchant Checkout API
 * https://nagad.com.bd/developer
 *
 * Required env vars:
 *   NAGAD_MERCHANT_ID           – Merchant ID from Nagad (e.g. 683002007104225)
 *   NAGAD_MERCHANT_NUMBER       – Merchant mobile number (01XXXXXXXXX)
 *   NAGAD_MERCHANT_PRIVATE_KEY  – Base64 PEM private key (without headers)
 *   NAGAD_PUBLIC_KEY            – Base64 Nagad public key (without headers)
 *   NAGAD_SANDBOX               – "true" for sandbox
 *   SCCG_NAGAD_NUMBER           – SCCG's Nagad merchant number shown to partners
 */

import { createPublicKey, createPrivateKey, publicEncrypt, privateDecrypt, constants } from "crypto";

const BASE =
  process.env.NAGAD_SANDBOX === "true"
    ? "http://sandbox.mynagad.com:10080"
    : "https://api.mynagad.com";

export function isNagadConfigured(): boolean {
  return !!(
    process.env.NAGAD_MERCHANT_ID &&
    process.env.NAGAD_MERCHANT_NUMBER &&
    process.env.NAGAD_MERCHANT_PRIVATE_KEY &&
    process.env.NAGAD_PUBLIC_KEY
  );
}

// ── RSA helpers ─────────────────────────────────────────────────────────────
function encryptRsa(plaintext: string): string {
  const pem = `-----BEGIN PUBLIC KEY-----\n${process.env.NAGAD_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;
  const key = createPublicKey(pem);
  return publicEncrypt({ key, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(plaintext)).toString("base64");
}

function decryptRsa(ciphertext: string): string {
  const pem = `-----BEGIN RSA PRIVATE KEY-----\n${process.env.NAGAD_MERCHANT_PRIVATE_KEY}\n-----END RSA PRIVATE KEY-----`;
  const key = createPrivateKey(pem);
  return privateDecrypt({ key, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(ciphertext, "base64")).toString("utf8");
}

function nagadDatetime(): string {
  const now = new Date();
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${dd}-${MONTHS[now.getMonth()]}-${now.getFullYear()}T${hh}:${mm}:${ss}`;
}

// ── Initialize payment ───────────────────────────────────────────────────────
export interface NagadInitParams {
  /** Unique order ID (max 40 chars) */
  orderId: string;
  /** Amount in BDT */
  amount: number;
  /** Absolute callback URL Nagad will redirect to */
  callbackURL: string;
}

export interface NagadPaymentIntent {
  redirectURL: string;
  paymentReferenceId: string;
}

export async function initPayment(p: NagadInitParams): Promise<NagadPaymentIntent> {
  const merchantId = process.env.NAGAD_MERCHANT_ID!;
  const datetime = nagadDatetime();

  // Nagad requires challenge to be RSA-encrypted with their public key
  const challengePlain = `${merchantId}${p.orderId}${datetime}`;
  const challengeEncrypted = encryptRsa(challengePlain);

  const body = {
    datetime,
    orderId: p.orderId,
    amount: p.amount.toFixed(2),
    challenge: challengeEncrypted,
  };

  const res = await fetch(`${BASE}/api/dfs/checkout/initialize/${merchantId}/${p.orderId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-KM-IP-V4": "127.0.0.1",
      "X-KM-MC-Id": merchantId,
      "X-KM-Client-Type": "PC_WEB",
      "X-KM-Api-Version": "0.2.0",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Nagad init HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.callBackUrl) throw new Error(`Nagad init failed: ${JSON.stringify(data)}`);

  return {
    redirectURL: data.callBackUrl,
    paymentReferenceId: data.tokenNumber || p.orderId,
  };
}

// ── Complete payment (called in callback) ────────────────────────────────────
export interface NagadCompleteResult {
  orderId: string;
  amount: string;
  clientMobileNo: string;
  merchantMobileNo: string;
  trxId: string;
  status: string;
}

export async function completePayment(paymentRefId: string): Promise<NagadCompleteResult> {
  const merchantId = process.env.NAGAD_MERCHANT_ID!;
  const datetime = nagadDatetime();

  const challengePlain = `${merchantId}${paymentRefId}${datetime}`;
  const challengeEncrypted = encryptRsa(challengePlain);

  const res = await fetch(`${BASE}/api/dfs/checkout/complete/${merchantId}/${paymentRefId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-KM-IP-V4": "127.0.0.1",
      "X-KM-MC-Id": merchantId,
      "X-KM-Client-Type": "PC_WEB",
      "X-KM-Api-Version": "0.2.0",
    },
    body: JSON.stringify({ datetime, orderId: paymentRefId, challenge: challengeEncrypted }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Nagad complete HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.status !== "Success") throw new Error(`Nagad complete failed: ${data.status}`);

  return {
    orderId: data.orderId || paymentRefId,
    amount: data.amount,
    clientMobileNo: data.clientMobileNo || "",
    merchantMobileNo: data.merchantMobileNo || process.env.NAGAD_MERCHANT_NUMBER || "",
    trxId: data.issuerPaymentRefNo || paymentRefId,
    status: data.status,
  };
}
