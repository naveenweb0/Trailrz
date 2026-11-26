const { spawn } = require('child_process');

async function auditBrowser() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--user-data-dir=/tmp/chrome-cdp-audit',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const list = await (await fetch('http://localhost:9225/json')).json();
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

    const consoleLogs = [];
    const consoleErrors = [];
    const exceptions = [];
    const failedRequests = [];
    const httpErrors = [];

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        const text = data.params.args.map(a => a.value || a.description).join(' ');
        consoleLogs.push({ type: data.params.type, text });
        if (data.params.type === 'error') {
          consoleErrors.push(text);
        }
      }
      if (data.method === 'Runtime.exceptionThrown') {
        exceptions.push(data.params.exceptionDetails);
      }
      if (data.method === 'Network.loadingFailed') {
        failedRequests.push(data.params);
      }
      if (data.method === 'Network.responseReceived') {
        if (data.params.response.status >= 400) {
          httpErrors.push({ url: data.params.response.url, status: data.params.response.status });
        }
      }
    };

    await send('Runtime.enable');
    await send('Console.enable');
    await send('Network.enable');
    await send('Page.enable');

    console.log('Navigating to http://localhost:3000 ...');
    await send('Page.navigate', { url: 'http://localhost:3000' });

    // Wait 4s for animations, data fetch, and hydration
    await new Promise(r => setTimeout(r, 4000));

    // Audit animation objects in browser runtime
    const animCheck = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        hasLenis: Boolean(window.__lenis),
        hasCanvas: Boolean(document.querySelector('canvas')),
        canvasCount: document.querySelectorAll('canvas').length,
        hasCursor: document.documentElement.classList.contains('has-cursor') || Boolean(document.querySelector('[data-cursor]')),
        title: document.title,
        heading: document.querySelector('h1, h2')?.innerText,
        cardsRendered: document.querySelectorAll('article').length
      })`,
      returnByValue: true
    });

    console.log('\n=== ANIMATION & DOM INTEGRITY AUDIT ===');
    console.log(animCheck.result.value);

    console.log('\n=== CONSOLE LOGS ===');
    consoleLogs.forEach(l => console.log('[' + l.type.toUpperCase() + '] ' + l.text));

    console.log('\n=== RUNTIME EXCEPTIONS === (' + exceptions.length + ')');
    exceptions.forEach(e => console.log('EXCEPTION:', e.text, e.exception?.description));

    console.log('\n=== FAILED NETWORK REQUESTS === (' + failedRequests.length + ')');
    failedRequests.forEach(f => console.log('FAILED:', f.errorText, f.type));

    console.log('\n=== HTTP 4XX/5XX ERRORS === (' + httpErrors.length + ')');
    httpErrors.forEach(h => console.log('HTTP ERROR:', h.status, h.url));

    ws.close();
  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    chrome.kill();
  }
}

auditBrowser();
