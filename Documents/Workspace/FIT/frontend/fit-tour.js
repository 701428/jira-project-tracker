const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const fakeUser = JSON.stringify({
    id: 'u1', name: 'Lalit Tak', email: 'lalit.tak@polarisgrids.com',
    role: 'Admin', department: 'Engineering', mobile: '9999999999'
  });

  async function injectAuth() {
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('fit_auth_token', token);
      localStorage.setItem('fit_auth_user', user);
    }, { token: 'fake.jwt.token', user: fakeUser });
  }

  // Login page
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/fit-01-login.png' });
  console.log('01 login');

  // Dashboard — inject before navigate so zustand init() picks it up
  await page.goto('http://localhost:3000/login');
  await injectAuth();
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/fit-02-dashboard.png' });
  console.log('02 dashboard');

  // Issue List
  await page.goto('http://localhost:3000/issues', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/fit-03-issues.png' });
  console.log('03 issues');

  // New Issue Form
  await page.goto('http://localhost:3000/issues/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/fit-04-form.png' });
  console.log('04 form');

  await browser.close();
  console.log('done');
})();
