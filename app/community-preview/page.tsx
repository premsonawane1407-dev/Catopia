import CommunityPreview from "./preview";
import { connection } from "next/server";
import "./preview.css";
import "./map.css";
import "./place-panel.css";
import "./paw.css";
import "./store.css";
import "./consistency.css";

export const metadata = {
  title: "Catopia community preview",
  description: "A non-persistent design preview for Catopia community screens.",
};

export default async function CommunityPreviewPage() {
  await connection();
  // Capture the date in the server page and pass it through for a stable client hydration.
  // eslint-disable-next-line react-hooks/purity
  const utcDay = Math.floor(Date.now() / 86_400_000);
  return <CommunityPreview utcDay={utcDay} />;
}
