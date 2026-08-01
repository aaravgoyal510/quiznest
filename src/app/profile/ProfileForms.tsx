"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { changePasswordAction, updateAvatarAction } from "./actions";
import { Camera, KeyRound, EyeOff, Lock, CheckCircle, AlertCircle, ShieldAlert, User } from "lucide-react";

interface ProfileFormsProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string | null;
    year: string | null;
    avatarUrl: string | null;
  };
}

export default function ProfileForms({ user }: ProfileFormsProps) {
  const { update } = useSession();

  // Avatar Upload States
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  // Trigger file browser for avatar
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Process Avatar File Selection and Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadSuccess(false);

    // Client-side validations
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File size exceeds 2MB limit.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Invalid type. Allowed formats: JPG, PNG, WEBP.");
      return;
    }

    // Set local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Call server action
    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await updateAvatarAction(formData);
      if (res.success) {
        setUploadSuccess(true);
        // Sync Next-Auth session image with the new avatar URL
        await update({ image: res.avatarUrl });
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  // Process Password Change Submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (newPassword.length < 8) {
      setPassError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("New passwords do not match.");
      return;
    }

    setPassLoading(true);

    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);

    try {
      const res = await changePasswordAction(formData);
      if (res.success) {
        setPassSuccess("Password changed successfully! Stale sessions on other devices have been revoked.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Sync Next-Auth session with new tokenVersion in memory to keep current device logged in
        await update({ tokenVersion: res.tokenVersion });
      }
    } catch (err: any) {
      setPassError(err.message || "Failed to update password.");
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Avatar & Read-Only locked Fields */}
      <div className="space-y-6 lg:col-span-1">
        {/* Avatar Upload Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center relative overflow-hidden">
          <h2 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wider">Profile Picture</h2>
          
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer mb-4" onClick={handleAvatarClick}>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-28 h-28 rounded-full object-cover border border-slate-800"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
                  <User className="w-12 h-12" />
                </div>
              )}

              {/* Camera Icon Overlay on Hover */}
              <div className="absolute inset-0 bg-slate-950/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-indigo-500/30">
                <Camera className="w-6 h-6 text-slate-200" />
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
            />

            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Change Photo"}
            </button>

            {uploadError && <p className="text-rose-400 text-xs mt-3">{uploadError}</p>}
            {uploadSuccess && <p className="text-emerald-400 text-xs mt-3">✓ Avatar updated successfully</p>}
          </div>
        </div>

        {/* Read-Onlylocked Account details Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-850 mb-4 text-slate-200 font-bold text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Account Parameters</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={user.name}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-400 text-xs disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-400 text-xs disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Role Type</label>
              <input
                type="text"
                disabled
                value={user.role}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-400 text-xs uppercase font-mono disabled:cursor-not-allowed"
              />
            </div>

            {user.role === "STUDENT" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                  <input
                    type="text"
                    disabled
                    value={user.department || "N/A"}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-400 text-xs disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Academic Year</label>
                  <input
                    type="text"
                    disabled
                    value={user.year || "N/A"}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-400 text-xs disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed italic">
              * To edit name, email, role, or department fields, please contact your system administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Password Change Form */}
      <div className="space-y-6 lg:col-span-2">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-850 mb-6 text-slate-200 font-bold text-sm">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>Update Account Password</span>
          </div>

          {passError && (
            <div className="mb-5 p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-start space-x-2.5 text-rose-350 text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-400 mt-0.5" />
              <span>{passError}</span>
            </div>
          )}

          {passSuccess && (
            <div className="mb-5 p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-start space-x-2.5 text-emerald-300 text-xs animate-fade-in">
              <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-400 mt-0.5" />
              <span>{passSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label htmlFor="curr-pass" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="curr-pass"
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm disabled:opacity-50 transition-all"
                />
              </div>
            </div>

            <hr className="border-slate-850" />

            <div>
              <label htmlFor="new-pass" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="new-pass"
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm disabled:opacity-50 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-new" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="confirm-new"
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passLoading}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm disabled:opacity-50 transition-all"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={passLoading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all text-xs disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                <span>{passLoading ? "Updating..." : "Change Password"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
