import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/orderModel";
import { execSync } from "child_process";

const HostycareAPI = require("@/services/hostycareApi");
const SmartVpsAPI = require("@/services/smartvpsApi");
import { VirtualizorAPI } from "@/services/virtualizorApi";

const OCEANLINUX_URL = process.env.NEXT_PUBLIC_OCEANLINUX_URL || "https://oceanlinux.com";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

async function proxyAdvpsAction(orderId: string, action: string) {
  const res = await fetch(`${OCEANLINUX_URL}/api/internal/advps-action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_API_KEY,
    },
    body: JSON.stringify({ orderId, action }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok && !data.success) {
    throw new Error(data.error || `Proxy ADVPS action failed: ${res.status}`);
  }
  return data;
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
      // Proxy all ADVPS actions through oceanlinux
      try {
        const proxyResult = await proxyAdvpsAction(orderId!, action);
        if (action === "status") {
          return NextResponse.json(proxyResult);
        }
        return NextResponse.json({ success: true, result: proxyResult.result || proxyResult });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
      }
    } else if (isSmartVps) {
      smartvpsApi = new SmartVpsAPI();
    } else if (order.provider === "hostycare" || !order.provider) {
      hostycareApi = new HostycareAPI();
      if (action === "reinstall" || action === "templates") {
        virtualizorApi = new VirtualizorAPI();
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
