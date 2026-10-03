import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { Plus, UserRound, CheckCircle2, UserPlus, ChevronDown, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { MetricCard } from "../../components/ui/MetricCard";
import {
  CardGridSkeleton,
  DashboardStatsSkeleton,
  OperationalQueryState,
  WorkspacePageShell,
} from "../../components/ux";
import type { Database } from "../../../lib/database.types";
import type { MemberRole } from "../../../lib/workspace";
import { canWorkspace } from "../../../lib/workspace-permissions";
import { contactsCrmService } from "../../../lib/contacts-crm.service";
import { organizationService } from "../../../lib/organization.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export function WorkspaceContacts({
  organization,
  currentUserId,
  currentRole,
}: {
  organization: Organization;
  currentUserId: string;
  currentRole: MemberRole | null;
}) {
  const canWrite = canWorkspace(currentRole, "contacts:write");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [rows, memberRows] = await Promise.all([
        contactsCrmService.getOrganizationContacts(organization.id),
        organizationService.getOrganizationMembers(organization.id),
      ]);
      setContacts(rows || []);
      setMembers(memberRows || []);
    } catch (error) {
      console.error(error);
      setLoadError("We couldn't load contacts. Check your connection and try again.");
      toast.error("Unable to load contacts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization.id]);

  const activeContacts = useMemo(
    () => contacts.filter((contact) => contact.status !== "archived"),
    [contacts]
  );

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return activeContacts;
    const q = searchQuery.toLowerCase();
    return activeContacts.filter((c) =>
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  }, [activeContacts, searchQuery]);

  const assignedCount = useMemo(
    () => activeContacts.filter((c) => Boolean(c.assigned_to)).length,
    [activeContacts]
  );

  const unassignedCount = useMemo(
    () => activeContacts.filter((c) => !c.assigned_to).length,
    [activeContacts]
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Enter a contact name.");
      return;
    }

    try {
      setSaving(true);
      await contactsCrmService.createContact({
        organizationId: organization.id,
        createdBy: currentUserId,
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Contact added.");
      setFullName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setNotes("");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to create contact.");
    } finally {
      setSaving(false);
    }
  };

  const assignContact = async (contactId: string, assignedTo: string) => {
    try {
      await contactsCrmService.updateContact(contactId, {
        assignedTo: assignedTo || null,
      });
      toast.success("Assignment updated.");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to assign contact.");
    }
  };

  const listPhase = loadError
    ? "error"
    : loading
      ? "loading"
      : activeContacts.length === 0
        ? "empty"
        : filteredContacts.length === 0
          ? "filtered-empty"
          : "ready";

  return (
    <WorkspacePageShell
      title="Contacts Directory"
      description="Standalone contact records for clients, landlords, and partners across your organization."
      badge={
        <Badge variant="outline" className="text-xs font-medium">
          {organization.name}
        </Badge>
      }
    >
      {loading && !loadError ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Active Directory"
            value={loading ? "—" : activeContacts.length}
            icon={UserRound}
            iconColor="primary"
            subtitle="Total customer and lead records"
          />
          <MetricCard
            title="Assigned Leads"
            value={loading ? "—" : assignedCount}
            icon={CheckCircle2}
            iconColor="primary"
            subtitle="Allocated to account reps"
          />
          <MetricCard
            title="Unassigned Inquiries"
            value={loading ? "—" : unassignedCount}
            icon={UserPlus}
            iconColor="primary"
            subtitle="Pending staff assignment"
          />
        </div>
      )}

      {canWrite ? (
        <Card className="p-6 rounded-3xl border-surface-border/80 bg-surface/90 backdrop-blur-sm shadow-card">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-surface-border/60">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Plus className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">Add New Contact Record</h2>
              <p className="text-xs text-muted-foreground">Register an individual or organizational buyer profile</p>
            </div>
          </div>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreate}>
            <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Akua Mensah" required />
            <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="akua@example.com" />
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 24 123 4567" />
            <Input label="Company / Entity" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Mensah Capital Ltd" />
            <Input
              label="Private Notes"
              className="md:col-span-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Prefers phone communication, interested in Cantonments apartments."
            />
            <div className="md:col-span-2 flex justify-end pt-2">
              <Button type="submit" disabled={saving} size="sm" className="rounded-xl shadow-md shadow-primary/20 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Contact"}</span>
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="p-6 rounded-3xl border-surface-border/80 bg-surface/90 backdrop-blur-sm shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-surface-border/60">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-display font-semibold text-foreground">All Contacts</h2>
            <Badge variant="outline" className="rounded-full text-xs font-semibold px-2.5 bg-surface-subtle">
              {filteredContacts.length}
            </Badge>
          </div>

          <div className="w-full sm:w-72">
            <Input
              label="Search contacts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, email, phone..."
              className="text-sm"
            />
          </div>
        </div>

        <OperationalQueryState
          phase={listPhase}
          errorMessage={loadError ?? undefined}
          onRetry={() => void loadData()}
          retryLabel="Reload contacts"
          loadingFallback={<CardGridSkeleton count={3} />}
          emptyIcon={UserRound}
          emptyTitle="No contacts yet"
          emptyDescription="No customer records have been created in this organization yet."
          filteredEmptyTitle="No matching contacts"
          filteredEmptyDescription={
            searchQuery
              ? `No records matched "${searchQuery}". Try a different search.`
              : "No records match the current filters."
          }
          emptyActionLabel={searchQuery ? "Clear search" : undefined}
          onEmptyAction={searchQuery ? () => setSearchQuery("") : undefined}
        >
          <div className="space-y-3 min-w-0">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 bg-surface-subtle/60 hover:bg-surface-subtle border border-surface-border/70 rounded-2xl flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between transition-all duration-200 group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5 group-hover:scale-105 transition-transform">
                    {contact.full_name?.charAt(0).toUpperCase() || "C"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {contact.full_name}
                      </p>
                      <Badge variant="outline" className="capitalize text-xs rounded-full">
                        {contact.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3.5 text-xs text-muted-foreground mt-1.5 flex-wrap">
                      {contact.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-primary/70" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-500/80" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.company && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-500/80" />
                          <span>{contact.company}</span>
                        </div>
                      )}
                      {!contact.email && !contact.phone && !contact.company && (
                        <span className="text-muted-foreground italic">No contact details registered</span>
                      )}
                    </div>
                    {contact.notes ? (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed bg-surface/50 p-2 rounded-xl border border-surface-border/40">
                        {contact.notes}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                  {canWrite ? (
                    <>
                      <div className="relative">
                        <NativeSelectControl
                          className="appearance-none px-3 py-1.5 rounded-xl border border-surface-border bg-surface text-xs font-medium text-foreground pr-8 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                          value={contact.assigned_to || ""}
                          onChange={(event) => void assignContact(contact.id, event.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {members.map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {member.user?.full_name || member.user?.email}
                            </option>
                          ))}
                        </NativeSelectControl>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl bg-surface hover:bg-surface-subtle"
                        onClick={() => void contactsCrmService.archiveContact(contact.id).then(loadData)}
                      >
                        Archive
                      </Button>
                    </>
                  ) : contact.assigned_to ? (
                    <span className="text-xs text-muted-foreground">
                      Assigned to{" "}
                      {members.find((member) => member.user_id === contact.assigned_to)?.user?.full_name ||
                        "team member"}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </OperationalQueryState>
      </Card>
    </WorkspacePageShell>
  );
}
