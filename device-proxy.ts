import type { IncomingMessage, ServerResponse } from "node:http";
import net from "node:net";

export type DeviceProxyTarget = {
  host: string;
  port: number;
};

type NextFunction = (error?: unknown) => void;

/**
 * ZTE Demo-Webs 固件返回的 HTTP 头混用 LF / CRLF，Node 22+ 的严格解析会直接失败。
 * 这里用原始 TCP 转发，并在回写客户端前把响应头规范化为 CRLF。
 */
function splitDeviceResponse(raw: Buffer): { headerText: string; body: Buffer } | null {
  const text = raw.toString("latin1");
  const patterns = ["\r\n\r\n", "\n\n", "\r\n\n", "\n\r\n"];
  let sepIdx = -1;
  let sepLen = 0;
  for (const pattern of patterns) {
    const index = text.indexOf(pattern);
    if (index !== -1 && (sepIdx === -1 || index < sepIdx)) {
      sepIdx = index;
      sepLen = pattern.length;
    }
  }
  if (sepIdx === -1) return null;

  const headerText = text
    .slice(0, sepIdx)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\r\n");

  return {
    headerText,
    body: raw.subarray(sepIdx + sepLen),
  };
}

function writeError(res: ServerResponse, status: number, message: string) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message);
}

export function createDeviceProxyMiddleware(target: DeviceProxyTarget) {
  return function deviceProxy(req: IncomingMessage, res: ServerResponse, next: NextFunction) {
    if (!req.url?.startsWith("/api")) {
      next();
      return;
    }

    const targetPath = req.url.replace(/^\/api/, "") || "/";
    const requestChunks: Buffer[] = [];

    req.on("data", (chunk) => {
      requestChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("error", (error) => {
      writeError(res, 500, `Request error: ${error.message}`);
    });

    req.on("end", () => {
      const requestBody = Buffer.concat(requestChunks);
      const socket = net.connect(target.port, target.host);
      const responseChunks: Buffer[] = [];
      let settled = false;

      const finish = (handler: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        handler();
      };

      const timer = setTimeout(() => {
        socket.destroy();
        finish(() => writeError(res, 504, "Device proxy timeout"));
      }, 15_000);

      socket.on("error", (error) => {
        finish(() => writeError(res, 502, `Device proxy error: ${error.message}`));
      });

      socket.on("connect", () => {
        const contentType =
          typeof req.headers["content-type"] === "string"
            ? req.headers["content-type"]
            : "application/x-www-form-urlencoded; charset=UTF-8";
        const accept =
          typeof req.headers.accept === "string"
            ? req.headers.accept
            : "application/json, text/javascript, */*; q=0.01";

        const lines = [
          `${req.method || "GET"} ${targetPath} HTTP/1.1`,
          `Host: ${target.host}`,
          `Accept: ${accept}`,
          `Content-Type: ${contentType}`,
          `Content-Length: ${requestBody.length}`,
          "Connection: close",
          `Referer: http://${target.host}/index.html`,
          `Origin: http://${target.host}`,
          "X-Requested-With: XMLHttpRequest",
        ];

        socket.write(`${lines.join("\r\n")}\r\n\r\n`);
        if (requestBody.length > 0) socket.write(requestBody);
      });

      socket.on("data", (chunk) => {
        responseChunks.push(chunk);
      });

      socket.on("end", () => {
        finish(() => {
          const raw = Buffer.concat(responseChunks);
          const split = splitDeviceResponse(raw);
          if (!split) {
            writeError(res, 502, "Invalid device response");
            return;
          }

          const headerLines = split.headerText.split("\r\n").filter(Boolean);
          const statusLine = headerLines.shift() || "HTTP/1.1 502 Bad Gateway";
          const statusMatch = statusLine.match(/^HTTP\/\d\.\d\s+(\d+)/);
          res.statusCode = statusMatch ? Number(statusMatch[1]) : 502;

          for (const line of headerLines) {
            const colon = line.indexOf(":");
            if (colon === -1) continue;
            const name = line.slice(0, colon).trim();
            const value = line.slice(colon + 1).trim();
            const lower = name.toLowerCase();
            if (
              lower === "transfer-encoding" ||
              lower === "connection" ||
              lower === "keep-alive" ||
              lower === "content-length"
            ) {
              continue;
            }
            res.setHeader(name, value);
          }

          res.setHeader("Content-Length", String(split.body.length));
          res.end(split.body);
        });
      });
    });
  };
}
