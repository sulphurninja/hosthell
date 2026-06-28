import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/orderModel";
import { isAdvpsOrder } from "@/lib/orderAutomation";

export const maxDuration = 120;

const OCEANLINUX_URL =
  process.env.NEXT_PUBLIC_OCEANLINUX_URL || "https://oceanlinux.com";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

/* ------------------------------------------------------------------ */
/*  Proxy to OceanLinux internal endpoints                             */
/* ------------------------------------------------------------------ */

async function proxyOceanlinux(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${OCEANLINUX_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_API_KEY,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(
      (data as any).message ||
        (data as any).error ||
        `OceanLinux proxy failed: ${res.status}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function proxyAdvpsAction(orderId: string, action: string, payload?: any) {
  return proxyOceanlinux("/api/internal/advps-action", {
    orderId,
    action,
    payload,
  });
}

function proxyServiceAction(
  orderId: string,
  action: string,
  extra?: Record<string, unknown>
) {
  return proxyOceanlinux("/api/internal/service-action", {
    orderId,
    action,
    ...extra,
  });
}

/* ------------------------------------------------------------------ */
/*  Sync order fields from proxy response back to DB                   */
/* ------------------------------------------------------------------ */

const SYNC_FIELDS = [
  "ipAddress", "username", "password", "os",
  "provisioningStatus", "provisioningError", "lastSyncTime",
  "advpsRebuildCount", "advpsRebuildCountMonth",
  "status", "advpsOrderId", "advpsServiceId",
] as const;

function pickSyncFields(remote: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of SYNC_FIELDS) {
    if (remote[k] !== undefined && remote[k] !== null) out[k] = remote[k];
  }
  return out;
}

async function syncFromProxyResult(orderId: string, proxyResult: any, action: string) {
  const patch: Record<string, unknown> = {
    lastAction: action,
    lastActionTime: new Date(),
  };
  if (proxyResult?.order) Object.assign(patch, pickSyncFields(proxyResult.order));
  const r = proxyResult?.result;
  if (r && typeof r === "object") {
    if ((r.newPassword || r.password) && !patch.password) patch.password = r.newPassword || r.password;
    if (r.newOs && !patch.os) patch.os = r.newOs;
    if (r.newUsername && !patch.username) patch.username = r.newUsername;
    if (r.credentialsUpdated && r.order) Object.assign(patch, pickSyncFields(r.order));
  }
  if (action === "sync" || action === "status") patch.lastSyncTime = new Date();
  await Order.findByIdAndUpdate(orderId, { $set: patch });
}

/* ------------------------------------------------------------------ */
/*  Power state normalizer                                             */
/* ------------------------------------------------------------------ */

function normalizePower(data: any): string {
  const check = (v: any): string => {
    if (v === undefined || v === null || v === "") return "unknown";
    const s = String(v).toLowerCase().trim();
    if (["running", "online", "started", "active", "on", "1"].includes(s)) return "running";
    if (["stopped", "offline", "shutdown", "off", "0", "inactive"].includes(s)) return "stopped";
    if (["suspended", "paused"].includes(s)) return "suspended";
    if (["installing", "rebooting", "starting", "stopping", "busy"].includes(s)) return "busy";
    return s || "unknown";
  };

  if (data?.powerState && data.powerState !== "unknown") return data.powerState;
  if (data?.result?.powerState && data.result.powerState !== "unknown") return data.result.powerState;

  const directCandidates = [
    data?.PowerStatus, data?.powerStatus, data?.MachineStatus,
    data?.status, data?.state, data?.power,
    data?.result?.PowerStatus, data?.result?.powerStatus,
    data?.result?.status, data?.result?.state, data?.result?.power,
    data?.result?.vmStatus?.status, data?.result?.runningStatus,
    data?.result?.service?.status, data?.result?.service?.runningStatus,
    data?.order?.status,
  ];
  for (const c of directCandidates) {
    if (c !== undefined && c !== null && c !== "") {
      const checked = check(c);
      if (checked !== "unknown") return checked;
    }
  }

  const raw = data?.rawStatus;
  if (!raw) return "unknown";
  if (typeof raw === "string") return check(raw);
  if (typeof raw === "object") {
    const nested = [
      raw.PowerStatus, raw.MachineStatus,
      raw.vmStatus?.status, raw.runningStatus,
      raw.service?.runningStatus, raw.service?.status,
      raw.status, raw.state, raw.power,
      raw.data?.status, raw.data?.state,
    ];
    for (const n of nested) {
      if (n !== undefined && n !== null && n !== "") {
        const checked = check(n);
        if (checked !== "unknown") return checked;
      }
    }
  }
  return "unknown";
}

/* ------------------------------------------------------------------ */
/*  POST handler — pure thin proxy, everything via OceanLinux          */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("panel_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    if (!INTERNAL_API_KEY) {
      return NextResponse.json({ success: false, error: "Server automation not configured (INTERNAL_API_KEY missing)" }, { status: 503 });
    }

    await connectDB();

    const orderId = sessionCookie.value;
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, templateId, newPassword, payload } = body;
    if (!action) {
      return NextResponse.json({ success: false, error: "action is required" }, { status: 400 });
    }

    const orderPlain = order.toObject ? order.toObject() : order;
    const isAdvps = isAdvpsOrder(orderPlain) && !!order.advpsServiceId;

    console.log(`[PANEL-ACTION] Order ${orderId}: action=${action}, provider=${order.provider}, isAdvps=${isAdvps}, ip=${order.ipAddress}`);

    let proxyResult: any;

    /* ============================================================ */
    /*  1) ADVPS → OceanLinux /api/internal/advps-action             */
    /* ============================================================ */
    if (isAdvps) {
      try {
        const advpsAction = action === "rebuild" ? "format" : action;
        proxyResult = await proxyAdvpsAction(orderId, advpsAction, payload || { templateId, os: body.os || body.osType });
      } catch (e: any) {
        const status = typeof e.status === "number" ? e.status : 500;
        return NextResponse.json({ success: false, error: e.message, code: e.data?.code, message: e.data?.message }, { status });
      }

    /* ============================================================ */
    /*  2) All others → OceanLinux /api/internal/service-action       */
    /* ============================================================ */
    } else {
      try {
        proxyResult = await proxyServiceAction(orderId, action, {
          templateId, newPassword, payload, os: body.os, osType: body.osType,
        });
      } catch (e: any) {
        const status = typeof e.status === "number" ? e.status : 500;
        return NextResponse.json({ success: false, error: e.message, code: e.data?.code, message: e.data?.message }, { status });
      }
    }

    /* ============================================================ */
    /*  3) Sync response data back to shared DB                      */
    /* ============================================================ */
    await syncFromProxyResult(orderId, proxyResult, action);

    /* ============================================================ */
    /*  4) Re-read order from shared DB (always fresh)               */
    /* ============================================================ */
    const freshOrder = await Order.findById(orderId)
      .select("ipAddress username password os provisioningStatus status lastSyncTime")
      .lean();

    const powerState = normalizePower(proxyResult);

    /* ============================================================ */
    /*  5) Build response                                            */
    /* ============================================================ */
    if (action === "templates") {
      return NextResponse.json({
        success: true,
        result: proxyResult?.result || proxyResult,
        ...(proxyResult?.vpsId ? { vpsId: proxyResult.vpsId } : {}),
        ...(proxyResult?.raw ? { raw: proxyResult.raw } : {}),
      });
    }

    if (action === "status" || action === "sync" || action === "pullpassword") {
      return NextResponse.json({
        success: proxyResult?.success !== false,
        powerState,
        rawStatus: proxyResult?.rawStatus,
        provider: proxyResult?.provider || "oceanlinux",
        lastSync: new Date().toISOString(),
        result: proxyResult?.result,
        order: freshOrder,
        syncResult: proxyResult?.syncResult,
      });
    }

    if (action === "generatepassword") {
      return NextResponse.json({
        success: proxyResult?.success !== false,
        powerState,
        result: proxyResult?.result,
        order: freshOrder,
        message: proxyResult?.result?.message || "Password generated",
        code: proxyResult?.code,
      });
    }

    if (action === "resetmac" || action === "reset-mac") {
      return NextResponse.json({
        success: proxyResult?.success !== false,
        result: proxyResult?.result || proxyResult,
      });
    }

    return NextResponse.json({
      success: proxyResult?.success !== false,
      result: proxyResult?.result || proxyResult,
      powerState: powerState !== "unknown" ? powerState : undefined,
      order: freshOrder,
    });
  } catch (error: any) {
    console.error("[PANEL-ACTION] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
