import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target1 = """    if (currentTestMode === "exam") {
      if (examUserAnswers[i] !== undefined && examUserAnswers[i] !== "") {
        isAnswered = true;
        isCorrect = isAnswerCorrect(q, examUserAnswers[i]);
      }
    } else {
      if (userAnswers[i] !== undefined) {
        isAnswered = true;
        isCorrect = isAnswerCorrect(q, userAnswers[i]);
      }
    }
    
    if (isAnswered) {"""

replacement1 = """    if (currentTestMode === "exam") {
      if (examUserAnswers[i] !== undefined && examUserAnswers[i] !== "") {
        isAnswered = true;
        isCorrect = isAnswerCorrect(q, examUserAnswers[i]);
      }
    } else {
      if (userAnswers[i] !== undefined) {
        isAnswered = true;
        isCorrect = isAnswerCorrect(q, userAnswers[i]);
      }
    }

    if (isReviewingExam && !isAnswered) {
      isAnswered = true;
      isCorrect = false;
    }
    
    if (isAnswered) {"""

target2 = """  // Gamification reward system
  let expGained = 0;
  let coinsGained = 0;
  const earnedBadges = [];

  const isPassed = score >= 50;
  let bananasGained = 0;"""

replacement2 = """  // Gamification reward system
  let expGained = 0;
  let coinsGained = 0;
  const earnedBadges = [];

  const wrongCount = totalQ - correctAnswersCount;
  const isPassed = !(wrongCount >= 5 || correctAnswersCount < 20);
  let bananasGained = 0;"""

target3 = """  studentScores.forEach(sc => {
    const test = tests.find(t => t.id === sc.testId) || { title: sc.testId };
    
    const isPassed = sc.score >= 50;
    const statusText = isPassed 
      ? `<span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-extrabold text-[10px]">ĐẠT CHUẨN</span>`
      : `<span class="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-400 font-extrabold text-[10px]">CHƯA ĐẠT</span>`;

    const tr = document.createElement("tr");"""

replacement3 = """  studentScores.forEach(sc => {
    const test = tests.find(t => t.id === sc.testId) || { title: sc.testId };
    
    let statusText = "";
    if (sc.correctCount !== undefined && sc.totalCount !== undefined) {
      const wrongCount = sc.totalCount - sc.correctCount;
      if (sc.correctCount < 20) {
        statusText = `<span class="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-400 font-extrabold text-[10px]">QUÁ YẾU</span>`;
      } else if (wrongCount >= 5) {
        statusText = `<span class="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-400 font-extrabold text-[10px]">THẤT BẠI</span>`;
      } else {
        statusText = `<span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-extrabold text-[10px]">ĐẠT CHUẨN</span>`;
      }
    } else {
      const isPassed = sc.score >= 50;
      statusText = isPassed 
        ? `<span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-extrabold text-[10px]">ĐẠT CHUẨN</span>`
        : `<span class="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-400 font-extrabold text-[10px]">CHƯA ĐẠT</span>`;
    }

    const tr = document.createElement("tr");"""

for i, (t, r) in enumerate([(target1, replacement1), (target2, replacement2), (target3, replacement3)]):
    if t in content:
        content = content.replace(t, r)
        print(f"Patched {i+1}")
    else:
        print(f"Failed to patch {i+1}")

with open('student/script.js', 'w') as f:
    f.write(content)
