

## איפוס סיסמה עבור livneidan14@gmail.com

### מה נעשה
נאפס את הסיסמה של המשתמש livneidan14@gmail.com לסיסמה החדשה `idan2004` באמצעות קריאת Admin API לשרת האימות.

### פרטים טכניים
- נשתמש ב-Edge Function או בקריאת `supabase.auth.admin.updateUserById()` עם ה-Service Role Key כדי לעדכן את הסיסמה.
- נמצא את ה-User ID של livneidan14@gmail.com מטבלת auth.users.
- נעדכן את הסיסמה ל-`idan2004`.

### שלבים
1. שליפת ה-User ID של livneidan14@gmail.com מבסיס הנתונים
2. קריאת Admin API לעדכון הסיסמה

