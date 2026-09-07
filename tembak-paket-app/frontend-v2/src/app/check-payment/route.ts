import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.GOPAY_GATEWAY_URL || "http://127.0.0.1:3002";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
    },
  });
}

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

async function handleProxy(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const targetUrl = `${GATEWAY_URL}/check-payment${url.search}`;

    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower !== "host" && lower !== "connection") {
        headers[key] = val;
      }
    });

    let body: any = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        body = await req.text();
      } catch (e) {}
    }

    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Gateway proxy error: " + error.message },
      { status: 502 }
    );
  }
}
