import querystring from "querystring";
import https from "https";

/**
 * Multi-account Virtualizor enduser client.
 * - Searches across multiple panels to resolve a vpsid by IP/hostname.
 * - Caches vpsid -> accountIndex for follow-up calls (getTemplates/reinstall).
 *
 * SSL certificate validation is disabled for servers with self-signed certificates.
 */
export class VirtualizorAPI {
  /**
   * @param {{ accounts?: Array<{ host: string; port?: number; key: string; pass: string; protocol?: 'http'|'https' }> }} [opts]
   * Pass `accounts` to use an explicit set of panels (e.g. a single per-company
   * panel pulled from the DB). When omitted, accounts are loaded from env vars
   * for back-compat with the existing Hostycare reinstall/templates flow.
   */
  constructor(opts = {}) {
    if (Array.isArray(opts?.accounts) && opts.accounts.length > 0) {
      this.accounts = opts.accounts
        .filter(a => a && a.host && a.key && a.pass)
        .map(a => ({
          host: a.host,
          port: Number(a.port || 4083),
          key: a.key,
          pass: a.pass,
          protocol: a.protocol || 'https',
        }));
    } else {
      this.accounts = this._loadAccountsFromEnv();
    }

    if (!this.accounts.length) {
      throw new Error("VirtualizorAPI: VIRTUALIZOR_HOST/KEY/PASSWORD missing");
    }

    this._vpsAccountCache = new Map();

    console.log(`[VirtualizorAPI] Loaded ${this.accounts.length} accounts:`);
    this.accounts.forEach((acct, i) => {
      console.log(`[VirtualizorAPI] Account ${i}: ${acct.protocol}://${acct.host}:${acct.port}`);
    });
  }

  // -------------------- env parsing --------------------
  _loadAccountsFromEnv() {
    const out = [];

    for (let i = 1; i <= 10; i++) {
      const host = process.env[`VIRTUALIZOR_HOST_${i}`];
      const key = process.env[`VIRTUALIZOR_API_KEY_${i}`];
      const pass = process.env[`VIRTUALIZOR_API_PASSWORD_${i}`];
      if (host && key && pass) {
        const port = Number(process.env[`VIRTUALIZOR_PORT_${i}`] || 4083);
        const protocol = process.env[`VIRTUALIZOR_PROTOCOL_${i}`] || 'https';
        out.push({ host, port, key, pass, protocol });
      }
    }
    if (out.length) return out;

    const hostsCsv = process.env.VIRTUALIZOR_HOSTS;
    const keysCsv = process.env.VIRTUALIZOR_API_KEYS;
    const passCsv = process.env.VIRTUALIZOR_API_PASSWORDS;
    if (hostsCsv && keysCsv && passCsv) {
      const hosts = hostsCsv.split(",").map(s => s.trim()).filter(Boolean);
      const keys = keysCsv.split(",").map(s => s.trim()).filter(Boolean);
      const passes = passCsv.split(",").map(s => s.trim()).filter(Boolean);
      const ports = (process.env.VIRTUALIZOR_PORTS || "")
        .split(",")
        .map(s => s.trim())
        .map(s => Number(s || 4083));
      const protocols = (process.env.VIRTUALIZOR_PROTOCOLS || "")
        .split(",")
        .map(s => s.trim().toLowerCase() || 'https');

      const n = Math.min(hosts.length, keys.length, passes.length);
      for (let i = 0; i < n; i++) {
        out.push({
          host: hosts[i],
          key: keys[i],
          pass: passes[i],
          port: ports[i] || 4083,
          protocol: protocols[i] || 'https',
        });
      }
    }
    if (out.length) return out;

    const host = process.env.VIRTUALIZOR_HOST;
    const key = process.env.VIRTUALIZOR_API_KEY;
    const pass = process.env.VIRTUALIZOR_API_PASSWORD;
    const port = Number(process.env.VIRTUALIZOR_PORT || 4083);
    const protocol = process.env.VIRTUALIZOR_PROTOCOL || 'https';
    if (host && key && pass) {
      out.push({ host, key, pass, port, protocol });
    }

    return out;
  }

  // -------------------- low-level per-account call --------------------
  _qsAuth(acct) {
    return `apikey=${encodeURIComponent(acct.key)}&apipass=${encodeURIComponent(acct.pass)}`;
  }

  _baseUrl(acct) {
    const protocol = acct.protocol || 'https';
    return `${protocol}://${acct.host}:${acct.port}/index.php?api=json&${this._qsAuth(acct)}`;
  }

