const fs = require('fs');
let js = fs.readFileSync('teacher/script.js', 'utf8');

const replacement = `
  } else if (type === "drag_image_text") {
    const leftInputs = Array.from(document.querySelectorAll('.dit-left')).map(el => el.value.trim());
    const rightInputs = Array.from(document.querySelectorAll('.dit-right')).map(el => el.value.trim());
    const validPairs = leftInputs.map((l, i) => ({ l, r: rightInputs[i] })).filter(p => p.l && p.r);
    
    qObj.rows = validPairs.map(p => p.l);
    qObj.options = [...validPairs.map(p => p.r)].sort(() => Math.random() - 0.5); // Shuffle options
    qObj.correctAnswers = validPairs.map(p => p.r);
    qObj.answer = "Kéo thả hình ảnh";
  } else if (type === "true_false") {`;

js = js.replace(/\} else if \(type === "true_false"\) \{/, replacement.trim());
fs.writeFileSync('teacher/script.js', js);
