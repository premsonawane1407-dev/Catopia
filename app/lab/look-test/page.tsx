import { notFound } from "next/navigation";
import LookTestLoader from "./loader";

// PHASE 0 LOOK TEST - throwaway, dev only. Nothing in the real app imports this folder.
// It renders a 404 in production builds so it can never ship by accident.
export const metadata = { title: "Look test (dev only)", robots: { index: false, follow: false } };

export default function LookTestPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LookTestLoader />;
}
