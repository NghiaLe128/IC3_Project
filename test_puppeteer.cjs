const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000/student/index.html');
  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to render rewards
  await page.evaluate(() => {
    // mock auth
    window.IC3_CACHE = {
      "ic3_current_user": '{"email": "hs1@gmail.com", "role": "student"}',
      "students": [{email: "hs1@gmail.com", level: "Explorer", exp: 500, coins: 500}]
    };
    localStorage.setItem("ic3_current_user", '{"email": "hs1@gmail.com", "role": "student"}');
  });
  
  await page.goto('http://localhost:3000/student/index.html');
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    window.switchStudentTab('rewards');
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const inner = await page.evaluate(() => {
    return document.getElementById('student-rewards-store-grid').innerHTML;
  });
  console.log("GRID HTML:", inner.trim().substring(0, 200));

  await browser.close();
})();
