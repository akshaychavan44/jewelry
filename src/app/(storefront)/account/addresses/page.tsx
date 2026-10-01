import { AddressBook } from "@/components/account/address-book";
import { PageHeader } from "@/components/account/page-header";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await db.address.findMany({ where: { userId: user.id, type: { in: ["SHIPPING", "BILLING"] } }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return (
    <>
      <PageHeader title="Addresses" description="Where your pieces are delivered. Couriers may call the number on the address for signature deliveries." />
      <AddressBook
        addresses={addresses
          .filter((a) => a.type === "SHIPPING")
          .map((a) => ({ id: a.id, label: a.label, fullName: a.fullName, company: a.company, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, country: a.country, phone: a.phone, isDefault: a.isDefault }))}
      />
    </>
  );
}
