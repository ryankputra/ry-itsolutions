import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "Ry-ITSolutions.apk");

  if (!fs.existsSync(filePath)) {
    return new NextResponse("APK File not found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": 'attachment; filename="Ry-ITSolutions.apk"',
      "Content-Length": String(fileBuffer.length),
      "Cache-Control": "public, max-age=3600"
    }
  });
}
