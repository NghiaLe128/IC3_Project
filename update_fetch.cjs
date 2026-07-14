const fs = require('fs');
let code = fs.readFileSync('assets/js/google-sheets.js', 'utf8');

code = code.replace(/window\.fetchGoogleSheetData = async \(spreadsheetId, sheetName = "Học sinh"\) => \{[\s\S]*?return parsedStudents;\n  \} catch \(error\) \{\n    throw error;\n  \}\n\};/g, `window.fetchGoogleSheetData = async (spreadsheetId, sheetName = "Tổng quát") => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const url = \`https://docs.google.com/spreadsheets/d/\${cleanId}/gviz/tq?tqx=out:csv&sheet=\${encodeURIComponent(sheetName)}\`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Không thể tải dữ liệu từ Google Sheet. Đảm bảo file đã được share 'Bất kỳ ai có liên kết'.");
    
    const csvText = await res.text();
    // Basic CSV parser
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < csvText.length && csvText[i + 1] === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentCell);
          currentCell = "";
        } else if (char === '\\n' || char === '\\r') {
          if (char === '\\r' && i + 1 < csvText.length && csvText[i + 1] === '\\n') i++;
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = "";
        } else {
          currentCell += char;
        }
      }
    }
    if (currentCell !== "" || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    if (rows.length < 2) throw new Error("Bảng tính Google Sheet rỗng hoặc chưa có dữ liệu học sinh!");

    const headers = rows[0].map(h => h ? h.trim() : "");
    const colTruong = findColumnIndex(headers, ["trường", "school"]);
    const colLop = findColumnIndex(headers, ["lớp", "class"]);
    const colHo = findColumnIndex(headers, ["họ", "last name"]);
    const colTen = findColumnIndex(headers, ["tên", "first name", "name", "họ tên"]);
    const colMatKhau = findColumnIndex(headers, ["mật khẩu", "password", "mk"]);

    if (colLop === -1 || colTen === -1 || colMatKhau === -1) {
      throw new Error("Bảng tính cần có các cột: (Trường), Lớp, Họ, Tên, Mật khẩu!");
    }

    const parsedStudents = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const school = colTruong !== -1 && row[colTruong] ? row[colTruong].trim() : "Mặc định";
      const className = row[colLop] ? row[colLop].trim() : "";
      const firstName = row[colTen] ? row[colTen].trim() : "";
      const lastName = (colHo !== -1 && row[colHo]) ? row[colHo].trim() : "";
      const fullName = (lastName ? \`\${lastName} \${firstName}\` : firstName).trim();
      const password = row[colMatKhau] ? row[colMatKhau].trim() : "";

      if (className && firstName && password) {
        parsedStudents.push({ rowIndex: i + 1, school, className, name: fullName, password });
      }
    }

    return parsedStudents;
  } catch (error) {
    throw error;
  }
};`);

fs.writeFileSync('assets/js/google-sheets.js', code);
