import { spawn, ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { ExtensionAPI, AgentToolResult } from "@earendil-works/pi-coding-agent";

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

const DEFAULT_TOOLS: McpTool[] = [
  { name: "read", description: "Extract the webpage content directly as clean Markdown", inputSchema: { type: "object", properties: { url: { type: "string", description: "Optional URL" } } } },
  { name: "grep", description: "Search / filter content inside the active webpage using queries", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "navigate", description: "Navigate to any given URL", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "tabs", description: "Manage browser tabs (list, switch, open new tabs)", inputSchema: { type: "object", properties: { action: { type: "string" } } } },
  { name: "snapshot", description: "Inspect DOM element handles for interaction", inputSchema: { type: "object", properties: {} } },
  { name: "act", description: "Click, type, select, or submit form elements", inputSchema: { type: "object", properties: { action: { type: "string" } } } },
  { name: "run", description: "Execute automation script against BrowserOS Neo SDK", inputSchema: { type: "object", properties: { script: { type: "string" } }, required: ["script"] } },
];

function findServerBinary(): string | null {
  const baseDir = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "BrowserClaw",
    ".browseros",
    "BrowserClawServer",
    "versions"
  );

  if (fs.existsSync(baseDir)) {
    try {
      const versions = fs.readdirSync(baseDir).sort().reverse();
      for (const ver of versions) {
        const bin = path.join(baseDir, ver, "resources", "bin", "browseros-claw-server");
        if (fs.existsSync(bin)) {
          return bin;
        }
      }
    } catch {}
  }

  // Fallback direct check
  const fallback = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "BrowserClaw",
    ".browseros",
    "BrowserClawServer",
    "versions",
    "0.0.49",
    "resources",
    "bin",
    "browseros-claw-server"
  );
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  return null;
}

class BrowserOsMcpClient {
  private child: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (val: any) => void; reject: (err: Error) => void }
  >();
  private buffer = "";
  private initialized = false;
  private serverPath: string | null = null;
  private configPath: string;

  constructor() {
    this.configPath = path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "BrowserClaw",
      ".browseros",
      "config.json"
    );
    this.serverPath = findServerBinary();
  }

  private ensureProcess(): ChildProcess {
    if (this.child && !this.child.killed) {
      return this.child;
    }

    if (!this.serverPath || !fs.existsSync(this.serverPath)) {
      throw new Error(`BrowserOS Claw Server binary not found.`);
    }

    this.initialized = false;
    for (const [id, req] of this.pendingRequests) {
      req.reject(new Error("Process restarted"));
    }
    this.pendingRequests.clear();
    this.buffer = "";

    const args: string[] = [];
    if (fs.existsSync(this.configPath)) {
      args.push("--config", this.configPath);
    }
    args.push("--stdio");

    this.child = spawn(this.serverPath, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child.stdout?.on("data", (data: Buffer) => {
      this.buffer += data.toString("utf8");
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (typeof msg.id === "number" && this.pendingRequests.has(msg.id)) {
            const req = this.pendingRequests.get(msg.id)!;
            this.pendingRequests.delete(msg.id);
            if (msg.error) {
              req.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              req.resolve(msg.result);
            }
          }
        } catch {}
      }
    });

    this.child.stderr?.on("data", () => {});

    this.child.on("error", (err) => {
      for (const [id, req] of this.pendingRequests) {
        req.reject(err);
      }
      this.pendingRequests.clear();
    });

    this.child.on("exit", (code) => {
      this.child = null;
      this.initialized = false;
      for (const [id, req] of this.pendingRequests) {
        req.reject(new Error(`BrowserOS process exited with code ${code}`));
      }
      this.pendingRequests.clear();
    });

    return this.child;
  }

  private sendRequest(method: string, params: any = {}, timeoutMs = 5000): Promise<any> {
    const proc = this.ensureProcess();
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      const msg = JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });

      proc.stdin?.write(msg + "\n", (err) => {
        if (err) {
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          reject(err);
        }
      });
    });
  }

  private sendNotification(method: string, params: any = {}): void {
    try {
      const proc = this.ensureProcess();
      const msg = JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
      });
      proc.stdin?.write(msg + "\n");
    } catch {}
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "pi-browseros-extension", version: "1.0.0" },
    }, 3000);
    this.sendNotification("notifications/initialized");
    this.initialized = true;
  }

  async listTools(): Promise<McpTool[]> {
    await this.init();
    const res = await this.sendRequest("tools/list", {}, 3000);
    return res?.tools ?? [];
  }

  async callTool(name: string, args: any): Promise<any> {
    await this.init();
    return await this.sendRequest("tools/call", {
      name,
      arguments: args,
    }, 30000);
  }

  dispose(): void {
    if (this.child) {
      try {
        this.child.kill();
      } catch {}
      this.child = null;
    }
  }
}

export default async function browserOsExtension(pi: ExtensionAPI) {
  const client = new BrowserOsMcpClient();

  // Load MCP tools from BrowserOS Neo, or fallback to default toolset
  let tools: McpTool[] = [];
  try {
    tools = await client.listTools();
  } catch (err: any) {
    tools = DEFAULT_TOOLS;
  }

  if (!tools || tools.length === 0) {
    tools = DEFAULT_TOOLS;
  }

  // Register each MCP tool
  for (const tool of tools) {
    const toolName = `browseros_${tool.name}`;
    const parameters = tool.inputSchema ?? { type: "object", properties: {} };

    pi.registerTool({
      name: toolName,
      description: `[BrowserOS Neo] ${tool.description || tool.name}`,
      parameters,
      execute: async (toolCallId: string, params: any): Promise<AgentToolResult> => {
        try {
          const res = await client.callTool(tool.name, params);
          if (!res) {
            return {
              content: [{ type: "text", text: "Empty response from BrowserOS Neo" }],
            };
          }

          if (res.isError) {
            const text = res.content?.map((c: any) => c.text).join("\n") || "Unknown error";
            return {
              content: [{ type: "text", text }],
              isError: true,
            };
          }

          const content = (res.content ?? []).map((c: any) => {
            if (c.type === "image" && c.data) {
              return {
                type: "image" as const,
                data: c.data,
                mimeType: c.mimeType || "image/png",
              };
            }
            return {
              type: "text" as const,
              text: c.text ?? JSON.stringify(c),
            };
          });

          if (content.length === 0) {
            content.push({ type: "text", text: JSON.stringify(res) });
          }

          return { content };
        } catch (error: any) {
          return {
            content: [{ type: "text", text: `BrowserOS Neo Error: ${error.message || String(error)}` }],
            isError: true,
          };
        }
      },
    });
  }

  // Clean up on session shutdown
  pi.on("session_shutdown", () => {
    client.dispose();
  });
}
