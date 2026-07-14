import sys

with open('student/script.js', 'r') as f:
    content = f.read()

content = content.replace("studentInfo.fullName", "studentInfo.name")
content = content.replace("currentStudent.fullName", "currentStudent.name")

with open('student/script.js', 'w') as f:
    f.write(content)
print("Patched names")
