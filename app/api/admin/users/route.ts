import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/password";

export async function GET() {
  try {
    await requireAdmin();

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .select("id, username, nombre, apellido, dni, role, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();

    const plainPassword = String(body.password || "").trim();

    const payload = {
      username: String(body.username || "").trim(),
      password: "",
      nombre: String(body.nombre || "").trim(),
      apellido: String(body.apellido || "").trim(),
      dni: String(body.dni || "").trim() || null,
      role: body.role === "admin" ? "admin" : "user",
    };

    if (!payload.username || !plainPassword || !payload.nombre || !payload.apellido) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const exists = await supabaseAdmin
      .from("app_users")
      .select("id")
      .eq("username", payload.username)
      .maybeSingle();

    if (exists.data) {
      return NextResponse.json({ error: "Ese usuario ya existe" }, { status: 400 });
    }

    payload.password = await hashPassword(plainPassword);

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .insert([payload])
      .select("id, username, nombre, apellido, dni, role, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAdmin();
    const body = await req.json();

    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      username: String(body.username || "").trim(),
      nombre: String(body.nombre || "").trim(),
      apellido: String(body.apellido || "").trim(),
      dni: String(body.dni || "").trim() || null,
      role: body.role === "admin" ? "admin" : "user",
    };

    if (!updateData.username || !updateData.nombre || !updateData.apellido) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const newPassword = String(body.password || "").trim();
    if (newPassword) {
      updateData.password = await hashPassword(newPassword);
    }

    const currentUserResult = await supabaseAdmin
      .from("app_users")
      .select("id, username, role")
      .eq("id", id)
      .maybeSingle();

    if (!currentUserResult.data) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const duplicate = await supabaseAdmin
      .from("app_users")
      .select("id")
      .eq("username", String(updateData.username))
      .neq("id", id)
      .maybeSingle();

    if (duplicate.data) {
      return NextResponse.json({ error: "Ya existe otro usuario con ese nombre" }, { status: 400 });
    }

    if (
      currentUserResult.data.role === "admin" &&
      updateData.role === "user" &&
      currentUserResult.data.id === session.id
    ) {
      const adminCountResult = await supabaseAdmin
        .from("app_users")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if ((adminCountResult.count || 0) <= 1) {
        return NextResponse.json(
          { error: "No podés bajar de rol al último administrador" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .update(updateData)
      .eq("id", id)
      .select("id, username, nombre, apellido, dni, role, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const targetResult = await supabaseAdmin
      .from("app_users")
      .select("id, role")
      .eq("id", id)
      .maybeSingle();

    if (!targetResult.data) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (targetResult.data.id === session.id) {
      return NextResponse.json(
        { error: "No podés eliminar tu propio usuario" },
        { status: 400 }
      );
    }

    if (targetResult.data.role === "admin") {
      const adminCountResult = await supabaseAdmin
        .from("app_users")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if ((adminCountResult.count || 0) <= 1) {
        return NextResponse.json(
          { error: "No podés eliminar el último administrador" },
          { status: 400 }
        );
      }
    }

    const { error } = await supabaseAdmin.from("app_users").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}