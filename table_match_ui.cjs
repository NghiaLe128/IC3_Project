const fs = require('fs');
let js = fs.readFileSync('teacher/script.js', 'utf8');

const tableMatchScript = `
window.tmData = { columns: [], rows: [], correctAnswers: [] };

window.renderTableMatchUI = function() {
    const container = document.getElementById('tm-container');
    if (!container) return;
    
    // Render columns
    const colsContainer = document.getElementById('tm-cols');
    colsContainer.innerHTML = tmData.columns.map((col, idx) => \`
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-sm">
            <span class="text-xs font-bold bg-purple-500 text-white rounded px-1.5 py-0.5">C\${idx + 1}</span>
            <input type="text" value="\${col}" onchange="window.updateTmColumn(\${idx}, this.value)" class="bg-transparent outline-none w-24 text-sm font-semibold">
            <button type="button" onclick="window.removeTmColumn(\${idx})" class="text-purple-400 hover:text-red-400"><i class="fa-solid fa-xmark"></i></button>
        </div>
    \`).join('');

    // Render rows table
    const rowsContainer = document.getElementById('tm-rows-tbody');
    let headerHtml = '<th class="p-3 font-bold text-indigo-300">Hàng hỏi / Nhãn mô tả</th>';
    tmData.columns.forEach(col => {
        headerHtml += \`<th class="p-3 text-center font-bold text-indigo-300 uppercase text-xs">\${col}</th>\`;
    });
    headerHtml += '<th class="p-3 text-center font-bold text-indigo-300">Xóa</th>';
    document.getElementById('tm-rows-thead').innerHTML = \`<tr class="border-b border-indigo-500/30 bg-[#131424]/80 text-left">\${headerHtml}</tr>\`;

    rowsContainer.innerHTML = tmData.rows.map((row, rIdx) => {
        let rowHtml = \`<td class="p-2"><div class="flex items-center gap-2">
            <span class="text-[10px] font-bold bg-blue-500/20 text-blue-400 rounded-full w-6 h-6 flex items-center justify-center shrink-0">H\${rIdx + 1}</span>
            <input type="text" value="\${row}" onchange="window.updateTmRow(\${rIdx}, this.value)" class="w-full p-2 rounded-lg border border-indigo-500/30 bg-[#1a1c2e] text-indigo-50 text-sm outline-none focus:border-purple-500">
        </div></td>\`;
        
        tmData.columns.forEach((col, cIdx) => {
            const isChecked = tmData.correctAnswers[rIdx] === cIdx;
            rowHtml += \`<td class="p-2 text-center">
                <input type="radio" name="tm_row_\${rIdx}" value="\${cIdx}" \${isChecked ? 'checked' : ''} onchange="window.updateTmAnswer(\${rIdx}, \${cIdx})" class="w-5 h-5 text-purple-500 border-indigo-500/50 bg-[#1a1c2e] focus:ring-purple-500 cursor-pointer">
            </td>\`;
        });
        
        rowHtml += \`<td class="p-2 text-center">
            <button type="button" onclick="window.removeTmRow(\${rIdx})" class="text-indigo-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash-can"></i></button>
        </td>\`;
        
        return \`<tr class="border-b border-indigo-500/10 hover:bg-[#131424]/40 transition-colors">\${rowHtml}</tr>\`;
    }).join('');
    
    document.getElementById('tm-col-count').innerText = \`(\${tmData.columns.length})\`;
    document.getElementById('tm-row-count').innerText = \`(\${tmData.rows.length})\`;
};

window.addTmColumn = function() {
    tmData.columns.push("Cột mới");
    window.renderTableMatchUI();
};
window.updateTmColumn = function(idx, val) {
    tmData.columns[idx] = val;
    window.renderTableMatchUI();
};
window.removeTmColumn = function(idx) {
    tmData.columns.splice(idx, 1);
    // adjust correctAnswers
    for (let i = 0; i < tmData.correctAnswers.length; i++) {
        if (tmData.correctAnswers[i] === idx) tmData.correctAnswers[i] = -1;
        else if (tmData.correctAnswers[i] > idx) tmData.correctAnswers[i]--;
    }
    window.renderTableMatchUI();
};
window.addTmRow = function() {
    tmData.rows.push("Hàng mới");
    tmData.correctAnswers.push(-1);
    window.renderTableMatchUI();
};
window.updateTmRow = function(idx, val) {
    tmData.rows[idx] = val;
};
window.removeTmRow = function(idx) {
    tmData.rows.splice(idx, 1);
    tmData.correctAnswers.splice(idx, 1);
    window.renderTableMatchUI();
};
window.updateTmAnswer = function(rIdx, cIdx) {
    tmData.correctAnswers[rIdx] = cIdx;
};
`;

const newHTML = `
  } else if (type === "table_match") {
    window.tmData = {
        columns: qData.options || ["Nhập", "Xuất"],
        rows: qData.rows || ["Bàn phím", "Scanner", "Màn hình"],
        correctAnswers: qData.correctAnswers || [0, 0, 1]
    };
    
    html = \`
      <div class="space-y-4 p-5 bg-[#131424]/80/80 rounded-2xl border border-indigo-500/30 shadow-sm" id="tm-container">
        <h4 class="font-bold text-sm text-purple-400">Cấu hình Bảng nối cột (Lưới khớp ô):</h4>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-indigo-500/30 bg-[#1a1c2e] mt-4">
            <div>
                <label class="block text-xs font-bold text-indigo-200 mb-2">Cỡ chữ trong bảng:</label>
                <select class="\${inputClass} py-2">
                    <option>👁 Vừa (md) - Chuẩn mặc định</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-indigo-200 mb-2">Độ rộng bảng:</label>
                <select class="\${inputClass} py-2">
                    <option>💻 Bình thường (Normal)</option>
                </select>
            </div>
        </div>

        <div class="p-4 rounded-xl border border-purple-500/20 bg-[#1a1c2e] mt-4">
            <div class="flex justify-between items-center mb-4">
                <h5 class="font-bold text-sm text-indigo-100">Danh sách các CỘT <span id="tm-col-count"></span></h5>
                <button type="button" onclick="window.addTmColumn()" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><i class="fa-solid fa-plus"></i> THÊM CỘT</button>
            </div>
            <div id="tm-cols" class="flex flex-wrap gap-3"></div>
        </div>

        <div class="p-4 rounded-xl border border-blue-500/20 bg-[#1a1c2e] mt-4">
            <div class="flex justify-between items-center mb-4">
                <h5 class="font-bold text-sm text-indigo-100">Danh sách các HÀNG & Click trỏ đáp án đúng <span id="tm-row-count"></span></h5>
                <button type="button" onclick="window.addTmRow()" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"><i class="fa-solid fa-plus"></i> THÊM HÀNG</button>
            </div>
            <div class="overflow-x-auto border border-indigo-500/30 rounded-xl">
                <table class="w-full">
                    <thead id="tm-rows-thead"></thead>
                    <tbody id="tm-rows-tbody"></tbody>
                </table>
            </div>
        </div>
      </div>
    \`;
    setTimeout(() => { window.renderTableMatchUI(); }, 50);
`;

const oldRegex = /\} else if \(type === "table_match"\) \{[\s\S]*?(?=\} else if \(type === "drag_text"\) \{)/;

js = js.replace(oldRegex, newHTML.trim() + "\n");
js += "\n" + tableMatchScript;
fs.writeFileSync('teacher/script.js', js);
