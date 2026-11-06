type WorkspacePageHeaderProps = {
  title: string;
  description?: string;
  kicker?: string;
};

export function WorkspacePageHeader({
  title,
  description,
  kicker = "Workspace",
}: WorkspacePageHeaderProps) {
  return (
    <div className="space-y-3">
      <p className="eyebrow">{kicker}</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-3xl text-base leading-8 text-[var(--muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
