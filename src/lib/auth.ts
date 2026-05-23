import { supabase } from "@/integrations/supabase/client";

// Convert display name to deterministic email for auth
export function nameToEmail(name: string): string {
  const sanitized = name.trim().toLowerCase().replace(/\s+/g, ".");
  // Use char codes for non-ascii
  const ascii = Array.from(sanitized)
    .map((c) => (c.charCodeAt(0) > 127 ? c.charCodeAt(0).toString(16) : c))
    .join("");
  return `${ascii}@mentorchat.app`;
}

// Mentor credentials
const MENTOR_NAME = "עידן ליבנה";
const MENTOR_EMAIL = nameToEmail(MENTOR_NAME);

export async function loginAsMentor(username: string, password: string) {
  if (username !== MENTOR_NAME) {
    throw new Error("שם משתמש או סיסמא שגויים");
  }

  // Try sign in first
  const { data, error } = await supabase.auth.signInWithPassword({
    email: MENTOR_EMAIL,
    password,
  });

  if (error && error.message.includes("Invalid login credentials")) {
    // First time - sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: MENTOR_EMAIL,
      password,
    });
    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error("שגיאה ביצירת המשתמש");

    // Create mentor profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: signUpData.user.id,
      display_name: MENTOR_NAME,
      role: "mentor",
      approved: true,
    });
    if (profileError) throw profileError;

    return signUpData;
  }

  if (error) throw error;
  return data;
}

export async function loginAsStudent(email: string, password: string) {
  const trimmedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) throw new Error("אימייל או סיסמה שגויים");
  return { ...data, isNew: false };
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}
