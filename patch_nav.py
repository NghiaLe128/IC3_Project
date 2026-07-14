import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target = """  if (dashName) dashName.textContent = currentStudent.fullName || currentStudent.email;"""
replacement = """  if (dashName) dashName.textContent = currentStudent.fullName || "Học viên vô danh";"""

if target in content:
    content = content.replace(target, replacement)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched nav name")
else:
    print("Target not found in nav name")
