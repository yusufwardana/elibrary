"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { login } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} id="login-submit-button">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Memproses...
        </>
      ) : (
        <>
          Masuk
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-md shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center lg:text-left">
          Masuk eLibrary
        </CardTitle>
        <CardDescription className="text-center lg:text-left">
          Masukkan email dan password untuk mengakses dashboard perpustakaan
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Lupa password?
              </Link>
            </div>
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

          <SubmitButton />
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 text-center text-xs text-muted-foreground">
        <div>
          Belum memiliki akun? Hubungi <span className="font-semibold text-foreground">Petugas Perpustakaan</span>.
        </div>
      </CardFooter>
    </Card>
  );
}
