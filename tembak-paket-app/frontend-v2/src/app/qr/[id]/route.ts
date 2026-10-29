import { NextRequest, NextResponse } from "next/server";

const GOPAY_GATEWAY_URL = process.env.GOPAY_GATEWAY_URL || "http://127.0.0.1:3002";
const SHOPPEPAY_GATEWAY_URL = process.env.SHOPPEPAY_GATEWAY_URL || process.env.SHOPPEPAY_URL || "http://127.0.0.1:3003";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Try primary GoPay first
    try {
      const resGp = await fetch(`${GOPAY_GATEWAY_URL}/qr/${id}`, { cache: "no-store" });
      if (resGp.ok) {
        const html = await resGp.text();
        return new NextResponse(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    } catch (e) {}

    // Fallback to ShopeePay
    const resSp = await fetch(`${SHOPPEPAY_GATEWAY_URL}/qr/${id}`, { cache: "no-store" });
    const html = await resSp.text();

    return new NextResponse(html, {
      status: resSp.status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: any) {
    return new NextResponse("<h3>Error loading QRIS page: " + err.message + "</h3>", {
      status: 502,
      headers: { "Content-Type": "text/html" },
    });
  }
}
