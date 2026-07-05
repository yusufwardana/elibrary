"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Camera, CheckCircle2, Loader2, Lock, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

// Zod schemas
const profileSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini harus diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Konfirmasi password minimal 6 karakter"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

const roleLabels: Record<string, string> = {
  administrator: "Administrator",
  kepala_perpustakaan: "Kepala Perpustakaan",
  petugas: "Petugas",
  guru: "Guru",
  siswa: "Siswa",
};

export default function ProfilePage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Form hooks
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "" },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // Fetch session & profile using TanStack Query
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userData?.id,
  });

  // Populate form defaults
  useEffect(() => {
    if (profile?.full_name) {
      profileForm.reset({ fullName: profile.full_name });
    }
  }, [profile, profileForm]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async (fullName: string) => {
      if (!userData?.id) throw new Error("Pengguna tidak terautentikasi");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profil berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal memperbarui profil");
    },
  });

  // Update password via auth
  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      passwordForm.reset();
      setPasswordSuccess("Password berhasil diperbarui");
      setPasswordError(null);
      toast.success("Password berhasil diperbarui");
    },
    onError: (error: Error) => {
      setPasswordError(error.message || "Gagal memperbarui password");
      setPasswordSuccess(null);
    },
  });

  const handleProfileSubmit = (data: { fullName: string }) => {
    updateProfileMutation.mutate(data.fullName);
  };

  const handlePasswordSubmit = (data: z.infer<typeof passwordSchema>) => {
    updatePasswordMutation.mutate(data.newPassword);
  };

  // Avatar Upload Handler
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Pilih berkas foto terlebih dahulu.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${userData?.id}/${Math.random()}.${fileExt}`;

      // Upload file to Supabase storage 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update database profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userData?.id || "");

      if (updateError) {
        throw updateError;
      }

      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Avatar berhasil diperbarui");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Gagal mengunggah foto profil";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  if (userLoading || profileLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Profil"
        description="Kelola informasi pribadi, foto avatar, dan kredensial akun Anda"
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Avatar Card */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg h-fit">
          <CardHeader className="text-center">
            <CardTitle>Foto Profil</CardTitle>
            <CardDescription>Perbarui foto profil Anda</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-2 border-border shadow-inner">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                  {profile?.full_name ? getInitials(profile.full_name) : "?"}
                </AvatarFallback>
              </Avatar>

              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
              >
                <div className="flex flex-col items-center text-center gap-1">
                  <Camera className="h-6 w-6" />
                  <span className="text-[10px] font-medium">Unggah Foto</span>
                </div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">{profile?.full_name}</h3>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
              <div className="inline-flex rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                {roleLabels[profile?.role || "siswa"]}
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-center text-[10px] text-muted-foreground border-t border-border/50 pt-4 justify-center">
            Format file: JPG, PNG, atau WEBP. Maks 2MB.
          </CardFooter>
        </Card>

        {/* Right Columns: Edit Info & Password */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Info Form */}
          <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
            <CardHeader>
              <CardTitle>Informasi Profil</CardTitle>
              <CardDescription>Perbarui nama lengkap akun Anda</CardDescription>
            </CardHeader>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-info">Alamat Email (Tidak dapat diubah)</Label>
                  <Input
                    id="email-info"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="Masukkan nama lengkap"
                      className="pl-10"
                      {...profileForm.register("fullName")}
                    />
                  </div>
                  {profileForm.formState.errors.fullName && (
                    <span className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {profileForm.formState.errors.fullName.message}
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-4 flex justify-end">
                <Button type="submit" disabled={updateProfileMutation.isPending} id="save-profile-info-button">
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Change Password Form */}
          <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg">
            <CardHeader>
              <CardTitle>Ganti Password</CardTitle>
              <CardDescription>Ubah password akun Anda secara berkala</CardDescription>
            </CardHeader>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
              <CardContent className="space-y-4">
                {passwordError && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive animate-pulse-soft">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">Password Saat Ini</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      {...passwordForm.register("currentPassword")}
                    />
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <span className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {passwordForm.formState.errors.currentPassword.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      {...passwordForm.register("newPassword")}
                    />
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <span className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {passwordForm.formState.errors.newPassword.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      {...passwordForm.register("confirmPassword")}
                    />
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <span className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {passwordForm.formState.errors.confirmPassword.message}
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-4 flex justify-end">
                <Button type="submit" disabled={updatePasswordMutation.isPending} id="save-password-button">
                  {updatePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Perbarui Password"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
