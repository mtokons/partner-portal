import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { sales } from "@/lib/db";

export const metadata = { title: "Sales Orders" };

const statusBadge: Record<string, string> = {
  pending: "badge-warning",
  "in-progress": "badge-info",
  completed: "badge-success",
  cancelled: "badge-danger",
};

export default async function SalesOrdersPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;
  const isAdmin = user?.roles?.includes("admin");
  const partnerId = isAdmin ? undefined : user?.partnerId;

  const orders = await sales.getSalesOrders(partnerId);

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">Sales Orders</h1>
        <p className="page-subtitle">{orders.length} orders</p>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        {orders.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <p>No orders yet. Orders are created when a sales offer is accepted.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Offer #</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 500, color: "var(--accent-cyan)" }}>
                    {order.orderNumber}
                  </td>
                  <td style={{ fontSize: "0.8125rem" }}>{order.offerNumber}</td>
                  <td style={{ color: "var(--text-primary)" }}>{order.clientName || "—"}</td>
                  <td style={{ fontWeight: 600 }}>৳{order.totalAmount.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${statusBadge[order.status] || "badge-neutral"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8125rem" }}>
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
