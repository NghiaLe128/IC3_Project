import sys

with open('student/script.js', 'r') as f:
    content = f.read()

content = content.replace("studentInfo.name || studentInfo.fullName || studentInfo.email", "studentInfo.fullName || studentInfo.name")
content = content.replace("st.name || st.fullName || st.email", "st.fullName || st.name")
content = content.replace("currentStudent.name || currentStudent.fullName || currentStudent.email", "currentStudent.fullName || currentStudent.name")

with open('student/script.js', 'w') as f:
    f.write(content)
print("Patched 5")
