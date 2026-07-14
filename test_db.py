import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target = """${(studentInfo.name || "HỌC VIÊN VÔ DANH").toUpperCase()}"""
replacement = """${(studentInfo.name || studentInfo.fullName || studentInfo.email || "HỌC VIÊN VÔ DANH").toUpperCase()}"""

if target in content:
    content = content.replace(target, replacement)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched 1")

target2 = """<span class="text-white font-black block">${st.name || "Học viên vô danh"}"""
replacement2 = """<span class="text-white font-black block">${st.name || st.fullName || st.email || "Học viên vô danh"}"""

if target2 in content:
    content = content.replace(target2, replacement2)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched 2")

target3 = """<span class="font-poppins font-black text-white block leading-tight">${studentInfo.name || "Học viên vô danh"}"""
replacement3 = """<span class="font-poppins font-black text-white block leading-tight">${studentInfo.name || studentInfo.fullName || studentInfo.email || "Học viên vô danh"}"""

if target3 in content:
    content = content.replace(target3, replacement3)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched 3")

target4 = """if (dashName) dashName.textContent = currentStudent.name || "Học viên vô danh";"""
replacement4 = """if (dashName) dashName.textContent = currentStudent.name || currentStudent.fullName || currentStudent.email || "Học viên vô danh";"""

if target4 in content:
    content = content.replace(target4, replacement4)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched 4")

