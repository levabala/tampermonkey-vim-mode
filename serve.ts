// Simple HTTP server for serving test HTML files
const server = Bun.serve({
    port: 3000,
    fetch(req) {
        const url = new URL(req.url);
        const path =
            url.pathname === "/" ? "/test-visual-mode.html" : url.pathname;

        try {
            const file = Bun.file("." + path);
            return new Response(file);
        } catch {
            return new Response("Not Found", { status: 404 });
        }
    },
});

console.log(`Server running at http://localhost:${server.port}`);
