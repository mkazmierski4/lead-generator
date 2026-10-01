"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CampaignEditor } from "@/components/CampaignEditor";
import { Topbar } from "@/components/Topbar";
import { IconChevron } from "@/components/icons";
import { api, type Campaign } from "@/lib/api";

export default function EdytujKampaniePage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.campaign(id).then(setCampaign).catch((e: Error) => setError(e.message));
  }, [id]);

  return (
    <>
      <Topbar
        left={
          <nav className="crumb" aria-label="Okruszki">
            <Link href="/kampanie">Kampanie</Link>
            <IconChevron size={12} />
            <Link href={`/kampanie/${id}`}>{campaign?.name ?? "…"}</Link>
            <IconChevron size={12} />
            <span style={{ color: "var(--ink)" }}>Edycja</span>
          </nav>
        }
      />
      {error ? (
        <div className="content"><div className="notice notice-error" role="alert">{error}</div></div>
      ) : !campaign ? (
        <div className="content"><p className="muted">Wczytuję…</p></div>
      ) : campaign.sending ? (
        <div className="content"><div className="notice" role="status">Kampania właśnie wysyła. Zatrzymaj wysyłkę, żeby edytować szablon.</div></div>
      ) : (
        <CampaignEditor campaign={campaign} />
      )}
    </>
  );
}
