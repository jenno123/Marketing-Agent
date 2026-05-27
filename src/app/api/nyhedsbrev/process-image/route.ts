import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const RATIOS: Record<string, [number, number] | null> = {
  "5:4": [5, 4],
  "16:9": [16, 9],
  "1:1": [1, 1],
  "4:3": [4, 3],
  "3:2": [3, 2],
  "original": null,
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const ratio = (formData.get("ratio") as string) ?? "original";
    const maxKb = parseInt(formData.get("maxKb") as string) || 0;

    if (!file) return NextResponse.json({ error: "Mangler billede" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    const origW = meta.width ?? 0;
    const origH = meta.height ?? 0;

    // Step 1: crop to aspect ratio
    let cropW = origW;
    let cropH = origH;
    let left = 0;
    let top = 0;

    const tuple = RATIOS[ratio];
    if (tuple) {
      const [rw, rh] = tuple;
      const target = rw / rh;
      const current = origW / origH;
      if (current > target) {
        cropW = Math.round(origH * target);
        left = Math.round((origW - cropW) / 2);
      } else if (current < target) {
        cropH = Math.round(origW / target);
        top = Math.round((origH - cropH) / 2);
      }
    }

    let pipeline = sharp(buffer);
    if (tuple) pipeline = pipeline.extract({ left, top, width: cropW, height: cropH });
    const croppedBuf = await pipeline.toBuffer();

    // Step 2: compress
    let result = await sharp(croppedBuf).jpeg({ quality: 90 }).toBuffer();
    if (maxKb > 0 && result.byteLength > maxKb * 1024) {
      for (const q of [80, 70, 60, 50, 40, 30, 20]) {
        const attempt = await sharp(croppedBuf).jpeg({ quality: q }).toBuffer();
        result = attempt;
        if (attempt.byteLength <= maxKb * 1024) break;
      }
    }

    return new Response(result as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/jpeg",
        "X-Orig-Size": String(Math.round(file.size / 1024)),
        "X-New-Size": String(Math.round(result.byteLength / 1024)),
        "X-Orig-Dims": `${origW}x${origH}`,
        "X-New-Dims": `${cropW}x${cropH}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
