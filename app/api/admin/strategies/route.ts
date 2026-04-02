import { NextRequest, NextResponse } from "next/server";

// adaptá esto a tu forma real de obtener sesión
async function getSessionUser() {
  // ejemplo
  // return await getUserFromSessionCookie();
  return null;
}

const DEFAULT_STRATEGIES = [
  { key: "agresiva", label: "Agresiva", index_multiplier: 50 },
  { key: "moderada", label: "Moderada", index_multiplier: 20 },
  { key: "suave", label: "Suave", index_multiplier: 10 },
];

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // leer de base si tenés tabla; si no, devolver defaults
  return NextResponse.json({ data: DEFAULT_STRATEGIES });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();

  // guardar en base
  // validar body.key, body.label, body.index_multiplier

  return NextResponse.json({ ok: true });
}