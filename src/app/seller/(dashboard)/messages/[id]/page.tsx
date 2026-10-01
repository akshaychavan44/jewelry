import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageThread } from "@/components/messages/thread";
import { StatusBadge } from "@/components/ui/display";
import { DISPUTE_STATUS } from "@/lib/status";
import { humanize } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { getConversationForUser } from "@/server/services/messaging";

export default async function SellerConversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller, user } = await requireSeller();
  const convo = await getConversationForUser(id, user.id, { sellerId: seller.id });
  if (!convo) notFound();
  const buyer = convo.participants.find((p) => p.role === "BUYER")?.user;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <Link href="/seller/messages" className="text-[13px] text-muted hover:text-ink">
            ← Messages
          </Link>
          <h1 className="display-sm mt-1 text-ink">{convo.subject}</h1>
          <p className="text-[13px] text-muted">
            {humanize(convo.type)} · with {buyer?.name ?? "buyer"}
            {convo.product && (
              <>
                {" "}·{" "}
                <Link href={`/product/${convo.product.slug}`} className="underline underline-offset-2">
                  {convo.product.title}
                </Link>
              </>
            )}
            {convo.sellerOrder && (
              <>
                {" "}·{" "}
                <Link href={`/seller/orders/${convo.sellerOrder.id}`} className="underline underline-offset-2">
                  {convo.sellerOrder.reference}
                </Link>
              </>
            )}
          </p>
        </div>
        {convo.dispute && <StatusBadge status={convo.dispute.status} map={DISPUTE_STATUS} />}
      </div>
      <MessageThread
        conversationId={convo.id}
        meId={user.id}
        readOnly={convo.dispute ? ["RESOLVED", "CLOSED"].includes(convo.dispute.status) : false}
        messages={convo.messages.map((m) => ({ id: m.id, body: m.body, isSystem: m.isSystem, createdAt: m.createdAt.toISOString(), sender: m.sender }))}
      />
    </>
  );
}
