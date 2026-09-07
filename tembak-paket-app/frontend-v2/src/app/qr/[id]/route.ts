import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.GOPAY_GATEWAY_URL || "http://127.0.0.1:3002";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const targetUrl = `${GATEWAY_URL}/qr/${id}`;

    const res = await fetch(targetUrl);
    const html = await res.text();

    return new NextResponse(html, {
      status: res.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    return new NextResponse("<h3>Error loading QRIS page: " + err.message + "</h3>", {
      status: 502,
      headers: { "Content-Type": "text/html" },
    });
  }
}
