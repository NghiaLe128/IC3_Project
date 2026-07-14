import sys

with open('student/script.js', 'r') as f:
    content = f.read()

target = """                <img src="${avatarUrl}" class="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_0_15px_${theme.avatarShadow}] hover:scale-110 transition-transform duration-300" alt="avatar" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=default'">"""

replacement = """                <img src="${avatarUrl}" class="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_0_15px_${theme.avatarShadow}] hover:scale-110 transition-transform duration-300 scale-125" alt="avatar" onerror="this.src='https://projectpokemon.org/images/normal-sprite/${studentInfo.pokemon || 'pikachu'}.gif'">"""

if target in content:
    content = content.replace(target, replacement)
    with open('student/script.js', 'w') as f:
        f.write(content)
    print("Patched onerror")
else:
    print("Target not found in onerror")
