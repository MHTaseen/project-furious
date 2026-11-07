import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import HomePage from "../page";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  const user = token ? verifySessionToken(token) : null;

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return <HomePage />;
}
