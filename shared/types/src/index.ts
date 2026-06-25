export type ServiceStatus = "ok" | "error";

export interface HealthResponse {
  status: ServiceStatus;
  service: string;
  version: string;
  database_ready: boolean;
}

// TODO(Phase 6+): Add shared Project, Task, Agent, ActivityEvent, and Review
// contracts when those features are implemented.

