"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Server,
  Globe,
  Cpu,
  HardDrive,
  Calendar,
  Network,
  Copy,
  Eye,
  EyeOff,
  Play,
  Square,
  RotateCcw,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Power,
  Monitor,
  Lock,
  User,
  Trash2,
  Flame,
  Zap,
  Terminal,
  Clock,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";

interface OrderData {
  _id: string;
  productName: string;
  memory: string;
  price: number;
  ipAddress: string;
  username: string;
  password: string;
  os: string;
  expiryDate: string;
  provider: string;
  hostycareServiceId?: string;
  smartvpsServiceId?: string;
  advpsServiceId?: string;
  slotIpPackageId?: string;
  provisioningStatus: string;
  status: string;
  lastAction?: string;
  lastActionTime?: string;
  panelUsername?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [powerState, setPowerState] = useState<string>("unknown");
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [reinstallPassword, setReinstallPassword] = useState("");
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  const smartvpsOsOptions = [
    { value: "ubuntu", label: "Ubuntu" },
    { value: "centos", label: "CentOS" },
    { value: "2022", label: "Windows Server 2022" },
    { value: "2019", label: "Windows Server 2019" },
    { value: "2016", label: "Windows Server 2016" },
    { value: "2012", label: "Windows Server 2012" },
    { value: "11", label: "Windows 11" },
  ];
  const [selectedOs, setSelectedOs] = useState("");

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) setOrder(data.order);
      else router.push("/access-server");
    } catch {
      router.push("/access-server");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/server/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      const data = await res.json();
      if (data.powerState) setPowerState(data.powerState);
    } catch {
      setPowerState("unknown");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (!order || order.provider === "smartvps") return;
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/server/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "templates" }),
      });
      const data = await res.json();
      if (data.success && data.result) setTemplates(data.result);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, [order]);

  const isAutoProvisioned = useCallback((o: OrderData | null) => {
    if (!o) return false;
    return !!(
      (o.provider === "hostycare" && o.hostycareServiceId) ||
      (o.provider === "smartvps" && (o.smartvpsServiceId || o.ipAddress)) ||
      (o.provider === "advps" && o.advpsServiceId)
    );
  }, []);

  const fetchPendingRequest = useCallback(async () => {
    try {
      const res = await fetch("/api/server/request-status");
      const data = await res.json();
      if (data.success && data.hasRequest) {
        setPendingRequest(data.request);
      } else {
        setPendingRequest(null);
      }
    } catch {
      console.error("Failed to fetch pending request");
    }
  }, []);

  const requestServerAction = async (action: string) => {
    const confirmed = confirm(
      `Request "${action}" action? An admin will review your request and perform the action.`
    );
    if (!confirmed) return;

    setRequestLoading(true);
    try {
      const res = await fetch("/api/server/request-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `${action} request submitted`);
        fetchPendingRequest();
      } else {
        toast.error(data.error || `Failed to submit ${action} request`);
      }
    } catch {
      toast.error(`Failed to submit ${action} request`);
    } finally {
      setRequestLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [fetchOrder]);
  useEffect(() => {
    if (order) {
      if (isAutoProvisioned(order)) {
        fetchStatus();
      } else {
        fetchPendingRequest();
      }
    }
  }, [order, fetchStatus, fetchPendingRequest, isAutoProvisioned]);

  const performAction = async (action: string, extraPayload?: any) => {
    setActionLoading(action);
    try {
      const res = await fetch("/api/server/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraPayload }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.result?.message || `${action} command sent`);
        setTimeout(fetchStatus, 3000);
      } else {
        toast.error(data.error || `${action} failed`);
      }
    } catch {
      toast.error(`${action} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReinstall = async () => {
    if (order?.provider === "smartvps") {
      if (!selectedOs) { toast.error("Select an OS"); return; }
      await performAction("changeos", { osType: selectedOs });
    } else {
      if (!selectedTemplate) { toast.error("Select a template"); return; }
      await performAction("reinstall", { templateId: selectedTemplate, newPassword: reinstallPassword || undefined });
    }
  };

  const cp = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const getPowerBadge = () => {
    switch (powerState) {
      case "running":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">Online</Badge>;
      case "stopped":
        return <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 font-medium">Offline</Badge>;
      case "suspended":
        return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Suspended</Badge>;
      case "busy":
        return <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">Busy</Badge>;
      default:
        return <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">Unknown</Badge>;
    }
  };

  const getOrderStatusBadge = () => {
    const s = order?.status?.toLowerCase() || "";
    if (s === "active")
      return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">Active</Badge>;
    if (s === "confirmed" || s === "paid")
      return <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium capitalize">{order?.status}</Badge>;
    if (s === "pending")
      return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Pending</Badge>;
    if (s === "failed" || s === "invalid")
      return <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 font-medium capitalize">{order?.status}</Badge>;
    if (s === "expired")
      return <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">Expired</Badge>;
    return <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium capitalize">{order?.status || "Unknown"}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Flame className="h-8 w-8 text-red-500 animate-pulse" />
      </div>
    );
  }

  if (!order) return null;

  const isSmartVps = order.provider === "smartvps";
  const isAdvps = order.provider === "advps" || !!order.advpsServiceId;
  const isManual = !isAutoProvisioned(order);
  const daysLeft = order.expiryDate
    ? Math.ceil((new Date(order.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Server Overview */}
      <HellCard icon={<Server className="h-5 w-5" />} title="Server Overview" desc="Your server details and status">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatItem icon={<Monitor className="h-4 w-4" />} label="Product" value={order.productName} />
          <StatItem icon={<Globe className="h-4 w-4" />} label="IP Address" value={order.ipAddress || "Pending"} onCopy={order.ipAddress ? () => cp(order.ipAddress, "IP") : undefined} />
          <StatItem icon={<Cpu className="h-4 w-4" />} label="OS" value={order.os} />
          <StatItem icon={<HardDrive className="h-4 w-4" />} label="Memory" value={order.memory} />
          <StatItem icon={<Server className="h-4 w-4" />} label="Provider" value={isManual ? "OceanLinux" : (order.provider || "hostycare")} />
          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <Calendar className="h-4 w-4 text-zinc-500 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Expires</p>
              <p className="text-sm font-medium text-zinc-200">
                {order.expiryDate ? new Date(order.expiryDate).toLocaleDateString() : "N/A"}
              </p>
              {daysLeft !== null && (
                <p className={`text-[11px] mt-0.5 ${daysLeft <= 3 ? "text-red-400" : daysLeft <= 7 ? "text-amber-400" : "text-zinc-500"}`}>
                  {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? "Expires today" : "Expired"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <Power className="h-4 w-4 text-zinc-500 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {statusLoading ? <Loader2 className="h-3 w-3 animate-spin text-zinc-400" /> : isManual ? getOrderStatusBadge() : getPowerBadge()}
              </div>
            </div>
          </div>
        </div>
      </HellCard>

      {/* Connection Details */}
      {order.ipAddress && order.username && (
        <HellCard icon={<Network className="h-5 w-5" />} title="Connection Details" desc="Credentials to connect to your server">
          <div className="space-y-2.5">
            <CredRow icon={<Globe className="h-4 w-4" />} label="IP Address" value={order.ipAddress} onCopy={() => cp(order.ipAddress, "IP")} />
            <CredRow icon={<User className="h-4 w-4" />} label="Username" value={order.username} onCopy={() => cp(order.username, "Username")} />
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                <span className="text-xs text-zinc-500">Password:</span>
                <code className="font-mono text-sm text-zinc-200 font-medium">
                  {showPassword ? order.password : "••••••••••••"}
                </code>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200" onClick={() => cp(order.password, "Password")}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {order.os && !order.os.toLowerCase().includes("windows") && (
              <div className="p-3 rounded-lg bg-black/40 border border-zinc-800">
                <p className="text-[11px] text-zinc-500 mb-1 uppercase tracking-wider">Quick Connect</p>
                <div className="flex items-center justify-between">
                  <code className="text-red-400 font-mono text-sm">
                    ssh {order.username}@{order.ipAddress}
                  </code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
                    onClick={() => cp(`ssh ${order.username}@${order.ipAddress}`, "SSH command")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </HellCard>
      )}

      {/* Server Control */}
      <div id="control" className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
        <div className="p-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Server Control</h2>
              <p className="text-xs text-zinc-500">
                {isManual ? "Request server actions — admin will review and process" : "Power management and configuration"}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">

          {/* ===== MANUAL ORDERS: Request-based actions ===== */}
          {isManual ? (
            <>
              {pendingRequest && (
                <div className={`p-4 rounded-lg border ${
                  pendingRequest.status === "pending"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : pendingRequest.status === "approved"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {pendingRequest.status === "pending" && <Clock className="h-4 w-4 text-amber-400" />}
                    {pendingRequest.status === "approved" && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                    {pendingRequest.status === "rejected" && <XCircle className="h-4 w-4 text-red-400" />}
                    <span className="text-sm font-medium text-zinc-200 capitalize">
                      {pendingRequest.action} request — {pendingRequest.status}
                    </span>
                  </div>
                  {pendingRequest.adminNotes && (
                    <p className="text-xs text-zinc-400 mt-1">Admin: {pendingRequest.adminNotes}</p>
                  )}
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Submitted {new Date(pendingRequest.requestedAt).toLocaleString()}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Request Server Actions</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    onClick={() => requestServerAction("start")}
                    disabled={requestLoading || (pendingRequest?.status === "pending")}
                    className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"
                  >
                    {requestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Request Start
                  </Button>
                  <Button
                    onClick={() => requestServerAction("stop")}
                    disabled={requestLoading || (pendingRequest?.status === "pending")}
                    className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20"
                  >
                    {requestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                    Request Stop
                  </Button>
                  <Button
                    onClick={() => requestServerAction("restart")}
                    disabled={requestLoading || (pendingRequest?.status === "pending")}
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    {requestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                    Request Restart
                  </Button>
                  <Button
                    onClick={() => requestServerAction("format")}
                    disabled={requestLoading || (pendingRequest?.status === "pending")}
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    {requestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Request Format
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-3">
                  Submit a request and an admin will process it shortly.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* ===== AUTO-PROVISIONED: Direct actions ===== */}
              <div>
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Power Management</h3>
                <div className="flex flex-wrap gap-2.5">
                  <Button onClick={() => performAction("start")} disabled={actionLoading !== null}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                    {actionLoading === "start" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Start
                  </Button>
                  <Button onClick={() => performAction("stop")} disabled={actionLoading !== null}
                    className="bg-red-600 hover:bg-red-700 text-white border-0">
                    {actionLoading === "stop" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                    Stop
                  </Button>
                  <Button variant="outline" onClick={() => performAction("restart")} disabled={actionLoading !== null}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600">
                    {actionLoading === "restart" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                    Restart
                  </Button>
                  <Button variant="outline" onClick={fetchStatus} disabled={statusLoading}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600">
                    {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Sync
                  </Button>
                </div>
              </div>

              {/* Format - SmartVPS only (ADVPS uses the Reinstall section below) */}
              {isSmartVps && (
                <div>
                  <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Format Server</h3>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700 text-white border-0" disabled={actionLoading !== null}>
                        {actionLoading === "format" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Format Server
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-white">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          Format Server
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will erase all data and reset to factory state. Cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => performAction("format")}>
                          Format
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {/* Reinstall / Rebuild */}
              {!isSmartVps && (
              <div>
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                  {isAdvps ? "Rebuild Server" : "Reinstall OS"}
                </h3>

                <div className="space-y-3 max-w-md">
                  <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={templatesLoading}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 mb-1">
                    {templatesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {isAdvps ? "Load OS Options" : "Load Templates"}
                  </Button>

                  {Object.keys(templates).length > 0 && (
                    <>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                          <SelectValue placeholder="Select operating system" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                          {Object.entries(templates).map(([id, name]) => (
                            <SelectItem key={id} value={id} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isAdvps && (
                        <div className="space-y-1.5">
                          <Label htmlFor="reinstallPwd" className="text-xs text-zinc-400">New Password (optional)</Label>
                          <Input id="reinstallPwd" type="text" placeholder="Auto-generated if empty"
                            value={reinstallPassword} onChange={(e) => setReinstallPassword(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600" />
                        </div>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" disabled={!selectedTemplate || actionLoading !== null}
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                            <HardDrive className="mr-2 h-4 w-4" />{isAdvps ? "Rebuild Server" : "Reinstall OS"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-white">
                              <AlertTriangle className="h-5 w-5 text-red-500" />{isAdvps ? "Rebuild Server" : "Reinstall OS"}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                              All data will be erased and the server will be rebuilt with the selected OS. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={isAdvps ? () => performAction("format", { payload: { templateId: selectedTemplate } }) : handleReinstall}>
                              {isAdvps ? "Rebuild" : "Reinstall"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Helper components ---- */

function HellCard({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      <div className="p-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">{icon}</div>
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-xs text-zinc-500">{desc}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatItem({ icon, label, value, onCopy }: { icon: React.ReactNode; label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
      <div className="text-zinc-500 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-zinc-200 truncate">{value}</p>
          {onCopy && (
            <button onClick={onCopy} className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0">
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CredRow({ icon, label, value, onCopy }: { icon: React.ReactNode; label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
      <div className="flex items-center gap-2 min-w-0">
        <div className="text-zinc-500 flex-shrink-0">{icon}</div>
        <span className="text-xs text-zinc-500">{label}:</span>
        <code className="font-mono text-sm text-zinc-200 font-medium">{value}</code>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200 flex-shrink-0" onClick={onCopy}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
