import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TestImage from "@/components/student/tests/TestImage";
import { toast } from "sonner";

interface Props {
  value: string | null | undefined;
  onChange: (path: string | null) => void;
  label?: string;
  className?: string;
}

/** Uploads to `test-images` bucket and stores the storage path in the JSON. */
export default function TestImageInput({ value, onChange, label = "תמונה", className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `q/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("test-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      onChange(path);
    } catch (e: any) {
      toast.error(e.message || "שגיאה בהעלאה");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (value && !value.startsWith("http")) {
      await supabase.storage.from("test-images").remove([value]);
    }
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>{label}</label>
      {value ? (
        <div className="relative inline-block">
          <TestImage
            src={value}
            className="rounded-lg max-h-40 object-contain"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <button
            onClick={remove}
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs transition-all disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", color: "#aaa" }}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "מעלה..." : "העלה תמונה"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
    </div>
  );
}
