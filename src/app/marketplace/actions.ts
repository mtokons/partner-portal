"use server";

import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { 
  createSalesOrder, createSalesOrderItem, createInvoice, createTransaction, 
  generateOrderNumber, getProducts,
  createCustomerPackage, createGiftCard, generateGiftCardNumber,
  getCoinWallet, updateCoinWallet, createCoinTransaction,
  createCustomer, getCustomerByEmail, getPartnerByEmail, createPartner,
  getSalesOrderById, getSalesOrderItems
} from "@/lib/sharepoint";
import { sendEmailViaGraph } from "@/lib/email";
import { revalidatePath } from "next/cache";

export async function createDirectOrderAction(data: {
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  country?: string;
  reference?: string;
  notes?: string;
  paymentMethod?: "bangladesh-online" | "manual-transfer" | "coin" | "paypal" | "bangladesh-transfer" | "pay-later";
  paymentTiming?: "now" | "later";
  bdTransferType?: "bkash" | "bank";
  paymentPlan?: "full" | "installment";
  downPaymentEur?: number;
  downPaymentBdt?: number;
  remainingEur?: number;
  remainingBdt?: number;
  depositPercent?: number;
  installmentCount?: number;
  liveRate?: number;
  clientPassword?: string;
  allowExistingAccount?: boolean;
}) {
  const session = await getEffectiveSession();
  const user = session?.user as SessionUser | undefined;

  const orderNumber = await generateOrderNumber();
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalAmount = subtotal; // Simpler for marketplace direct buy
  const now = new Date().toISOString();
  const paymentMethod = data.paymentMethod || "paypal";
  const bdTransferType = data.bdTransferType || "bkash";
  const paymentPlan = data.paymentPlan || "full";
  const isCoinPayment = paymentMethod === "coin";
  const trimmedReference = data.reference?.trim() || "";
  const country = data.country?.trim() || "Bangladesh";
  const isBangladesh = country.toLowerCase() === "bangladesh";
  const installmentCount = data.installmentCount || 4;
  const cleanEmail = (data.customerEmail || "").trim().toLowerCase();

  if (isCoinPayment && !user) {
    throw new Error("Please sign in or create an account to pay with SCCG Coins.");
  }

  // 0. Handle Payment Method logic (Coins)
  if (isCoinPayment && user) {
    const wallet = await getCoinWallet(user.id);
    if (!wallet) throw new Error("No SCCG Coin wallet found for this user.");
    if (wallet.balance < totalAmount) {
      throw new Error(`Insufficient balance. You have ${wallet.balance} SCCG Coins, but the order total is ${totalAmount}.`);
    }

    // Debit the wallet
    await createCoinTransaction({
      walletId: wallet.id,
      userId: user.id,
      type: "spend-purchase",
      amount: totalAmount,
      currency: "SCCG",
      description: `Payment for Marketplace Order ${orderNumber}`,
      createdAt: now,
      referenceId: orderNumber,
    } as any);

    await updateCoinWallet(user.id, {
      balance: wallet.balance - totalAmount,
      totalSpent: (wallet.totalSpent || 0) + totalAmount,
    });
  }

  // 0.1 Check for Duplicate Email & Provision Client Account if New
  let clientId = user?.id || "";
  let isNewClient = false;
  let tempClientPassword = "";

  try {
    const existingCustomer = await getCustomerByEmail(cleanEmail);
    const existingPartner = await getPartnerByEmail(cleanEmail);

    if (existingCustomer || existingPartner) {
      // Existing registered account: enforce login or explicit user acknowledgment
      const isCurrentUser = user && user.email?.toLowerCase() === cleanEmail;
      if (!isCurrentUser && !data.allowExistingAccount) {
        throw new Error(
          `An SCCG account is already registered with ${cleanEmail}. Please switch to 'Existing User Login' to sign in with your password, or select 'Continue order with this existing profile'.`
        );
      }
      clientId = existingCustomer?.id || existingPartner?.id || user?.id || cleanEmail;
    } else {
      // New Client: Provision customer account
      isNewClient = true;
      tempClientPassword = (data.clientPassword && data.clientPassword.trim().length >= 6)
        ? data.clientPassword.trim()
        : `SCCG@${Math.floor(100000 + Math.random() * 900000)}`;

      const { hash } = await import("bcryptjs");
      const passwordHash = await hash(tempClientPassword, 10);

      // 1. Create client entry in Clients list
      const newCustomer = await createCustomer({
        name: data.customerName.trim(),
        email: cleanEmail,
        passwordHash,
        phone: data.customerPhone?.trim() || "",
        company: "Direct Client",
        partnerId: user?.partnerId || "SCCG-DIRECT",
      });
      clientId = newCustomer.id;

      // 2. Create credentials user in Partners table (role: "customer") for NextAuth login
      try {
        await createPartner({
          name: data.customerName.trim(),
          email: cleanEmail,
          passwordHash,
          company: "Direct Client",
          phone: data.customerPhone?.trim() || "",
          role: "customer" as any,
          status: "active",
          partnerType: "individual",
          commissionTier: "standard",
          onboardingStatus: "approved",
        });
      } catch (authErr) {
        console.warn("Notice creating credentials in Partners list:", authErr);
      }

      // 3. Sync customer to Candidate list (standard for client/student accounts)
      try {
        const { ensureCustomerCandidateRecord } = await import("@/lib/customer-candidate-sync");
        await ensureCustomerCandidateRecord({
          email: cleanEmail,
          fullName: data.customerName.trim(),
          phone: data.customerPhone?.trim(),
          partnerId: user?.partnerId || "SCCG-DIRECT",
          partnerName: user?.name || "SCCG Direct Marketplace",
        });
      } catch (candErr) {
        console.warn("Could not sync candidate record for new customer:", candErr);
      }
    }
  } catch (userErr) {
    if (userErr instanceof Error && userErr.message.includes("already registered")) {
      throw userErr;
    }
    console.warn("Notice checking/creating customer account:", userErr);
    clientId = clientId || cleanEmail;
  }

  const paymentTiming = data.paymentTiming || (data.paymentMethod === "pay-later" ? "later" : "now");
  const isPayLater = paymentTiming === "later" || data.paymentMethod === "pay-later";

  // Format human-readable payment plan & channel description
  const planDescription = paymentPlan === "installment"
    ? `Installment Plan (${data.depositPercent || 35}% Minimum Deposit: €${data.downPaymentEur || 0}${isBangladesh ? ` / ৳${(data.downPaymentBdt || 0).toLocaleString()} BDT` : ""}, remaining €${data.remainingEur || 0} divided into ${installmentCount} installments of €${Math.round((data.remainingEur || 0) / installmentCount)} each)`
    : `Full Payment (100% upfront: €${totalAmount}${isBangladesh ? ` / ৳${(data.downPaymentBdt || totalAmount * (data.liveRate || 140.2)).toLocaleString()} BDT` : ""})`;

  const channelDescription = isPayLater
    ? "Pay Later (Service Reservation — SCCG representative will contact client)"
    : paymentMethod === "paypal"
    ? "PayPal (Euro Transfer to mhasnainn@hotmail.com)"
    : paymentMethod === "coin"
    ? "SCCG Coin Balance"
    : `Bangladesh Transfer via ${bdTransferType === "bkash" ? "bKash Personal (01835898287)" : "The City Bank (A/C: 2303620513001, Hajigonj Branch)"}`;

  // 1. Create the Sales Order directly in "pending" status
  const order = await createSalesOrder({
    orderNumber,
    salesOfferId: "DIRECT_BUY",
    offerNumber: "N/A",
    partnerId: user?.partnerId || user?.id || "DIRECT_CUSTOMER",
    partnerName: user?.name || "Direct Marketplace Customer",
    clientId: clientId || cleanEmail,
    clientName: data.customerName.trim(),
    clientEmail: cleanEmail,
    status: "pending",
    totalAmount,
    notes: [
      data.notes || "Checkout from SCCG Marketplace",
      `Customer Country: ${country}`,
      `Customer Phone: ${data.customerPhone?.trim() || "N/A"}`,
      `Account Created: ${isNewClient ? "Yes (New Client Account)" : "Existing Account Linked"}`,
      `Payment Timing: ${isPayLater ? "Pay Later (Request Submitted - Representative will contact soon)" : "Pay Now (Representative will verify and contact soon)"}`,
      `Payment Plan: ${planDescription}`,
      `Payment Channel: ${channelDescription}`,
      `Payment Reference / TrxID: ${isPayLater ? "N/A (Pay Later Reservation)" : trimmedReference || "N/A"}`,
      `Payment Status: ${isPayLater ? "Pending Representative Contact & Invoice" : "Pending Admin Verification"}`,
      `Verification Note: ${isPayLater ? "SCCG representative will contact client soon to arrange payment and consultation." : "SCCG Admin will confirm payment via banking system upon receipt. Representative will contact client soon."}`,
      `Submitted At: ${now}`,
    ].join("\n"),
    createdBy: user?.id || cleanEmail || "guest",
    createdAt: now,
    updatedAt: now,
  });

  // 2. Create Order Line Items
  for (const item of data.items) {
    await createSalesOrderItem({
      salesOrderId: order.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    });
  }

  // 3. Dispatch Detailed Booking Confirmation Email to Client & CC service@mysccg.de
  try {
    const itemsHtml = data.items.map(it => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b;">${it.productName}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">${it.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0F4C81;">€${(it.unitPrice * it.quantity).toLocaleString()}</td>
      </tr>
    `).join("");

    const perInstEur = installmentCount > 0 ? Math.round((data.remainingEur || 0) / installmentCount) : 0;
    const perInstBdt = installmentCount > 0 ? Math.round((data.remainingBdt || 0) / installmentCount) : 0;

    const installmentBreakdownHtml = paymentPlan === "installment" ? `
      <div style="margin-top: 16px; padding: 14px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px;">
        <p style="margin: 0 0 6px 0; font-weight: 800; font-size: 13px; color: #92400e;">
          Selected Plan: Installment Schedule (${data.depositPercent || 42}% Minimum Deposit &middot; ${installmentCount} Milestones)
        </p>
        <p style="margin: 0; font-size: 12px; color: #78350f; line-height: 1.6;">
          • <strong>Payable Today (Initial Deposit):</strong> €${(data.downPaymentEur || 0).toLocaleString()}${isBangladesh ? ` (≈ ৳${(data.downPaymentBdt || 0).toLocaleString()} BDT)` : ""}<br/>
          • <strong>Remaining Balance:</strong> €${(data.remainingEur || 0).toLocaleString()} divided into <strong>${installmentCount} equal monthly installments</strong> of €${perInstEur.toLocaleString()}${isBangladesh ? ` (≈ ৳${perInstBdt.toLocaleString()} BDT)` : ""} each.
        </p>
      </div>
    ` : `
      <div style="margin-top: 16px; padding: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;">
        <p style="margin: 0; font-weight: 800; font-size: 13px; color: #166534;">Selected Plan: Full Payment (100% Upfront Settlement: €${totalAmount.toLocaleString()})</p>
      </div>
    `;

    const payableNowEur = paymentPlan === "installment" ? (data.downPaymentEur ?? Math.round(totalAmount * 0.35)) : totalAmount;
    const payableNowBdt = paymentPlan === "installment" ? (data.downPaymentBdt ?? Math.round(payableNowEur * (data.liveRate || 140.2))) : Math.round(totalAmount * (data.liveRate || 140.2));

    // Rich Payment Channel Details for client reference
    let paymentChannelHtml = "";
    if (isPayLater) {
      paymentChannelHtml = `
        <div style="margin-top: 16px; padding: 16px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <p style="margin: 0; font-weight: 800; font-size: 13px; color: #166534;">
              📋 Payment Preference: Pay Later (Service Reservation)
            </p>
            <span style="background: #16a34a; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">ZERO DUE TODAY</span>
          </div>
          <p style="margin: 0 0 8px 0; color: #15803d; line-height: 1.6;">
            Thank you for reserving your service with SCCG! Your booking request has been recorded. <strong>One of our representatives will contact you soon</strong> via Email or WhatsApp/Phone to answer any questions, finalize your schedule, and provide your official invoice for payment.
          </p>
          <div style="padding: 8px 12px; background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 11px; color: #14532d;">
            <strong>Reserved Package Total:</strong> €${totalAmount.toLocaleString()} EUR${isBangladesh ? ` (≈ ৳${Math.round(totalAmount * (data.liveRate || 140.2)).toLocaleString()} BDT)` : ""} &middot; Payment will be arranged upon consultation.
          </div>
        </div>
      `;
    } else if (paymentMethod === "paypal") {
      paymentChannelHtml = `
        <div style="margin-top: 16px; padding: 16px; background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <p style="margin: 0; font-weight: 800; font-size: 13px; color: #0369a1;">
              💳 Payment Method: PayPal Euro Transfer (€)
            </p>
            <span style="background: #0284c7; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">EURO ONLY (€)</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; background: #ffffff; border: 1px solid #e0f2fe; border-radius: 6px;">
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; width: 140px; border-bottom: 1px solid #f1f5f9;">PayPal Email:</td>
              <td style="padding: 7px 10px; font-weight: 800; color: #0284c7; font-family: monospace; border-bottom: 1px solid #f1f5f9;">mhasnainn@hotmail.com</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Recipient Name:</td>
              <td style="padding: 7px 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">Md Hasnain (SCCG Germany)</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Payable Now:</td>
              <td style="padding: 7px 10px; font-weight: 800; color: #0369a1; font-size: 13px; border-bottom: 1px solid #f1f5f9;">€${payableNowEur.toLocaleString("en-DE", { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Order Reference:</td>
              <td style="padding: 7px 10px; font-weight: 800; font-family: monospace; color: #0F4C81; border-bottom: 1px solid #f1f5f9;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600;">Your TrxID / Ref:</td>
              <td style="padding: 7px 10px; font-weight: 700; font-family: monospace; color: #334155;">${trimmedReference || "Pending submission"}</td>
            </tr>
          </table>
          <p style="margin: 0; font-size: 11px; color: #0369a1; line-height: 1.5;">
            <strong>Instructions:</strong> Log in to PayPal &gt; Send Payment to <strong>mhasnainn@hotmail.com</strong> &gt; Enter <strong>€${payableNowEur.toLocaleString("en-DE", { minimumFractionDigits: 2 })}</strong> with note: <strong>${orderNumber}</strong>. SCCG Admin will confirm payment receipt.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #0284c7; font-weight: 600;">
            ℹ️ Notice: After submitting your request, one of our representatives will contact you soon.
          </p>
        </div>
      `;
    } else if (paymentMethod === "bangladesh-transfer" && bdTransferType === "bkash") {
      paymentChannelHtml = `
        <div style="margin-top: 16px; padding: 16px; background: #fdf2f8; border: 1.5px solid #fbcfe8; border-radius: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <p style="margin: 0; font-weight: 800; font-size: 13px; color: #9d174d;">
              📱 Payment Method: Bangladesh Local Transfer via bKash Personal
            </p>
            <span style="background: #e11d48; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">bKash BDT</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; background: #ffffff; border: 1px solid #fce7f3; border-radius: 6px;">
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; width: 140px; border-bottom: 1px solid #f1f5f9;">bKash Number:</td>
              <td style="padding: 7px 10px; font-weight: 800; color: #e11d48; font-family: monospace; font-size: 13px; border-bottom: 1px solid #f1f5f9;">01835898287</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Account Type:</td>
              <td style="padding: 7px 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">Personal (Send Money)</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Recipient / Account Holder:</td>
              <td style="padding: 7px 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">Rabiul H Chawdhury</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Payable in BDT:</td>
              <td style="padding: 7px 10px; font-weight: 800; color: #9d174d; font-size: 13px; border-bottom: 1px solid #f1f5f9;">৳${payableNowBdt.toLocaleString()} BDT <span style="font-size: 11px; font-weight: normal; color: #64748b;">(≈ €${payableNowEur.toLocaleString()})</span></td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">bKash Reference:</td>
              <td style="padding: 7px 10px; font-weight: 800; font-family: monospace; color: #0F4C81; border-bottom: 1px solid #f1f5f9;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600;">Your TrxID / Ref:</td>
              <td style="padding: 7px 10px; font-weight: 700; font-family: monospace; color: #334155;">${trimmedReference || "Pending submission"}</td>
            </tr>
          </table>
          <p style="margin: 0; font-size: 11px; color: #9d174d; line-height: 1.5;">
            <strong>Instructions:</strong> Open bKash app &gt; Send Money &gt; Enter <strong>01835898287</strong> &gt; Amount: <strong>৳${payableNowBdt.toLocaleString()} BDT</strong> &gt; Reference: <strong>${orderNumber}</strong>. Keep your 10-char TrxID for verification.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #9d174d; font-weight: 600;">
            ℹ️ Notice: After submitting your request, one of our representatives will contact you soon.
          </p>
        </div>
      `;
    } else if (paymentMethod === "bangladesh-transfer") {
      paymentChannelHtml = `
        <div style="margin-top: 16px; padding: 16px; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <p style="margin: 0; font-weight: 800; font-size: 13px; color: #166534;">
              🏦 Payment Method: Bangladesh Local Transfer — The City Bank PLC
            </p>
            <span style="background: #16a34a; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">Bank Transfer / Deposit</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; background: #ffffff; border: 1px solid #dcfce7; border-radius: 6px;">
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; width: 140px; border-bottom: 1px solid #f1f5f9;">Bank Name:</td>
              <td style="padding: 7px 10px; font-weight: 800; color: #166534; border-bottom: 1px solid #f1f5f9;">The City Bank PLC</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Account Name:</td>
              <td style="padding: 7px 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">Md Hasnain</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Account Number:</td>
              <td style="padding: 7px 10px; font-weight: 800; color: #166534; font-family: monospace; font-size: 13px; border-bottom: 1px solid #f1f5f9;">2303620513001</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Branch &amp; Routing:</td>
              <td style="padding: 7px 10px; font-weight: 700; color: #334155; border-bottom: 1px solid #f1f5f9;">Hajigonj Branch, Chandpur &middot; Routing: 225130635</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Payable in BDT:</td>
              <td style="padding: 7px 10px; font-weight: 800; color: #166534; font-size: 13px; border-bottom: 1px solid #f1f5f9;">৳${payableNowBdt.toLocaleString()} BDT <span style="font-size: 11px; font-weight: normal; color: #64748b;">(≈ €${payableNowEur.toLocaleString()})</span></td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Transfer Remarks:</td>
              <td style="padding: 7px 10px; font-weight: 800; font-family: monospace; color: #0F4C81; border-bottom: 1px solid #f1f5f9;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; color: #64748b; font-weight: 600;">Your TrxID / Ref:</td>
              <td style="padding: 7px 10px; font-weight: 700; font-family: monospace; color: #334155;">${trimmedReference || "Pending submission"}</td>
            </tr>
          </table>
          <p style="margin: 0; font-size: 11px; color: #166534; line-height: 1.5;">
            <strong>Instructions:</strong> Transfer via Citytouch app / BEFTN / NPSB or deposit cash at any City Bank branch with remarks <strong>${orderNumber}</strong>. Retain receipt for verification.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #166534; font-weight: 600;">
            ℹ️ Notice: After submitting your request, one of our representatives will contact you soon.
          </p>
        </div>
      `;
    } else {
      paymentChannelHtml = `
        <div style="margin-top: 16px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 12px;">
          <p style="margin: 0 0 4px 0; font-weight: 800; font-size: 13px; color: #0F4C81;">Payment Method: ${channelDescription}</p>
          <p style="margin: 0 0 4px 0;"><strong>Payable Amount:</strong> €${payableNowEur.toLocaleString()}</p>
          <p style="margin: 0;"><strong>Your Reference:</strong> ${trimmedReference || "N/A"}</p>
        </div>
      `;
    }

    // New Client Account Provisioning Details in Email
    const accountDetailsHtml = isNewClient ? `
      <div style="margin-top: 20px; padding: 18px; background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; font-size: 12px;">
        <div style="margin-bottom: 8px;">
          <p style="margin: 0; font-weight: 800; font-size: 14px; color: #065f46;">
            🎉 Your SCCG Client Account Has Been Created!
          </p>
        </div>
        <p style="margin: 0 0 10px 0; color: #047857; line-height: 1.5;">
          An official client portal account has been set up for you. Use these credentials to sign in, monitor your order status, download invoices, access study materials, and manage milestone payments:
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff; border: 1px solid #d1fae5; border-radius: 6px;">
          <tr>
            <td style="padding: 7px 10px; color: #64748b; font-weight: 600; width: 130px; border-bottom: 1px solid #f1f5f9;">Portal Login:</td>
            <td style="padding: 7px 10px; font-weight: 700; border-bottom: 1px solid #f1f5f9;"><a href="https://portal.mysccg.de/login" style="color: #0F4C81; text-decoration: underline;">https://portal.mysccg.de/login</a></td>
          </tr>
          <tr>
            <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Username / Email:</td>
            <td style="padding: 7px 10px; font-weight: 800; font-family: monospace; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${cleanEmail}</td>
          </tr>
          <tr>
            <td style="padding: 7px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Temporary Password:</td>
            <td style="padding: 7px 10px; font-weight: 800; font-family: monospace; color: #0F4C81; border-bottom: 1px solid #f1f5f9;">${tempClientPassword}</td>
          </tr>
          <tr>
            <td style="padding: 7px 10px; color: #64748b; font-weight: 600;">Account Role:</td>
            <td style="padding: 7px 10px; font-weight: 700; color: #059669;">Client / Student</td>
          </tr>
        </table>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">
          Tip: You can update your password anytime under your Account Settings after logging in.
        </p>
      </div>
    ` : `
      <div style="margin-top: 16px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569;">
        <strong>Existing SCCG Account:</strong> This booking is linked to your existing account (<span style="font-family: monospace; font-weight: bold; color: #0F4C81;">${cleanEmail}</span>). You can sign in at <a href="https://portal.mysccg.de/login" style="color: #0F4C81; font-weight: bold;">portal.mysccg.de</a> anytime to track your progress.
      </div>
    `;

    const emailSubject = `Booking Received: Order #${orderNumber} — SCCG Germany`;
    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #1e293b;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0F4C81 0%, #0B2545 100%); padding: 28px 24px; color: #ffffff;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #F5B800;">SCCG Germany • Service Booking Confirmation</div>
          <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">Your Booking Has Been Received</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">Order #${orderNumber} &middot; Awaiting Admin Payment Verification</p>
        </div>

        <div style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">
            Dear <strong>${data.customerName}</strong>,
          </p>
          <p style="margin: 0 0 20px 0; font-size: 13px; color: #475569; line-height: 1.6;">
            Thank you for booking with SCCG Germany. We have received your order details and submitted payment reference. Our admissions and finance admin will verify your payment in our system and confirm your enrollment.
          </p>

          <!-- Booked Services Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 10px 12px; text-align: left; color: #475569;">Service / Course</th>
                <th style="padding: 10px 12px; text-align: center; color: #475569;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; color: #475569;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px; font-weight: bold; text-align: right;">Total Order Value:</td>
                <td style="padding: 12px; font-weight: 800; text-align: right; font-size: 15px; color: #0F4C81;">€${totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Payment Plan Details -->
          ${installmentBreakdownHtml}

          <!-- Rich Payment Method & Reference Box -->
          ${paymentChannelHtml}

          <!-- Client Account Status Box -->
          ${accountDetailsHtml}

          <!-- Next Steps Notice -->
          <div style="margin-top: 20px; padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; font-size: 12px; color: #1e40af; line-height: 1.6;">
            <strong>Next Steps:</strong> SCCG Admissions Admin will verify the transaction reference in our accounting system. Once confirmed, you will receive your official enrollment confirmation dossier, student login credentials, and digital receipt.
          </div>

          <div style="margin-top: 20px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; color: #64748b; text-align: center;">
            Sales &amp; Service Desk CC Copy: <strong>service@mysccg.de</strong> &middot; Order ID: #${orderNumber}
          </div>

          <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
            SCCG Career Lab UG (haftungsbeschränkt) &middot; Julius-Ludowieg-Straße 46, 21073 Hamburg, Germany &middot; <a href="mailto:info@mysccg.de" style="color: #0F4C81; text-decoration: none;">info@mysccg.de</a>
          </p>
        </div>
      </div>
    `;

    // Send direct booking confirmation email to client with CC to service@mysccg.de
    try {
      console.log(`[Order Email] Sending client booking receipt to ${cleanEmail} for order #${orderNumber}...`);
      await sendEmailViaGraph({
        to: cleanEmail,
        toName: data.customerName,
        cc: [
          { email: "service@mysccg.de", name: "SCCG Service Desk" }
        ],
        subject: emailSubject,
        htmlBody: emailBody,
        senderUserId: "portal@mysccg.de",
      });
      console.log(`[Order Email] ✓ Dispatched client confirmation email to ${cleanEmail}`);
    } catch (clientErr) {
      console.error("[Order Email] Client dispatch failed, trying fallback sender:", clientErr);
      try {
        await sendEmailViaGraph({
          to: cleanEmail,
          toName: data.customerName,
          subject: emailSubject,
          htmlBody: emailBody,
          senderUserId: "service@mysccg.de",
        });
        console.log(`[Order Email] ✓ Dispatched client confirmation via service@mysccg.de`);
      } catch (fbErr) {
        console.error("[Order Email] Fallback client email failed:", fbErr);
      }
    }

    // Send direct admin sales alert to service@mysccg.de to ensure inbox delivery
    try {
      console.log(`[Order Email] Sending direct admin alert to service@mysccg.de for order #${orderNumber}...`);
      const adminAlertSubject = `🔔 [New Booking Alert] Order #${orderNumber} — ${data.customerName} (€${totalAmount.toLocaleString()})`;
      const adminAlertBody = `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 2px solid #0F4C81; border-radius: 12px; overflow: hidden;">
          <div style="background: #0F4C81; padding: 20px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 18px;">🔔 New Marketplace Order — Admin Verification Required</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #e2e8f0;">Order #${orderNumber} &middot; Received at ${now}</p>
          </div>
          <div style="padding: 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <p style="margin: 0 0 6px 0; font-weight: bold; font-size: 13px; color: #0F4C81;">Order &amp; Payment Details:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #334155; line-height: 1.6;">
              <li><strong>Customer Name:</strong> ${data.customerName}</li>
              <li><strong>Customer Email:</strong> ${cleanEmail}</li>
              <li><strong>Customer Phone / Country:</strong> ${data.customerPhone || "N/A"} / ${country}</li>
              <li><strong>Payment Channel:</strong> ${channelDescription}</li>
              <li><strong>Payment Plan:</strong> ${planDescription}</li>
              <li><strong>Payment Reference / TrxID:</strong> <span style="font-family: monospace; font-weight: bold; color: #0F4C81;">${trimmedReference || "Pending submission"}</span></li>
              <li><strong>Order Total:</strong> €${totalAmount.toLocaleString()}</li>
            </ul>
          </div>
          <div style="padding: 20px;">
            ${emailBody}
          </div>
        </div>
      `;

      await sendEmailViaGraph({
        to: "service@mysccg.de",
        toName: "SCCG Service Desk",
        subject: adminAlertSubject,
        htmlBody: adminAlertBody,
        senderUserId: "portal@mysccg.de",
      });
      console.log(`[Order Email] ✓ Dispatched direct admin alert to service@mysccg.de`);
    } catch (adminErr) {
      console.error("[Order Email] Admin alert dispatch failed:", adminErr);
    }
  } catch (emailErr) {
    console.error("Booking confirmation email unexpected error:", emailErr);
  }

  // 4. Handle Coin Payment instant invoice if applicable
  if (isCoinPayment) {
    const invoice = await createInvoice({
      partnerId: user?.partnerId || user?.id || "DIRECT_CUSTOMER",
      clientId: user?.id || data.customerEmail,
      clientName: data.customerName,
      orderId: order.id,
      amount: totalAmount,
      status: "paid",
      dueDate: now,
      createdAt: now,
    });

    await createTransaction({
      clientId: user?.id || data.customerEmail,
      partnerId: user?.partnerId || user?.id || "DIRECT_CUSTOMER",
      type: "payment",
      amount: totalAmount,
      reference: trimmedReference || `Direct-Order-${orderNumber}`,
      orderId: order.id,
      description: `Marketplace Coin Payment for Order ${orderNumber}`,
      date: now,
    });
  }

  revalidatePath("/orders");
  revalidatePath("/financials/invoices");
  
  return {
    success: true,
    orderId: order.id,
    orderNumber,
    requiresVerification: !isCoinPayment,
    paymentMethod,
    paymentPlan,
    invoiceId: isCoinPayment ? order.id : undefined,
  };
}

export async function getNextOrderNumberAction() {
  try {
    return await generateOrderNumber();
  } catch {
    return `SCCG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

/**
 * Real-time email validation to detect if customer already has an SCCG account
 */
export async function checkCustomerEmailAction(email: string): Promise<{ exists: boolean; name?: string; role?: string }> {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
    return { exists: false };
  }
  try {
    const customer = await getCustomerByEmail(cleanEmail);
    if (customer) {
      return { exists: true, name: customer.name || "", role: "customer" };
    }
    const partner = await getPartnerByEmail(cleanEmail);
    if (partner) {
      return { exists: true, name: partner.name || "", role: partner.role || "partner" };
    }
    return { exists: false };
  } catch (err) {
    console.warn("checkCustomerEmailAction check failed:", err);
    return { exists: false };
  }
}

/**
 * Public Order Details for confirmation page & receipt generation
 */
export async function getPublicOrderDetailsAction(orderId: string, orderNumber?: string) {
  try {
    if (!orderId && !orderNumber) return null;
    let order = null;
    if (orderId) {
      order = await getSalesOrderById(orderId);
    }
    if (!order) return null;
    if (orderNumber && order.orderNumber && order.orderNumber.trim().toUpperCase() !== orderNumber.trim().toUpperCase()) {
      return null;
    }
    let items: any[] = [];
    try {
      items = await getSalesOrderItems(order.id);
    } catch (itemErr) {
      console.warn("getSalesOrderItems failed for order", order.id, itemErr);
    }
    return {
      order,
      items: Array.isArray(items) ? items : [],
    };
  } catch (err) {
    console.warn("getPublicOrderDetailsAction failed:", err);
    return null;
  }
}
