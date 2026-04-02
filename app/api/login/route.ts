import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .select("id, username, password, nombre, apellido, role")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || !data.password) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, data.password);

    if (!ok) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    await createSession({
      id: data.id,
      username: data.username,
      nombre: data.nombre,
      apellido: data.apellido,
      role: data.role,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: data.id,
        username: data.username,
        nombre: data.nombre,
        apellido: data.apellido,
        role: data.role,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}