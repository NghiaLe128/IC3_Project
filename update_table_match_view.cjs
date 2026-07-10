const fs = require('fs');
let js = fs.readFileSync('teacher/script.js', 'utf8');

const regex = /\} else if \(q\.type === "table_match"\) \{[\s\S]*?(?=\} else if \(q\.type === "drag_text"\) \{)/;

const newHTML = `
  } else if (q.type === "table_match") {
    optionsContainer.innerHTML = \`
      <div class="space-y-3">
        <div class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider"><i class="fa-solid fa-table-list mr-1"></i>Bảng nối cặp đúng (Table Match):</div>
        <div class="overflow-x-auto border border-indigo-500/30 rounded-xl shadow-sm">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-[#131424]/80 border-b border-indigo-500/30 text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                <th class="p-3">Hàng hỏi / Nhãn mô tả</th>
                \${(q.options || []).map(col => \`<th class="p-3 text-center">\${col}</th>\`).join('')}
              </tr>
            </thead>
            <tbody>
              \${(q.rows || []).map((row, rIdx) => \`
                <tr class="border-b border-indigo-500/10 hover:bg-[#131424]/40 transition-colors">
                  <td class="p-3 font-semibold text-indigo-100">\${row}</td>
                  \${(q.options || []).map((col, cIdx) => \`
                      <td class="p-3 text-center">
                          \${q.correctAnswers[rIdx] === cIdx ? '<span class="text-emerald-500 text-lg"><i class="fa-solid fa-circle-dot"></i></span>' : '<span class="text-indigo-500/30 text-lg"><i class="fa-regular fa-circle"></i></span>'}
                      </td>
                  \`).join('')}
                </tr>
              \`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    \`;
`;

js = js.replace(regex, newHTML.trim() + "\\n");
fs.writeFileSync('teacher/script.js', js);
