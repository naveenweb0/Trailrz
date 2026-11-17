"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, X, RefreshCw, Link as LinkIcon } from "lucide-react";

interface CloudinaryImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
}

export default function CloudinaryImageUpload({
  value,
  onChange,
  label = "Cover Image",
  required = false,
}: CloudinaryImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WebP, AVIF)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size exceeds the 10MB limit.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Get direct upload signature from backend (works without outgoing server network)
      const signRes = await fetch("/api/admin/cloudinary-sign", {
        method: "POST",
      });

      const signData = await signRes.json();

      if (signRes.ok && signData.success) {
        // Direct Client-to-Cloudinary Upload via Browser (Bypasses server sandbox network boundaries)
        const cloudFormData = new FormData();
        cloudFormData.append("file", file);
        cloudFormData.append("api_key", signData.apiKey);
        cloudFormData.append("timestamp", String(signData.timestamp));
        cloudFormData.append("signature", signData.signature);
        cloudFormData.append("folder", signData.folder);

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
          {
            method: "POST",
            body: cloudFormData,
          }
        );

        const cloudResult = await cloudRes.json();

        if (cloudRes.ok && cloudResult.secure_url) {
          onChange(cloudResult.secure_url);
          setUploading(false);
          return;
        } else {
          console.warn("Direct upload returned error, falling back to server route:", cloudResult);
        }
      }

      // Fallback: Upload via server endpoint
      const formData = new FormData();
      formData.append("file", file);

      const serverRes = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const serverData = await serverRes.json();

      if (!serverRes.ok || !serverData.success) {
        throw new Error(serverData.error || "Failed to upload to Cloudinary");
      }

      onChange(serverData.url);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(
        err.message ||
          "Upload failed. Ensure you are connected to the internet, or paste an image URL directly."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const isCloudinary = value?.includes("cloudinary.com");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-white/80">
          {label} {required && <span className="text-trailrz-red">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[11px] text-white/50 hover:text-white flex items-center space-x-1"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showManualInput ? "Hide manual URL" : "Paste URL instead"}</span>
        </button>
      </div>

      {showManualInput && (
        <div className="mb-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://res.cloudinary.com/..."
            className="w-full px-4 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red font-mono"
          />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview or Upload Zone */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-neutral-900 group">
          <div className="relative aspect-[16/9] w-full max-h-64 bg-neutral-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded event cover preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs flex items-center space-x-1 hover:bg-neutral-200 transition-colors shadow-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace via Cloudinary</span>
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs flex items-center space-x-1 hover:bg-red-700 transition-colors shadow-lg"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-neutral-900/90 flex items-center justify-between text-xs border-t border-white/10">
            <div className="flex items-center space-x-2 truncate">
              {isCloudinary ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Cloudinary Hosted
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  External URL
                </span>
              )}
              <span className="text-white/50 truncate max-w-xs font-mono text-[11px]">{value}</span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-white/70 hover:text-white text-xs underline font-medium ml-2 shrink-0"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-trailrz-red bg-trailrz-red/5"
              : "border-white/15 hover:border-white/30 bg-neutral-900/50 hover:bg-neutral-900"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="w-8 h-8 text-trailrz-red animate-spin mb-3" />
              <p className="text-sm font-semibold text-white">Uploading image directly to Cloudinary...</p>
              <p className="text-xs text-white/50 mt-1">Direct CDN upload with automatic WebP optimization</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <div className="w-12 h-12 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center mb-3 text-trailrz-red">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">
                Click to upload cover image or drag and drop
              </p>
              <p className="text-xs text-white/50 mt-1">
                PNG, JPG, WebP up to 10MB (Saved directly to your Cloudinary)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
