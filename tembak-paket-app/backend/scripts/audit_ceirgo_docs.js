const fs = require('fs');
const path = require('path');

const DOC_URLS = [
    // 1. Overview & Auth
    "https://ceirgo.id/docs",
    "https://ceirgo.id/docs/authentication",
    "https://ceirgo.id/docs/authentication/api-keys",
    "https://ceirgo.id/docs/authentication/permissions",
    "https://ceirgo.id/docs/authentication/verify-access",

    // 2. Deposits & Wallet
    "https://ceirgo.id/docs/deposits",
    "https://ceirgo.id/docs/deposits/providers",
    "https://ceirgo.id/docs/deposits/provider-detail",
    "https://ceirgo.id/docs/deposits/create-deposit",
    "https://ceirgo.id/docs/deposits/list-deposits",
    "https://ceirgo.id/docs/deposits/deposit-detail",

    // 3. Orders & Services (IMEI / CEIR)
    "https://ceirgo.id/docs/orders",
    "https://ceirgo.id/docs/orders/services",
    "https://ceirgo.id/docs/orders/service-detail",
    "https://ceirgo.id/docs/orders/create-order",
    "https://ceirgo.id/docs/orders/list-orders",
    "https://ceirgo.id/docs/orders/order-detail",
    "https://ceirgo.id/docs/orders/order-status",

    // 4. Transactions & Wallet Balance
    "https://ceirgo.id/docs/transactions",
    "https://ceirgo.id/docs/transactions/wallet-balance",
    "https://ceirgo.id/docs/transactions/list-transactions",
    "https://ceirgo.id/docs/transactions/transaction-detail",
    "https://ceirgo.id/docs/transactions/list-mutations",
    "https://ceirgo.id/docs/transactions/mutation-detail",

    // 5. Transfers, Webhooks & References
    "https://ceirgo.id/docs/transfers/create-transfer",
    "https://ceirgo.id/docs/transfers/transfer-detail",
    "https://ceirgo.id/docs/webhooks/order-webhooks",
    "https://ceirgo.id/docs/references/request-format",
    "https://ceirgo.id/docs/references/errors",
    "https://ceirgo.id/docs/references/rate-limits",
    "https://ceirgo.id/docs/compatibility/dhru"
];

function cleanHtml(html) {
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const content = mainMatch ? mainMatch[1] : html;
    return content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

async function crawl() {
    console.log(`Starting crawl of ${DOC_URLS.length} official CeirGO docs...`);
    const results = [];

    for (const url of DOC_URLS) {
        try {
            console.log(`Fetching: ${url}`);
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; CeirGOAuditor/1.0)'
                }
            });
            const html = await res.text();
            const text = cleanHtml(html);

            // Extract method & endpoint
            // Usually shown as "GET /api/..." or "POST /api/..."
            const methodEndpointMatch = text.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[a-zA-Z0-9_\-\/{}\?\=\.]+)/i);
            const method = methodEndpointMatch ? methodEndpointMatch[1].toUpperCase() : null;
            const endpoint = methodEndpointMatch ? methodEndpointMatch[2] : null;

            // Extract title
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].replace('| CeirGO API Docs', '').trim() : '';

            // Extract permission
            const permMatch = text.match(/\b([a-z]+\.[a-z_]+(?:\.[a-z_]+)?)\b/);

            results.push({
                url,
                title,
                method,
                endpoint,
                snippet: text.slice(0, 1000),
                fullText: text
            });
        } catch (e) {
            console.error(`Error crawling ${url}:`, e.message);
            results.push({
                url,
                error: e.message
            });
        }
    }

    const outPath = path.join(__dirname, 'crawled_raw_docs.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`Saved crawled docs to ${outPath}`);
}

crawl();