  async _call(accountIndex, path, post, retries = 2) {
    const acct = this.accounts[accountIndex];
    if (!acct) throw new Error(`Virtualizor account[${accountIndex}] not found`);

    const url = `${this._baseUrl(acct)}&${path}`;
    console.log(`[VirtualizorAPI][Account ${accountIndex}] Making ${post ? 'POST' : 'GET'} request to: ${acct.host}:${acct.port}`);
    console.log(`[VirtualizorAPI][Account ${accountIndex}] Path: ${path}`);
    if (post) {
      console.log(`[VirtualizorAPI][Account ${accountIndex}] POST data:`, Object.keys(post));
    }

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const startTime = Date.now();
        const data = await this._makeHttpsRequest(url, post, accountIndex);
        const duration = Date.now() - startTime;
        console.log(`[VirtualizorAPI][Account ${accountIndex}] Request completed in ${duration}ms`);
        return data;
      } catch (error) {
        console.error(`[VirtualizorAPI][Account ${accountIndex}] Attempt ${attempt} failed:`, error.message);
        if (attempt === retries + 1) {
          throw new Error(`Virtualizor ${acct.host} failed after ${retries + 1} attempts: ${error.message}`);
        }
        const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Make HTTPS request using native Node.js https module with SSL certificate bypass
   * This works around Next.js fetch() not supporting custom agents
   */
  _makeHttpsRequest(url, postData, accountIndex) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const postBody = postData ? querystring.stringify(postData) : null;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: postData ? 'POST' : 'GET',
        headers: {
          'User-Agent': 'OceanLinux-VirtualizorClient/1.0',
          ...(postData && {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postBody)
          })
        },
        rejectUnauthorized: false,
        timeout: 120000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (res.statusCode >= 400 || jsonData?.error) {
              const err = Array.isArray(jsonData?.error)
                ? jsonData.error.join("; ")
                : (jsonData?.error || `HTTP ${res.statusCode}`);
              reject(new Error(`Virtualizor API error: ${err}`));
            } else {
              resolve(jsonData);
            }
          } catch (parseError) {
            reject(new Error(`Virtualizor non-JSON response: ${data.slice(0, 300)}`));
          }
        });
      });

      req.on('error', (error) => { reject(error); });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout after 2 minutes'));
      });

      if (postBody) req.write(postBody);
      req.end();
    });
  }

  // -------------------- helpers to normalize listvs --------------------
  static _valToIps(val) {
    const out = [];
    const push = (x) => {
      if (x && typeof x === "string") {
        const cleanIp = x.trim().split(':')[0];
        out.push(cleanIp);
      }
    };

    if (!val) return out;
    if (typeof val === "string") { push(val); return out; }

    if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === "string") push(v);
        else if (v && typeof v === "object") push(v.ip || v.address || v.mainip);
      }
      return out;
    }

    if (typeof val === "object") {
      for (const v of Object.values(val)) {
        if (typeof v === "string") push(v);
        else if (v && typeof v === "object") push(v.ip || v.address || v.mainip);
      }
    }
    return out;
  }

  static _normalizeVm([key, vm]) {
    const vpsid = String(vm?.vpsid ?? vm?.vid ?? vm?.subid ?? key ?? "");
    const hostname = (vm?.hostname || vm?.host || vm?.name || "").toString().trim();
    const virt = (vm?.virt || vm?.virt_type || vm?.virtualization || "").toString().trim().toLowerCase();
    const ips = [
      ...VirtualizorAPI._valToIps(vm?.ips),
      ...VirtualizorAPI._valToIps(vm?.ip),
      ...VirtualizorAPI._valToIps(vm?.ipaddresses),
      ...VirtualizorAPI._valToIps(vm?.primaryip),
      ...VirtualizorAPI._valToIps(vm?.mainip),
      ...VirtualizorAPI._valToIps(vm?.ipv4),
    ].filter(Boolean);

    return { vpsid, hostname, virt, ips: Array.from(new Set(ips)) };
  }

  async _listMyVms(accountIndex) {
    try {
      const r = await this._call(accountIndex, `act=listvs&page=1&reslen=1000`);
      const vsMap = r?.vps || r?.vs || (typeof r === "object" ? r : null);
      if (!vsMap || typeof vsMap !== "object") return [];

      const entries = Object.entries(vsMap).filter(
        ([, v]) => v && typeof v === "object" && (v.vpsid || v.vid || v.subid || v.hostname || v.ip || v.ips)
      );

      return entries.map(VirtualizorAPI._normalizeVm).filter(vm => vm.vpsid);
    } catch (error) {
      console.error(`[VirtualizorAPI][_listMyVms] Error listing VMs for account ${accountIndex}:`, error.message);
      throw error;
    }
  }

  // -------------------- public API --------------------

  async findVpsId(by = {}) {
    const ipRaw = by.ip?.trim();
    const ipIn = ipRaw ? ipRaw.split(':')[0] : null;
    const hostIn = by.hostname?.trim()?.toLowerCase();

    console.log(`[VirtualizorAPI][findVpsId] Searching for VPS with IP: ${ipIn}, hostname: ${hostIn}`);

    for (let i = 0; i < this.accounts.length; i++) {
      try {
        const vms = await this._listMyVms(i);
        if (!vms.length) continue;

        const matchIpHost = () => (ipIn && hostIn)
          ? vms.find(vm => vm.ips.includes(ipIn) && vm.hostname.toLowerCase() === hostIn) || null
          : null;
        const matchIp = () => ipIn ? vms.find(vm => vm.ips.includes(ipIn)) || null : null;
        const matchHost = () => hostIn ? vms.find(vm => vm.hostname.toLowerCase() === hostIn) || null : null;

        const matched =
          matchIpHost() ||
          matchIp() ||
          matchHost() ||
          (vms.length === 1 ? vms[0] : null);

        if (matched?.vpsid) {
          this._vpsAccountCache.set(matched.vpsid, i);
          return { vpsid: matched.vpsid, virt: matched.virt || null };
        }
      } catch (error) {
        console.error(`[VirtualizorAPI][findVpsId] Error checking account ${i}:`, error.message);
      }
    }

    return null;
  }

  async getTemplates(vpsid) {
    const idx = await this._resolveAccountIndexForVps(vpsid);
    return this._call(idx, `svs=${vpsid}&act=ostemplate`);
  }

  /**
   * Power actions on the correct account. Virtualizor's enduser API uses a
   * two-step "confirm" flow for power actions: a plain GET to act=stop only
   * returns the confirmation page (HTTP 200 with `act:"stop"` echoed back but
   * NO actual effect on the VM). To actually execute, we have to POST a body
   * containing `do=1` (the confirmation token). Without this, the VPS visibly
   * doesn't change state even though the API call appears successful.
   *
   * Note: these methods are only invoked from the new company-Virtualizor
   * automation path. Hostycare orders go through HostycareAPI for power
   * actions and are not affected.
   */
  async start(vpsid) {
    const idx = await this._resolveAccountIndexForVps(vpsid);
    return this._call(idx, `svs=${vpsid}&act=start`, { do: 1 });
  }

  async stop(vpsid) {
    const idx = await this._resolveAccountIndexForVps(vpsid);
    return this._call(idx, `svs=${vpsid}&act=stop`, { do: 1 });
  }

  async restart(vpsid) {
    const idx = await this._resolveAccountIndexForVps(vpsid);
    return this._call(idx, `svs=${vpsid}&act=restart`, { do: 1 });
  }

  async reboot(vpsid) {
    return this.restart(vpsid);
  }

  /**
   * Locate a VPS across known accounts and return the raw VM record (incl. status).
   * Used by the company-Virtualizor automation 'status' branch.
   */
  async getVpsRecord(vpsid) {
    const idx = await this._resolveAccountIndexForVps(vpsid);
    try {
      const r = await this._call(idx, `act=listvs&page=1&reslen=1000`);
      const vsMap = r?.vps || r?.vs || (typeof r === 'object' ? r : null);
      if (!vsMap || typeof vsMap !== 'object') return null;
      for (const [key, vm] of Object.entries(vsMap)) {
        if (!vm || typeof vm !== 'object') continue;
        const id = String(vm.vpsid ?? vm.vid ?? vm.subid ?? key ?? '');
        if (id === String(vpsid)) return vm;
      }
      return null;
    } catch (err) {
      console.error(`[VirtualizorAPI][getVpsRecord] Failed for vpsid=${vpsid}:`, err.message);
      return null;
    }
  }

  async reinstall(vpsid, templateId, newPassword) {
    const idx = await this._resolveAccountIndexForVps(vpsid);
    const post = {
      newos: String(templateId),
      newpass: newPassword,
      conf: newPassword,
      reinsos: "Reinstall",
    };
    return this._call(idx, `svs=${vpsid}&act=ostemplate`, post);
  }

  async _resolveAccountIndexForVps(vpsid) {
    if (this._vpsAccountCache.has(vpsid)) {
      return this._vpsAccountCache.get(vpsid);
    }

    for (let i = 0; i < this.accounts.length; i++) {
      try {
        const vms = await this._listMyVms(i);
        if (vms.some(vm => vm.vpsid === String(vpsid))) {
          this._vpsAccountCache.set(vpsid, i);
          return i;
        }
      } catch (error) {
        console.error(`[VirtualizorAPI][_resolveAccountIndexForVps] Error checking account ${i}:`, error.message);
      }
    }

    throw new Error(`Virtualizor: could not resolve account for vpsid ${vpsid}`);
  }
}

export default VirtualizorAPI;
