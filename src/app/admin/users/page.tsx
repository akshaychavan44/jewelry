import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { UserStatusButton } from "@/components/admin/user-actions";
import { Badge, Card, Pagination, StatusBadge, Table, Td, Th } from "@/components/ui/display";
import { Input } from "@/components/ui/input";
import type { Role } from "@/generated/prisma/enums";
import { formatDate, timeAgo } from "@/lib/format";
import { countryName } from "@/lib/regions";
import { USER_STATUS, VERIFICATION_STATUS } from "@/lib/status";
import { firstParam, type SearchParams } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { listUsers } from "@/server/services/admin";

export const metadata: Metadata = { title: "Users" };

const ROLES: { value: Role | "ALL"; label: string }[] = [
  { value: "ALL", label: "Everyone" },
  { value: "BUYER", label: "Buyers" },
  { value: "SELLER", label: "Jewelers" },
  { value: "ADMIN", label: "Admins" },
];

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() || undefined;
  const role = ROLES.find((r) => r.value === firstParam(sp.role)?.toUpperCase())?.value ?? "ALL";
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const { rows, total, pageCount } = await listUsers({ q, role: role === "ALL" ? undefined : role, page });
  const href = (over: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, role: role === "ALL" ? undefined : role.toLowerCase(), page: undefined as number | undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") params.set(k, String(v));
    return `/admin/users${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow="Accounts" title="Users" description={`${total.toLocaleString("en-US")} ${total === 1 ? "account matches" : "accounts match"}. Suspending an account signs it out everywhere.`} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <FilterTabs label="Role" active={role} tabs={ROLES.map((r) => ({ value: r.value, label: r.label, href: href({ role: r.value === "ALL" ? undefined : r.value.toLowerCase() }) }))} />
        <form className="mb-5 flex gap-2" action="/admin/users">
          {role !== "ALL" && <input type="hidden" name="role" value={role.toLowerCase()} />}
          <Input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" className="h-10 w-64" />
        </form>
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Role</Th>
              <Th>Country</Th>
              <Th>Joined</Th>
              <Th>Last seen</Th>
              <Th className="text-right">Orders</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <Td colSpan={8} className="py-10 text-center text-muted">
                  No accounts match {q ? `“${q}”` : "this filter"}.
                </Td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id}>
                <Td>
                  <span className="block text-[14px] text-ink">{u.name ?? "—"}</span>
                  <span className="text-[12.5px] text-muted">{u.email}</span>
                </Td>
                <Td>
                  {u.role === "SELLER" && u.sellerProfile ? (
                    <Link href={`/admin/kyc/${u.sellerProfile.id}`} className="block text-[13px] hover:underline">
                      {u.sellerProfile.storeName}
                      <span className="mt-0.5 block">
                        <StatusBadge status={u.sellerProfile.verificationStatus} map={VERIFICATION_STATUS} />
                      </span>
                    </Link>
                  ) : (
                    <Badge tone={u.role === "ADMIN" ? "gold" : "neutral"}>{u.role === "ADMIN" ? "Admin" : u.role === "SELLER" ? "Jeweler" : "Buyer"}</Badge>
                  )}
                </Td>
                <Td className="text-[13px] text-ink-soft">{u.country ? countryName(u.country) : "—"}</Td>
                <Td className="text-[13px] whitespace-nowrap text-ink-soft">{formatDate(u.createdAt)}</Td>
                <Td className="text-[13px] whitespace-nowrap text-ink-soft">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "—"}</Td>
                <Td className="text-right tabular text-ink-soft">{u._count.orders}</Td>
                <Td>
                  <StatusBadge status={u.status} map={USER_STATUS} />
                </Td>
                <Td className="text-right">{u.role !== "ADMIN" && u.id !== me.id && <UserStatusButton userId={u.id} name={u.name ?? u.email} status={u.status} />}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <div className="mt-6">
        <Pagination page={page} pageCount={pageCount} hrefFor={(p) => href({ page: p })} />
      </div>
    </>
  );
}
