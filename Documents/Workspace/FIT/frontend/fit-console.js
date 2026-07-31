const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const msgs = [];
  page.on('console', msg => msgs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => msgs.push('PAGE ERROR: ' + err.message + '\n' + err.stack));

  const fakeUser = JSON.stringify({ id: 'u1', name: 'Lalit Tak', email: 'lalit.tak@polarisgrids.com', role: 'Admin', department: 'Engineering', mobile: '9999999999' });
  await page.goto('http://localhost:3000/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('fit_auth_token', token);
    localStorage.setItem('fit_auth_user', user);
  }, { token: 'fake.jwt.token', user: fakeUser });

  await page.goto('http://localhost:3000/issues/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  msgs.forEach(m => console.log(m));
  if (!msgs.length) console.log('No messages');

  // Also print all text content on the page
  const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('PAGE TEXT:', text);
  await browser.close();
})();
