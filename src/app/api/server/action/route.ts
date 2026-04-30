import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/orderModel";
import IPStock from "@/models/ipStockModel";
import Company from "@/models/companyModel";
import { execSync } from "child_process";

const HostycareAPI = require("@/services/hostycareApi");
const SmartVpsAPI = require("@/services/smartvpsApi");
import { VirtualizorAPI } from "@/services/virtualizorApi";
import {
  getCompanyVirtualizorAccounts,
  toVirtualizorApiAccounts,
} from "@/lib/companyVirtualizor";

const OCEANLINUX_URL = process.env.NEXT_PUBLIC_OCEANLINUX_URL || "https://oceanlinux.com";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

/**
 * Resolve every per-company Virtualizor panel configured against the order's
 * IP stock, in priority order. Returns an empty array when the order isn't
 * linked to a company that has Virtualizor automation enabled — callers
 * should fall back to the regular provider/manual flow in that case.
 *
 * Mirrors the OceanLinux service-action helper so both panels resolve the
 * same Mongo `Company` document identically.
 */
async function resolveCompanyVirtualizorAccounts(order: any) {
  if (!order?.ipStockId) return { accounts: [], companyName: null as string | null };
  try {
    const ipStock = await IPStock.findById(order.ipStockId).select("company").lean();
    if (!(ipStock as any)?.company) return { accounts: [], companyName: null };
    const company = await Company.findById((ipStock as any).company)
      .select("virtualizors virtualizor name")
      .lean();
    if (!company) return { accounts: [], companyName: null };
    const accounts = getCompanyVirtualizorAccounts(company);
    return { accounts, companyName: (company as any).name as string | null };
  } catch (err: any) {
    console.error("[PANEL-ACTION] Company-Virtualizor lookup failed:", err.message);
    return { accounts: [], companyName: null };
  }
}

function normalizeVirtualizorRunningState(raw: any): string {
  if (!raw) return "unknown";
  if (typeof raw === "string") {
    const s = raw.toLowerCase().trim();
    if (["1", "running", "on", "online", "started", "active"].includes(s)) return "running";
    if (["0", "stopped", "off", "offline", "shutdown"].includes(s)) return "stopped";
    if (["suspended", "paused"].includes(s)) return "suspended";
    return s;
  }
  if (typeof raw === "number") return raw === 1 ? "running" : "stopped";
  if (typeof raw === "object") {
    const candidate = raw.status || raw.state || raw.power || raw.running;
    if (candidate !== undefined) return normalizeVirtualizorRunningState(candidate);
  }
  return "unknown";
}

/**
 * Walk Virtualizor's nested `oslist` and return metadata for a specific
 * template id: its friendly name, the distro bucket key (e.g. "windows" /
 * "ubuntu"), and the virtualization type bucket. Used after a company-
 * Virtualizor reinstall so we can sync `order.os` and `order.username` to
 * match the OS the user actually installed (e.g. Linux → Windows).
 */
function findTemplateMeta(oslist: any, templateId: string | number | null | undefined) {
  if (!oslist || typeof oslist !== "object" || templateId == null) return null;
  const targetId = String(templateId);
  for (const [virtType, distros] of Object.entries(oslist)) {
    if (!distros || typeof distros !== "object") continue;
    for (const [distroKey, templates] of Object.entries(distros as any)) {
      if (!templates || typeof templates !== "object") continue;
      for (const [tplId, tpl] of Object.entries(templates as any)) {
        if (String(tplId) !== targetId) continue;
        const name =
          (tpl && typeof tpl === "object" &&
            ((tpl as any).name || (tpl as any).filename || (tpl as any).desc || (tpl as any).title)) ||
          String(tplId);
        return {
          templateId: targetId,
          name: String(name),
          distro: String(distroKey),
          virtType: String(virtType),
        };
      }
    }
  }
  return null;
}

/**
 * Classify an OS template's family from the metadata + name. Returns the
 * canonical username (and family) so the order document stays in sync after
 * a cross-family reinstall (Linux → Windows or vice versa).
 */
