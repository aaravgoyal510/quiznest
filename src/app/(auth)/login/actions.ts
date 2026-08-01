"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return { success: true };
  } catch (error: any) {
    if (error instanceof AuthError) {
      return { error: "Invalid email address or password." };
    }
    // Next.js uses an internal RedirectError to navigate pages.
    // We MUST rethrow this error to allow the framework to redirect successfully.
    throw error;
  }
}
