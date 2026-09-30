const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");
const { spawn } = require("child_process");

function findBrowser() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe") : null,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        const listeners = this.eventListeners.get(msg.method) || [];
        listeners.forEach(fn => fn(msg.params));
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.pending.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || "Evaluation error");
    }
    return res.result ? res.result.value : undefined;
  }

  async waitFor(expression, timeoutMs = 12000, intervalMs = 250) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const val = await this.evaluate(expression);
        if (val) return val;
      } catch (_) {}
      await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error(`Timeout waiting for expression: ${expression}`);
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
  }
}

async function runBrowserTests() {
  console.log("==========================================");
  console.log("   DRIVESPHERE BROWSER AUTOMATION TESTS   ");
  console.log("==========================================");

  let serverProcess = null;
  let serverReady = false;
  try {
    const checkRes = await fetch("http://127.0.0.1:3000/api/health");
    if (checkRes.ok) serverReady = true;
  } catch (_) {}

  if (!serverReady) {
    console.log("[Browser] Port 3000 not active. Spawning background server...");
    serverProcess = spawn("node", ["server.js"], { cwd: __dirname, stdio: "ignore" });
    for (let i = 0; i < 30; i++) {
      try {
        const check = await fetch("http://127.0.0.1:3000/api/health");
        if (check.ok) {
          serverReady = true;
          break;
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 200));
    }
    if (!serverReady) {
      console.error("[FATAL] Could not start DriveSphere server on port 3000.");
      process.exit(1);
    }
  }
  console.log("[Browser] Verified DriveSphere server active on http://127.0.0.1:3000");

  const browserPath = findBrowser();
  if (!browserPath) {
    console.warn("[SKIP] No compatible browser found in environment.");
    if (serverProcess) { try { serverProcess.kill(); } catch (_) {} }
    process.exit(0);
  }
  console.log(`[Browser] Found executable: ${browserPath}`);

  const cdpPort = await getFreePort();
  const userDir = path.join(os.tmpdir(), "ds_cdp_profile_" + Date.now());
  fs.mkdirSync(userDir, { recursive: true });

  const chromeArgs = [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDir}`,
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
  ];

  console.log(`[Browser] Launching headless browser on port ${cdpPort}...`);
  const browserProc = spawn(browserPath, chromeArgs, { stdio: "ignore" });

  let isExiting = false;
  const cleanup = () => {
    if (isExiting) return;
    isExiting = true;
    try { browserProc.kill(); } catch (_) {}
    if (serverProcess) { try { serverProcess.kill(); } catch (_) {} }
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (_) {}
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(1); });
  process.on("SIGTERM", () => { cleanup(); process.exit(1); });

  // Wait for CDP readiness
  let versionData = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!versionData) {
    console.error("[FATAL] Could not connect to Chrome DevTools Protocol.");
    cleanup();
    process.exit(1);
  }
  console.log(`[Browser] Connected successfully to: ${versionData.Browser}\n`);

  let passedTests = 0;
  let totalTests = 0;

  async function runTestCase(name, url, testFn) {
    totalTests++;
    console.log(`Running: ${name} [${url}]`);
    let client = null;
    try {
      const listRes = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const targets = await listRes.json();
      let pageTarget = targets.find(t => t.type === "page") || targets[0];

      client = new CDPClient(pageTarget.webSocketDebuggerUrl);
      await client.connect();

      await client.send("Page.enable");
      await client.send("Runtime.enable");

      const consoleErrors = [];
      client.on("Runtime.consoleAPICalled", (params) => {
        if (params.type === "error") {
          const text = (params.args || []).map(a => a.value || JSON.stringify(a)).join(" ");
          if (!text.includes("400") && !text.includes("WeatherAPI")) {
            consoleErrors.push(text);
          }
        }
      });

      await client.send("Page.navigate", { url });
      await new Promise(r => setTimeout(r, 1500));

      await testFn(client, consoleErrors);

      if (consoleErrors.length > 0) {
        console.warn(`  [WARN] Page emitted ${consoleErrors.length} console error(s):`);
        consoleErrors.slice(0, 3).forEach(err => console.warn(`    - ${err}`));
      }

      console.log(`  Passed: ${name}\n`);
      passedTests++;
    } catch (err) {
      console.error(`  FAILED: ${name}`);
      console.error(`  Error: ${err.message}\n`);
    } finally {
      if (client) client.close();
    }
  }

  // TEST 1: Landing Page / Login Authentication Form
  await runTestCase("Landing Page Auth Verification", "http://127.0.0.1:3000/login/", async (client) => {
    await client.waitFor("!!document.getElementById('email') || !!document.querySelector('input[type=\"email\"]')", 10000);
    const title = await client.evaluate("document.title");
    if (!title || !title.toLowerCase().includes("drivesphere")) {
      throw new Error(`Unexpected page title: "${title}"`);
    }
    const hasEmail = await client.evaluate("!!document.getElementById('email')");
    const hasPassword = await client.evaluate("!!document.getElementById('password')");
    if (!hasEmail || !hasPassword) {
      throw new Error("Missing #email or #password input elements in authentication view");
    }
  });

  // TEST 2: Dashboard UI & MapLibre Canvas Structure
  const authQuery = "?token=mock_jwt_tester&operator=" + encodeURIComponent(JSON.stringify({ name: "Demo Pilot", email: "pilot@drivesphere.io" }));
  await runTestCase("Dashboard UI & Map Container", `http://127.0.0.1:3000/${authQuery}`, async (client) => {
    await client.waitFor("!!document.getElementById('mapWrapper')", 10000);
    const hasMap3d = await client.evaluate("!!document.getElementById('map3d')");
    if (!hasMap3d) throw new Error("Missing #map3d canvas container");

    await client.waitFor("typeof maplibregl !== 'undefined'", 8000);
    await client.waitFor("typeof map !== 'undefined' && map !== null", 8000);

    const hasInputs = await client.evaluate("!!document.getElementById('fromInput') && !!document.getElementById('toInput') && !!document.getElementById('startTripBtn')");
    if (!hasInputs) throw new Error("Missing route input elements on dashboard");
  });

  // TEST 3: Interactive Navigation & Route Drawing
  await runTestCase("Interactive Trip Navigation Flow", `http://127.0.0.1:3000/${authQuery}`, async (client) => {
    await client.waitFor("!!document.getElementById('fromInput')", 8000);

    await client.evaluate(`
      window.alert = (m) => console.warn("[PAGE_ALERT]", m);
      const f = document.getElementById("fromInput");
      const t = document.getElementById("toInput");
      if (f) f.value = "Bengaluru";
      if (t) t.value = "Chennai";
      if (typeof submitPlan === "function") {
        submitPlan(new Event("submit"));
      } else {
        document.getElementById("startTripBtn")?.click();
      }
    `);

    await client.waitFor("typeof currentRouteCoords !== 'undefined' && Array.isArray(currentRouteCoords) && currentRouteCoords.length > 0", 15000);

    const navResult = await client.evaluate(`({
      coordCount: currentRouteCoords.length,
      currentPlace: tripState && tripState.vehicle ? tripState.vehicle.currentPlace : null,
      hudPlace: document.getElementById("currentPlace") ? document.getElementById("currentPlace").textContent : null,
      mapOpacity: document.getElementById("map3d") ? getComputedStyle(document.getElementById("map3d")).opacity : "0"
    })`);

    console.log(`    Route Coordinates Generated: ${navResult.coordCount}`);
    console.log(`    Vehicle Location: "${navResult.currentPlace}"`);
    console.log(`    HUD Location: "${navResult.hudPlace}"`);
    console.log(`    Map Canvas Opacity: ${navResult.mapOpacity}`);

    if (navResult.currentPlace === "Routing failed") {
      throw new Error("Navigation failed: vehicle.currentPlace reports 'Routing failed'");
    }

    if (navResult.coordCount < 100) {
      throw new Error(`Insufficient route coordinates: ${navResult.coordCount}`);
    }
  });

  // TEST 4: AI Trip Planner Modal
  await runTestCase("AI Trip Planner Modal Component", `http://127.0.0.1:3000/${authQuery}`, async (client) => {
    await client.waitFor("!!document.getElementById('planTripBtn')", 8000);

    await client.evaluate(`
      const btn = document.getElementById("planTripBtn");
      if (btn) btn.click();
    `);

    await client.waitFor("document.getElementById('tripModalOverlay') && document.getElementById('tripModalOverlay').classList.contains('is-open')", 6000);

    const hasInputs = await client.evaluate("!!document.getElementById('tripFromInput') && !!document.getElementById('tripToInput') && !!document.getElementById('tripDays')");
    if (!hasInputs) throw new Error("AI Trip Planner modal missing input elements");

    await client.evaluate(`
      const closeBtn = document.getElementById("tripModalClose");
      if (closeBtn) closeBtn.click();
    `);

    await client.waitFor("!document.getElementById('tripModalOverlay').classList.contains('is-open')", 4000);
  });

  console.log("==========================================");
  console.log(` BROWSER TEST REPORT: ${passedTests}/${totalTests} Passed`);
  console.log("==========================================");

  cleanup();

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runBrowserTests().catch(err => {
  console.error("Unhandled browser test error:", err);
  process.exit(1);
});
