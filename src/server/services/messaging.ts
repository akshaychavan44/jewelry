import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ConversationType, NotificationType, Role } from "@/generated/prisma/enums";
import { db, type Tx } from "@/server/db";

type Client = Tx | typeof db;

export async function notify(
  client: Client,
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  href?: string,
) {
  await client.notification.create({ data: { userId, type, title, body, href } });
}

/** Finds (or opens) the buyer ↔ store thread for a given subject. */
export async function openConversation(
  client: Client,
  args: {
    type: ConversationType;
    subject: string;
    buyerId: string;
    sellerId: string;
    sellerUserId: string;
    productId?: string;
    sellerOrderId?: string;
    offerId?: string;
    customRequestId?: string;
  },
) {
  const where: Prisma.ConversationWhereInput = {
    type: args.type,
    sellerId: args.sellerId,
    participants: { some: { userId: args.buyerId } },
    ...(args.offerId ? { offerId: args.offerId } : {}),
    ...(args.productId && !args.offerId ? { productId: args.productId } : {}),
    ...(args.sellerOrderId ? { sellerOrderId: args.sellerOrderId } : {}),
    ...(args.customRequestId ? { customRequestId: args.customRequestId } : {}),
  };
  const existing = await client.conversation.findFirst({ where });
  if (existing) return existing;
  return client.conversation.create({
    data: {
      type: args.type,
      subject: args.subject,
      sellerId: args.sellerId,
      productId: args.productId,
      sellerOrderId: args.sellerOrderId,
      offerId: args.offerId,
      customRequestId: args.customRequestId,
      participants: {
        create: [
          { userId: args.buyerId, role: "BUYER", lastReadAt: new Date() },
          { userId: args.sellerUserId, role: "SELLER" },
        ],
      },
    },
  });
}

export async function postMessage(
  client: Client,
  conversationId: string,
  senderId: string | null,
  body: string,
  opts: { isSystem?: boolean; attachments?: Prisma.InputJsonValue } = {},
) {
  const now = new Date();
  const message = await client.message.create({
    data: { conversationId, senderId, body, isSystem: !!opts.isSystem, attachments: opts.attachments },
  });
  await client.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } });
  if (senderId) {
    await client.conversationParticipant.updateMany({ where: { conversationId, userId: senderId }, data: { lastReadAt: now } });
  }
  return message;
}

/** Conversations visible to a user, newest first, with unread counts. */
export async function listConversations(userId: string, role: Role | "SELLER_STORE", sellerId?: string) {
  const where: Prisma.ConversationWhereInput =
    role === "SELLER_STORE" && sellerId ? { sellerId, type: { not: "DISPUTE" } } : { participants: { some: { userId } } };
  const conversations = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 60,
    include: {
      participants: { include: { user: { select: { id: true, name: true, role: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      seller: { select: { storeName: true, slug: true, logoUrl: true } },
      product: { select: { title: true, slug: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } },
    },
  });
  return Promise.all(
    conversations.map(async (c) => {
      const me = c.participants.find((p) => p.userId === userId);
      const unread = await db.message.count({
        where: { conversationId: c.id, senderId: { not: userId }, createdAt: { gt: me?.lastReadAt ?? new Date(0) } },
      });
      return { ...c, unread };
    }),
  );
}

export async function getConversationForUser(conversationId: string, userId: string, opts: { sellerId?: string; admin?: boolean } = {}) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { user: { select: { id: true, name: true, role: true } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, role: true } } } },
      seller: { select: { id: true, storeName: true, slug: true, logoUrl: true, userId: true } },
      product: { select: { title: true, slug: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } },
      offer: { select: { id: true, status: true } },
      dispute: { select: { id: true, caseNumber: true, status: true } },
      sellerOrder: { select: { id: true, reference: true, order: { select: { orderNumber: true } } } },
    },
  });
  if (!conversation) return null;
  const isParticipant = conversation.participants.some((p) => p.userId === userId);
  const isStore = !!opts.sellerId && conversation.sellerId === opts.sellerId;
  if (!isParticipant && !isStore && !opts.admin) return null;
  await db.conversationParticipant.updateMany({ where: { conversationId, userId }, data: { lastReadAt: new Date() } });
  return conversation;
}
