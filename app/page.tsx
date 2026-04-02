"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calculator,
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Shield,
  TrendingUp,
  Moon,
  Sun,
  Settings,
  Users,
} from "lucide-react";

const LS_REMEMBERED_USERNAME = "app_remembered_username";

type User = {
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
  index_multiplier: number; // ahora representa porcentaje, ej: 50 = 50%
};

type MonthlySeries = Record<string, number>;

type AdjustedCalc = {
  originMonth: string | null;
  latestMonth: string | null;
  originValue: number | null;
  latestValue: number | null;
  adjustedAmount: number | null;
};

type NoticeType = "success" | "error" | "";

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));
}

function formatWholeInput(value: number | string) {
  if (value === "" || value === null || value === undefined) return "";
  const num = Math.round(Number(value));
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatInput(value: number | string | null) {
  if (value === "" || value === null || value === undefined) return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(num);
}

function parseInput(value: string) {
  if (!value) return 0;
  return Number(String(value).replace(/\./g, "").replace(",", ".")) || 0;
}

function formatRawNumber(value: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function ymFromDate(dateStr: string) {
  return String(dateStr).slice(0, 7);
}

function getSortedMonths(series: MonthlySeries) {
  return Object.keys(series).sort();
}

function getLatestMonth(series: MonthlySeries) {
  const months = getSortedMonths(series);
  return months.length ? months[months.length - 1] : null;
}

function getNearestMonth(targetYm: string, series: MonthlySeries) {
  const months = getSortedMonths(series);
  if (!months.length) return null;
  if (series[targetYm] !== undefined) return targetYm;

  if (targetYm <= months[0]) return months[0];
  if (targetYm >= months[months.length - 1]) return months[months.length - 1];

  let candidate = months[0];
  for (const month of months) {
    if (month <= targetYm) candidate = month;
    else break;
  }
  return candidate;
}

function buildAdjustedAmount(
  capitalBase: number,
  fechaInicio: string,
  series: MonthlySeries
): AdjustedCalc {
  const originMonth = getNearestMonth(ymFromDate(fechaInicio), series);
  const latestMonth = getLatestMonth(series);

  if (!originMonth || !latestMonth) {
    return {
      originMonth: null,
      latestMonth: null,
      originValue: null,
      latestValue: null,
      adjustedAmount: null,
    };
  }

  const originValue = series[originMonth];
  const latestValue = series[latestMonth];

  if (!originValue || !latestValue) {
    return {
      originMonth,
      latestMonth,
      originValue: null,
      latestValue: null,
      adjustedAmount: null,
    };
  }

  return {
    originMonth,
    latestMonth,
    originValue,
    latestValue,
    adjustedAmount: capitalBase * (latestValue / originValue),
  };
}

function getWinningBase(
  pisoSistema: number,
  capitalBase: number,
  usdCalc: AdjustedCalc,
  uvaCalc: AdjustedCalc,
  ipcCalc: AdjustedCalc
) {
  const options = [
    { key: "USD", value: usdCalc.adjustedAmount },
    { key: "UVA", value: uvaCalc.adjustedAmount },
    { key: "IPC", value: ipcCalc.adjustedAmount },
    { key: "SISTEMA", value: pisoSistema },
    { key: "CAPITAL", value: capitalBase },
  ].filter(
    (item): item is { key: string; value: number } =>
      item.value !== null && item.value !== undefined && !Number.isNaN(item.value)
  );

  if (!options.length) {
    return { key: "SISTEMA", value: pisoSistema };
  }

  return options.reduce((max, item) => (item.value > max.value ? item : max));
}

function getStatusText(
  label: string,
  status: "ready" | "loading" | "error",
  latestMonth: string | null
) {
  if (status === "ready") return `${label}: API real${latestMonth ? ` (${latestMonth})` : ""}`;
  if (status === "loading") return `${label}: cargando...`;
  return `${label}: error al cargar`;
}

function Notice({
  type,
  message,
  darkMode,
}: {
  type: NoticeType;
  message: string;
  darkMode: boolean;
}) {
  if (!type || !message) return null;

  const cls =
    type === "success"
      ? darkMode
        ? "border-emerald-900 bg-emerald-950/60 text-emerald-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700"
      : darkMode
      ? "border-rose-900 bg-rose-950/60 text-rose-300"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${cls}`}>
      {message}
    </div>
  );
}

function LoginScreen({
  username,
  password,
  remember,
  error,
  loggingIn,
  setUsername,
  setPassword,
  setRemember,
  onLogin,
}: {
  username: string;
  password: string;
  remember: boolean;
  error: string;
  loggingIn: boolean;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  setRemember: (v: boolean) => void;
  onLogin: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-3xl shadow p-8 w-full max-w-[360px] space-y-4">
        <div className="flex items-center gap-2">
          <Shield />
          <h2 className="font-bold text-lg">Iniciar sesión</h2>
        </div>

        <input
          className="w-full border rounded-xl p-3"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loggingIn}
        />

        <input
          className="w-full border rounded-xl p-3"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loggingIn}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={loggingIn}
          />
          Recordar usuario
        </label>

        {error ? <div className="text-red-500 text-sm">{error}</div> : null}

        <button
          onClick={onLogin}
          disabled={loggingIn}
          className="w-full bg-black text-white rounded-xl p-3 font-bold disabled:opacity-60"
        >
          {loggingIn ? "Ingresando..." : "Ingresar"}
        </button>
      </div>
    </div>
  );
}

function MiniIndicatorCard({
  title,
  adjustedAmount,
  originMonth,
  latestMonth,
  selected,
  onClick,
}: {
  title: string;
  adjustedAmount: number | null;
  originMonth: string | null;
  latestMonth: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-[2rem] border transition-all duration-300 flex flex-col justify-between p-3 h-24 w-full text-left ${
        selected
          ? "border-transparent bg-white shadow-[0_10px_25px_rgba(0,0,0,0.08)] scale-[1.02]"
          : "border-white/80 bg-white/50 backdrop-blur-xl hover:bg-white/70 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm ${
            selected ? "bg-[#007AFF]" : "bg-white"
          }`}
        >
          <TrendingUp size={14} className={selected ? "text-white" : "text-slate-500"} />
        </div>
        {selected ? (
          <span className="flex items-center gap-1 rounded-full bg-[#007AFF] px-2 py-0.5 text-[8px] font-bold text-white uppercase tracking-wider shadow-sm">
            Base
          </span>
        ) : null}
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-end min-w-0">
        <span
          className={`block text-[11px] font-extrabold uppercase tracking-wide mb-0.5 leading-none ${
            selected ? "text-[#007AFF]" : "text-slate-700"
          }`}
        >
          {title}
        </span>
        <div className="text-[13px] md:text-[14px] font-black tracking-tight text-slate-900 leading-tight truncate">
          {adjustedAmount !== null ? formatARS(adjustedAmount) : "Sin dato"}
        </div>
        <div className="mt-0.5 text-[9px] font-bold leading-none text-slate-500">
          {originMonth && latestMonth ? `${originMonth} → ${latestMonth}` : "No disponible"}
        </div>
      </div>
    </button>
  );
}

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [adminView, setAdminView] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [strategyDrafts, setStrategyDrafts] = useState<Record<string, string>>({});
  const [loadingStrategies, setLoadingStrategies] = useState(false);
  const [savingStrategyKey, setSavingStrategyKey] = useState<string | null>(null);

  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [noticeType, setNoticeType] = useState<NoticeType>("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const [creatingUser, setCreatingUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newApellido, setNewApellido] = useState("");
  const [newDni, setNewDni] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [editApellido, setEditApellido] = useState("");
  const [editDni, setEditDni] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");

  const [fechaInicio, setFechaInicio] = useState("2023-06-15");
  const [capitalBase, setCapitalBase] = useState(1000000);
  const [pisoSistema, setPisoSistema] = useState(1200000);
  const [strategy, setStrategy] = useState<"agresiva" | "moderada" | "suave">("moderada");
  const [mode, setMode] = useState<"contado" | "financiado">("contado");
  const [cuotas, setCuotas] = useState(6);
  const [tna, setTna] = useState(50);

  const [usdSeries, setUsdSeries] = useState<MonthlySeries>({});
  const [uvaSeries, setUvaSeries] = useState<MonthlySeries>({});
  const [ipcSeries, setIpcSeries] = useState<MonthlySeries>({});
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [usdApiStatus, setUsdApiStatus] = useState<"ready" | "loading" | "error">("loading");
  const [uvaApiStatus, setUvaApiStatus] = useState<"ready" | "loading" | "error">("loading");
  const [ipcApiStatus, setIpcApiStatus] = useState<"ready" | "loading" | "error">("loading");
  const [detailIndicator, setDetailIndicator] = useState<"USD" | "UVA" | "IPC" | "SISTEMA">("USD");
  const [showDetail, setShowDetail] = useState(false);

  const showNotice = (type: NoticeType, message: string) => {
    setNoticeType(type);
    setNoticeMessage(message);
  };

  const clearNotice = () => {
    setNoticeType("");
    setNoticeMessage("");
  };

  const buildStrategyDrafts = (list: Strategy[]) => {
    const drafts: Record<string, string> = {};
    list.forEach((item) => {
      drafts[item.key] = formatInput(item.index_multiplier);
    });
    return drafts;
  };

  useEffect(() => {
    const rememberedUsername = localStorage.getItem(LS_REMEMBERED_USERNAME) || "";
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRemember(true);
    } else {
      setRemember(false);
    }

    async function loadSession() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const json = await res.json();
        if (json?.user) {
          setUser(json.user as User);
        }
      } catch (err) {
        console.error("No se pudo cargar la sesión", err);
      } finally {
        setLoadingSession(false);
      }
    }

    loadSession();
  }, []);

  const resetNewUserForm = () => {
    setNewUsername("");
    setNewPassword("");
    setNewNombre("");
    setNewApellido("");
    setNewDni("");
    setNewRole("user");
  };

  const resetEditUserForm = () => {
    setEditingUserId(null);
    setEditUsername("");
    setEditPassword("");
    setEditNombre("");
    setEditApellido("");
    setEditDni("");
    setEditRole("user");
  };

  const login = async () => {
    setError("");
    setLoggingIn(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Usuario o contraseña incorrectos");
        return;
      }

      if (remember) {
        localStorage.setItem(LS_REMEMBERED_USERNAME, json.user.username);
      } else {
        localStorage.removeItem(LS_REMEMBERED_USERNAME);
      }

      setPassword("");
      setUser(json.user as User);
      setAdminView(false);
    } catch (err) {
      console.error(err);
      setError("No se pudo iniciar sesión");
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("No se pudo cerrar sesión", err);
    } finally {
      setLoggingOut(false);
    }

    setUser(null);
    setPassword("");
    setStrategies([]);
    setStrategyDrafts({});
    setAdminUsers([]);
    clearNotice();
    resetNewUserForm();
    resetEditUserForm();
    setUsdSeries({});
    setUvaSeries({});
    setIpcSeries({});
    setAdminView(false);
  };

  const loadStrategies = async () => {
    setLoadingStrategies(true);

    try {
      const res = await fetch("/api/admin/strategies", { cache: "no-store" });
      const json = await res.json();

      if (res.ok && json.data?.length) {
        const list = json.data as Strategy[];
        setStrategies(list);
        setStrategyDrafts(buildStrategyDrafts(list));
      } else {
        const fallback: Strategy[] = [
          { key: "agresiva", label: "Agresiva", index_multiplier: 50 },
          { key: "moderada", label: "Moderada", index_multiplier: 20 },
          { key: "suave", label: "Suave", index_multiplier: 10 },
        ];
        setStrategies(fallback);
        setStrategyDrafts(buildStrategyDrafts(fallback));
      }
    } catch (error) {
      console.error("No se pudieron cargar las estrategias", error);

      const fallback: Strategy[] = [
        { key: "agresiva", label: "Agresiva", index_multiplier: 50 },
        { key: "moderada", label: "Moderada", index_multiplier: 20 },
        { key: "suave", label: "Suave", index_multiplier: 10 },
      ];

      setStrategies(fallback);
      setStrategyDrafts(buildStrategyDrafts(fallback));
    } finally {
      setLoadingStrategies(false);
    }
  };

  const saveStrategy = async (strategyItem: Strategy) => {
    clearNotice();
    setSavingStrategyKey(strategyItem.key);

    try {
      const percentValue = parseInput(
        strategyDrafts[strategyItem.key] ?? formatInput(strategyItem.index_multiplier)
      );

      const res = await fetch("/api/admin/strategies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: strategyItem.key,
          label: strategyItem.label,
          index_multiplier: percentValue,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        showNotice("error", json?.error || "No se pudo guardar la estrategia");
        return;
      }

      await loadStrategies();
      showNotice("success", `Estrategia ${strategyItem.label} guardada correctamente.`);
    } catch (error) {
      console.error("No se pudo guardar la estrategia", error);
      showNotice("error", "No se pudo guardar la estrategia.");
    } finally {
      setSavingStrategyKey(null);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);

    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const json = await res.json();

      if (res.ok && json.data) {
        setAdminUsers(json.data as User[]);
      }
    } catch (error) {
      console.error("No se pudieron cargar los usuarios", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const createUser = async () => {
    clearNotice();
    setCreatingUser(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          nombre: newNombre,
          apellido: newApellido,
          dni: newDni,
          role: newRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        showNotice("error", json?.error || "No se pudo crear el usuario");
        return;
      }

      resetNewUserForm();
      await loadUsers();
      showNotice("success", "Usuario creado correctamente.");
    } catch (error) {
      console.error("No se pudo crear el usuario", error);
      showNotice("error", "No se pudo crear el usuario.");
    } finally {
      setCreatingUser(false);
    }
  };

  const startEditUser = (target: User) => {
    clearNotice();
    setEditingUserId(target.id);
    setEditUsername(target.username);
    setEditPassword("");
    setEditNombre(target.nombre || "");
    setEditApellido(target.apellido || "");
    setEditDni(target.dni || "");
    setEditRole(target.role);
  };

  const saveEditedUser = async () => {
    if (!editingUserId) return;

    clearNotice();
    setSavingUser(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUserId,
          username: editUsername,
          password: editPassword,
          nombre: editNombre,
          apellido: editApellido,
          dni: editDni,
          role: editRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        showNotice("error", json?.error || "No se pudo guardar el usuario");
        return;
      }

      await loadUsers();
      resetEditUserForm();
      showNotice("success", "Usuario actualizado correctamente.");
    } catch (error) {
      console.error("No se pudo guardar el usuario", error);
      showNotice("error", "No se pudo guardar el usuario.");
    } finally {
      setSavingUser(false);
    }
  };

  const updateUserRole = async (target: User, nextRole: "admin" | "user") => {
    clearNotice();
    setUpdatingRoleId(target.id);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: target.id,
          username: target.username,
          nombre: target.nombre,
          apellido: target.apellido,
          dni: target.dni || "",
          role: nextRole,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        showNotice("error", json?.error || "No se pudo cambiar el rol");
        return;
      }

      await loadUsers();
      showNotice("success", `Rol actualizado para ${target.username}.`);
    } catch (error) {
      console.error("No se pudo cambiar el rol", error);
      showNotice("error", "No se pudo cambiar el rol.");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const deleteUser = async (target: User) => {
    const confirmed = window.confirm(`¿Eliminar al usuario ${target.username}?`);
    if (!confirmed) return;

    clearNotice();
    setDeletingUserId(target.id);

    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(target.id)}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        showNotice("error", json?.error || "No se pudo eliminar el usuario");
        return;
      }

      if (editingUserId === target.id) {
        resetEditUserForm();
      }

      await loadUsers();
      showNotice("success", `Usuario eliminado: ${target.username}.`);
    } catch (error) {
      console.error("No se pudo eliminar el usuario", error);
      showNotice("error", "No se pudo eliminar el usuario.");
    } finally {
      setDeletingUserId(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadStrategies();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadUsers();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    async function safeJsonFetch(url: string) {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} en ${url}`);
      }

      const text = await response.text();

      if (!text || !text.trim()) {
        throw new Error(`Respuesta vacía en ${url}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`La respuesta no es JSON válido en ${url}`);
      }
    }

    async function loadIndicators() {
      setLoadingIndicators(true);

      try {
        try {
          setUsdApiStatus("loading");
          const usdData = await safeJsonFetch("https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial");
          const monthlyUsd: MonthlySeries = {};
          if (Array.isArray(usdData)) {
            usdData.forEach((item) => {
              const ym = String(item?.fecha).slice(0, 7);
              const venta = Number(item?.venta);
              if (ym && Number.isFinite(venta)) monthlyUsd[ym] = venta;
            });
          }
          setUsdSeries(monthlyUsd);
          setUsdApiStatus("ready");
        } catch (usdError) {
          console.error("No se pudo cargar USD", usdError);
          setUsdSeries({});
          setUsdApiStatus("error");
        }

        try {
          setUvaApiStatus("loading");
          const uvaData = await safeJsonFetch("https://api.argentinadatos.com/v1/finanzas/indices/uva");
          const monthlyUva: MonthlySeries = {};
          if (Array.isArray(uvaData)) {
            uvaData.forEach((item) => {
              const ym = String(item?.fecha).slice(0, 7);
              const valor = Number(item?.valor);
              if (ym && Number.isFinite(valor)) monthlyUva[ym] = valor;
            });
          }
          setUvaSeries(monthlyUva);
          setUvaApiStatus("ready");
        } catch (uvaError) {
          console.error("No se pudo cargar UVA", uvaError);
          setUvaSeries({});
          setUvaApiStatus("error");
        }

        try {
          setIpcApiStatus("loading");
          const ipcData = await safeJsonFetch(
            "https://apis.datos.gob.ar/series/api/series?ids=148.3_INIVELNAL_DICI_M_26&start_date=2016-01-01&format=json&metadata=none"
          );
          const monthlyIpc: MonthlySeries = {};
          if (Array.isArray(ipcData?.data)) {
            ipcData.data.forEach((row: [string, number]) => {
              const ym = String(row?.[0]).slice(0, 7);
              const valor = Number(row?.[1]);
              if (ym && Number.isFinite(valor)) monthlyIpc[ym] = valor;
            });
          }
          setIpcSeries(monthlyIpc);
          setIpcApiStatus("ready");
        } catch (ipcError) {
          console.error("No se pudo cargar IPC", ipcError);
          setIpcSeries({});
          setIpcApiStatus("error");
        }
      } finally {
        setLoadingIndicators(false);
      }
    }

    loadIndicators();
  }, [user]);

  const currentStrategy = useMemo(() => {
    return (
      strategies.find((s) => s.key === strategy) || {
        key: strategy,
        label: strategy,
        index_multiplier:
          strategy === "agresiva" ? 50 : strategy === "moderada" ? 20 : 10,
      }
    );
  }, [strategies, strategy]);

  const usdCalc = useMemo(
    () => buildAdjustedAmount(capitalBase, fechaInicio, usdSeries),
    [capitalBase, fechaInicio, usdSeries]
  );
  const uvaCalc = useMemo(
    () => buildAdjustedAmount(capitalBase, fechaInicio, uvaSeries),
    [capitalBase, fechaInicio, uvaSeries]
  );
  const ipcCalc = useMemo(
    () => buildAdjustedAmount(capitalBase, fechaInicio, ipcSeries),
    [capitalBase, fechaInicio, ipcSeries]
  );

  const winningBase = useMemo(
    () => getWinningBase(pisoSistema, capitalBase, usdCalc, uvaCalc, ipcCalc),
    [pisoSistema, capitalBase, usdCalc, uvaCalc, ipcCalc]
  );

  const resultado = useMemo(() => {
    const baseNegociacion = winningBase.value;
    const strategyFactor = 1 + currentStrategy.index_multiplier / 100;
    const baseConEstrategia = baseNegociacion * strategyFactor;

    if (mode === "contado") {
      return {
        baseNegociacion,
        baseConEstrategia,
        totalFinal: baseConEstrategia,
        valorCuota: 0,
        tem: tna / 12 / 100,
      };
    }

    const n = Math.max(1, cuotas || 1);
    const tem = (tna || 0) / 12 / 100;
    let cuota = baseConEstrategia / n;

    if (tem > 0) {
      const denominator = Math.pow(1 + tem, n) - 1;
      cuota =
        denominator === 0
          ? baseConEstrategia / n
          : baseConEstrategia * ((tem * Math.pow(1 + tem, n)) / denominator);
    }

    return {
      baseNegociacion,
      baseConEstrategia,
      totalFinal: cuota * n,
      valorCuota: cuota,
      tem,
    };
  }, [winningBase, currentStrategy, mode, cuotas, tna]);

  const detailItem =
    detailIndicator === "USD"
      ? usdCalc
      : detailIndicator === "UVA"
      ? uvaCalc
      : detailIndicator === "IPC"
      ? ipcCalc
      : {
          originMonth: ymFromDate(fechaInicio),
          latestMonth: ymFromDate(fechaInicio),
          originValue: pisoSistema,
          latestValue: pisoSistema,
          adjustedAmount: pisoSistema,
        };

  const pageBg = darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900";
  const containerCard = darkMode
    ? "bg-slate-900 border-slate-800 text-slate-100"
    : "bg-white/60 border-white text-slate-900";
  const softCard = darkMode ? "bg-slate-900/70 border-slate-800" : "bg-white/40 border-white/80";
  const caseCardCls = darkMode
    ? "bg-slate-950 border-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
    : "bg-slate-100 border-slate-300 shadow-[0_8px_20px_rgba(15,23,42,0.08)]";
  const inputCls = darkMode
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-slate-300 text-slate-900";
  const actionBtn = darkMode
    ? "text-sm rounded-xl px-3 py-2 bg-slate-800 text-slate-100 border border-slate-700"
    : "text-sm rounded-xl px-3 py-2 bg-white text-slate-900 border border-slate-200";

  if (loadingSession) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${pageBg}`}>
        <div className="bg-white p-8 rounded-3xl shadow w-[350px] text-center font-medium text-slate-900">
          Cargando...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        username={username}
        password={password}
        remember={remember}
        error={error}
        loggingIn={loggingIn}
        setUsername={setUsername}
        setPassword={setPassword}
        setRemember={setRemember}
        onLogin={login}
      />
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 ${pageBg}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4 gap-3">
          <div className="font-bold">
            Usuario: {user.username} {user.role === "admin" ? "(Administrador)" : ""}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode((v) => !v)} className={actionBtn}>
              <span className="inline-flex items-center gap-2">
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                {darkMode ? "Modo claro" : "Modo noche"}
              </span>
            </button>

            {user.role === "admin" ? (
              <button onClick={() => setAdminView((v) => !v)} className={actionBtn}>
                <span className="inline-flex items-center gap-2">
                  {adminView ? <Calculator size={16} /> : <Settings size={16} />}
                  {adminView ? "Volver a calculadora" : "Panel admin"}
                </span>
              </button>
            ) : null}

            <button onClick={logout} disabled={loggingOut} className={actionBtn}>
              {loggingOut ? "Cerrando..." : "Salir"}
            </button>
          </div>
        </div>

        <Notice type={noticeType} message={noticeMessage} darkMode={darkMode} />

        {adminView && user.role === "admin" ? (
          <div
            className={
              darkMode
                ? "bg-slate-950 p-4 rounded-2xl border border-slate-700 mb-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                : "bg-slate-200/90 p-4 rounded-2xl border border-slate-300 mb-4 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
            }
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-5">
              <div>
                <h3 className="font-bold text-xl">Panel administrador</h3>
                <p className={darkMode ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                  Gestión de usuarios y estrategias del sistema.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                  Solo administrador
                </span>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
              <div className="space-y-6">
                <div
                  className={
                    darkMode
                      ? "rounded-2xl border border-slate-700 bg-slate-900 p-4"
                      : "rounded-2xl border border-slate-300 bg-white p-4"
                  }
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={16} className="text-[#007AFF]" />
                    <h4 className="font-bold">Alta de usuario</h4>
                  </div>

                  <div className="space-y-3">
                    <input
                      className={
                        darkMode
                          ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                          : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                      }
                      placeholder="Usuario"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      disabled={creatingUser}
                    />

                    <input
                      className={
                        darkMode
                          ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                          : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                      }
                      placeholder="Contraseña"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={creatingUser}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className={
                          darkMode
                            ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                            : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                        }
                        placeholder="Nombre"
                        value={newNombre}
                        onChange={(e) => setNewNombre(e.target.value)}
                        disabled={creatingUser}
                      />

                      <input
                        className={
                          darkMode
                            ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                            : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                        }
                        placeholder="Apellido"
                        value={newApellido}
                        onChange={(e) => setNewApellido(e.target.value)}
                        disabled={creatingUser}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className={
                          darkMode
                            ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                            : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                        }
                        placeholder="DNI"
                        value={newDni}
                        onChange={(e) => setNewDni(e.target.value)}
                        disabled={creatingUser}
                      />

                      <select
                        className={
                          darkMode
                            ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                            : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                        }
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
                        disabled={creatingUser}
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={createUser}
                      disabled={creatingUser}
                      className={
                        darkMode
                          ? "flex-1 bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-bold disabled:opacity-60"
                          : "flex-1 bg-black text-white px-4 py-2.5 rounded-xl font-bold disabled:opacity-60"
                      }
                    >
                      {creatingUser ? "Creando..." : "Crear usuario"}
                    </button>

                    <button onClick={resetNewUserForm} disabled={creatingUser} className={actionBtn}>
                      Limpiar
                    </button>
                  </div>
                </div>

                {editingUserId ? (
                  <div
                    className={
                      darkMode
                        ? "rounded-2xl border border-slate-700 bg-slate-900 p-4"
                        : "rounded-2xl border border-slate-300 bg-white p-4"
                    }
                  >
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div>
                        <h4 className="font-bold">Editar usuario</h4>
                        <p className={darkMode ? "text-xs text-slate-400" : "text-xs text-slate-500"}>
                          Actualizá los datos del usuario seleccionado.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-600">
                        En edición
                      </span>
                    </div>

                    <div className="space-y-3">
                      <input
                        className={
                          darkMode
                            ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                            : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                        }
                        placeholder="Usuario"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        disabled={savingUser}
                      />

                      <input
                        className={
                          darkMode
                            ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                            : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                        }
                        placeholder="Nueva contraseña (opcional)"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        disabled={savingUser}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          className={
                            darkMode
                              ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                              : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                          }
                          placeholder="Nombre"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          disabled={savingUser}
                        />

                        <input
                          className={
                            darkMode
                              ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                              : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                          }
                          placeholder="Apellido"
                          value={editApellido}
                          onChange={(e) => setEditApellido(e.target.value)}
                          disabled={savingUser}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          className={
                            darkMode
                              ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                              : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                          }
                          placeholder="DNI"
                          value={editDni}
                          onChange={(e) => setEditDni(e.target.value)}
                          disabled={savingUser}
                        />

                        <select
                          className={
                            darkMode
                              ? "w-full border border-slate-700 bg-slate-950 text-slate-100 p-3 rounded-xl"
                              : "w-full border border-slate-300 bg-white p-3 rounded-xl"
                          }
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as "admin" | "user")}
                          disabled={savingUser}
                        >
                          <option value="user">Usuario</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={saveEditedUser}
                        disabled={savingUser}
                        className={
                          darkMode
                            ? "flex-1 bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-bold disabled:opacity-60"
                            : "flex-1 bg-black text-white px-4 py-2.5 rounded-xl font-bold disabled:opacity-60"
                        }
                      >
                        {savingUser ? "Guardando..." : "Guardar cambios"}
                      </button>

                      <button onClick={resetEditUserForm} disabled={savingUser} className={actionBtn}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-6">
                <div
                  className={
                    darkMode
                      ? "rounded-2xl border border-slate-700 bg-slate-900 p-4"
                      : "rounded-2xl border border-slate-300 bg-white p-4"
                  }
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Settings size={16} className="text-[#007AFF]" />
                    <h4 className="font-bold">Estrategias</h4>
                  </div>

                  {loadingStrategies ? (
                    <div className={darkMode ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                      Cargando estrategias...
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                      {strategies.map((s) => {
                        const draftValue = strategyDrafts[s.key] ?? formatInput(s.index_multiplier);
                        const percentPreview = parseInput(draftValue);
                        const factorPreview = 1 + percentPreview / 100;

                        return (
                          <div
                            key={s.key}
                            className={
                              darkMode
                                ? "rounded-2xl border border-slate-800 bg-slate-950 p-4"
                                : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            }
                          >
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div>
                                <div className="font-bold">{s.label}</div>
                                <div className={darkMode ? "text-xs text-slate-400" : "text-xs text-slate-500"}>
                                  {s.key}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                                Activa
                              </span>
                            </div>

                            <label className={darkMode ? "text-xs text-slate-400" : "text-xs text-slate-500"}>
                              Recargo (%)
                            </label>

                            <input
                              value={draftValue}
                              onChange={(e) =>
                                setStrategyDrafts((prev) => ({
                                  ...prev,
                                  [s.key]: e.target.value,
                                }))
                              }
                              disabled={savingStrategyKey === s.key}
                              className={
                                darkMode
                                  ? "mt-2 w-full border border-slate-700 bg-slate-900 text-slate-100 p-3 rounded-xl"
                                  : "mt-2 w-full border border-slate-300 bg-white p-3 rounded-xl"
                              }
                            />

                            <div className={darkMode ? "mt-2 text-xs text-slate-400" : "mt-2 text-xs text-slate-500"}>
                              Multiplica por {factorPreview.toFixed(4).replace(".", ",")}
                            </div>

                            <button
                              onClick={() => saveStrategy(s)}
                              disabled={savingStrategyKey === s.key}
                              className={
                                darkMode
                                  ? "mt-4 w-full bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-bold disabled:opacity-60"
                                  : "mt-4 w-full bg-black text-white px-4 py-2.5 rounded-xl font-bold disabled:opacity-60"
                              }
                            >
                              {savingStrategyKey === s.key ? "Guardando..." : "Guardar"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div
                  className={
                    darkMode
                      ? "rounded-2xl border border-slate-700 bg-slate-900 p-4"
                      : "rounded-2xl border border-slate-300 bg-white p-4"
                  }
                >
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-[#007AFF]" />
                      <h4 className="font-bold">Usuarios creados</h4>
                    </div>
                    <span className={darkMode ? "text-xs text-slate-400" : "text-xs text-slate-500"}>
                      {adminUsers.length} usuarios
                    </span>
                  </div>

                  {loadingUsers ? (
                    <div className={darkMode ? "text-sm text-slate-400" : "text-sm text-slate-500"}>
                      Cargando usuarios...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {adminUsers.map((u) => (
                        <div
                          key={u.id}
                          className={
                            darkMode
                              ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_140px_auto_auto] items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3"
                              : "grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_140px_auto_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                          }
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {u.nombre} {u.apellido}
                            </div>
                            <div className={darkMode ? "text-xs text-slate-400 truncate" : "text-xs text-slate-500 truncate"}>
                              @{u.username} · DNI {u.dni || "-"}
                            </div>
                          </div>

                          <select
                            value={u.role}
                            onChange={(e) =>
                              updateUserRole(u, e.target.value as "admin" | "user")
                            }
                            disabled={updatingRoleId === u.id}
                            className={
                              darkMode
                                ? "border border-slate-700 bg-slate-900 text-slate-100 px-3 py-2 rounded-xl text-sm"
                                : "border border-slate-300 bg-white px-3 py-2 rounded-xl text-sm"
                            }
                          >
                            <option value="user">Usuario</option>
                            <option value="admin">Administrador</option>
                          </select>

                          <button
                            onClick={() => startEditUser(u)}
                            disabled={deletingUserId === u.id || updatingRoleId === u.id}
                            className={
                              darkMode
                                ? "text-sm font-bold px-3 py-2 rounded-xl bg-amber-900/30 text-amber-300 border border-amber-800 disabled:opacity-60"
                                : "text-sm font-bold px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 disabled:opacity-60"
                            }
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => deleteUser(u)}
                            disabled={deletingUserId === u.id || updatingRoleId === u.id}
                            className={
                              darkMode
                                ? "text-sm font-bold px-3 py-2 rounded-xl bg-rose-900/40 text-rose-300 border border-rose-800 disabled:opacity-60"
                                : "text-sm font-bold px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 disabled:opacity-60"
                            }
                          >
                            {deletingUserId === u.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`w-full rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.06)] border overflow-hidden ${containerCard}`}>
            <div className="flex flex-col xl:flex-row">
              <div className="flex-1 p-4 md:p-6 relative">
                <div className="mb-4 flex items-center gap-4 ml-2">
                  <div
                    className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-sm border ${
                      darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-white/80"
                    }`}
                  >
                    <Calculator className="text-[#007AFF]" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Calculadora</h1>
                    <p className={darkMode ? "text-sm text-slate-400 font-medium" : "text-sm text-slate-500 font-medium"}>
                      Estrategia de cobranza
                    </p>
                    <div className={darkMode ? "mt-0.5 space-y-0.5 text-xs text-slate-500 font-medium" : "mt-0.5 space-y-0.5 text-xs text-slate-400 font-medium"}>
                      <p>{getStatusText("Dólar oficial venta", usdApiStatus, getLatestMonth(usdSeries))}</p>
                      <p>{getStatusText("UVA", uvaApiStatus, getLatestMonth(uvaSeries))}</p>
                      <p>{getStatusText("IPC", ipcApiStatus, getLatestMonth(ipcSeries))}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className={darkMode ? "text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2" : "text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-2"}>
                      Variables del caso
                    </h2>

                    <div className={`p-5 rounded-[2rem] border ${caseCardCls}`}>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <label className={darkMode ? "text-[11px] font-bold text-slate-400 tracking-wide flex items-center gap-1.5 ml-1 uppercase" : "text-[11px] font-bold text-slate-500 tracking-wide flex items-center gap-1.5 ml-1 uppercase"}>
                            <Calendar size={14} className="text-slate-400" />
                            Fecha inicial
                          </label>
                          <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className={`w-full h-[3.25rem] border rounded-3xl px-4 outline-none ${inputCls}`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className={darkMode ? "text-[11px] font-bold text-slate-400 tracking-wide flex items-center gap-1.5 ml-1 uppercase" : "text-[11px] font-bold text-slate-500 tracking-wide flex items-center gap-1.5 ml-1 uppercase"}>
                            <DollarSign size={14} className="text-slate-400" />
                            Capital base
                          </label>
                          <input
                            value={formatWholeInput(capitalBase)}
                            onChange={(e) => setCapitalBase(parseInput(e.target.value))}
                            className={`w-full h-[3.25rem] border rounded-3xl px-4 outline-none ${inputCls}`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className={darkMode ? "text-[11px] font-bold text-slate-400 tracking-wide flex items-center gap-1.5 ml-1 uppercase" : "text-[11px] font-bold text-slate-500 tracking-wide flex items-center gap-1.5 ml-1 uppercase"}>
                            <DollarSign size={14} className="text-slate-400" />
                            Piso sistema
                          </label>
                          <input
                            value={formatWholeInput(pisoSistema)}
                            onChange={(e) => setPisoSistema(parseInput(e.target.value))}
                            className={`w-full h-[3.25rem] border rounded-3xl px-4 outline-none ${inputCls}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className={darkMode ? "text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2" : "text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-2"}>
                      Cálculos según diferentes indicadores
                    </h2>

                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                      <MiniIndicatorCard
                        title="USD"
                        adjustedAmount={usdCalc.adjustedAmount}
                        originMonth={usdCalc.originMonth}
                        latestMonth={usdCalc.latestMonth}
                        selected={winningBase.key === "USD"}
                        onClick={() => {
                          setDetailIndicator("USD");
                          setShowDetail(true);
                        }}
                      />
                      <MiniIndicatorCard
                        title="UVA"
                        adjustedAmount={uvaCalc.adjustedAmount}
                        originMonth={uvaCalc.originMonth}
                        latestMonth={uvaCalc.latestMonth}
                        selected={winningBase.key === "UVA"}
                        onClick={() => {
                          setDetailIndicator("UVA");
                          setShowDetail(true);
                        }}
                      />
                      <MiniIndicatorCard
                        title="IPC"
                        adjustedAmount={ipcCalc.adjustedAmount}
                        originMonth={ipcCalc.originMonth}
                        latestMonth={ipcCalc.latestMonth}
                        selected={winningBase.key === "IPC"}
                        onClick={() => {
                          setDetailIndicator("IPC");
                          setShowDetail(true);
                        }}
                      />
                      <MiniIndicatorCard
                        title="SISTEMA"
                        adjustedAmount={pisoSistema}
                        originMonth={ymFromDate(fechaInicio)}
                        latestMonth={ymFromDate(fechaInicio)}
                        selected={winningBase.key === "SISTEMA"}
                        onClick={() => {
                          setDetailIndicator("SISTEMA");
                          setShowDetail(true);
                        }}
                      />
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowDetail((prev) => !prev)}
                        className="rounded-full bg-slate-900 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-slate-800 transition-colors"
                      >
                        {showDetail ? "Ocultar cálculos" : "Mostrar cálculos"}
                      </button>

                      {showDetail ? (
                        <span className="text-[11px] font-semibold text-[#007AFF] bg-[#007AFF]/10 px-3 py-1 rounded-full">
                          {detailIndicator} seleccionado
                        </span>
                      ) : null}
                    </div>

                    {showDetail ? (
                      <div className={`mt-4 p-4 rounded-[2rem] border shadow-sm ${softCard}`}>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h3 className={darkMode ? "text-[11px] font-bold text-slate-400 uppercase tracking-widest" : "text-[11px] font-bold text-slate-500 uppercase tracking-widest"}>
                            Detalle del cálculo
                          </h3>
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                            {detailIndicator}
                          </span>
                        </div>

                        {detailIndicator === "SISTEMA" ? (
                          <div className="rounded-2xl p-3 border bg-white/70 text-slate-900">
                            Se toma directamente el capital actualizado según sistema ingresado por el usuario.
                          </div>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-4">
                            <div className="rounded-2xl p-3 border bg-white/70 text-slate-900">
                              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Capital base</div>
                              <div className="mt-1 text-lg font-extrabold">{formatARS(capitalBase)}</div>
                            </div>
                            <div className="rounded-2xl p-3 border bg-white/70 text-slate-900">
                              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Mes origen</div>
                              <div className="mt-1 text-lg font-extrabold">{detailItem.originMonth || "-"}</div>
                            </div>
                            <div className="rounded-2xl p-3 border bg-white/70 text-slate-900">
                              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Valor inicial</div>
                              <div className="mt-1 text-lg font-extrabold">{formatRawNumber(detailItem.originValue)}</div>
                            </div>
                            <div className="rounded-2xl p-3 border bg-white/70 text-slate-900">
                              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Valor actual</div>
                              <div className="mt-1 text-lg font-extrabold">{formatRawNumber(detailItem.latestValue)}</div>
                              <div className="mt-0.5 text-[10px] font-semibold text-slate-500">{detailItem.latestMonth || "-"}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <h2 className={darkMode ? "text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2" : "text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-2"}>
                      Parámetros de negociación
                    </h2>

                    <div className={`p-6 rounded-[2rem] border shadow-sm grid gap-6 md:grid-cols-2 ${softCard}`}>
                      <div className="space-y-3">
                        <label className={darkMode ? "text-[11px] font-bold text-slate-400 uppercase tracking-wide block ml-2" : "text-[11px] font-bold text-slate-500 uppercase tracking-wide block ml-2"}>
                          Estrategia
                        </label>

                        <div className={darkMode ? "flex bg-slate-950 p-1.5 rounded-full border border-slate-800" : "flex bg-slate-200/50 p-1.5 rounded-full border border-slate-100"}>
                          {strategies.map((s) => {
                            const isActive = strategy === s.key;
                            return (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => setStrategy(s.key)}
                                className={`flex-1 py-3 text-sm font-bold rounded-full transition-all ${
                                  isActive
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : darkMode
                                    ? "text-slate-400 hover:text-slate-200"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className={darkMode ? "text-[11px] font-bold text-slate-400 uppercase tracking-wide block ml-2" : "text-[11px] font-bold text-slate-500 uppercase tracking-wide block ml-2"}>
                          Modalidad
                        </label>

                        <div className={darkMode ? "flex bg-slate-950 p-1.5 rounded-full border border-slate-800" : "flex bg-slate-200/50 p-1.5 rounded-full border border-slate-100"}>
                          <button
                            type="button"
                            onClick={() => setMode("contado")}
                            className={`flex-1 py-3 text-sm font-bold rounded-full transition-all ${
                              mode === "contado"
                                ? "bg-[#007AFF] text-white shadow-sm"
                                : darkMode
                                ? "text-slate-400 hover:text-slate-200"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Contado
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode("financiado")}
                            className={`flex-1 py-3 text-sm font-bold rounded-full transition-all ${
                              mode === "financiado"
                                ? "bg-[#007AFF] text-white shadow-sm"
                                : darkMode
                                ? "text-slate-400 hover:text-slate-200"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Plan
                          </button>
                        </div>

                        <div className={`transition-all duration-500 overflow-hidden ${mode === "financiado" ? "max-h-[100px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"}`}>
                          <div className="flex gap-4 pt-1">
                            <input
                              value={formatWholeInput(cuotas)}
                              onChange={(e) => setCuotas(parseInput(e.target.value))}
                              className={`w-[90px] h-11 border rounded-3xl px-4 outline-none ${inputCls}`}
                              placeholder="Cuotas"
                            />
                            <input
                              value={formatWholeInput(tna)}
                              onChange={(e) => setTna(parseInput(e.target.value))}
                              className={`flex-1 h-11 border rounded-3xl px-4 outline-none ${inputCls}`}
                              placeholder="TNA"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`xl:w-[420px] border-t xl:border-t-0 xl:border-l flex flex-col relative z-20 ${darkMode ? "bg-slate-900/70 border-slate-800" : "bg-white/50 border-white/80"}`}>
                <div className="p-8 flex-1 flex flex-col relative">
                  <div className="flex items-center justify-between mb-8">
                    <div className={darkMode ? "flex items-center gap-2 text-slate-400" : "flex items-center gap-2 text-slate-500"}>
                      <Activity size={18} />
                      <h3 className="text-sm font-bold tracking-widest uppercase">Resumen</h3>
                    </div>
                  </div>

                  <div className={darkMode ? "mb-8 bg-slate-950 p-6 rounded-[2rem] border border-slate-800 shadow-sm" : "mb-8 bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm"}>
                    <p className={darkMode ? "text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-wide" : "text-slate-500 text-[11px] font-bold mb-1 uppercase tracking-wide"}>
                      Importe a cobrar (total final)
                    </p>
                    <div className="text-4xl font-extrabold tracking-tight">{formatARS(resultado.totalFinal)}</div>
                  </div>

                  <div className={darkMode ? "space-y-1 mb-8 bg-slate-950 rounded-3xl p-2 border border-slate-800" : "space-y-1 mb-8 bg-white/40 rounded-3xl p-2 border border-white/80"}>
                    <div className="flex justify-between items-center px-3 py-2.5 rounded-2xl">
                      <span className={darkMode ? "text-slate-400 text-sm font-bold" : "text-slate-500 text-sm font-bold"}>Base inicial</span>
                      <div className="text-right">
                        <div className="font-extrabold">{formatARS(winningBase.value)}</div>
                        <div className="text-[11px] font-bold text-[#007AFF]">{winningBase.key}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center px-3 py-2.5 rounded-2xl">
                      <span className={darkMode ? "text-slate-400 text-sm font-bold" : "text-slate-500 text-sm font-bold"}>Estrategia aplicada</span>
                      <span className="font-extrabold">+{formatInput(currentStrategy.index_multiplier)}%</span>
                    </div>

                    <div className="flex justify-between items-center px-3 py-2.5 rounded-2xl">
                      <span className={darkMode ? "text-slate-400 text-sm font-bold" : "text-slate-500 text-sm font-bold"}>Monto contado</span>
                      <span className="font-extrabold">{formatARS(resultado.baseConEstrategia)}</span>
                    </div>

                    {mode === "financiado" ? (
                      <>
                        <div className="flex justify-between items-center px-3 py-2.5 rounded-2xl">
                          <span className={darkMode ? "text-slate-400 text-sm font-bold" : "text-slate-500 text-sm font-bold"}>Capital a financiar</span>
                          <span className="font-extrabold">{formatARS(resultado.baseConEstrategia)}</span>
                        </div>

                        <div className="flex justify-between items-center px-3 py-2.5 rounded-2xl">
                          <span className={darkMode ? "text-slate-400 text-sm font-bold" : "text-slate-500 text-sm font-bold"}>Monto total financiado</span>
                          <span className="font-extrabold text-[#007AFF]">{formatARS(resultado.totalFinal)}</span>
                        </div>

                        <div className="flex justify-between items-center px-3 py-2.5 rounded-2xl">
                          <span className={darkMode ? "text-slate-400 text-sm font-bold" : "text-slate-500 text-sm font-bold"}>Tasas (TNA / TEM)</span>
                          <span className={darkMode ? "font-extrabold bg-slate-800 px-2 py-0.5 rounded-full text-xs" : "font-extrabold bg-slate-100 px-2 py-0.5 rounded-full text-xs"}>
                            {formatInput(tna)}% / {(resultado.tem * 100).toFixed(2).replace(".", ",")}%
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>

                  {mode === "financiado" ? (
                    <div className="flex-1 flex flex-col">
                      <div className={darkMode ? "bg-slate-950 rounded-[2rem] p-4 border border-slate-800 flex-1 flex flex-col max-h-[350px] shadow-sm" : "bg-white/50 rounded-[2rem] p-4 border border-white flex-1 flex flex-col max-h-[350px] shadow-sm"}>
                        <div className="flex items-center justify-between mb-4 px-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="text-[#007AFF]" size={16} />
                            <h4 className="font-bold text-sm">Cuotas (Sistema Francés)</h4>
                          </div>
                          <span className="text-[10px] font-bold text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-1 rounded-full">
                            {Math.max(1, cuotas)} pagos fijos
                          </span>
                        </div>

                        <div className="overflow-y-auto pr-1 flex-1">
                          <div className="grid grid-cols-2 gap-2 pb-2">
                            {Array.from({ length: Math.max(1, cuotas) }, (_, i) => (
                              <div
                                key={i + 1}
                                className={darkMode ? "flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2.5" : "flex items-center justify-between bg-white/80 border border-white rounded-xl p-2.5"}
                              >
                                <div className={darkMode ? "w-6 h-6 rounded-full bg-slate-800 shrink-0 flex items-center justify-center text-[11px] font-bold text-slate-300" : "w-6 h-6 rounded-full bg-slate-100 shrink-0 flex items-center justify-center text-[11px] font-bold text-slate-600"}>
                                  {i + 1}
                                </div>
                                <span className="font-extrabold text-sm truncate pl-2">
                                  {formatARS(resultado.valorCuota)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={darkMode ? "bg-slate-950 border border-slate-800 rounded-[2rem] p-6 text-center mt-auto" : "bg-gradient-to-br from-[#007AFF]/5 to-[#007AFF]/10 border border-[#007AFF]/20 rounded-[2rem] p-6 text-center mt-auto"}>
                      <div className={darkMode ? "w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-800" : "w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md border border-[#007AFF]/10"}>
                        <CheckCircle2 className="text-[#007AFF]" size={28} />
                      </div>
                      <h4 className="font-extrabold mb-1 text-lg">Pago único</h4>
                      <p className={darkMode ? "text-sm text-slate-400 font-medium" : "text-sm text-slate-600 font-medium"}>
                        Cobro de contado en una sola exhibición sin intereses financieros.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 space-y-3">
                    <div className={darkMode ? "rounded-2xl border border-slate-800 bg-slate-950 p-4" : "rounded-2xl border border-slate-200 bg-white p-4"}>
                      <div className="text-sm text-slate-500">USD origen / actual</div>
                      <div className="text-base font-bold">
                        {formatRawNumber(usdCalc.originValue)} / {formatRawNumber(usdCalc.latestValue)}
                      </div>
                    </div>

                    <div className={darkMode ? "rounded-2xl border border-slate-800 bg-slate-950 p-4" : "rounded-2xl border border-slate-200 bg-white p-4"}>
                      <div className="text-sm text-slate-500">UVA origen / actual</div>
                      <div className="text-base font-bold">
                        {formatRawNumber(uvaCalc.originValue)} / {formatRawNumber(uvaCalc.latestValue)}
                      </div>
                    </div>

                    <div className={darkMode ? "rounded-2xl border border-slate-800 bg-slate-950 p-4" : "rounded-2xl border border-slate-200 bg-white p-4"}>
                      <div className="text-sm text-slate-500">IPC origen / actual</div>
                      <div className="text-base font-bold">
                        {formatRawNumber(ipcCalc.originValue)} / {formatRawNumber(ipcCalc.latestValue)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}