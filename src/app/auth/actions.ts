"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Konfirmasi password minimal 6 karakter"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

export async function login(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const result = loginSchema.safeParse({ email, password });
  if (!result.success) {
    return {
      error: result.error.issues[0].message,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[LOGIN ERROR]", error.message, "| URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    return {
      error: `[DEBUG] ${error.message} | URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30)}...`,
    };
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function forgotPassword(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const result = forgotPasswordSchema.safeParse({ email });
  if (!result.success) {
    return {
      error: result.error.issues[0].message,
    };
  }

  const supabase = await createClient();
  
  // Get site configuration or request headers to build the redirect URL
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return {
      error: error.message || "Gagal mengirim email reset password.",
    };
  }

  return {
    success: "Email instruksi reset password telah dikirim. Silakan periksa kotak masuk Anda.",
  };
}

export async function resetPassword(prevState: unknown, formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const result = resetPasswordSchema.safeParse({ password, confirmPassword });
  if (!result.success) {
    return {
      error: result.error.issues[0].message,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      error: error.message || "Gagal memperbarui password.",
    };
  }

  return {
    success: "Password berhasil diperbarui. Silakan login kembali.",
  };
}
