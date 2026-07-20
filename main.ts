const BANKS_MAP: Record<string, string> = {
  "033": "UBA",
  "50515": "MONIEPOINT",
  "999992": "OPAY"
};

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

  // Compile and Serve index.html dynamically from template partials
  if (path === "/" || path === "/index.html") {
    try {
      const header = await Deno.readTextFile("./header.html");
      const screensAuth = await Deno.readTextFile("./screens_auth.html");
      const screensLoginReg = await Deno.readTextFile("./screens_login_register.html");
      const screensDashboard = await Deno.readTextFile("./screens_dashboard.html");
      const screensSettings = await Deno.readTextFile("./screens_settings.html");
      const screensTransfer = await Deno.readTextFile("./screens_transfer.html");
      const screensModals = await Deno.readTextFile("./screens_modals.html");
      const screensSuccessDetailsReceipt = await Deno.readTextFile("./screens_success_details_receipt.html");
      const screensHistory = await Deno.readTextFile("./screens_history.html");
      const appJs = await Deno.readTextFile("./app.js");
      const appPart3 = await Deno.readTextFile("./app_part3.js");

      const compiledHtml = `
        ${header}
        ${screensAuth}
        ${screensLoginReg}
        ${screensDashboard}
        ${screensSettings}
        ${screensTransfer}
        ${screensModals}
        ${screensSuccessDetailsReceipt}
        ${screensHistory}
        <script>
          ${appJs}
          ${appPart3}
        </script>
        </body>
        </html>
      `;

      return new Response(compiledHtml, {
        headers: { "content-type": "text/html; charset=utf-8", ...corsHeaders },
      });
    } catch (e) {
      return new Response("Template compilation failed: " + e.message, { status: 500, headers: corsHeaders });
    }
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