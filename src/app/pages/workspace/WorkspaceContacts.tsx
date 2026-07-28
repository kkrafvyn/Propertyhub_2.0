import { useEffect, useMemo, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
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
  const [contacts, setContacts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rows, memberRows] = await Promise.all([
        contactsCrmService.getOrganizationContacts(organization.id),
        organizationService.getOrganizationMembers(organization.id),
      ]);
      setContacts(rows || []);
      setMembers(memberRows || []);
    } catch (error) {
      console.error(error);
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
      toast.error("Unable to add contact.");
    } finally {
      setSaving(false);
    }
  };

  const assignContact = async (contactId: string, assignedTo: string) => {
    try {
      await contactsCrmService.updateContact(contactId, {
        assignedTo: assignedTo || null,
      });
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to assign contact.");
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading contacts...</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Contacts CRM</h1>
        <p className="text-muted-foreground mt-2">
          Standalone contact records for prospects, landlords, and buyers outside active deal cases.
        </p>
      </div>

      {canWrite ? (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Add contact</h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreate}>
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Input
            label="Notes"
            className="md:col-span-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button type="submit" disabled={saving}>
            <Plus className="w-4 h-4" />
            {saving ? "Saving..." : "Add contact"}
          </Button>
        </form>
      </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">All contacts ({activeContacts.length})</h2>
        {activeContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
        ) : (
          <div className="space-y-3">
            {activeContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex flex-col gap-3 rounded-xl border border-border p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex items-start gap-3">
                  <UserRound className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{contact.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[contact.email, contact.phone, contact.company].filter(Boolean).join(" · ") ||
                        "No contact details"}
                    </p>
                    {contact.notes ? (
                      <p className="text-sm text-muted-foreground mt-1">{contact.notes}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {contact.status}
                  </Badge>
                  {canWrite ? (
                    <>
                      <select
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                        value={contact.assigned_to || ""}
                        onChange={(event) => void assignContact(contact.id, event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.user?.full_name || member.user?.email}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void contactsCrmService.archiveContact(contact.id).then(loadData)}
                      >
                        Archive
                      </Button>
                    </>
                  ) : contact.assigned_to ? (
                    <span className="text-sm text-muted-foreground">
                      Assigned to{" "}
                      {members.find((member) => member.user_id === contact.assigned_to)?.user?.full_name ||
                        "team member"}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
