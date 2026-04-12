/**
 * SCCG Unique ID Generator
 *
 * Format: SCCG-{PREFIX}-{YYMMDD}-{00001}
 * Uses Firestore transactions for atomic sequence counters.
 */

import { getAdminFirestore } from "./firebase-admin";
import * as admin from "firebase-admin";

export type SccgEntityPrefix =
  | "USR"  // User Account
  | "CUS"  // Customer
  | "PI"   // Partner Individual
  | "PP"   // Partner Institutional
  | "EXP"  // Expert
  | "QTO"  // Quotation / Offer
  | "ORD"  // Sales Order
  | "INV"  // Invoice
  | "PAY"  // Payment
  | "CRD"  // SCCG Card
  | "IST"  // Installment
  | "PYO"  // Payout
  | "AUD"  // Audit Log
  | "EMP"  // Employee
  | "CRS"  // Course
  | "BCH"  // Batch
  | "ENR"  // Enrollment
  | "CERT"; // Certificate

function getTodayString(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * Generate a globally unique SCCG ID using atomic Firestore counter.
 * Example: SCCG-EMP-260412-00001
 */
export async function generateSccgId(entityPrefix: SccgEntityPrefix): Promise<string> {
  const db = getAdminFirestore();
  const today = getTodayString();
  const docRef = db.collection("sccgSequences").doc(`${entityPrefix}-${today}`);

  const result = await db.runTransaction(async (tx) => {
    const docSnap = await tx.get(docRef);
    const next = (docSnap.exists ? (docSnap.data()?.lastSequence ?? 0) : 0) + 1;
    tx.set(docRef, { lastSequence: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });

  return `SCCG-${entityPrefix}-${today}-${String(result).padStart(5, "0")}`;
}

/**
 * Generate a 16-digit SCCG Card number (3489 prefix + 12 random + Luhn check)
 */
export function generateCardNumber(): string {
  const prefix = "3489";
  let digits = prefix;

  // Generate 11 random digits
  for (let i = 0; i < 11; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }

  // Luhn check digit
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  const check = (10 - (sum % 10)) % 10;
  digits += check.toString();

  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12, 16)}`;
}

/**
 * Generate a 12-char certificate verification code.
 * No ambiguous characters (I, O, 0, 1, L).
 */
export function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 12; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}
