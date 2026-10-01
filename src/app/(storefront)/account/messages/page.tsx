import { PageHeader } from "@/components/account/page-header";
import { ConversationList } from "@/components/messages/conversation-list";
import { requireUser } from "@/server/auth/session";
import { listConversations } from "@/server/services/messaging";

export default async function MessagesPage() {
  const user = await requireUser("/account/messages");
  const conversations = await listConversations(user.id, user.role);
  return (
    <>
      <PageHeader title="Messages" description="Questions, commissions, offers and any open cases with Loupe." />
      <ConversationList
        basePath="/account/messages"
        items={conversations.map((c) => ({
          id: c.id,
          type: c.type,
          subject: c.subject,
          lastMessageAt: c.lastMessageAt,
          unread: c.unread,
          counterpart: c.type === "DISPUTE" ? `Loupe case · ${c.seller?.storeName ?? ""}` : (c.seller?.storeName ?? "Loupe"),
          preview: c.messages[0]?.body ?? "",
          imageUrl: c.product?.images[0]?.url,
        }))}
      />
    </>
  );
}
