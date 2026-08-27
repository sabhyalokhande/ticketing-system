"use server";

import { redirect } from "next/navigation";
import { checkAdminPassword, createAdminSession } from "@/lib/auth";

export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkAdminPassword(password)) {
    redirect(`/admin/login?error=${encodeURIComponent("Incorrect password")}`);
  }
  await createAdminSession();
  redirect("/admin");
}
