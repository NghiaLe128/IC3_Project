const fs = require('fs');
let code = fs.readFileSync('assets/js/google-sheets.js', 'utf8');

// 1. Mark Attendance - update search for "Điểm danh D/M"
code = code.replace(
  /const diemDanhCol = findColumnIndex\(headers, \["điểm danh"\]\);/,
  `
        const today = new Date();
        const dateStr1 = \`\${today.getDate()}/\${today.getMonth() + 1}\`;
        const dateStr2 = \`\${String(today.getDate()).padStart(2, '0')}/\${String(today.getMonth() + 1).padStart(2, '0')}\`;
        
        const diemDanhCol = headers.findIndex(h => {
           if (!h) return false;
           const hl = h.toLowerCase();
           return hl.includes("điểm danh") && (hl.includes(dateStr1) || hl.includes(dateStr2));
        });
  `
);

// 2. Map test scores better
code = code.replace(
  /let testCol = headers\.findIndex\(h => h && testTitle && h\.toLowerCase\(\)\.includes\(testTitle\.toLowerCase\(\)\)\);[\s\S]*?if \(testCol === -1\) return { success: false, message: "Không tìm thấy cột điểm phù hợp" };/,
  `
    let testCol = -1;
    if (testTitle) {
      let normalizedTestTitle = testTitle.toLowerCase().replace(/ôn tập\\s*/g, "ot").replace(/\\s+/g, "");
      
      testCol = headers.findIndex(h => {
          if (!h) return false;
          let normalizedH = h.toLowerCase().replace(/\\s+/g, "");
          return normalizedH.includes(normalizedTestTitle);
      });
    }

    if (testCol === -1) return { success: false, message: "Không tìm thấy cột điểm phù hợp" };
  `
);

// 3. Add syncCheatToGoogleSheet
code += `

/**
 * Automatically Sync Cheat to Google Sheet
 */
window.syncCheatToGoogleSheet = async (cheatReason) => {
  const token = sessionStorage.getItem("google_sheets_token");
  if (!token) return { success: false, message: "Missing token" };

  try {
    const config = await window.getGoogleSheetsConfig();
    if (!config || !config.spreadsheetId) return { success: false, message: "No sheet configured" };

    const cleanId = extractSpreadsheetId(config.spreadsheetId);
    const sheetName = config.studentSheetName || "Học sinh";
    const rowIndex = sessionStorage.getItem("sheet_student_row_index");

    if (!rowIndex) return { success: false, message: "Không tìm thấy vị trí học sinh trên sheet" };

    // Fetch headers
    const res = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${cleanId}/values/\${encodeURIComponent(sheetName + '!A1:Z1')}\`, {
      headers: { Authorization: \`Bearer \${token}\` }
    });
    const data = await res.json();
    const headers = data.values && data.values[0] ? data.values[0] : [];
    
    const noteCol = findColumnIndex(headers, ["ghi chú"]);
    const cheatCol = findColumnIndex(headers, ["gian lận"]);
    
    if (noteCol !== -1) {
      // Get current note
      const cellRes = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${cleanId}/values/\${encodeURIComponent(sheetName + '!' + String.fromCharCode(65 + noteCol) + rowIndex)}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const cellData = await cellRes.json();
      let currentNote = cellData.values && cellData.values[0] && cellData.values[0][0] ? cellData.values[0][0] : "";
      
      if (currentNote && !currentNote.includes(cheatReason)) {
        currentNote += ", " + cheatReason;
      } else if (!currentNote) {
        currentNote = cheatReason;
      }
      
      await updateSheetCell(cleanId, sheetName, token, rowIndex, noteCol, currentNote);
    }
    
    if (cheatCol !== -1) {
      // Increment cheat counter
      const cellRes = await fetch(\`https://sheets.googleapis.com/v4/spreadsheets/\${cleanId}/values/\${encodeURIComponent(sheetName + '!' + String.fromCharCode(65 + cheatCol) + rowIndex)}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const cellData = await cellRes.json();
      let currentCheat = cellData.values && cellData.values[0] && cellData.values[0][0] ? parseInt(cellData.values[0][0]) || 0 : 0;
      
      await updateSheetCell(cleanId, sheetName, token, rowIndex, cheatCol, (currentCheat + 1).toString());
    }
    
    return { success: true };
  } catch (error) {
    console.error("❌ Exception during Google Sheet cheat sync:", error);
    return { success: false, error: error.message };
  }
};
`;

fs.writeFileSync('assets/js/google-sheets.js', code);
