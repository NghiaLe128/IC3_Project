import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target = """  const level3TestsIds = tests.filter(t => t.level === "level_3").map(t => t.id);
  const hasIC3Master = myScores.some(s => level3TestsIds.includes(s.testId) && s.score >= 50);"""

replacement = """  const level3TestsIds = tests.filter(t => t.level === "level_3").map(t => t.id);
  const hasIC3Master = myScores.some(s => {
    if (!level3TestsIds.includes(s.testId)) return false;
    if (s.correctCount !== undefined && s.totalCount !== undefined) {
      const wrong = s.totalCount - s.correctCount;
      return !(wrong >= 5 || s.correctCount < 20);
    }
    return s.score >= 50;
  });"""

if target in content:
    content = content.replace(target, replacement)
    print("Patched hasIC3Master")
else:
    print("Failed to patch hasIC3Master")

with open('student/script.js', 'w') as f:
    f.write(content)
