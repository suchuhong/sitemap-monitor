import { requireUser } from "@/lib/auth/session";
import { NewSiteForm } from "./new-site-form";

export const runtime = 'edge';

export default async function NewSitePage() {
  await requireUser({ redirectTo: "/sites/new" });
  return <NewSiteForm />;
}
