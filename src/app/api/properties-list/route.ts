import { NextResponse } from "next/server";
import { PROPERTIES } from "@/lib/data";

/** Lightweight endpoint returning property id/name/city/image for admin pickers */
export async function GET() {
  const list = PROPERTIES.map(p => ({
    id: p.id,
    name: p.name,
    city: p.city,
    image: p.image,
  }));
  return NextResponse.json(list);
}
