const SOCIAL_IMAGE_PATH = "/assets/makesb-social-card.jpg";

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'none'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-ancestors 'none'",
  );
  return headers;
}

async function serveAsset(request, env, pathname) {
  const assetUrl = new URL(pathname, request.url);
  const assetRequest = new Request(assetUrl, request);
  return env.ASSETS.fetch(assetRequest);
}

const worker = {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const url = new URL(request.url);
    let pathname = url.pathname;

    if (pathname.endsWith("/")) {
      pathname += "index.html";
    }

    let response = await serveAsset(request, env, pathname);

    if (response.status === 404 && !pathname.split("/").pop().includes(".")) {
      response = await serveAsset(request, env, "/index.html");
    }

    const headers = withSecurityHeaders(response);

    if (
      request.method === "GET" &&
      response.ok &&
      (headers.get("content-type") || "").includes("text/html")
    ) {
      const html = await response.text();
      const absoluteSocialImage = new URL(SOCIAL_IMAGE_PATH, request.url).href;
      const renderedHtml = html.replace(
        'content="assets/makesb-social-card.jpg"',
        `content="${absoluteSocialImage}"`,
      );

      return new Response(renderedHtml, {
        status: response.status,
        headers,
      });
    }

    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      headers,
    });
  },
};

export default worker;
