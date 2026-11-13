"use client";

import React from "react";

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

/**
 * Unified dark-glass container for all dashboard data & chart cards.
 * Keeps surface, radius, border, and shadow consistent across tabs.
 */
export function DashboardCard({ children, className = "", padded = false }: DashboardCardProps) {
  return (
    <div
      className={`glass rounded-2xl border border-white/[0.08] shadow-[0_10px_34px_rgba(0,0,0,0.3)] overflow-hidden ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface DashboardCardHeaderProps {
  icon?: React.ReactNode;
  iconGradient?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  borderBottom?: boolean;
  className?: string;
}

/**
 * Consistent, dyslexia- and ADHD-friendly card header:
 * sentence-case title, high-contrast subtitle, and right-aligned controls.
 */
export function DashboardCardHeader({
  icon,
  iconGradient = "linear-gradient(135deg, rgba(56,189,248,0.22), rgba(167,139,250,0.22))",
  title,
  subtitle,
  actions,
  borderBottom = true,
  className = "",
}: DashboardCardHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 flex-wrap px-5 sm:px-6 py-4 ${
        borderBottom ? "border-b border-white/[0.06]" : ""
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
            style={{ background: iconGradient }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight leading-snug">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
