const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/Users/naveenmaan/Desktop/trailrz-nextjs/screenshots/comparison';
fs.mkdirSync(OUT_DIR, { recursive: true });

const pages = [
  { name: 'home', path: '/' },
  { name: 'discover', path: '/discover' },
  { name: 'originals', path: '/originals' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'my_tickets', path: '/my-tickets' }
];

const viewports = [
  { w: 1440, h: 900, label: '1440x900' },
  { w: 1280, h: 800, label: '1280x800' },
  { w: 768, h: 1024, label: '768x1024' },
  { w: 390, h: 844, label: '390x844' }
];

async function captureOne(url, outPath, w, h) {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--user-data-dir=/tmp/chrome-vp-comp-' + w + 'x' + h,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const list = await (await fetch('http://localhost:9226/json')).json();
    const target = list.find(t => t.type === 'page') || list[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (msg) => {
          const data = JSON.parse(msg.data);
          if (data.id === msgId) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: w < 768
    });
    await send('Page.enable');
    await send('Page.navigate', { url });

    // Wait 3.5 seconds for preloader (1.8s + 0.9s curtain slide) to finish completely
    await new Promise(r => setTimeout(r, 3500));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    ws.close();
  } catch (err) {
    console.error('Failed to capture ' + url + ':', err.message);
  } finally {
    chrome.kill();
    await new Promise(r => setTimeout(r, 500));
  }
}

async function run() {
  console.log('Starting side-by-side screenshot capture with full preloader completion...');
  for (const vp of viewports) {
    console.log(`\n--- Viewport ${vp.label} ---`);
    for (const p of pages) {
      const origUrl = `http://localhost:3005${p.path}`;
      const migUrl = `http://localhost:3000${p.path}`;

      const origOut = path.join(OUT_DIR, `orig_${p.name}_${vp.label}.png`);
      const migOut = path.join(OUT_DIR, `mig_${p.name}_${vp.label}.png`);

      process.stdout.write(`Capturing ${p.name} [orig]... `);
      await captureOne(origUrl, origOut, vp.w, vp.h);
      process.stdout.write(`[mig]... `);
      await captureOne(migUrl, migOut, vp.w, vp.h);
      console.log('done.');
    }
  }
  console.log('\nAll comparison screenshots captured successfully in:', OUT_DIR);
}

run();
