const BUILD_DATE = new Date().toISOString();

export function GET() {
  const mem = process.memoryUsage();
  return Response.json({
    status: "ok",
    uptime_seconds: Math.round(process.uptime()),
    build_date: BUILD_DATE,
    node_version: process.version,
    memory: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
}
