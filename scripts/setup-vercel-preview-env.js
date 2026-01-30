#!/usr/bin/env node
/**
 * Set Vercel Preview environment variables via API (for phase-3 / branch deployments).
 * Ensures NEXTAUTH_SECRET and optionally NEXTAUTH_URL exist for Preview so sign-in works.
 *
 * Prerequisites (one-time):
 * 1. Create a Vercel token: https://vercel.com/account/tokens → Create
 * 2. Set VERCEL_TOKEN in your environment or in .env.local (do not commit .env.local with the token)
 *
 * Usage:
 *   VERCEL_TOKEN=xxx node scripts/setup-vercel-preview-env.js
 *   # or: add VERCEL_TOKEN to .env.local and run:
 *   npm run vercel:setup-preview-env
 *
 * Optional env:
 *   VERCEL_PROJECT_NAME  - project name (default: booking-app)
 *   VERCEL_TEAM_ID      - team ID if project is under a team
 *   PREVIEW_BASE_URL    - e.g. https://booking-app-git-phase-3-xxx.vercel.app (optional; if unset, app uses VERCEL_URL at runtime)
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Load .env.local and .env so VERCEL_TOKEN can be set there (do not commit .env.local)
function loadEnvFiles() {
  const root = path.resolve(__dirname, "..");
  for (const file of [".env.local", ".env"]) {
    const p = path.join(root, file);
    try {
      const content = fs.readFileSync(p, "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m && process.env[m[1]] === undefined) {
          const val = m[2].replace(/^["']|["']$/g, "").trim();
          process.env[m[1]] = val;
        }
      }
    } catch {
      // file missing or unreadable
    }
  }
}
loadEnvFiles();

const VERCEL_API = "https://api.vercel.com";

function getEnv(name, defaultValue = undefined) {
  const val = process.env[name];
  if (val !== undefined && val !== "") return val;
  return defaultValue;
}

function hasPreviewTarget(envVar) {
  const t = envVar.target;
  if (Array.isArray(t)) return t.includes("preview");
  return t === "preview";
}

async function api(method, path, body = null, token, teamId) {
  const url = new URL(path, VERCEL_API);
  if (teamId) url.searchParams.set("teamId", teamId);
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body && (method === "POST" || method === "PATCH")) opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.message || `HTTP ${res.status}: ${text}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

async function main() {
  const token = getEnv("VERCEL_TOKEN");
  const projectName = getEnv("VERCEL_PROJECT_NAME", "booking-app");
  const teamId = getEnv("VERCEL_TEAM_ID");
  const previewBaseUrl = getEnv("PREVIEW_BASE_URL");

  if (!token) {
    console.error("Missing VERCEL_TOKEN.");
    console.error("Create one at: https://vercel.com/account/tokens");
    console.error("Then run: VERCEL_TOKEN=your_token node scripts/setup-vercel-preview-env.js");
    process.exit(1);
  }

  console.log("Vercel Preview env setup");
  console.log("Project:", projectName);
  if (teamId) console.log("Team ID:", teamId);
  console.log("");

  const projectPath = `/v9/projects/${encodeURIComponent(projectName)}`;
  const envPath = `${projectPath}/env`;

  let list;
  try {
    list = await api("GET", envPath, null, token, teamId);
  } catch (e) {
    if (e.status === 404) {
      console.error("Project not found. Check VERCEL_PROJECT_NAME and VERCEL_TEAM_ID.");
    } else {
      console.error("Failed to list env vars:", e.message);
    }
    process.exit(1);
  }

  const envVars = Array.isArray(list) ? list : list.envs || list;
  const hasNextAuthSecretPreview = envVars.some(
    (e) => e.key === "NEXTAUTH_SECRET" && hasPreviewTarget(e)
  );
  const hasNextAuthUrlPreview =
    !previewBaseUrl ||
    envVars.some((e) => e.key === "NEXTAUTH_URL" && hasPreviewTarget(e));

  if (hasNextAuthSecretPreview && hasNextAuthUrlPreview) {
    console.log("Preview env already has NEXTAUTH_SECRET (and NEXTAUTH_URL if needed). Nothing to do.");
    process.exit(0);
  }

  if (!hasNextAuthSecretPreview) {
    const secret = crypto.randomBytes(32).toString("base64");
    const createPath = `${envPath}?upsert=true`;
    try {
      await api(
        "POST",
        createPath,
        {
          key: "NEXTAUTH_SECRET",
          value: secret,
          type: "encrypted",
          target: ["preview"],
        },
        token,
        teamId
      );
      console.log("Added NEXTAUTH_SECRET for Preview.");
    } catch (e) {
      console.error("Failed to add NEXTAUTH_SECRET:", e.message);
      process.exit(1);
    }
  }

  if (previewBaseUrl && !hasNextAuthUrlPreview) {
    const createPath = `${envPath}?upsert=true`;
    try {
      await api(
        "POST",
        createPath,
        {
          key: "NEXTAUTH_URL",
          value: previewBaseUrl.replace(/\/$/, ""),
          type: "plain",
          target: ["preview"],
        },
        token,
        teamId
      );
      console.log("Added NEXTAUTH_URL for Preview:", previewBaseUrl);
    } catch (e) {
      console.error("Failed to add NEXTAUTH_URL:", e.message);
      process.exit(1);
    }
  }

  console.log("");
  console.log("Done. Redeploy the phase-3 (or any preview) deployment for changes to apply.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
