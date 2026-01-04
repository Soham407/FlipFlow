import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PLANS } from "../config/constants";
import { UserRole } from "../types";

export function useFileUpload(
  userRole: UserRole,
  userId: string | undefined,
  onSuccess: () => void
) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
      const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(fileNameWithoutExt);
    }
  };

  const validateFile = (fileToValidate: File, currentFlipbookCount: number) => {
    // Dynamic Plan Lookup - Convert userRole to uppercase to match PLANS keys
    const planKey = userRole.toUpperCase() as keyof typeof PLANS;
    const plan = PLANS[planKey] || PLANS.FREE; // Fallback to FREE if role not found

    // Check count limit
    if (currentFlipbookCount >= plan.maxFlipbooks) {
      toast.error(
        `Your ${plan.name} plan limit is ${plan.maxFlipbooks} flipbook${
          plan.maxFlipbooks !== 1 ? "s" : ""
        }. Upgrade for more!`
      );
      return false;
    }

    // Check size limit
    if (fileToValidate.size > plan.maxFileSizeBytes) {
      toast.error(
        `File too large! Your ${plan.name} plan limit is ${plan.maxFileSizeMB}MB. Upgrade for larger files.`
      );
      return false;
    }

    return true;
  };

  const uploadFlipbook = async (currentFlipbookCount: number) => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    if (!userId) return;

    if (!validateFile(file, currentFlipbookCount)) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("fileSize", file.size.toString());

      // Get the session for auth header
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Make direct fetch call to get better error messages
      const functionUrl = `${
        import.meta.env.VITE_SUPABASE_URL
      }/functions/v1/upload-to-r2`;
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || `Upload failed with status ${response.status}`
        );
      }

      if (!responseData.success) {
        throw new Error(responseData.error || "Upload failed");
      }

      toast.success("Flipbook uploaded successfully!");
      setFile(null);
      setTitle("");
      onSuccess();
      return true;
    } catch (error) {
      console.error("Upload error details:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload flipbook";

      toast.error(errorMessage);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      handleFileSelect(droppedFile);
    } else {
      toast.error("Please drop a PDF file");
    }
  };

  return {
    file,
    title,
    setTitle,
    uploading,
    isDragging,
    setIsDragging,
    handleFileSelect,
    uploadFlipbook,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
