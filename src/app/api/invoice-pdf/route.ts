import { NextResponse } from "next/server";
import { getInvoices, getOrders, getClientById } from "@/lib/sharepoint";
import { generateInvoicePdf } from "@/lib/pdf";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });
  }

  // Fetch all invoices (mock mode) and find matching one
  const invoices = await getInvoices();
  const invoice = invoices.find((inv) => inv.id === id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  let order = undefined;
  let client = undefined;

  try {
    if (invoice.orderId) {
      const orders = await getOrders(invoice.partnerId);
      order = orders.find((o) => o.id === invoice.orderId);
    }
    if (invoice.clientId) {
      client = (await getClientById(invoice.clientId)) ?? undefined;
    }
  } catch {
    // Non-fatal: PDF will render without order/client details
  }

  const pdfBytes = generateInvoicePdf(invoice, order, client);

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.id}.pdf"`,
    },
  });
}
