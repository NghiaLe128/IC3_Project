import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target = """                <div class="text-center font-poppins font-black text-xs md:text-sm tracking-wide truncate ${theme.nameText}">
                  ${(studentInfo.fullName || studentInfo.email || "CHƯA RÕ").toUpperCase()}
                </div>"""

replacement = """                <div class="text-center font-poppins font-black text-xs md:text-sm tracking-wide truncate ${theme.nameText}">
                  ${(studentInfo.fullName || "HỌC VIÊN VÔ DANH").toUpperCase()}
                </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched podium name")
else:
    print("Target not found in podium")
