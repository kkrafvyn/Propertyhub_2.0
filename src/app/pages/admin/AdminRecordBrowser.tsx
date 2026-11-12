import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import {
  ADMIN_PAGE_SIZE,
  fetchAdminRecords,
  type AdminDataset,
  type AdminFilters,
  type AdminRecord,
} from "../../../lib/admin-operations.service";

export const recordText = (value: unknown) =>
  value == null || value === "" ? "—" : String(value);
export function AdminRecordBrowser({
  kind,
  title,
  description,
  columns,
  statuses = [],
  organizationFilter = false,
  children,
  detail,
  refreshKey = 0,
}: {
  kind: AdminDataset;
  title: string;
  description: string;
  columns: Array<{ key: string; label: string; render?: (row:AdminRecord)=>ReactNode }>;
  statuses?: string[];
  organizationFilter?: boolean;
  children?: ReactNode;
  detail?: (row: AdminRecord, refresh: () => void) => ReactNode;
  refreshKey?: number;
}) {
  const initial = { search: "", status: "", organization: "", page: 0 };
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState<AdminFilters>(initial);
  const [result, setResult] = useState<{ rows: AdminRecord[]; count: number }>({
    rows: [],
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminRecord | null>(null);
  const [version, setVersion] = useState(0);
  const detailRef = useRef<HTMLElement>(null);
  const refresh = () => {
    setSelected(null);
    setVersion((v) => v + 1);
  };
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSelected(null);
    fetchAdminRecords(kind, filters)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Unable to load records.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, filters, version, refreshKey]);
  useEffect(() => {
    if (selected) detailRef.current?.focus();
  }, [selected]);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          Refresh
        </Button>
      </header>
      {children}
      <Card className="p-5">
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({ ...draft, page: 0 });
          }}
        >
          <div className="min-w-48 flex-1">
            <Input
              label="Search records"
              value={draft.search}
              onChange={(event) =>
                setDraft({ ...draft, search: event.target.value })
              }
              placeholder="Reference, text, or exact record/account ID"
            />
          </div>
          {organizationFilter ? (
            <div className="min-w-48 flex-1">
              <Input
                label="Organization ID"
                value={draft.organization}
                onChange={(event) =>
                  setDraft({ ...draft, organization: event.target.value })
                }
                placeholder="All organizations"
              />
            </div>
          ) : null}
          {statuses.length ? (
            <label className="space-y-2 text-sm">
              Status
              <select
                className="block min-h-11 rounded-lg border border-border bg-background px-3"
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value })
                }
              >
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button type="submit" disabled={loading}>
            Apply filters
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft(initial);
              setFilters(initial);
            }}
          >
            Clear
          </Button>
        </form>
      </Card>
      {error ? (
        <Card className="space-y-3 border-destructive/30 p-5">
          <p role="alert" className="text-destructive">
            {error}
          </p>
          <Button variant="outline" onClick={refresh}>
            Try again
          </Button>
        </Card>
      ) : loading ? (
        <p role="status" className="p-6">
          Loading records…
        </p>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="border-b">
                  {columns.map((column) => (
                    <th key={column.key} scope="col" className="p-3">
                      {column.label}
                    </th>
                  ))}
                  <th scope="col" className="p-3">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    {columns.map((column) => (
                      <td key={column.key} className="max-w-72 break-words p-3">
                    {column.render ? column.render(row) : recordText(row[column.key])}
                      </td>
                    ))}
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`View ${row.id}`}
                        onClick={() => setSelected(row)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.rows.length === 0 ? (
              <p className="p-6 text-muted-foreground">
                No records match these filters.
              </p>
            ) : null}
          </Card>
          <nav
            aria-label="Record pages"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <p role="status" className="text-sm text-muted-foreground">
              {result.count === 0
                ? "0 records"
                : `${filters.page * ADMIN_PAGE_SIZE + 1}–${Math.min((filters.page + 1) * ADMIN_PAGE_SIZE, result.count)} of ${result.count}`}{" "}
              · Page {filters.page + 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={filters.page === 0}
                onClick={() =>
                  setFilters({ ...filters, page: filters.page - 1 })
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={(filters.page + 1) * ADMIN_PAGE_SIZE >= result.count}
                onClick={() =>
                  setFilters({ ...filters, page: filters.page + 1 })
                }
              >
                Next
              </Button>
            </div>
          </nav>
        </>
      )}
      {selected && !loading && !error ? (
        <section
          ref={detailRef}
          tabIndex={-1}
          aria-label="Record details"
          className="space-y-5 rounded-xl border border-border bg-surface p-5 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Record details</h2>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close details
            </Button>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(selected).map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="text-xs text-muted-foreground">
                  {key.replaceAll("_", " ")}
                </dt>
                <dd className="whitespace-pre-wrap break-words text-sm">
                  {recordText(value)}
                </dd>
              </div>
            ))}
          </dl>
          {detail?.(selected, refresh)}
        </section>
      ) : null}
    </div>
  );
}
