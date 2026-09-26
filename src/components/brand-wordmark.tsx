type Props = {
  descriptor?: boolean;
};

export function BrandWordmark({ descriptor = false }: Props) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span className="relative h-6 w-3 shrink-0" aria-hidden="true">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--accent)]" />
        <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--accent-strong)] bg-[var(--canvas)]">
          <span className="absolute left-1/2 top-1/2 size-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text)]" />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-4 tracking-[-0.035em] text-[var(--text)]">
          Panta{" "}
          <span className="font-medium text-[var(--text-muted)]">Lens</span>
        </span>
        {descriptor ? (
          <span className="mt-0.5 hidden whitespace-nowrap text-[9.5px] leading-3 text-[var(--text-dim)] sm:block">
            Prediction market intelligence
          </span>
        ) : null}
      </span>
    </span>
  );
}
