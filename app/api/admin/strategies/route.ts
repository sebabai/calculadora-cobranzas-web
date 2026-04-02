import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";

type SessionUser = {
  id: string;
  username: string;
  nombre: string;
  apellido: string;
  dni?: string | null;
  role: "admin" | "user";
};

type Strategy = {
  key: "agresiva" | "moderada" | "suave";
  label: string;
  index_multiplier: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const user = (await getSessionUser()) as SessionUser | null;

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("strategies")
    .select("key,label,index_multiplier")
    .order("key");

  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar las estrategias" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest) {
  const user = (await getSessionUser()) as SessionUser | null;

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = (await req.json()) as Strategy;

  const { error } = await supabase
    .from("strategies")
    .upsert({
      key: body.key,
      label: body.label,
      index_multiplier: body.index_multiplier,
    });

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar la estrategia" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}