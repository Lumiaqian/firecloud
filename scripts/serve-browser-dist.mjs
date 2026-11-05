// Serve only an already-built Pages artifact, including its production subpath.
import { createServer } from "node:http";
import { access, readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const mount = "/firecloud/";
const types = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff"
};

try {
  await access(resolve(root, "index.html"));
} catch {
  throw new Error("Missing dist/index.html. Run npm run build before npm run test:browser.");
}

const server = createServer(async (request, response) => {
  const finish = (status, message) => {
    response.writeHead(status, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    response.end(message);
  };
  if (request.method !== "GET" && request.method !== "HEAD") return finish(405, "Method not allowed");
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    if (!pathname.startsWith(mount)) return finish(404, "Not found");
    let file = resolve(root, pathname.slice(mount.length));
    if (file !== root && !file.startsWith(`${root}${sep}`)) return finish(404, "Not found");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const content = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Content-Length": content.length,
      "Cache-Control": "no-store"
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    finish(404, "Not found");
  }
});

server.listen(8787, "127.0.0.1", () => console.log("Browser smoke: http://127.0.0.1:8787/firecloud/"));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
