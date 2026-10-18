"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";

import { Button, Card, ErrorState, Icon, Input, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { playerHref } from "@/lib/course";
import { price } from "@/lib/format";
import type { OrderView } from "@/lib/types";

function useOrder(poll = false) {
  const { orderId } = useParams<{ orderId: string }>();
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.get<OrderView>(`/me/orders/${orderId}`),
    refetchOnMount: "always",
    // While a hosted provider's webhook is on its way, keep checking (also in a background tab).
    refetchInterval: (q) => (poll && q.state.data?.status === "PENDING" ? 1500 : false),
    refetchIntervalInBackground: true,
  });
}

/** Stand-in for a hosted checkout page, used with BILLING_PROVIDER=test. No card data is sent anywhere. */
export function TestCheckout() {
  const router = useRouter();
  const qc = useQueryClient();
  const order = useOrder();
  const pay = useMutation({
    mutationFn: () => api.post<OrderView>(`/me/orders/${order.data!.id}/test-pay`),
    onSuccess: (o) => {
      qc.setQueryData(["order", o.id], o);
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      router.replace(`/checkout/${o.id}/success`);
    },
  });
  if (order.isLoading) return <Skeleton height={420} />;
  if (order.error || !order.data) return <ErrorState message={order.error?.message ?? "Order not found"} />;
  const o = order.data;
  if (o.status !== "PENDING") {
    router.replace(`/checkout/${o.id}/${o.status === "PAID" ? "success" : "cancel"}`);
    return null;
  }
  return (
    <Card padding={0} style={{ width: "100%", overflow: "hidden" }}>
      <div className="flex items-start gap-3.5" style={{ padding: "22px 24px 0" }}>
        <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--coral-100)", color: "var(--coral-700)" }}>
          <Icon name="credit-card" />
        </span>
        <div>
          <div className="ob-dialog__title">Checkout</div>
          <div style={{ color: "var(--text-muted)", marginTop: 4 }}>{o.courseTitle}</div>
        </div>
      </div>
      <form
        className="flex flex-col gap-3.5"
        style={{ padding: "16px 24px 20px" }}
        onSubmit={(e) => {
          e.preventDefault();
          pay.mutate();
        }}
      >
        <Input label="Name on card" defaultValue={o.buyerName ?? ""} autoComplete="off" />
        <Input label="Card number" iconLeft="credit-card" defaultValue="4242 4242 4242 4242" autoComplete="off" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Expiry" defaultValue="08 / 29" autoComplete="off" />
          <Input label="CVC" defaultValue="123" autoComplete="off" />
        </div>
        <div className="flex justify-between" style={{ paddingTop: 12, borderTop: "1px solid var(--border-subtle)", font: "600 15px var(--font-body)", color: "var(--text-strong)" }}>
          <span>Total</span>
          <span>{price(o.amountCents, o.currency)}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Test checkout — no real payment is taken. 30-day refund guarantee.</div>
        {pay.error && <div className="ob-help ob-help--error">{pay.error.message}</div>}
        <div className="flex justify-end gap-2.5 pt-1.5">
          <Button variant="secondary" href={`/checkout/${o.id}/cancel`}>
            Cancel
          </Button>
          <Button type="submit" iconLeft="lock" loading={pay.isPending}>
            {pay.isPending ? "Processing…" : `Pay ${price(o.amountCents, o.currency)}`}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function CheckoutSuccess() {
  const order = useOrder(true);
  if (order.isLoading) return <Skeleton height={260} />;
  if (order.error || !order.data) return <ErrorState message={order.error?.message ?? "Order not found"} />;
  const o = order.data;
  const paid = o.status === "PAID";
  return (
    <Card padding={32} style={{ width: "100%", textAlign: "center" }}>
      <span style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto", display: "grid", placeItems: "center", background: paid ? "var(--green-100)" : "var(--amber-100)", color: paid ? "var(--green-700)" : "var(--amber-700)" }}>
        <Icon name={paid ? "circle-check" : "loader-circle"} size={28} className={paid ? undefined : "ob-spin"} />
      </span>
      <h1 style={{ font: "600 24px/32px var(--font-display)", marginTop: 16 }}>{paid ? "You're enrolled!" : "Confirming your payment…"}</h1>
      <p style={{ color: "var(--text-muted)", margin: "6px 0 22px" }}>
        {paid ? `${o.courseTitle} is now in My learning. A receipt is on its way to your inbox.` : "This usually takes a few seconds."}
      </p>
      {paid && (
        <Button size="lg" iconRight="arrow-right" href={playerHref(o.courseId)}>
          Start learning
        </Button>
      )}
    </Card>
  );
}

export function CheckoutCancelled() {
  const order = useOrder();
  return (
    <Card padding={32} style={{ width: "100%", textAlign: "center" }}>
      <span style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto", display: "grid", placeItems: "center", background: "var(--ink-100)", color: "var(--ink-700)" }}>
        <Icon name="x" size={28} />
      </span>
      <h1 style={{ font: "600 24px/32px var(--font-display)", marginTop: 16 }}>Checkout cancelled</h1>
      <p style={{ color: "var(--text-muted)", margin: "6px 0 22px" }}>You haven&rsquo;t been charged. You can come back to this course any time.</p>
      <Button variant="secondary" iconLeft="arrow-left" href={order.data?.courseSlug ? `/courses/${order.data.courseSlug}` : "/courses"}>
        Back to the course
      </Button>
    </Card>
  );
}
