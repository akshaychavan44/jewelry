"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createIntegrationAction, disconnectIntegrationAction, mapSkuAction } from "@/server/actions/seller";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-[2px] border border-line bg-ivory px-3 py-2 font-mono text-[12px] text-ink">{value}</code>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        className="grid size-9 place-items-center rounded-[2px] border border-line text-ink-soft hover:text-ink"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="size-4 text-moss" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

export function ConnectIntegration() {
  const router = useRouter();
  const [provider, setProvider] = useState<"SHOPIFY" | "SQUARE" | "CUSTOM_API">("SHOPIFY");
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [shop, setShop] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Provider">
        {(
          [
            ["SHOPIFY", "Shopify POS"],
            ["SQUARE", "Square"],
            ["CUSTOM_API", "Custom / other POS (API)"],
          ] as const
        ).map(([p, label]) => (
          <button key={p} type="button" role="radio" aria-checked={provider === p} onClick={() => setProvider(p)} className={cn("rounded-full border px-3.5 py-1.5 text-[13px]", provider === p ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft")}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Name" htmlFor="int-name" optional>
          <Input id="int-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Boutique POS" />
        </Field>
        {provider === "SHOPIFY" && (
          <Field label="Shop domain" htmlFor="int-shop">
            <Input id="int-shop" value={shop} onChange={(e) => setShop(e.target.value)} placeholder="your-store.myshopify.com" />
          </Field>
        )}
        {provider !== "CUSTOM_API" && (
          <Field label={provider === "SHOPIFY" ? "Webhook signing secret" : "Signature key"} htmlFor="int-secret">
            <Input id="int-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
          </Field>
        )}
      </div>
      <Button
        pending={pending}
        onClick={() =>
          start(async () => {
            const res = await createIntegrationAction({ provider, name, secret, shopDomain: shop });
            if (res.ok) {
              toast.success(res.message);
              if ("apiKey" in res && res.apiKey) setApiKey(res.apiKey);
              router.refresh();
            } else toast.error(res.message);
          })
        }
      >
        {provider === "CUSTOM_API" ? "Create API key" : "Connect"}
      </Button>
      {apiKey && (
        <div className="rounded-[3px] border border-amber/30 bg-amber-mist p-4">
          <p className="mb-2 text-[13px] text-amber">Copy this key now — for your security it won&rsquo;t be shown again.</p>
          <CopyField value={apiKey} label="API key" />
        </div>
      )}
    </div>
  );
}

export function SkuMapper({ integrationId, variants }: { integrationId: string; variants: { id: string; sku: string; title: string; mapped: string | null }[] }) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants.find((v) => !v.mapped)?.id ?? variants[0]?.id ?? "");
  const [externalId, setExternalId] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-[12px] text-ink-soft">
        Loupe SKU
        <NativeSelect value={variantId} onChange={(e) => setVariantId(e.target.value)} className="mt-1 h-9 w-64 text-[13px]">
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.sku} {v.mapped ? `→ ${v.mapped}` : ""}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="text-[12px] text-ink-soft">
        POS item id
        <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} className="mt-1 h-9 w-48 font-mono text-[12.5px]" />
      </label>
      <Button
        size="sm"
        variant="subtle"
        pending={pending}
        onClick={() =>
          start(async () => {
            const res = await mapSkuAction(integrationId, variantId, externalId);
            if (res.ok) {
              toast.success(res.message);
              setExternalId("");
              router.refresh();
            } else toast.error(res.message);
          })
        }
      >
        Map SKU
      </Button>
    </div>
  );
}

export function DisconnectButton({ integrationId }: { integrationId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      pending={pending}
      onClick={() =>
        confirm("Disconnect this integration? Stock will stop syncing.") &&
        start(async () => {
          const res = await disconnectIntegrationAction(integrationId);
          if (res.ok) toast.success(res.message);
          router.refresh();
        })
      }
    >
      Disconnect
    </Button>
  );
}
