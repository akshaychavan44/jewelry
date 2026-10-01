import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageThread } from "@/components/messages/thread";
import { StatusBadge } from "@/components/ui/display";
import { DISPUTE_STATUS } from "@/lib/status";
import { humanize } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { getConversationForUser } from "@/server/services/messaging";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/messages/${id}`);
  const convo = await getConversationForUser(id, user.id);
  if (!convo) notFound();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-4">
          {convo.product?.images[0] && (
            <Link href={`/product/${convo.product.slug}`} className="relative size-14 shrink-0 overflow-hidden bg-sand">
              <Image src={convo.product.images[0].url} alt="" fill sizes="56px" className="object-cover" />
            </Link>
          )}
          <div>
            <Link href="/account/messages" className="text-[13px] text-muted hover:text-ink">
              ← Messages
            </Link>
            <h1 className="display-sm mt-1 text-ink">{convo.subject}</h1>
            <p className="text-[13px] text-muted">
              {humanize(convo.type)} · with{" "}
              {convo.seller && (
                <Link href={`/jewelers/${convo.seller.slug}`} className="underline underline-offset-2 hover:text-ink">
                  {convo.seller.storeName}
                </Link>
              )}
              {convo.sellerOrder && (
                <>
                  {" "}·{" "}
                  <Link href={`/account/orders/${convo.sellerOrder.order.orderNumber}`} className="underline underline-offset-2 hover:text-ink">
                    {convo.sellerOrder.reference}
                  </Link>
                </>
              )}
            </p>
          </div>
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
