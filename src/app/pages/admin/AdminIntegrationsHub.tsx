import { AdminSectionGate } from "./AdminSectionGate";
import { AdminOperations } from "./AdminOperations";

export function AdminIntegrationsHub() {
  return (
    <AdminSectionGate section="integrations" label="Integrations & jobs">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Integrations & jobs</h1>
          <p className="text-muted-foreground mt-2">
            Platform health checks, integration configuration signals, and operational event stream.
          </p>
        </div>
        <AdminOperations />
      </div>
    </AdminSectionGate>
  );
}
