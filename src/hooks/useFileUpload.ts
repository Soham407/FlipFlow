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
    // Dynamic Plan Lookup - Convert userRole to uppercase to match PLANS keys
    const planKey = userRole.toUpperCase() as keyof typeof PLANS;
    const plan = PLANS[planKey] || PLANS.FREE; // Fallback to FREE if role not found
    
    // Check count limit
    if (currentFlipbookCount >= plan.maxFlipbooks) {
      toast.error(`Your ${plan.name} plan limit is ${plan.maxFlipbooks} flipbook${plan.maxFlipbooks !== 1 ? 's' : ''}. Upgrade for more!`);
      return false;
    }

    // Check size limit
    if (fileToValidate.size > plan.maxFileSizeBytes) {
      toast.error(`File too large! Your ${plan.name} plan limit is ${plan.maxFileSizeMB}MB. Upgrade for larger files.`);
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
