# Tests Section for Student Portal

Add a new "מבחנים" (Tests) section to the student portal with level-based tests supporting 5 question types.

## Where it plugs in

- New nav item in `PortalSidebar` under "תוכן" section: "מבחנים" (Tests) with a `ClipboardCheck` icon.
- New view key `"tests"` handled in `FuturesPortal.tsx` renderContent switch.
- All new code lives under `src/components/student/tests/`. No backend/database changes — tests are seeded as a static TypeScript data file so you can edit levels/questions directly in code.

## File structure

```text
src/
  data/
    testsData.ts              // seed data: levels + questions (2 sample levels, all 5 types)
  components/student/tests/
    TestsView.tsx             // main controller: list | test | results
    LevelsList.tsx            // grid of level cards (with room for locked/completed states)
    TestRunner.tsx            // one-question-at-a-time flow, progress, Next/Finish
    TestResults.tsx           // score + per-question review + retake button
    questions/
      MultipleChoiceQuestion.tsx
      TrueFalseQuestion.tsx
      ImageChoiceQuestion.tsx
      DrawingQuestion.tsx     // canvas + pen/eraser/clear + reveal + self-grade
      ShortTextQuestion.tsx
      QuestionShell.tsx       // shared wrapper: prompt, optional image, hint, explanation
    types.ts                  // Question/Level/Answer TypeScript types
```

## Data model (types.ts)

Discriminated union on `type` so adding a new type = new component + new variant.

```ts
type BaseQuestion = { id: string; prompt: string; image?: string; hint?: string; explanation?: string };
type MultipleChoice = BaseQuestion & { type: "multiple_choice"; options: string[]; correctIndex: number };
type TrueFalse      = BaseQuestion & { type: "true_false"; correct: boolean };
type ImageChoice    = BaseQuestion & { type: "image_choice"; options: { label?: string; image?: string }[]; correctIndex: number };
type Drawing        = BaseQuestion & { type: "drawing"; correctAnswerImage: string };
type ShortText      = BaseQuestion & { type: "short_text"; accepted: string[] }; // case-insensitive match
type Question = MultipleChoice | TrueFalse | ImageChoice | Drawing | ShortText;
type Level = { id: string; title: string; questions: Question[] };
```

Seed with 2 levels mixing all 5 types.

## Behavior

- **LevelsList**: grid of cards matching existing portal style (dark bg, gold accents `#d4a017`). Each card shows level title + question count. Leaves visual room for future locked/completed badges.
- **TestRunner**:
  - Local state: `currentIndex`, `answers[]` (one entry per question), and per-question local answer state.
  - Header: "שאלה X מתוך Y" + thin progress bar.
  - Renders the question component matching `question.type`.
  - "הבא" button (disabled until answered). Last question shows "סיום" instead.
  - Drawing questions: after student draws and taps "בדוק תשובה", reveal `correctAnswerImage` side-by-side and show "עניתי נכון" / "עניתי לא נכון" buttons that record the score and advance.
  - Short text: case-insensitive trim compare against `accepted[]`.
- **TestResults**:
  - Big score display (e.g. "7 / 10").
  - Review list: each row shows prompt, student's answer, correct answer, explanation. Wrong answers highlighted in red, correct in green.
  - "נסה שוב" button resets state and returns to TestRunner from question 1.
- **Retake / navigation**: back arrow in TestRunner and Results returns to LevelsList.

## Question components

Each is a controlled component: `{ question, value, onChange, disabled }`. TestRunner owns the answer state and passes it in. This keeps rendering pure and makes adding a new type trivial (add a component, add a case in the switch inside TestRunner).

- **DrawingQuestion**: HTML5 `<canvas>` with pointer events. Toolbar: pen, eraser, clear, "בדוק תשובה". Sized responsively; touch-friendly. Uses `getBoundingClientRect` for accurate coordinates on mobile.

## Styling

Match existing portal: dark background `#1a1a1a`, cards on `rgba(255,255,255,0.04)`, gold accent `#d4a017`, `font-outfit` for titles, RTL Hebrew labels throughout. Fully responsive — grid collapses to single column on mobile, canvas fills available width.

## Out of scope (not building unless you ask)

- Persisting scores to the database (currently in-memory per session).
- Locked/completed states based on progress (structure supports it; no logic yet).
- Uploading real images for image_choice / drawing correct-answer — seed uses placeholder URLs you can swap.
