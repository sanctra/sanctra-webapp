#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = process.env.SANCTRA_MANIFEST_REVIEW_QA_OUT || path.join(root, "artifacts", "con-2307-manifest-review");
const port = Number(process.env.SANCTRA_MANIFEST_REVIEW_QA_PORT || 3317);
const baseUrl = `http://127.0.0.1:${port}`;
const serverEnv = {
  ...process.env,
  NODE_ENV: "development",
  SANCTRA_MANIFEST_REVIEW_QA_FIXTURE: "1",
  SANCTRA_PILOT_ACTOR_ID: "local-qa-admin",
  SANCTRA_PILOT_ROLE: "pilot_admin",
  PORT: String(port),
};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: options.env || process.env,
      stdio: options.stdio || "pipe",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
      options.onOutput?.(String(chunk));
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
      options.onOutput?.(String(chunk));
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(" ")} failed with ${code}\n${stdout}\n${stderr}`));
    });
  });
}

async function waitForServer(server) {
  const started = Date.now();
  while (Date.now() - started < 60000) {
    if (server.exitCode !== null) throw new Error(`dev server exited early with ${server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/admin/manifest-review`, {
        headers: {
          "x-sanctra-pilot-actor-id": "local-qa-admin",
          "x-sanctra-pilot-actor-role": "pilot_admin",
        },
      });
      if (response.status === 200) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`timed out waiting for ${baseUrl}`);
}

async function screenshot(name, url, viewport) {
  const destination = path.join(outDir, `${name}.png`);
  await run("npm", [
    "exec",
    "--yes",
    "playwright",
    "--",
    "screenshot",
    "--browser",
    "chromium",
    "--full-page",
    "--wait-for-selector",
    "text=Manifest review",
    "--viewport-size",
    viewport,
    url,
    destination,
  ]);
  return destination;
}

await fs.mkdir(outDir, { recursive: true });
const nextBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
const server = spawn(nextBin, ["dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: serverEnv,
  stdio: "pipe",
});

let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk; });
server.stderr.on("data", (chunk) => { serverLog += chunk; });

try {
  await waitForServer(server);
  const outputs = [];
  outputs.push(await screenshot("manifest-review-list-desktop", `${baseUrl}/admin/manifest-review`, "1440,1200"));
  outputs.push(await screenshot("manifest-review-decision-controls-desktop", `${baseUrl}/admin/manifest-review`, "1180,1400"));
  outputs.push(await screenshot("manifest-review-two-person-mobile", `${baseUrl}/admin/manifest-review`, "390,1100"));
  outputs.push(await screenshot("manifest-review-conflict-state", `${baseUrl}/admin/manifest-review?qa_state=conflict`, "1180,1200"));
  const receipt = {
    ok: true,
    generated_at: new Date().toISOString(),
    fixture_gate: "SANCTRA_MANIFEST_REVIEW_QA_FIXTURE=1 and NODE_ENV!=production",
    states: [
      "list/read view",
      "reviewer decision controls",
      "admin confirmation/two-person-control messaging",
      "deterministic conflict/error state",
    ],
    screenshots: outputs,
  };
  const receiptPath = path.join(outDir, "receipt.json");
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ...receipt, receipt: receiptPath }, null, 2));
} catch (error) {
  await fs.writeFile(path.join(outDir, "server.log"), serverLog);
  throw error;
} finally {
  server.kill("SIGTERM");
}
