"use client";
import { useState, useEffect } from "react";

export default function UnsupportedBrowserBanner() {
  const [show, setShow] = useState(false);
  const [browserName, setBrowserName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already dismissed this session
    if (sessionStorage.getItem("browser-banner-dismissed")) return;

    const ua = navigator.userAgent;

    // Internet Explorer
    if (/MSIE|Trident/.test(ua)) {
      setBrowserName("Internet Explorer");
      setShow(true);
      return;
    }

    // Old Edge (EdgeHTML, pre-Chromium)
    if (/Edge\/\d+/.test(ua) && !/Edg\//.test(ua)) {
      setBrowserName("Microsoft Edge (Legacy)");
      setShow(true);
      return;
    }

    // Very old Chrome (< 90)
    const chromeMatch = ua.match(/Chrome\/(\d+)/);
    if (chromeMatch && !ua.includes("Edg/") && parseInt(chromeMatch[1]) < 90) {
      setBrowserName(`Chrome ${chromeMatch[1]}`);
      setShow(true);
      return;
    }

    // Very old Firefox (< 90)
    const ffMatch = ua.match(/Firefox\/(\d+)/);
    if (ffMatch && parseInt(ffMatch[1]) < 90) {
      setBrowserName(`Firefox ${ffMatch[1]}`);
      setShow(true);
      return;
    }

    // Very old Safari (< 15)
    const safariMatch = ua.match(/Version\/(\d+).*Safari/);
    if (safariMatch && parseInt(safariMatch[1]) < 15 && !ua.includes("Chrome")) {
      setBrowserName(`Safari ${safariMatch[1]}`);
      setShow(true);
      return;
    }
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] px-4 py-3 text-center text-sm font-semibold"
      style={{
        background: "linear-gradient(90deg, #F97316, #EF4444)",
        color: "#fff",
      }}
    >
      <span>
        ⚠️ You&apos;re using <strong>{browserName}</strong>, which may not work
        correctly with this dashboard. For the best experience, please switch to{" "}
        <a
          href="https://www.google.com/chrome/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-black"
        >
          Chrome
        </a>
        ,{" "}
        <a
          href="https://www.microsoft.com/edge"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-black"
        >
          Edge
        </a>
        , or{" "}
        <a
          href="https://www.mozilla.org/firefox/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-black"
        >
          Firefox
        </a>
        .
      </span>
      <button
        onClick={() => {
          setShow(false);
          sessionStorage.setItem("browser-banner-dismissed", "1");
        }}
        className="ml-4 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all"
      >
        ✕ Dismiss
      </button>
    </div>
  );
}
