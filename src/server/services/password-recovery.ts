import "server-only";
import type { Tx } from "@/server/db";
/** Consume and update in the caller's transaction. Concurrent replays cannot succeed. */
export async function consumeResetToken(tx: Tx, tokenHash: string, passwordHash: string) {
  const rows = await tx.$queryRaw<{ identifier: string }[]>`DELETE FROM "VerificationToken" WHERE "token" = ${tokenHash} AND "identifier" LIKE 'password-reset:%' AND "expires" > clock_timestamp() RETURNING "identifier"`;
  if (!rows.length) return false;
  const email = rows[0].identifier.slice("password-reset:".length);
  const user = await tx.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, status: "ACTIVE" } });
  if (!user?.passwordHash) return false;
  await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
  // This marker stores a revocation timestamp, not an expiring email token.
  await tx.$executeRaw`INSERT INTO "VerificationToken" ("identifier", "token", "expires") VALUES ('password-version', ${`password-version:${user.id}`}, clock_timestamp()) ON CONFLICT ("token") DO UPDATE SET "expires" = clock_timestamp()`;
  return true;
}
