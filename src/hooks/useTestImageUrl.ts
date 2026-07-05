import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Resolves a storage path or absolute URL into a usable image src.
 *  - If value starts with http(s):// or data:, returns as-is.
 *  - Otherwise treats it as a path inside the `test-images` bucket and creates a signed URL.
 */
export function useTestImageUrl(value: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) { setUrl(null); return; }
    if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) {
      setUrl(value); return;
    }
    (async () => {
      const { data } = await supabase.storage.from("test-images").createSignedUrl(value, 60 * 60 * 6);
      if (!cancelled) setUrl(data?.signedUrl || null);
    })();
    return () => { cancelled = true; };
  }, [value]);

  return url;
}
