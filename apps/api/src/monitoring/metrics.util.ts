export interface MetricsSnapshot {
  startedAt: string;
  uptimeSeconds: number;
  requestsTotal: number;
  statusGroups: Record<string, number>;
}

const startedAtMs = Date.now();
const statusGroups: Record<string, number> = {
  "2xx": 0,
  "3xx": 0,
  "4xx": 0,
  "5xx": 0,
};

let requestsTotal = 0;

export function recordHttpRequest(statusCode: number): void {
  requestsTotal += 1;
  const group = `${Math.floor(statusCode / 100)}xx`;
  statusGroups[group] = (statusGroups[group] || 0) + 1;
}

export function getMetricsSnapshot(): MetricsSnapshot {
  return {
    startedAt: new Date(startedAtMs).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAtMs) / 1000),
    requestsTotal,
    statusGroups: { ...statusGroups },
  };
}

export function renderPrometheusMetrics(snapshot = getMetricsSnapshot()): string {
  const lines = [
    "# HELP poolproject_api_uptime_seconds API process uptime in seconds.",
    "# TYPE poolproject_api_uptime_seconds gauge",
    `poolproject_api_uptime_seconds ${snapshot.uptimeSeconds}`,
    "# HELP poolproject_api_http_requests_total HTTP requests observed by the API process.",
    "# TYPE poolproject_api_http_requests_total counter",
    `poolproject_api_http_requests_total ${snapshot.requestsTotal}`,
  ];

  for (const [statusGroup, count] of Object.entries(snapshot.statusGroups)) {
    lines.push(`poolproject_api_http_requests_by_status_group_total{status_group="${statusGroup}"} ${count}`);
  }

  return `${lines.join("\n")}\n`;
}
