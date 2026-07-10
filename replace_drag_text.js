const fs = require('fs');
let js = fs.readFileSync('teacher/script.js', 'utf8');

const newDragTextHTML = `
      <div class="space-y-4 p-5 bg-[#131424]/80/80 rounded-2xl border border-indigo-500/30 shadow-sm">
        <h4 class="font-bold text-sm text-purple-400">Cấu hình Kéo thả Khớp các Cặp Chữ:</h4>
        <p class="text-[11px] text-indigo-300 italic mb-4">Thực hiện ghép vế Trái khớp với định nghĩa vế Phải tương ứng. Hệ thống sẽ tự đảo ngẫu nhiên khi hiển thị.</p>
        
        <div class="grid grid-cols-2 gap-4 mb-2">
            <span class="text-xs font-bold text-indigo-200">Từ Khóa Vế Trái (Cố định)</span>
            <span class="text-xs font-bold text-indigo-200">Nhãn Khớp Vế Phải (Kéo thả)</span>
        </div>
        <div id="drag-text-rows" class="space-y-3 border-t border-indigo-500/30 border-dashed pt-3">
            \${(qData.rows || ['', '', '', '']).map((row, idx) => \`
                <div class="grid grid-cols-2 gap-4">
                    <input type="text" class="dt-left \${inputClass}" placeholder="Ví dụ: RAM" value="\${row}">
                    <input type="text" class="dt-right \${inputClass}" placeholder="Khớp: Bộ nhớ truy cập ngẫu nhiên" value="\${(qData.correctAnswers || [])[idx] || ''}">
                </div>
            \`).join('')}
        </div>
        <button type="button" onclick="addDragTextRow()" class="mt-3 px-4 py-2 rounded-xl border border-purple-200 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors bg-[#1a1c2e] shadow-sm">+ Thêm cặp</button>
      </div>
`;

js = js.replace(/<div class="space-y-4 p-5 bg-\[#131424\]\/80\/80 rounded-2xl border border-indigo-500\/30 shadow-sm">\s*<div>\s*<label class="\$\{labelClass\}">Các mảnh văn bản để kéo \(cách nhau bằng dấu phẩy\)<\/label>\s*<input type="text" id="form-options" class="\$\{inputClass\}" placeholder="Từ 1, Từ 2, Từ 3" value="\$\{\(qData\.options \|\| \[\]\)\.join\(\', \'\)\}">\s*<\/div>\s*<div>\s*<label class="\$\{labelClass\}">Các vị trí \(ô trống\) cần thả \(cách nhau bằng dấu phẩy\)<\/label>\s*<input type="text" id="form-rows" class="\$\{inputClass\}" placeholder="Vị trí 1, Vị trí 2" value="\$\{\(qData\.rows \|\| \[\]\)\.join\(\', \'\)\}">\s*<\/div>\s*<div>\s*<label class="\$\{labelClass\}">Đáp án đúng cho mỗi vị trí \(chính xác văn bản từ mục kéo\)<\/label>\s*<input type="text" id="form-correct-answers" class="\$\{inputClass\}" placeholder="Từ 1, Từ 2" value="\$\{\(qData\.correctAnswers \|\| \[\]\)\.join\(\', \'\)\}">\s*<\/div>\s*<\/div>/g, newDragTextHTML.trim());

fs.writeFileSync('teacher/script.js', js);
