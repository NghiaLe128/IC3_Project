fetch("http://localhost:3000/api/sheets/proxy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    range: "Class Data!A1:Z2000",
    method: "GET"
  })
}).then(r => r.json()).then(console.log);
