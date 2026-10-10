"use client";
import React, { useEffect, useState } from "react";

interface SafeEmailProps {
  className?: string;
  label?: string;
  children?: React.ReactNode;
}

export default function SafeEmail({ className = "", label, children }: SafeEmailProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = "leasing";
  const domain = "teamvisionllc.com";
  const email = `${user}@${domain}`;

  if (!mounted) {
    // Return a bot-safe representation during SSR/hydration
    return (
      <span className={className}>
        {children || label || `${user} [at] ${domain}`}
      </span>
    );
  }

  return (
    <a href={`mailto:${email}`} className={className}>
      {children || label || email}
    </a>
  );
}
