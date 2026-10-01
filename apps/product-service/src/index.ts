// ============================================================================
// product-service: the very first version.
// It only does one thing: answer "are you alive?" at /health.
// We add the listings endpoints after we confirm this works.
// ============================================================================

import Fastify from "fastify";

// logger: true prints every request in the terminal, which helps while learning.
const app = Fastify({ logger: true });

// The health check. Every service gets one, so tools can ask "are you up?".
app.get("/health", async () => {
  return { status: "ok", service: "product-service" };
});

// 4000 keeps it away from the student app (3000) and the admin (3001).
const port = Number(process.env.PORT ?? 4000);

try {
  // 0.0.0.0 means "accept connections from outside this machine too",
  // which we will need later when it runs in a container.
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}