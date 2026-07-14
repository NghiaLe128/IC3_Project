const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// Replace standard form with just the Google Sheet button
code = code.replace(/<form id="loginForm" class="space-y-4">[\s\S]*?<\/form>/, '');

// Replace Google button text
code = code.replace(/<span>Đăng nhập Google \(Lớp học Sheet\)<\/span>/, '<span>Đăng nhập bằng Google Sheet</span>');

// Replace SVG with FontAwesome icon
code = code.replace(/<svg version="1.1" xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 48 48" class="w-5 h-5">[\s\S]*?<\/svg>/, '<i class="fa-solid fa-file-excel text-emerald-400 text-xl"></i>');

// Update click handler for the button
const oldJs = `            // 1. Google sign in
            const authResult = await window.googleSignInStudent();
            cachedGoogleUser = authResult.user;

            // 2. Fetch sheet config
            const config = await window.getGoogleSheetsConfig();
            if (!config || !config.spreadsheetId) {
              throw new Error("Chưa cấu hình Google Sheet từ phía Giáo viên! Vui lòng báo Giáo viên liên kết bảng tính trước.");
            }`;

const newJs = `            // 1. Fetch sheet config
            const config = await window.getGoogleSheetsConfig();
            if (!config || !config.spreadsheetId) {
              throw new Error("Chưa cấu hình Google Sheet từ phía Giáo viên! Vui lòng báo Giáo viên liên kết bảng tính trước.");
            }
            
            // Generate a synthetic user since we skip Google login
            cachedGoogleUser = { email: "student_" + Date.now() + "@sheet.local" };`;

code = code.replace(oldJs, newJs);

// Remove googleUserEmailDisplay in Modal
code = code.replace(/<p id="googleUserEmailDisplay" class="text-xs text-indigo-300 mt-1">user@gmail.com<\/p>/, '<p id="googleUserEmailDisplay" class="hidden text-xs text-indigo-300 mt-1">user@gmail.com</p>');

fs.writeFileSync('index.html', code);
