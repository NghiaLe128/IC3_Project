import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target = """      displayOrder.forEach((scoreEntry) => {
        const studentInfo = blockStudents.find(s => s.email === scoreEntry.studentEmail) || {};
        const avatarUrl = studentInfo.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=default";"""

replacement = """      displayOrder.forEach((scoreEntry) => {
        const studentInfo = blockStudents.find(s => s.email === scoreEntry.studentEmail) || {};
        const avatarUrl = `https://play.pokemonshowdown.com/sprites/xyani/${window.getShowdownFormName(studentInfo.pokemon || 'pikachu')}.gif`;"""

if target in content:
    content = content.replace(target, replacement)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched avatar")
else:
    print("Target not found in avatar")
