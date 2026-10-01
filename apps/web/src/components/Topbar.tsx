"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconSearch } from "./icons";

export function Topbar({ left }: { left?: ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="topbar">
      {left ?? (
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(q.trim() ? `/leady?q=${encodeURIComponent(q.trim())}` : "/leady");
          }}
        >
          <IconSearch size={16} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj firmy lub miasta"
            aria-label="Szukaj firmy lub miasta"
          />
          <span className="kbd">Ctrl K</span>
        </form>
      )}
      <div className="avatar" aria-hidden="true">MK</div>
    </header>
  );
}
