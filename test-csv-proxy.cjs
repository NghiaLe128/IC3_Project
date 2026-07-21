async function test() {
  const cleanId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"; // example public sheet
  const sheetName = "Class Data";
  const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(csvUrl);
  console.log(res.status);
  const text = await res.text();
  console.log(text.slice(0, 100));
}
test();
