const FILES = [
  "header.html",
  "screens_auth.html",
  "screens_login_register.html",
  "screens_dashboard.html",
  "screens_settings.html",
  "screens_transfer.html",
  "screens_modals.html",
  "screens_success_details_receipt.html",
  "screens_history.html",
  "app.js",
  "app_part3.js"
];

let compiledHtmlCache = "";

async function compileTemplates() {
  console.log("Compiling templates from GitHub raw...");
  try {
    const parts: Record<string, string> = {};
    for (const file of FILES) {
      const url = `https://raw.githubusercontent.com/ISRAEL2468/osampay-israel-public/main/${file}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${file}: ${res.statusText}`);
      parts[file] = await res.text();
    }

    compiledHtmlCache = `
      ${parts["header.html"]}
      ${parts["screens_auth.html"]}
      ${parts["screens_login_register.html"]}
      ${parts["screens_dashboard.html"]}
      ${parts["screens_settings.html"]}
      ${parts["screens_transfer.html"]}
      ${parts["screens_modals.html"]}
      ${parts["screens_success_details_receipt.html"]}
      ${parts["screens_history.html"]}
      <script>
        ${parts["app.js"]}
        ${parts["app_part3.js"]}
      </script>
      </body>
      </html>
    `;
    console.log("Templates compiled successfully!");
  } catch (err) {
    console.error("Template compilation failed:", err);
  }
}

// Initial compile at startup
await compileTemplates();

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Reload cache if requested (hot-reloads changes without restarting server!)
  if (path === "/api/reload-templates") {
    await compileTemplates();
    return new Response(JSON.stringify({ success: true, message: "Templates reloaded from GitHub!" }), {
      headers: { "content-type": "application/json", ...corsHeaders }
    });
  }

  // Serve index.html dynamically from cache
  if (path === "/" || path === "/index.html") {
    if (!compiledHtmlCache) {
      await compileTemplates();
    }
    if (!compiledHtmlCache) {
      return new Response("Template compilation failed. Please try again.", { status: 500, headers: corsHeaders });
    }
    return new Response(compiledHtmlCache, {
      headers: { "content-type": "text/html; charset=utf-8", ...corsHeaders },
    });
  }

  // API Account Resolution Endpoint
  if (path === "/api/resolve-account") {
    const accNo = url.searchParams.get("account_number") || "";
    const bankCode = url.searchParams.get("bank_code") || "";
    const cleanAcc = accNo.trim();
    const cleanBank = bankCode.trim().toLowerCase();

    console.log(`Resolve request: Bank=${cleanBank}, Acc=${cleanAcc}`);

    // 1. Check OPay Phone Registration Resolution
    if ((cleanBank === "opay" || cleanBank === "999992" || cleanBank === "305") && cleanAcc === "7047945145") {
      return new Response(JSON.stringify({ success: true, name: "ISRAEL OSAMWONYI", bank: "OPay" }), {
        headers: { "content-type": "application/json", ...corsHeaders }
      });
    }

    // 2. Check Bank Recipient Resolution
    if ((cleanBank === "uba" || cleanBank === "033") && cleanAcc === "2207814950") {
      return new Response(JSON.stringify({ success: true, name: "JENNIFER ISOKEN IDAHOSA", bank: "UBA" }), {
        headers: { "content-type": "application/json", ...corsHeaders }
      });
    }

    if ((cleanBank === "moniepoint" || cleanBank === "monie point" || cleanBank === "50515") && cleanAcc === "9162114195") {
      return new Response(JSON.stringify({ success: true, name: "ISRAEL OSAMWONYI", bank: "Moniepoint" }), {
        headers: { "content-type": "application/json", ...corsHeaders }
      });
    }

    // 3. Fallback to NUBAN API if Key is present
    const nubanApiKey = Deno.env.get("NUBAN_API_KEY");
    if (nubanApiKey) {
      try {
        const fetchUrl = `https://api.nuban.com.ng/api/v1/query?acc_no=${cleanAcc}&bank_code=${cleanBank}`;
        const nubanRes = await fetch(fetchUrl, {
          headers: {
            "Authorization": `Bearer ${nubanApiKey}`,
            "Accept": "application/json"
          }
        });
        if (nubanRes.ok) {
          const data = await nubanRes.json();
          if (data && data.account_name) {
            return new Response(JSON.stringify({ success: true, name: data.account_name, bank: cleanBank }), {
              headers: { "content-type": "application/json", ...corsHeaders }
            });
          }
        }
      } catch (err) {
        console.error("NUBAN API Error:", err);
      }
    }

    return new Response(JSON.stringify({ success: false, error: "api key not yet configured" }), {
      headers: { "content-type": "application/json", ...corsHeaders }
    });
  }

  return new Response("Not Found", { status: 404, headers: corsHeaders });
});