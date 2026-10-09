import { PageHeader } from "@/components/account/page-header";
import { ConversationList } from "@/components/messages/conversation-list";
import { requireSeller } from "@/server/auth/session";
import { listConversations } from "@/server/services/messaging";

export default async function SellerMessages() {
  const { seller, user } = await requireSeller();
  const conversations = await listConversations(user.id, "SELLER_STORE", seller.id);
  const disputes = await listConversations(user.id, user.role);
  const all = [...conversations, ...disputes.filter((d) => d.type === "DISPUTE" && d.sellerId === seller.id)].sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  return (
    <>
      <PageHeader title="Messages" description="Direct customer inquiries, bespoke commission requests, and piece discussions." />
      <ConversationList
        basePath="/seller/messages"
        items={all.map((c) => {
          const buyer = c.participants.find((p) => p.role === "BUYER")?.user;
          return {
            id: c.id,
            type: c.type,
            subject: c.subject,
            lastMessageAt: c.lastMessageAt,
            unread: c.unread,
            counterpart: c.type === "DISPUTE" ? `Loupe case · ${buyer?.name ?? "buyer"}` : (buyer?.name ?? "Buyer"),
            preview: c.messages[0]?.body ?? "",
            imageUrl: c.product?.images[0]?.url,
          };
        })}
      />
    </>
  );
}
