import sys

with open('assets/js/google-sheets.js', 'r') as f:
    content = f.read()

target = """    // Write correct count or fallback to score
    const valueToWrite = (correctCount !== undefined && correctCount !== null) ? correctCount : score;
    await updateSheetCell(cleanId, sheetName, token, rowIndex, testCol, valueToWrite);

    // Calculate XL and Ghi chú
    // Rule: Nếu 45 câu -> 41+ câu đúng = A, < 20 câu đúng = C
    const xlCol = findColumnIndex(headers, ["xl", "xếp loại"]);
    const noteCol = findColumnIndex(headers, ["ghi chú"]);

    if (xlCol !== -1 && noteCol !== -1) {
       let type = "";
       let note = "";
       const headerName = headers[testCol];
       if (headerName.includes("(45)")) {
          const val = (correctCount !== undefined && correctCount !== null) ? correctCount : score;
          if (val >= 41 || (correctCount === undefined && val >= 91)) {
             type = "A";
             note = "Xuất sắc, cần duy trì phát huy.";
          } else if (val <= 20 || (correctCount === undefined && val <= 44)) {
             type = "C";
             note = "Cần cố gắng ôn tập nhiều hơn.";
          } else {
             type = "B";
          }
       }
       if (type) {
         await updateSheetCell(cleanId, sheetName, token, rowIndex, xlCol, type);
         await updateSheetCell(cleanId, sheetName, token, rowIndex, noteCol, note);
       }
    }"""

replacement = """    // Write correct count or fallback to score
    const valueToWrite = (correctCount !== undefined && correctCount !== null) ? correctCount : score;
    
    // Read current score from sheet to check if we should update
    const scoreCellRange = sheetName + '!' + String.fromCharCode(65 + testCol) + rowIndex;
    const currentScoreData = await fetchSheetsValues(cleanId, scoreCellRange, token);
    const currentScoreStr = currentScoreData.values && currentScoreData.values[0] && currentScoreData.values[0][0] ? currentScoreData.values[0][0] : "";
    const currentScoreVal = parseInt(currentScoreStr);

    let shouldUpdate = false;
    if (isNaN(currentScoreVal) || valueToWrite > currentScoreVal) {
        shouldUpdate = true;
    }

    if (shouldUpdate) {
      await updateSheetCell(cleanId, sheetName, token, rowIndex, testCol, valueToWrite);

      // Calculate XL and Ghi chú
      // Rule: Nếu 45 câu -> 41+ câu đúng = A, < 20 câu đúng = C
      const xlCol = findColumnIndex(headers, ["xl", "xếp loại"]);
      const noteCol = findColumnIndex(headers, ["ghi chú"]);

      if (xlCol !== -1 && noteCol !== -1) {
         let type = "";
         let note = "";
         const headerName = headers[testCol];
         if (headerName.includes("(45)")) {
            const val = valueToWrite;
            if (val >= 41 || (correctCount === undefined && val >= 91)) {
               type = "A";
               note = "Xuất sắc, cần duy trì phát huy.";
            } else if (val <= 20 || (correctCount === undefined && val <= 44)) {
               type = "C";
               note = "Cần cố gắng ôn tập nhiều hơn.";
            } else {
               type = "B";
            }
         }
         if (type) {
           await updateSheetCell(cleanId, sheetName, token, rowIndex, xlCol, type);
           await updateSheetCell(cleanId, sheetName, token, rowIndex, noteCol, note);
         }
      }
    } else {
      console.log(`Bỏ qua cập nhật Google Sheet vì điểm mới (${valueToWrite}) <= điểm cũ (${currentScoreVal})`);
    }"""

if target in content:
    with open('assets/js/google-sheets.js', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Patched successfully")
else:
    print("Target not found")
