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

class BrowserOsMcpClient {
  private child: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (val: any) => void; reject: (err: Error) => void }
  >();
  private buffer = "";
  private initialized = false;
  private serverPath: string;
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
    this.serverPath = path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "BrowserClaw",
      ".browseros",
      "BrowserClawServer",
      "versions",
      "0.0.44",
      "resources",
      "bin",
      "browseros-claw-server"
    );
  }

  private ensureProcess(): ChildProcess {
    if (this.child && !this.child.killed) {
      return this.child;
    }

    if (!fs.existsSync(this.serverPath)) {
      throw new Error(`BrowserOS Claw Server binary not found at ${this.serverPath}`);
    }

    this.initialized = false;
    this.pendingRequests.clear();
    this.buffer = "";

    const args = ["--stdio"];
    if (fs.existsSync(this.configPath)) {
      args.unshift(`--config=${this.configPath}`);
    }

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

    this.child.on("exit", () => {
      this.child = null;
      this.initialized = false;
    });

    return this.child;
  }

  private sendRequest(method: string, params: any = {}): Promise<any> {
    const proc = this.ensureProcess();
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      const msg = JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });

      proc.stdin?.write(msg + "\n", (err) => {
        if (err) {
          this.pendingRequests.delete(id);
          reject(err);
        }
      });
    });
  }

  private sendNotification(method: string, params: any = {}): void {
    const proc = this.ensureProcess();
    const msg = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
    });
    proc.stdin?.write(msg + "\n");
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "pi-browseros-extension", version: "1.0.0" },
    });
    this.sendNotification("notifications/initialized");
    this.initialized = true;
  }

  async listTools(): Promise<McpTool[]> {
    await this.init();
    const res = await this.sendRequest("tools/list", {});
    return res?.tools ?? [];
  }

  async callTool(name: string, args: any): Promise<any> {
    await this.init();
    return await this.sendRequest("tools/call", {
      name,
      arguments: args,
    });
  }

  dispose(): void {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }
}

export default async function browserOsExtension(pi: ExtensionAPI) {
  const client = new BrowserOsMcpClient();

  // Load MCP tools from BrowserOS Neo
  let tools: McpTool[] = [];
  try {
    tools = await client.listTools();
  } catch (err: any) {
    // If BrowserOS is not available during startup, fail gracefully
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
