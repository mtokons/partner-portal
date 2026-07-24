import { NextResponse } from "next/server";
import { getInvoiceById, getClientById, getSalesOrderById, getSalesOrderItems } from "@/lib/sharepoint";
import { generateInvoicePdf } from "@/lib/pdf";
import { requireSessionUser, canAccess } from "@/lib/api-auth";
import type { Order } from "@/types";

export async function GET(request: Request) {
  const user = await requireSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing invoice id" }, { status: 400 });

  // Fetch the specific invoice by ID — much faster than scanning all invoices
  let invoice;
  try {
    invoice = await getInvoiceById(id);
  } catch (e) {
    console.error("invoice-pdf: getInvoiceById failed", (e as Error).message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  if (!canAccess(user, { partnerId: invoice.partnerId, customerId: invoice.clientId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let order: Order | undefined;
  let client = undefined;

  try {
    if (invoice.orderId) {
      const salesOrder = await getSalesOrderById(invoice.orderId).catch(() => null);
      if (salesOrder) {
        const items = await getSalesOrderItems(salesOrder.id).catch(() => []);
        order = {
          id: salesOrder.id,
          partnerId: salesOrder.partnerId,
          clientId: salesOrder.clientId,
          clientName: salesOrder.clientName,
          items: items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
          status: "confirmed",
          totalAmount: salesOrder.totalAmount,
          notes: salesOrder.notes,
          createdAt: salesOrder.createdAt,
        };
      }
    }
    if (invoice.clientId) {
      client = (await getClientById(invoice.clientId)) ?? undefined;
    }
  } catch {
    // Non-fatal: PDF will render without order/client details
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = generateInvoicePdf(invoice, order, client);
  } catch (e) {
    console.error("invoice-pdf: generateInvoicePdf failed", (e as Error).message);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }

  const filename = `invoice-${invoice.invoiceNumber || invoice.id}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes as unknown as ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

