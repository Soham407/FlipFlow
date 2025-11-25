import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PLANS } from "../config/constants";
import { UserRole } from "../types";

export function useFileUpload(userRole: UserRole, userId: string | undefined, onSuccess: () => void) {
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
    // 1. Check Plan Limits
    const plan = userRole === 'pro' ? PLANS.PRO : PLANS.FREE;
    
    // Check count limit
    if (currentFlipbookCount >= plan.maxFlipbooks) {
      toast.error(`Free users can only create ${plan.maxFlipbooks} flipbooks. Upgrade to Pro for unlimited!`);
      return false;
    }

    // Check size limit
    if (fileToValidate.size > plan.maxFileSizeBytes) {
      toast.error(`Maximum file size is ${plan.maxFileSizeMB}MB. ${userRole === 'free' ? 'Upgrade to Pro for 50MB limit!' : ''}`);
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
      formData.append('file', file);
      formData.append('title', title);
      formData.append('fileSize', file.size.toString());

      const { data, error } = await supabase.functions.invoke('upload-to-r2', {
        body: formData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upload failed');

      toast.success("Flipbook uploaded successfully!");
      setFile(null);
      setTitle("");
      onSuccess(); // Callback to close modal or refresh list
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload flipbook";
      console.error('Upload error:', error);
      toast.error(errorMessage);
      return false;
    } finally {
      setUploading(false);
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
    uploadFlipbook
  };
}
