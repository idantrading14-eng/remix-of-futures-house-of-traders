## מטרה
לצמצם את המערכת כך שתישאר רק מערכת קורסים — צד מנטור (ניהול קורסים/מודולים/שיעורים/תלמידים) וצד תלמיד (צפייה, סימניות, הערות). למחוק את כל השאר: CRM לקוחות, צ׳אט, AI Agent, חטיבות (Divisions), Onboarding, שלבים, תשלומים, תזכורות.

## מה יישאר
**צד מנטור (`/dashboard`)**
- ניהול קורסים, מודולים ושיעורים
- ניהול תלמידים (רשימה + ניהול גישות לקורסים)
- הגדרות בסיסיות + יציאה

**צד תלמיד (`/student`)**
- דשבורד פשוט עם קורסים זמינים
- צפייה בשיעורים (וידאו/PDF/HTML)
- סימניות (Bookmarks)
- הערות שיעור (Student Lesson Notes)
- הגדרות בסיסיות

**אימות**: התחברות / איפוס סיסמה נשארים כפי שהם. אין הרשמה עצמית, אין social login.

## מה יימחק

### דפים / קומפוננטות
- `MentorDashboard`, `DashboardOverview`, `ClientsPage`, `TimelinePage`, `CoursesPage` (הישן), `AcademyCoursesPage`/`AcademyLayout` יאוחדו לדשבורד מנטור חדש מבוסס קורסים
- `ChatView`, `StudentChatView`, `AISuggestions`, `ClientFile`, `ClientList`, `ClientTimeline`, `DivisionSwitcher`
- `components/clients/*` (כל התיקייה)
- `components/dashboard/*` (StuckStudentsWidget, DashboardAnalytics)
- `components/admin/AccessManagementTab` — יוחלף בטאב פשוט יותר בתוך ניהול הקורסים
- `components/student/OnboardingPopup`, `StudentChatView`
- `components/student/portal/DashboardView` — יוחלף בדשבורד מינימלי שמציג רק קורסים
- `contexts/DivisionContext`
- `lib/aiAgent.ts`, `lib/mockData.ts` (אם לא בשימוש אחר)

### Edge functions
- `ai-agent`, `webhook-new-student`, `add-manual-client` — מחיקה
- `reset-password` — נשאר

### טבלאות DB (migration שתמחק)
- `activity_log`, `ai_suggestions`, `client_details`, `client_notes`, `divisions`, `messages`, `onboarding_answers`, `payments`, `plans`, `student_reminders`, `student_stages`
- מהטבלה `profiles` — הסרת העמודות `division_id`, `onboarding_completed`
- מהטבלה `courses` — הסרת `external_id` (משמש רק לזרימת product_ids/חטיבות)

### טבלאות שיישארו
`profiles`, `courses`, `modules`, `lessons`, `enrollments`, `lesson_progress`, `lesson_bookmarks`, `student_lesson_notes`, `student_access` (יישאר `has_courses_access` בלבד; נסיר `has_mentorchat_access`).

## ניווט חדש
- `/login` → לפי תפקיד: מנטור → `/dashboard`, תלמיד → `/student`
- `/dashboard` — דשבורד מנטור (טאבים: קורסים | תלמידים | הגדרות)
- `/student` — פורטל תלמיד (קורסים | סימניות | הערות | הגדרות)
- כל הראוטים האחרים (`/clients`, `/timeline`, `/academy`) יוסרו

## פרטים טכניים
- ה־AppShell יוחלף בלייאאוט פשוט שמרנדר את האקדמיה (מבוסס `AcademyLayout` הקיים) כדשבורד הראשי
- `FuturesPortal` ינוקה מ־access.has_mentorchat_access, מ־Onboarding ומ־ChatView
- בדיקות RLS קיימות נשמרות (mentor manage / student own)
- המיגרציה תהיה `DROP TABLE ... CASCADE` לטבלאות הלא־רלוונטיות + `ALTER TABLE` להסרת עמודות
- אזהרה: המיגרציה מוחקת נתונים לצמיתות (כל הצ׳אטים, הלקוחות, החטיבות, התשלומים וכו׳)

## שלבי ביצוע
1. הרצת migration למחיקת הטבלאות והעמודות
2. מחיקת edge functions (`ai-agent`, `webhook-new-student`, `add-manual-client`)
3. מחיקת קומפוננטות/דפים שאינם בשימוש
4. שכתוב `App.tsx` (ראוטים מצומצמים), `AppShell.tsx` (דשבורד קורסים), `FuturesPortal.tsx` (ללא צ׳אט/onboarding)
5. ניקוי `lib/auth.ts` מהתייחסויות לחטיבות/Onboarding אם קיימות
6. עדכון memory: הסרת רשומות שאינן רלוונטיות (Divisions, AI Agent, Onboarding, Stuck Students, Chat Management וכו׳)

האם לאשר? (שים לב — מחיקת הנתונים בלתי הפיכה)