function classifyOsFamily(tplMeta: { distro?: string; name?: string } | null) {
  if (!tplMeta) return { family: null as string | null, username: null as string | null };
  const haystack = [tplMeta.distro, tplMeta.name].filter(Boolean).join(" ").toLowerCase();
  if (/\b(windows|win\s*2k|win\s*server|winsrv|win\s*xp|win\s*7|win\s*8|win\s*10|win\s*11|server\s*200[38]|server\s*201[269]|server\s*202[0-9])\b/.test(haystack)) {
    return { family: "windows", username: "Administrator" };
  }
  if (/\b(ubuntu|debian|centos|rocky|almalinux|alma|fedora|rhel|redhat|linux|arch|opensuse|suse)\b/.test(haystack)) {
    return { family: "linux", username: "root" };
  }
  return { family: null, username: null };
}

async function proxyAdvpsAction(orderId: string, action: string, payload?: any) {
  const res = await fetch(`${OCEANLINUX_URL}/api/internal/advps-action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_API_KEY,
    },
    body: JSON.stringify({ orderId, action, payload }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as any).message || (data as any).error || `Proxy ADVPS action failed: ${res.status}`
    ) as Error & { status?: number; data?: any };
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data;
}

/** Match oceanlinux internal ADVPS power parsing when top-level powerState is missing. */
function normalizeAdvpsPowerFromRaw(raw: any): string {
  if (!raw || typeof raw !== "object") return "unknown";
  const vmSt =
    raw.vmStatus?.status ||
    raw.runningStatus ||
    raw.service?.runningStatus ||
    raw.service?.status ||
    raw.service?.vmStatus?.status ||
    "";
  if (typeof vmSt !== "string" || !vmSt) return "unknown";
  const sl = vmSt.toLowerCase();
  if (["running", "online", "started", "active"].includes(sl)) return "running";
  if (["stopped", "offline", "shutdown"].includes(sl)) return "stopped";
  if (["suspended", "paused"].includes(sl)) return "suspended";
  return sl;
}

function pickAdvpsOrderSyncFields(remote: Record<string, unknown>) {
  const keys = [
    "ipAddress",
    "username",
    "password",
    "os",
    "provisioningStatus",
    "provisioningError",
    "lastSyncTime",
    "advpsRebuildCount",
    "advpsRebuildCountMonth",
    "status",
    "advpsOrderId",
  ] as const;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = remote[k];
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

function generateSecurePassword() {
  const length = 20;
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "@#&$";
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function flattenOslist(oslist: any, virtFilter?: string) {
  const out: Record<string, string> = {};
  if (!oslist || typeof oslist !== "object") return out;

  const flattenDistros = (distroMap: any) => {
    if (!distroMap || typeof distroMap !== "object") return;
    for (const distro of Object.values(distroMap) as any[]) {
      if (!distro || typeof distro !== "object") continue;
      for (const [id, tpl] of Object.entries(distro) as [string, any][]) {
        if (!id || !tpl || typeof tpl !== "object") continue;
        const name = tpl.name || tpl.filename || tpl.desc || String(id);
        out[String(id)] = String(name);
      }
    }
  };

  if (virtFilter) {
    const key = String(virtFilter).toLowerCase();
    const match = Object.entries(oslist).find(([k]) => k.toLowerCase() === key);
    if (match) {
      flattenDistros(match[1]);
      return out;
    }
  }

  for (const virt of Object.values(oslist)) {
    flattenDistros(virt);
  }
  return out;
}

function isServerReachable(ip: string) {
  const cleanIp = ip.split(":")[0];
  const isWin = process.platform === "win32";
  const cmd = isWin
    ? `ping -n 1 -w 3000 ${cleanIp}`
    : `ping -c 1 -W 3 ${cleanIp}`;
  try {
    execSync(cmd, { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function guessHostnameFromOrder(order: any) {
  return order?.serverDetails?.rawDetails?.hostname || order?.hostname || undefined;
}

function getOrderFromCookie(request: NextRequest) {
  return request.cookies.get("panel_session")?.value || null;
}

export async function POST(request: NextRequest) {
  try {
    const orderId = getOrderFromCookie(request);
    if (!orderId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { action, templateId, newPassword, payload } = body;

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    let ipAddress = order.ipAddress || order.serverDetails?.rawDetails?.ips?.[0] || null;
    if (!ipAddress) {
      return NextResponse.json({ success: false, error: "No IP address found" }, { status: 400 });
    }

    let result: any;
    let virtualizorApi: any = null;
    let hostycareApi: any = null;
    let smartvpsApi: any = null;

    const isSmartVps =
      order.provider === "smartvps" ||
      (order.productName && order.productName.includes("🌊"));

    const isAdvps =
      (order.provider === "advps" || order.advpsServiceId || (order.productName && order.productName.includes("⚡")))
      && !!order.advpsServiceId;

    if (isAdvps) {
      try {
        const proxyResult = await proxyAdvpsAction(
          orderId!,
          action,
          payload || { templateId: templateId, os: body.os || body.osType }
        );
        if (action === "templates") {
          return NextResponse.json(proxyResult);
        }

        if (action === "status" || action === "sync") {
          let powerState = (proxyResult as any).powerState || "unknown";
          if (powerState === "unknown" && (proxyResult as any).rawStatus) {
            powerState = normalizeAdvpsPowerFromRaw((proxyResult as any).rawStatus);
          }

          if (action === "sync" && (proxyResult as any).order) {
            const patch = pickAdvpsOrderSyncFields((proxyResult as any).order as any);
            if (Object.keys(patch).length > 0) {
              await Order.findByIdAndUpdate(orderId, { $set: patch });
            }
          }

          return NextResponse.json({
            ...(proxyResult as object),
            success: (proxyResult as any).success !== false,
            powerState,
          });
        }

        return NextResponse.json({ success: true, result: (proxyResult as any).result || proxyResult });
      } catch (e: any) {
        const status = typeof e.status === "number" ? e.status : 500;
        return NextResponse.json(
          {
            success: false,
            error: e.message,
            code: e.data?.code,
            message: e.data?.message,
          },
          { status }
        );
      }
    } else if (isSmartVps) {
      smartvpsApi = new SmartVpsAPI();
    } else {
      // Any non-SmartVPS, non-ADVPS order without a real Hostycare service ID
      // is eligible for company-Virtualizor automation — covers pure
      // OceanLinux orders AND mislabeled "company" orders whose `provider`
      // was stamped as 'hostycare' but never received a serviceId. If a
      // company has Virtualizor panels configured, we route start/stop/
      // restart/status/sync/templates/reinstall through them. Hostycare
      // orders that DO have a serviceId fall straight through to the
      // existing HostycareAPI branch below — totally unaffected.
      if (!order.hostycareServiceId) {
        const { accounts: companyVirtAccounts } = await resolveCompanyVirtualizorAccounts(order);
        if (companyVirtAccounts.length > 0) {
          const supportedActions = new Set([
            "start",
            "stop",
            "restart",
            "status",
            "sync",
            "templates",
            "reinstall",
          ]);
          if (!supportedActions.has(action)) {
            return NextResponse.json(
              {
                success: false,
                error: `Action '${action}' is not supported for this order via Virtualizor automation.`,
              },
              { status: 400 }
            );
          }

          let companyApi: any;
          try {
            companyApi = new VirtualizorAPI({ accounts: toVirtualizorApiAccounts(companyVirtAccounts) });
          } catch (apiErr: any) {
            return NextResponse.json(
              {
                success: false,
                error: `Company Virtualizor configuration is invalid: ${apiErr.message}`,
              },
              { status: 500 }
            );
          }

          const hostname = guessHostnameFromOrder(order);
          const panelHostsLabel = companyVirtAccounts.map((a: any) => a.host).join(", ");
          const findVps = async () => {
            const found = await companyApi.findVpsId({ ip: ipAddress, hostname });
            if (!found) {
              const message = `No VPS visible for IP ${ipAddress} on any of the company's Virtualizor panels (${panelHostsLabel}).`;
              const err: any = new Error(message);
              err.status = 404;
              throw err;
            }
            return typeof found === "object" ? found : { vpsid: String(found), virt: null };
          };

          try {
            switch (action) {
              case "start": {
                const { vpsid } = await findVps();
                const apiRes = await companyApi.start(vpsid);
                await Order.findByIdAndUpdate(orderId, { lastAction: "start", lastActionTime: new Date() });
                return NextResponse.json({
                  success: true,
                  result: { success: true, message: "Start command sent (Virtualizor)", apiResponse: apiRes },
                });
              }
              case "stop": {
                const { vpsid } = await findVps();
                const apiRes = await companyApi.stop(vpsid);
                await Order.findByIdAndUpdate(orderId, { lastAction: "stop", lastActionTime: new Date() });
                return NextResponse.json({
                  success: true,
                  result: { success: true, message: "Stop command sent (Virtualizor)", apiResponse: apiRes },
                });
              }
              case "restart": {
                const { vpsid } = await findVps();
                const apiRes = await companyApi.restart(vpsid);
                await Order.findByIdAndUpdate(orderId, { lastAction: "restart", lastActionTime: new Date() });
                return NextResponse.json({
                  success: true,
                  result: { success: true, message: "Restart command sent (Virtualizor)", apiResponse: apiRes },
                });
              }
              case "status":
              case "sync": {
                let powerState = "unknown";
                let rawStatus: any = null;
                try {
                  const { vpsid } = await findVps();
                  const vmRecord = await companyApi.getVpsRecord(vpsid);
                  if (vmRecord) {
                    rawStatus =
                      vmRecord.status ?? vmRecord.state ?? vmRecord.running ?? vmRecord.power ?? null;
                    powerState = normalizeVirtualizorRunningState(rawStatus ?? vmRecord);
                  }
                } catch (lookupErr: any) {
                  console.warn(
                    "[PANEL-ACTION] Virtualizor status lookup failed; falling back to ping:",
                    lookupErr.message
                  );
                }
                if (powerState === "unknown" && ipAddress) {
                  powerState = isServerReachable(ipAddress) ? "running" : "stopped";
                }
                await Order.findByIdAndUpdate(orderId, { lastSyncTime: new Date() });
                return NextResponse.json({
                  success: true,
                  powerState,
                  rawStatus,
                  provider: "virtualizor",
                  lastSync: new Date().toISOString(),
                });
              }
              case "templates": {
                const { vpsid, virt } = await findVps();
                const tplRaw = await companyApi.getTemplates(vpsid);
                const vpsVirt =
                  virt || tplRaw?.virt || tplRaw?.info?.virt || tplRaw?.vs?.virt || null;
                const oslistData = tplRaw?.oslist || tplRaw?.os || tplRaw;
                const flat = flattenOslist(oslistData, vpsVirt);
                return NextResponse.json({ success: true, result: flat, vpsId: vpsid, raw: tplRaw });
              }
              case "reinstall": {
                const chosenTemplateId = templateId ?? payload?.templateId;
                const providedPwd = newPassword ?? payload?.password;
                if (!chosenTemplateId) {
                  return NextResponse.json(
                    { success: false, error: "templateId is required" },
                    { status: 400 }
                  );
                }
                const { vpsid } = await findVps();
                const pwd = providedPwd || generateSecurePassword();

                // Fetch the friendly name + family for the chosen template
                // BEFORE triggering the reinstall, so we can sync the
                // displayed OS / username on the order to whatever the user
                // actually picked (handles Linux ⇄ Windows transitions).
                let tplMeta: ReturnType<typeof findTemplateMeta> = null;
                try {
                  const tplRaw = await companyApi.getTemplates(vpsid);
                  const oslistData = tplRaw?.oslist || tplRaw?.os || tplRaw;
                  tplMeta = findTemplateMeta(oslistData, chosenTemplateId);
                } catch (tplErr: any) {
                  console.warn(
                    "[PANEL-ACTION] Pre-reinstall template metadata lookup failed:",
                    tplErr.message
                  );
                }
                const osClass = classifyOsFamily(tplMeta);

                const apiRes = await companyApi.reinstall(vpsid, chosenTemplateId, pwd);

                const update: any = {
                  $set: {
                    password: pwd,
                    lastAction: "reinstall",
                    lastActionTime: new Date(),
                  },
                };
                if (tplMeta?.name) update.$set.os = tplMeta.name;
                if (osClass.username) update.$set.username = osClass.username;

                await Order.findByIdAndUpdate(orderId, update);

                return NextResponse.json({
                  success: true,
                  result: {
                    accepted: true,
                    vpsId: vpsid,
                    templateId: chosenTemplateId,
                    message: "Reinstall submitted via company Virtualizor",
                    newPassword: pwd,
                    newOs: tplMeta?.name || null,
                    newUsername: osClass.username || null,
                    osFamily: osClass.family || null,
                    raw: apiRes,
                  },
                });
              }
            }
          } catch (virtErr: any) {
            console.error(
              `[PANEL-ACTION] Company-Virtualizor action '${action}' failed:`,
              virtErr.message
            );
            const status = typeof virtErr.status === "number" ? virtErr.status : 500;
            return NextResponse.json(
              { success: false, error: virtErr.message || "Virtualizor action failed" },
              { status }
            );
          }
        }
      }

      // No company-Virtualizor configured — fall through to the existing
      // Hostycare flow (this is the original branch, preserved verbatim).
      if (order.provider === "hostycare" || !order.provider) {
        hostycareApi = new HostycareAPI();
        if (action === "reinstall" || action === "templates") {
          virtualizorApi = new VirtualizorAPI();
        }
      }
    }

    switch (action) {
      case "start":
        if (smartvpsApi) {
          const apiRes = await smartvpsApi.start(ipAddress);
          result = { success: true, message: "Start command sent", apiResponse: apiRes };
        } else if (hostycareApi && order.hostycareServiceId) {
          const apiRes = await hostycareApi.startService(order.hostycareServiceId);
          result = { success: true, message: "Start command sent", apiResponse: apiRes };
        } else {
          throw new Error("No valid API configured");
        }
        break;

      case "stop":
        if (smartvpsApi) {
          const apiRes = await smartvpsApi.stop(ipAddress);
          result = { success: true, message: "Stop command sent", apiResponse: apiRes };
        } else if (hostycareApi && order.hostycareServiceId) {
          const apiRes = await hostycareApi.stopService(order.hostycareServiceId);
          result = { success: true, message: "Stop command sent", apiResponse: apiRes };
        } else {
          throw new Error("No valid API configured");
        }
        break;

      case "restart":
        if (smartvpsApi) {
          await smartvpsApi.stop(ipAddress);
          await new Promise((r) => setTimeout(r, 2000));
          const apiRes = await smartvpsApi.start(ipAddress);
          result = { success: true, message: "Restart command sent", apiResponse: apiRes };
        } else if (hostycareApi && order.hostycareServiceId) {
          const apiRes = await hostycareApi.rebootService(order.hostycareServiceId);
          result = { success: true, message: "Restart command sent", apiResponse: apiRes };
        } else {
          throw new Error("No valid API configured");
        }
        break;

      case "status": {
        if (smartvpsApi) {
          try {
            const apiRes = await smartvpsApi.status(ipAddress);
            let powerState = "unknown";
            const rawStatus = apiRes?.status || apiRes?.state || apiRes?.power || apiRes;
            if (typeof rawStatus === "string") {
              const sl = rawStatus.toLowerCase();
              if (["online", "running", "active", "started", "on", "1"].includes(sl)) powerState = "running";
              else if (["offline", "stopped", "inactive", "off", "0", "shutdown"].includes(sl)) powerState = "stopped";
              else powerState = sl;
            }
            return NextResponse.json({ success: true, powerState, rawStatus, provider: "smartvps", lastSync: new Date().toISOString() });
          } catch (e: any) {
            return NextResponse.json({ success: false, error: e.message, powerState: "unknown", provider: "smartvps" });
          }
        } else if (hostycareApi && order.hostycareServiceId) {
          try {
            let serviceInfo = null;
            let serviceDetails = null;
            try { serviceInfo = await hostycareApi.getServiceInfo(order.hostycareServiceId); } catch {}
            try { serviceDetails = await hostycareApi.getServiceDetails(order.hostycareServiceId); } catch {}

            let powerState = "unknown";
            let rawStatus: any = null;
            const extractStatus = (obj: any) => {
              if (!obj) return null;
              const direct = obj.domainstatus || obj.domainStatus || obj.status || obj.state || obj.power_status;
              if (direct) return direct;
              for (const key of ["data", "result", "vps", "server", "service"]) {
                if (obj[key]) {
                  const nested = obj[key].domainstatus || obj[key].domainStatus || obj[key].status || obj[key].state || obj[key].power_status;
                  if (nested) return nested;
                }
              }
              return null;
            };
            if (serviceInfo || serviceDetails) rawStatus = extractStatus(serviceInfo) || extractStatus(serviceDetails);

            if (rawStatus) {
              const sl = String(rawStatus).toLowerCase().trim();
              if (["online", "running", "active", "started", "on", "1", "true"].includes(sl)) powerState = "running";
              else if (["offline", "stopped", "inactive", "off", "0", "false", "shutdown", "terminated", "down"].includes(sl)) powerState = "stopped";
              else if (["suspended", "paused", "cancelled"].includes(sl)) powerState = "suspended";
              else powerState = sl;
            } else if (ipAddress) {
              const reachable = isServerReachable(ipAddress);
              powerState = reachable ? "running" : "stopped";
            }

            return NextResponse.json({ success: true, powerState, rawStatus, serviceInfo, serviceDetails, lastSync: new Date().toISOString() });
          } catch (e: any) {
            let fallback = "stopped";
            if (ipAddress) fallback = isServerReachable(ipAddress) ? "running" : "stopped";
            return NextResponse.json({ success: true, error: e.message, powerState: fallback });
          }
        }
        return NextResponse.json({ success: false, error: "No valid API configured", powerState: "unknown" });
      }

      case "format":
        if (smartvpsApi) {
          const apiRes = await smartvpsApi.format(ipAddress);
          result = { success: true, message: "Format command sent", apiResponse: apiRes };
        } else {
          throw new Error("Format is not available for this provider");
        }
        break;

      case "changeos": {
        if (!smartvpsApi) throw new Error("changeOS is only available for SmartVPS");
        const osType = body.osType || body.os || payload?.os;
        if (!osType) throw new Error("OS type is required");
        const apiRes = await smartvpsApi.changeOS(ipAddress, osType);
        result = { success: true, message: `OS change to ${osType} sent`, apiResponse: apiRes };
        break;
      }

      case "reinstall": {
        if (!virtualizorApi) {
          return NextResponse.json({ success: false, error: "Virtualizor required for reinstall" }, { status: 400 });
        }
        const chosenTemplateId = templateId ?? payload?.templateId;
        const providedPwd = newPassword ?? payload?.password;
        if (!chosenTemplateId) {
          return NextResponse.json({ success: false, error: "templateId is required" }, { status: 400 });
        }
        try {
          const hostname = guessHostnameFromOrder(order);
          const vpsResult = await virtualizorApi.findVpsId({ ip: ipAddress, hostname });
          if (!vpsResult) {
            return NextResponse.json({ success: false, error: `No VPS visible for IP ${ipAddress}` }, { status: 404 });
          }
          const vpsid = typeof vpsResult === "object" ? vpsResult.vpsid : vpsResult;
          const pwd = providedPwd || generateSecurePassword();
          const apiRes = await virtualizorApi.reinstall(vpsid, chosenTemplateId, pwd);

          await Order.findByIdAndUpdate(orderId, {
            $set: { password: pwd, lastAction: "reinstall", lastActionTime: new Date() },
          });

          return NextResponse.json({
            success: true,
            result: { accepted: true, vpsId: vpsid, templateId: chosenTemplateId, message: "Reinstall submitted", newPassword: pwd, raw: apiRes },
          });
        } catch (error: any) {
          return NextResponse.json({ success: false, error: `Reinstall failed: ${error.message}` }, { status: 500 });
        }
      }

      case "templates": {
        if (!virtualizorApi) {
          return NextResponse.json({ success: false, error: "Virtualizor not available" }, { status: 400 });
        }
        try {
          const hostname = guessHostnameFromOrder(order);
          const vpsResult = await virtualizorApi.findVpsId({ ip: ipAddress, hostname });
          if (!vpsResult) {
            return NextResponse.json({ success: false, error: `No VPS visible for IP ${ipAddress}` }, { status: 404 });
          }
          const vpsid = typeof vpsResult === "object" ? vpsResult.vpsid : vpsResult;
          const vpsVirtFromFind = typeof vpsResult === "object" ? vpsResult.virt : null;
          const tplRaw = await virtualizorApi.getTemplates(vpsid);
          const vpsVirt = vpsVirtFromFind || tplRaw?.virt || tplRaw?.info?.virt || tplRaw?.vs?.virt || null;
          const oslistData = tplRaw?.oslist || tplRaw?.os || tplRaw;
          const flat = flattenOslist(oslistData, vpsVirt);
          return NextResponse.json({ success: true, result: flat, vpsId: vpsid, raw: tplRaw });
        } catch (error: any) {
          return NextResponse.json({ success: false, error: `Failed to fetch templates: ${error.message}` }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    await Order.findByIdAndUpdate(orderId, { lastAction: action, lastActionTime: new Date() });
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[PANEL-ACTION] Error:", error.message);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
