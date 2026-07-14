const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// Replace standard form completely (just hide it or remove it entirely)
code = code.replace(/<form id="loginForm" class="space-y-4">[\s\S]*?<\/form>/, '<form id="loginForm" class="space-y-4 hidden"></form>');

// Also remove the "mt-6 pt-6 border-t border-slate-800/85" from the button wrapper to make it look clean
code = code.replace(/<div class="mt-6 pt-6 border-t border-slate-800\/85">/, '<div>');

// Fix button text to say "Đang lấy dữ liệu..."
code = code.replace(/Đang kết nối Google\.\.\./, "Đang tải dữ liệu...");

fs.writeFileSync('index.html', code);
