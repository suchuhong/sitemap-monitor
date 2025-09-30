import { requireUser } from "@/lib/auth/session";
import { NewSiteForm } from "./new-site-form";

export default async function NewSitePage() {
  await requireUser();
  return <NewSiteForm />;
}
