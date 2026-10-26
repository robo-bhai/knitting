/**
 * Cloudflare Worker for Auto-Triggering GitHub Actions Workflow
 * 
 * Target Workflow: .github/workflows/cloudflare_tunnel.yml
 * Trigger Schedule: Every 5 hours via Cloudflare Cron Trigger (e.g., 0 *\/5 * * *)
 * Also supports manual triggering via HTTP GET / POST request.
 */

export default {
  /**
   * 1. CRON TRIGGER HANDLER
   * Automatically executed by Cloudflare Cron Triggers
   */
  async scheduled(event, env, ctx) {
    console.log(`[Cron Trigger] Executing scheduled run at ${new Date().toISOString()}`);
    ctx.waitUntil(triggerWorkflow(env, "scheduled-cron"));
  },

  /**
   * 2. HTTP FETCH HANDLER
   * Allows manual triggers, testing, and webhook integration
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: / or /status -> Friendly UI & Status Dashboard
    if (url.pathname === "/" || url.pathname === "/status") {
      const isConfigured = Boolean(env.GITHUB_TOKEN && env.REPO_OWNER && env.REPO_NAME);
      return new Response(getDashboardHtml(env, isConfigured), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Route: /trigger or /run -> Trigger the workflow immediately
    if (url.pathname === "/trigger" || url.pathname === "/run") {
      try {
        const result = await triggerWorkflow(env, "manual-http");
        return new Response(JSON.stringify(result, null, 2), {
          status: result.success ? 200 : 500,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Route not found. Use / or /trigger" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  },
};

/**
 * Triggers the GitHub Actions Workflow via GitHub REST API (workflow_dispatch)
 */
async function triggerWorkflow(env, triggerSource = "cron") {
  const token = env.GITHUB_TOKEN?.trim();
  const owner = env.REPO_OWNER?.trim();
  const repo = env.REPO_NAME?.trim();
  const workflow = env.WORKFLOW_ID?.trim() || "cloudflare_tunnel.yml";
  const ref = env.BRANCH?.trim() || "main";
  const durationHours = env.DURATION_HOURS?.trim() || "5";

  if (!token || !owner || !repo) {
    const errorMsg = "Missing required environment variables: GITHUB_TOKEN, REPO_OWNER, or REPO_NAME";
    console.error(`[Error] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    };
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;

  console.log(`[Dispatching] Workflow: ${workflow} on ${owner}/${repo} (ref: ${ref}, source: ${triggerSource})`);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "User-Agent": "Cloudflare-Worker-Workflow-Trigger/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: ref,
      inputs: {
        duration_hours: durationHours,
      },
    }),
  });

  // GitHub returns HTTP 204 No Content on successful dispatch
  if (response.status === 204) {
    const successMsg = `Successfully triggered workflow '${workflow}' for ${owner}/${repo} on branch '${ref}'.`;
    console.log(`[Success] ${successMsg}`);
    return {
      success: true,
      message: successMsg,
      workflow,
      repo: `${owner}/${repo}`,
      branch: ref,
      source: triggerSource,
      timestamp: new Date().toISOString(),
    };
  }

  // Handle errors from GitHub API
  const responseBody = await response.text();
  let errorJson = null;
  try {
    errorJson = JSON.parse(responseBody);
  } catch (e) {
    // raw text
  }

  const failureMsg = `GitHub API responded with status ${response.status}: ${errorJson?.message || responseBody || "Unknown error"}`;
  console.error(`[Failure] ${failureMsg}`);

  return {
    success: false,
    status: response.status,
    error: failureMsg,
    details: errorJson || responseBody,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Returns a clean, user-friendly HTML dashboard when visiting the Worker URL
 */
function getDashboardHtml(env, isConfigured) {
  const owner = env.REPO_OWNER || "Not Set";
  const repo = env.REPO_NAME || "Not Set";
  const workflow = env.WORKFLOW_ID || "cloudflare_tunnel.yml";
  const branch = env.BRANCH || "main";
  const duration = env.DURATION_HOURS || "5";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cloudflare Cron Worker | GitHub Actions Trigger</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem 1rem; line-height: 1.6; }
    .card { max-width: 680px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.4); border: 1px solid #334155; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #38bdf8; display: flex; align-items: center; gap: 0.5rem; }
    p.sub { color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.5rem; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1.5rem; }
    .status-ready { background: #065f46; color: #34d399; }
    .status-warning { background: #7c2d12; color: #fb923c; }
    .grid { display: grid; grid-template-columns: 140px 1fr; gap: 0.75rem; background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid #334155; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .label { color: #64748b; font-weight: 500; }
    .val { color: #e2e8f0; font-family: ui-monospace, monospace; }
    .btn { display: inline-block; background: #0284c7; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; text-decoration: none; transition: background 0.2s; }
    .btn:hover { background: #0369a1; }
    .footer { margin-top: 1.5rem; font-size: 0.8rem; color: #64748b; border-top: 1px solid #334155; padding-top: 1rem; }
    code { background: #334155; padding: 2px 6px; border-radius: 4px; color: #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚡ GitHub Workflow Auto-Trigger</h1>
    <p class="sub">Cloudflare Worker cron orchestrator for GarmentFlow / Cloudflare Tunnel</p>

    <div class="status-badge ${isConfigured ? 'status-ready' : 'status-warning'}">
      ${isConfigured ? '● Configured & Active' : '▲ Missing Environment Variables'}
    </div>

    <div class="grid">
      <div class="label">Repository:</div>
      <div class="val">${owner}/${repo}</div>

      <div class="label">Workflow:</div>
      <div class="val">${workflow}</div>

      <div class="label">Branch:</div>
      <div class="val">${branch}</div>

      <div class="label">Duration:</div>
      <div class="val">${duration} Hours</div>

      <div class="label">Cron Schedule:</div>
      <div class="val"><code>0 */5 * * *</code> (Every 5 Hours)</div>

      <div class="label">GitHub Token:</div>
      <div class="val">${env.GITHUB_TOKEN ? '••••••••••••' + env.GITHUB_TOKEN.slice(-4) : 'Not configured'}</div>
    </div>

    <div style="display: flex; gap: 1rem; align-items: center;">
      <a href="/trigger" class="btn">🚀 Test Trigger Workflow Now</a>
    </div>

    <div class="footer">
      To change settings or token, edit Environment Variables in your Cloudflare Worker Settings.
    </div>
  </div>
</body>
</html>`;
}
