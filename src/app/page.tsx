import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";

export default async function Home() {
  redirect((await getSessionUserId()) ? "/dashboard" : "/login");
}
