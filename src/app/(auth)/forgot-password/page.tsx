"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { forgotPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} id="forgot-submit-button">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Mengirim...
        </>
      ) : (
        "Kirim Tautan Reset"
      )}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(forgotPassword, null);

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-md shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center lg:text-left">
          Lupa Password
        </CardTitle>
        <CardDescription className="text-center lg:text-left">
          Masukkan email akun Anda untuk mendapatkan tautan reset password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive animate-pulse-soft">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {state?.success && (
            <div className="flex items-center gap-2.5 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{state.success}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Alamat Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nama@sekolah.sch.id"
                className="pl-10"
                required
                disabled={!!state?.success}
              />
            </div>
          </div>

          {!state?.success && <SubmitButton />}
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border/50 pt-4">
        <Link
          href="/login"
          className="flex items-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Kembali ke Halaman Login
        </Link>
      </CardFooter>
    </Card>
  );
}
