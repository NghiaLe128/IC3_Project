const fs = require('fs');
let code = fs.readFileSync('student/script.js', 'utf-8');

const regexReplace = /  img\.src = targetPoke\.image;[\s\S]*?overlay\.classList\.remove\("hidden"\);\n\}/m;

const newLogic = `
  img.classList.remove("scale-0", "opacity-0", "animate-ping", "animate-shake");
  
  const rarityColors = targetPoke.rarity === "Hiếm" ? "bg-yellow-500 text-yellow-950" : (targetPoke.rarity === "Thần Thoại" ? "bg-purple-500 text-purple-950" : "bg-slate-600 text-slate-200");
  const glowColor = targetPoke.rarity === "Hiếm" ? "bg-yellow-600/30" : (targetPoke.rarity === "Thần Thoại" ? "bg-purple-600/30" : "bg-cyan-600/20");
  
  const bgGlow = document.getElementById("catch-bg-glow");
  if (bgGlow) bgGlow.className = \`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none transition-colors duration-700 \${glowColor}\`;

  img.src = targetPoke.image;
  nameEl.innerText = targetPoke.name;
  
  const nameElMobile = document.getElementById("catch-poke-name-mobile");
  if (nameElMobile) nameElMobile.innerText = targetPoke.name;
  
  // Rarity Colors
  rarityBadge.innerText = targetPoke.rarity;
  rarityBadge.className = \`inline-block mt-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-inner border border-slate-600/50 \${rarityColors}\`;
  
  const rarityBadgeMobile = document.getElementById("catch-rarity-badge-mobile");
  if (rarityBadgeMobile) {
      rarityBadgeMobile.innerText = targetPoke.rarity;
      rarityBadgeMobile.className = \`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest text-white ml-2 \${rarityColors}\`;
  }

  if (targetPoke.rarity === "Hiếm") {
    spawnRateEl.innerText = "30%";
  } else if (targetPoke.rarity === "Thần Thoại") {
    spawnRateEl.innerText = "5%";
  } else {
    spawnRateEl.innerText = "70%";
  }

  elementEl.innerText = targetPoke.element || "Không rõ";
  successRateEl.innerText = (baseChance * 100).toFixed(0) + "%";
  
  const successRateMobile = document.getElementById("catch-success-rate-mobile");
  if (successRateMobile) successRateMobile.innerText = (baseChance * 100).toFixed(0) + "%";

  container.innerHTML = "";
  const mobileContainer = document.getElementById("pokeballs-container-mobile");
  if (mobileContainer) mobileContainer.innerHTML = "";
  
  for (let i = 0; i < balls; i++) {
    container.innerHTML += \`<img id="pokeball-\${i}" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" class="w-5 h-5 transition-all duration-300">\`;
    if (mobileContainer) {
        mobileContainer.innerHTML += \`<img id="pokeball-mobile-\${i}" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" class="w-4 h-4 transition-all duration-300">\`;
    }
  }

  const results = document.getElementById("catch-results");
  if (results) results.classList.add("hidden");
  
  const msg = document.getElementById("catch-message");
  if (msg) msg.innerHTML = "";
  
  const thrownBall = document.getElementById("thrown-pokeball");
  if (thrownBall) {
      thrownBall.classList.add("hidden");
      thrownBall.style.bottom = "80px";
      thrownBall.style.transform = "translateX(-50%) rotate(0deg) scale(1)";
  }
  
  const actions = document.getElementById("catch-actions");
  if (actions) actions.classList.remove("opacity-50", "pointer-events-none");

  overlay.classList.remove("hidden");
}
`;

code = code.replace(regexReplace, newLogic);
fs.writeFileSync('student/script.js', code);
