"use client";
import React from "react";
import Link from "next/link";
import { trackEvent } from "@/hooks/useAnalytics";

/**
 * Tracked link for property cards — fires a `property_click` event
 * when a user clicks through to a property detail page.
 */
export function TrackedPropertyLink({
  href,
  propertyName,
  propertyId,
  className,
  id,
  children,
}: {
  href: string;
  propertyName: string;
  propertyId: string;
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      id={id}
      className={className}
      onClick={() => {
        trackEvent("property_click", {
          property_id: propertyId,
          property_name: propertyName,
          action: "view_details",
        });
      }}
    >
      {children}
    </Link>
  );
}

/**
 * Tracked CTA button — fires a `cta_click` event when a user
 * clicks a call-to-action like "Inquire", "Contact", "Call", etc.
 */
export function TrackedCTALink({
  href,
  label,
  context,
  className,
  id,
  children,
}: {
  href: string;
  label: string;
  context?: string;
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("tel:") || href.startsWith("mailto:");

  if (isExternal) {
    return (
      <a
        href={href}
        id={id}
        className={className}
        onClick={() => {
          trackEvent("cta_click", { label, context: context || href });
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      id={id}
      className={className}
      onClick={() => {
        trackEvent("cta_click", { label, context: context || href });
      }}
    >
      {children}
    </Link>
  );
}
