"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react";
import { resetPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} id="reset-submit-button">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Memperbarui...
        </>
      ) : (
        "Perbarui Password"
      )}
    </Button>
  );
}

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(resetPassword, null);

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-md shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center lg:text-left">
          Reset Password
        </CardTitle>
        <CardDescription className="text-center lg:text-left">
          Buat password baru yang kuat untuk mengamankan akun Anda
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
            <div className="flex flex-col gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-semibold">Sukses!</span>
              </div>
              <p>{state.success}</p>
              <Button asChild variant="outline" className="mt-2 w-full border-green-500/30 text-green-700 hover:bg-green-500/20 dark:text-green-400">
                <Link href="/login">Masuk Sekarang</Link>
              </Button>
            </div>
          )}

          {!state?.success && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Password Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <SubmitButton />
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
