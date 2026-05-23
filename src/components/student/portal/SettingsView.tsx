import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User, Camera, Phone, Shield, Lock, Trash2,
  Eye, EyeOff
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

/* ── style constants ── */
const CARD = "rounded-xl p-6 mb-6";
const CARD_BG = "#2a2a2a";
const GOLD = "#d4a017";
const GREEN = "#2ecc71";
const INPUT_CLS =
  "w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2 transition-all";
const SAVE_BTN =
  "px-6 py-2 rounded-lg text-sm font-bold text-white transition-all active:scale-95";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-base font-bold text-white font-outfit mb-4 flex items-center gap-2"
      style={{ borderRight: `3px solid ${GOLD}`, paddingRight: 10 }}
    >
      {children}
    </h3>
  );
}

export default function SettingsView() {
  /* ── profile state ── */
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /* ── security ── */
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  /* ── delete ── */
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (profile) setFullName(profile.display_name);

      const { data: details } = await supabase
        .from("client_details")
        .select("phone")
        .eq("student_id", user.id)
        .single();
      if (details?.phone) setPhone(details.phone);
    })();
  }, []);

  /* ── handlers ── */
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingProfile(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: fullName })
      .eq("id", user.id);

    if (!error) {
      await supabase
        .from("client_details")
        .upsert({ student_id: user.id, phone, status: "active" }, { onConflict: "student_id" });
      toast.success("הפרופיל עודכן בהצלחה");
    } else {
      toast.error("שגיאה בעדכון הפרופיל");
    }
    setSavingProfile(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingAvatar(false); return; }

    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error } = await supabase.storage.from("course-thumbnails").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      toast.success("התמונה עודכנה");
    } else {
      toast.error("שגיאה בהעלאת התמונה");
    }
    setUploadingAvatar(false);
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) { toast.error("הסיסמאות אינן תואמות"); return; }
    if (newPw.length < 6) { toast.error("סיסמה חייבת להכיל לפחות 6 תווים"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (!error) {
      toast.success("הסיסמה שונתה בהצלחה");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } else {
      toast.error(error.message);
    }
    setChangingPw(false);
  };

  const handleDeleteAccount = async () => {
    toast.error("לצורך מחיקת חשבון, פנה למנטור שלך");
  };

  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6" dir="rtl">
      <h2 className="text-xl font-bold text-white font-outfit mb-6">הגדרות</h2>

      {/* ═══ PROFILE ═══ */}
      <div className={CARD} style={{ background: CARD_BG }}>
        <SectionHeading>
          <User size={18} style={{ color: GOLD }} /> פרופיל אישי
        </SectionHeading>

        {/* avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: "rgba(212,160,23,0.15)", color: GOLD }}
              >
                {initials || "?"}
              </div>
            )}
            <label
              className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: GOLD }}
            >
              <Camera size={14} className="text-black" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </label>
          </div>
          <div>
            <p className="text-sm text-white font-bold">{fullName || "—"}</p>
            <p className="text-xs" style={{ color: "#777" }}>לחץ על האייקון לשינוי תמונה</p>
          </div>
        </div>

        {/* full name */}
        <label className="block text-xs text-gray-400 mb-1">שם מלא</label>
        <input
          className={INPUT_CLS}
          style={{ background: "#1a1a1a", borderColor: "#333" }}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="הכנס שם מלא"
        />

        {/* phone */}
        <label className="block text-xs text-gray-400 mb-1 mt-4">
          <Phone size={12} className="inline ml-1" /> מספר טלפון
        </label>
        <input
          className={INPUT_CLS}
          style={{ background: "#1a1a1a", borderColor: "#333" }}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="050-0000000"
          dir="ltr"
        />

        <button
          className={SAVE_BTN + " mt-5"}
          style={{ background: GREEN }}
          onClick={handleSaveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? "שומר..." : "שמור שינויים"}
        </button>
      </div>

      {/* ═══ SECURITY (password only) ═══ */}
      <div className={CARD} style={{ background: CARD_BG }}>
        <SectionHeading>
          <Shield size={18} style={{ color: GOLD }} /> אבטחה
        </SectionHeading>

        <p className="text-sm font-bold text-white mb-3">
          <Lock size={14} className="inline ml-1" /> שינוי סיסמה
        </p>

        {[
          { label: "סיסמה נוכחית", val: currentPw, set: setCurrentPw, show: showCurrentPw, toggle: setShowCurrentPw },
          { label: "סיסמה חדשה", val: newPw, set: setNewPw, show: showNewPw, toggle: setShowNewPw },
        ].map((f) => (
          <div key={f.label} className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
            <div className="relative">
              <input
                className={INPUT_CLS}
                style={{ background: "#1a1a1a" }}
                type={f.show ? "text" : "password"}
                value={f.val}
                onChange={(e) => f.set(e.target.value)}
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => f.toggle(!f.show)}
              >
                {f.show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}

        <label className="block text-xs text-gray-400 mb-1">אישור סיסמה חדשה</label>
        <input
          className={INPUT_CLS}
          style={{ background: "#1a1a1a" }}
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
        />

        <button
          className={SAVE_BTN + " mt-4"}
          style={{ background: GREEN }}
          onClick={handleChangePassword}
          disabled={changingPw}
        >
          {changingPw ? "משנה..." : "שנה סיסמה"}
        </button>
      </div>

      {/* ═══ DANGER ZONE ═══ */}
      <div className={CARD} style={{ background: "#2a1a1a", border: "1px solid #5a2a2a" }}>
        <SectionHeading>
          <Trash2 size={18} className="text-red-500" /> מחיקת חשבון
        </SectionHeading>
        <p className="text-xs text-gray-400 mb-4">
          מחיקת החשבון היא פעולה בלתי הפיכה. כל הנתונים, ההתקדמות והסימניות שלך יימחקו לצמיתות.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all active:scale-95"
              style={{ background: "#dc3545" }}
            >
              מחק את החשבון שלי
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent style={{ background: "#2a2a2a", border: "1px solid #444" }} dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white text-right">
                אתה בטוח שברצונך למחוק את החשבון?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400 text-right">
                הקלד "מחק" כדי לאשר. פעולה זו בלתי הפיכה.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              className={INPUT_CLS + " mt-2"}
              style={{ background: "#1a1a1a" }}
              placeholder='הקלד "מחק" לאישור'
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <AlertDialogFooter className="flex-row-reverse gap-2 mt-2">
              <AlertDialogCancel className="bg-transparent border-gray-600 text-gray-300">
                ביטול
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteConfirmText !== "מחק"}
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                מחק לצמיתות
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="h-8" />
    </div>
  );
}
