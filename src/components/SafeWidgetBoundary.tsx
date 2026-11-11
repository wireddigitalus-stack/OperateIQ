"use client";

import React from "react";
import { reportClientError } from "@/lib/api-client";

interface SafeWidgetBoundaryProps {
  name: string;
  children: React.ReactNode;
}

interface SafeWidgetBoundaryState {
  hasError: boolean;
  resetCount: number;
}

/**
 * Isolates floating widgets and auxiliary modals (like Ask OpsIQ chat cards)
 * so third-party browser extension DOM mutations (Grammarly, password managers,
 * page translators) can never cascade up to GlobalError and crash the page.
 */
export default class SafeWidgetBoundary extends React.Component<
  SafeWidgetBoundaryProps,
  SafeWidgetBoundaryState
> {
  state: SafeWidgetBoundaryState = {
    hasError: false,
    resetCount: 0,
  };

  static getDerivedStateFromError(): Partial<SafeWidgetBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (this.state.resetCount === 0) {
      reportClientError(error, `widget:${this.props.name}`).catch(() => {});
    }
    if (this.state.resetCount < 2) {
      setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          resetCount: prev.resetCount + 1,
        }));
      }, 60);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return (
      <React.Fragment key={this.state.resetCount}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
