"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Settings,
  Loader2,
  Camera,
  Trash2,
  Lock,
  User as UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, changePassword } from "@/app/actions/profile";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import Modal from "./Modal";
import type { DashboardProfile } from "@/lib/agency/server";

interface ProfileMenuProps {
  profile: DashboardProfile;
}

function initialsOf(profile: DashboardProfile): string {
  const f = profile.first_name?.[0] ?? "";
  const l = profile.last_name?.[0] ?? "";
  if (f || l) return `${f}${l}`.toUpperCase();
  return profile.email.charAt(0).toUpperCase();
}

export default function ProfileMenu({ profile }: ProfileMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setOpen(false), open);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  const displayName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-full transition-colors hover:bg-(--color-bg-hover) focus-ring"
          aria-label="Open profile menu"
          aria-expanded={open}
        >
          <Avatar profile={profile} size={28} />
          <span
            className="text-[12.5px] font-medium hidden sm:inline max-w-[120px] truncate"
            style={{ color: "var(--color-text)" }}
          >
            {displayName}
          </span>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1.5 w-[240px] card overflow-hidden z-30 animate-up"
            style={{
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 12px 36px -8px rgba(0,0,0,0.22)",
            }}
          >
            <div className="px-3 py-3 border-b divider flex items-center gap-3">
              <Avatar profile={profile} size={36} />
              <div className="min-w-0">
                <p
                  className="text-[13px] font-semibold truncate"
                  style={{ color: "var(--color-text)" }}
                >
                  {displayName}
                </p>
                <p className="text-[11px] text-muted truncate">
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="py-1">
              <MenuItem
                icon={<Settings className="w-3.5 h-3.5" />}
                label="Profile settings"
                onClick={() => {
                  setOpen(false);
                  setSettingsOpen(true);
                }}
              />
              <MenuItem
                icon={<Lock className="w-3.5 h-3.5" />}
                label="Change password"
                onClick={() => {
                  setOpen(false);
                  setPasswordOpen(true);
                }}
              />
            </div>

            <div className="border-t divider py-1">
              <MenuItem
                icon={<LogOut className="w-3.5 h-3.5" />}
                label="Sign out"
                onClick={handleLogout}
              />
            </div>
          </div>
        )}
      </div>

      <ProfileSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
      />
      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-(--color-bg-hover)"
      style={{ color: "var(--color-text-secondary)" }}
    >
      <span style={{ color: "var(--color-text-muted)" }}>{icon}</span>
      <span style={{ color: "var(--color-text)" }}>{label}</span>
    </button>
  );
}

function Avatar({
  profile,
  size,
}: {
  profile: DashboardProfile;
  size: number;
}) {
  const initials = initialsOf(profile);
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name ?? profile.email}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{
          width: size,
          height: size,
          border: "1px solid var(--color-border)",
        }}
      />
    );
  }
  return (
    <div
      className="rounded-full grid place-items-center shrink-0 font-semibold"
      style={{
        width: size,
        height: size,
        background: "var(--color-accent-soft)",
        color: "var(--color-accent)",
        border: "1px solid var(--color-accent-soft-border)",
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initials}
    </div>
  );
}

function ProfileSettingsModal({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: DashboardProfile;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatar_url ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile({
      firstName,
      lastName,
      avatarUrl,
    });
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error ?? "Could not save profile");
      return;
    }
    toast.success("Profile updated");
    onClose();
    router.refresh();
  };

  const acceptImages = "image" + "/" + "*";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profile settings"
      description="Update your display name and avatar."
      width={460}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="profile-form"
            className="btn btn-primary"
            disabled={saving || uploading}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </>
      }
    >
      <form id="profile-form" onSubmit={handleSave} className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              profile={{ ...profile, avatar_url: avatarUrl }}
              size={64}
            />
            {uploading && (
              <div
                className="absolute inset-0 rounded-full grid place-items-center"
                style={{ background: "rgba(255,255,255,0.7)" }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptImages}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarChange(file);
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
                disabled={uploading}
              >
                <Camera className="w-3.5 h-3.5" />
                Upload photo
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="btn btn-ghost btn-sm"
                  style={{ color: "var(--color-danger)" }}
                  disabled={uploading}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
            <p className="text-[11.5px] text-muted">
              JPG, PNG or GIF. Max 4MB.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="field-label">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              className="field"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="lastName" className="field-label">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              className="field"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="field-label">Email</label>
          <div
            className="field flex items-center gap-2"
            style={{
              background: "var(--color-bg-subtle)",
              color: "var(--color-text-muted)",
              cursor: "not-allowed",
            }}
          >
            <UserIcon
              className="w-3.5 h-3.5"
              style={{ color: "var(--color-text-subtle)" }}
            />
            {profile.email}
          </div>
          <p className="field-hint">Email cannot be changed.</p>
        </div>
      </form>
    </Modal>
  );
}

function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    const result = await changePassword(password);
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error ?? "Could not change password");
      return;
    }
    toast.success("Password updated");
    setPassword("");
    setConfirm("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change password"
      description="Choose a new password for your account."
      width={420}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="password-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…
              </>
            ) : (
              "Update password"
            )}
          </button>
        </>
      }
    >
      <form id="password-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="field-label">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="field-label">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
            required
            minLength={6}
          />
        </div>
      </form>
    </Modal>
  );
}
