const fs = require('fs');
let js = fs.readFileSync('teacher/script.js', 'utf8');

// The replacement was supposed to target handleQuestionFormSubmit but I targeted the wrong `type === "true_false"`.
// I will clean up the misplaced code in renderDynamicFormFields.
js = js.replace(/\} else if \(type === "drag_image_text"\) \{\s*const leftInputs[\s\S]*?qObj\.answer = "Kéo thả hình ảnh";\s*/, "");

// Now let's put it in handleQuestionFormSubmit properly
const replacement = `
  } else if (type === "drag_image_text") {
    const leftInputs = Array.from(document.querySelectorAll('.dit-left')).map(el => el.value.trim());
    const rightInputs = Array.from(document.querySelectorAll('.dit-right')).map(el => el.value.trim());
    const validPairs = leftInputs.map((l, i) => ({ l, r: rightInputs[i] })).filter(p => p.l && p.r);
    
    qObj.rows = validPairs.map(p => p.l);
    qObj.leftImages = validPairs.map(p => p.l); // add leftImages for view compatibility
    qObj.options = [...validPairs.map(p => p.r)].sort(() => Math.random() - 0.5); // Shuffle options
    qObj.correctAnswers = validPairs.map(p => p.r);
    qObj.answer = "Kéo thả hình ảnh";
  } else if (type === "true_false") {`;

// Replace in handleQuestionFormSubmit
const handleSubmitTarget = /\} else if \(type === "true_false"\) \{/g;
// We need to only replace the second occurrence, which is in handleQuestionFormSubmit
const parts = js.split('} else if (type === "true_false") {');
if (parts.length === 3) {
    js = parts[0] + '} else if (type === "true_false") {' + parts[1] + replacement.trim() + parts[2];
}

fs.writeFileSync('teacher/script.js', js);
