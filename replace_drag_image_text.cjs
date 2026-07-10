const fs = require('fs');
let js = fs.readFileSync('teacher/script.js', 'utf8');

const newHTML = `
  } else if (type === "drag_image_text") {
      html = \`
      <div class="space-y-4 p-5 bg-[#131424]/80/80 rounded-2xl border border-indigo-500/30 shadow-sm">
        <h4 class="font-bold text-sm text-purple-400">Cấu hình Kéo thả Khớp Ảnh - Chữ:</h4>
        <p class="text-[11px] text-indigo-300 italic mb-4">Nhập đường dẫn hình ảnh cột vế Trái khớp với đáp án chữ vế Phải tương ứng.</p>
        
        <div class="grid grid-cols-2 gap-4 mb-2">
            <span class="text-xs font-bold text-indigo-200">Đường dẫn ảnh Trái (Link URL)</span>
            <span class="text-xs font-bold text-indigo-200">Nhãn Khớp Chữ Phải</span>
        </div>
        <div id="drag-image-text-rows" class="space-y-3 border-t border-indigo-500/30 border-dashed pt-3">
            \${(qData.rows && qData.rows.length ? qData.rows : ['', '', '', '']).map((row, idx) => \`
                <div class="grid grid-cols-2 gap-4">
                    <input type="text" class="dit-left \${inputClass}" placeholder="/favicon.png hoặc URL ảnh..." value="\${row}">
                    <input type="text" class="dit-right \${inputClass}" placeholder="Nhãn khớp: e.g. Thùng rác máy tính" value="\${(qData.correctAnswers || [])[idx] || ''}">
                </div>
            \`).join('')}
        </div>
        <button type="button" onclick="addDragImageTextRow()" class="mt-3 px-4 py-2 rounded-xl border border-purple-200 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors bg-[#1a1c2e] shadow-sm">+ Thêm cặp</button>
      </div>
    \`;
  } else if (type === "true_false") {`;

js = js.replace(/\} else if \(type === "true_false"\) \{/, newHTML.trim());

const addRowScript = `
window.addDragImageTextRow = function() {
    const container = document.getElementById('drag-image-text-rows');
    const inputClass = "w-full p-3 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm";
    const div = document.createElement('div');
    div.className = "grid grid-cols-2 gap-4";
    div.innerHTML = \`
        <input type="text" class="dit-left \${inputClass}" placeholder="URL ảnh..." value="">
        <input type="text" class="dit-right \${inputClass}" placeholder="Nhãn khớp" value="">
    \`;
    container.appendChild(div);
};
`;

js += "\\n" + addRowScript;

fs.writeFileSync('teacher/script.js', js);
