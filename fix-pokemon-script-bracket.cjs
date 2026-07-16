const fs = require('fs');
let code = fs.readFileSync('admin/script.js', 'utf-8');

// I replaced until "window.savePokemonEvolutions = async function() {"
// Let's add the rest of savePokemonEvolutions.

code = code.replace(/window\.savePokemonEvolutions = async function\(\) \{\n  try \{\n    const colRef = window\.fStore\.collection\(window\.db, "pokemonEvolutions"\);\n    const snapshot = await window\.fStore\.getDocs\(colRef\);\n    \n    \/\/ First, delete forms that were removed\n    for \(const docSnap of snapshot\.docs\) \{\n      if \(!currentAdminEvoMap\[docSnap\.id\]\) \{\n        await window\.fStore\.deleteDoc\(docSnap\.ref\);\n      \}\n    \}\n/g, 
`window.savePokemonEvolutions = async function() {
  try {
    const colRef = window.fStore.collection(window.db, "pokemonEvolutions");
    const snapshot = await window.fStore.getDocs(colRef);
        
    for (const docSnap of snapshot.docs) {
      if (!currentAdminEvoMap[docSnap.id]) {
        await window.fStore.deleteDoc(docSnap.ref);
      }
    }
    
    // Then save/update existing forms
    for (const [base, forms] of Object.entries(currentAdminEvoMap)) {
      const docRef = window.fStore.doc(window.db, "pokemonEvolutions", base);
      const images = forms.map(f => \`https://projectpokemon.org/images/normal-sprite/\${f}.gif\`);
      await window.fStore.setDoc(docRef, {
        basePokemon: base,
        forms: forms,
        images: images,
        updatedAt: window.fStore.serverTimestamp()
      }, { merge: true });
    }
    console.log("Evolutions saved.");
  } catch (e) {
    console.error("Lỗi khi lưu evos:", e);
  }
};
`);

fs.writeFileSync('admin/script.js', code);
