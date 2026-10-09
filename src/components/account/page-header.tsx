export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: React.ReactNode; action?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="min-w-0 max-w-full">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display-md text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-[49ch] text-base leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-[11.5px] tracking-[0.1em] text-muted uppercase">{label}</p>
      <p className="mt-2 text-[26px] leading-none font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-2 text-[12.5px] text-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-[3px] border border-line bg-porcelain px-5 py-4 transition-colors";
  return href ? (
    <a href={href} className={`${cls} hover:border-line-strong`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}
