type ProviderMarkProps = {
  providerId: string;
  providerLabel: string;
  size?: "sm" | "md";
};

const providerStyles: Record<string, { label: string; className: string; icon?: string }> = {
  openai: {
    label: "OAI",
    icon: "/provider-icons/openai.svg",
    className: "bg-[color:rgba(17,17,15,0.92)] text-white",
  },
  anthropic: {
    label: "ANT",
    icon: "/provider-icons/anthropic.svg",
    className: "bg-[color:rgba(156,98,44,0.14)] text-[color:#8b5a2b]",
  },
  google: {
    label: "GGL",
    icon: "/provider-icons/google.svg",
    className: "bg-[color:rgba(54,114,255,0.12)] text-[color:#2450d6]",
  },
  xai: {
    label: "XAI",
    icon: "/provider-icons/xai.svg",
    className: "bg-[color:rgba(40,40,42,0.12)] text-[color:#26262a]",
  },
  qwen: {
    label: "QWN",
    icon: "/provider-icons/qwen.svg",
    className: "bg-[color:rgba(5,150,105,0.12)] text-[color:#0f766e]",
  },
  moonshot: {
    label: "KIM",
    icon: "/provider-icons/moonshot.svg",
    className: "bg-[color:rgba(124,58,237,0.12)] text-[color:#6d28d9]",
  },
  deepseek: {
    label: "DSK",
    icon: "/provider-icons/deepseek.svg",
    className: "bg-[color:rgba(37,99,235,0.12)] text-[color:#1d4ed8]",
  },
  minimax: {
    label: "MM",
    icon: "/provider-icons/minimax.svg",
    className: "bg-[color:rgba(30,64,175,0.1)] text-[color:#1e40af]",
  },
  doubao: {
    label: "DB",
    icon: "/provider-icons/doubao.svg",
    className: "bg-[color:rgba(249,115,22,0.12)] text-[color:#c2410c]",
  },
  kling: {
    label: "KLG",
    icon: "/provider-icons/kling.svg",
    className: "bg-[color:rgba(244,63,94,0.12)] text-[color:#be123c]",
  },
  wan: {
    label: "WAN",
    icon: "/provider-icons/wan.svg",
    className: "bg-[color:rgba(14,165,233,0.12)] text-[color:#0369a1]",
  },
  zhipu: {
    label: "ZP",
    icon: "/provider-icons/zhipu.svg",
    className: "bg-[color:rgba(15,118,110,0.12)] text-[color:#0f766e]",
  },
};

const sizeStyles = {
  sm: {
    box: "h-8 w-8 rounded-[0.65rem] text-[9px]",
    icon: "h-4 w-4",
  },
  md: {
    box: "h-12 w-12 rounded-[0.85rem] text-[11px]",
    icon: "h-6 w-6",
  },
} as const;

function buildFallbackLabel(providerLabel: string) {
  return (
    providerLabel.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "API"
  );
}

export function ProviderMark({
  providerId,
  providerLabel,
  size = "md",
}: ProviderMarkProps) {
  const style = providerStyles[providerId] ?? {
    label: buildFallbackLabel(providerLabel),
    className: "bg-[color:rgba(17,17,15,0.08)] text-[var(--ink)]",
  };

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden font-semibold uppercase tracking-[0.12em] ${sizeStyles[size].box} ${style.className}`}
      aria-label={providerLabel}
      title={providerLabel}
    >
      {style.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={style.icon}
          alt=""
          className={`${sizeStyles[size].icon} object-contain`}
          aria-hidden="true"
        />
      ) : (
        style.label
      )}
    </div>
  );
}
