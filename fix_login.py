import sys

with open('student/script.js', 'r') as f:
    content = f.read()

content = content.replace("name: user.name,", "name: user.displayName || user.name,")

with open('student/script.js', 'w') as f:
    f.write(content)
print("Patched login")
