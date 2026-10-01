import Link from "next/link";
import { CampaignEditor } from "@/components/CampaignEditor";
import { Topbar } from "@/components/Topbar";
import { IconChevron } from "@/components/icons";

export default function NowaKampaniaPage() {
  return (
    <>
      <Topbar
        left={
          <nav className="crumb" aria-label="Okruszki">
            <Link href="/kampanie">Kampanie</Link>
            <IconChevron size={12} />
            <span style={{ color: "var(--ink)" }}>Nowa kampania</span>
          </nav>
        }
      />
      <CampaignEditor />
    </>
  );
}
