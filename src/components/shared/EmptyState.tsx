"use client";

import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "@/components/ui/button";

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: IconProp;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-primary/5">
        <FontAwesomeIcon icon={icon} className="h-7 w-7 text-primary" />
      </span>
      <h2 className="font-heading text-h3 font-semibold">{title}</h2>
      {description && <p className="max-w-xs text-sm text-ink-muted">{description}</p>}
      {actionLabel && (
        <Button className="mt-2 max-w-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
