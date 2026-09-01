import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { leaseScreeningService } from "../../../lib/lease-screening.service";
import { useAuth } from "../../context/AuthContext";

export function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    void leaseScreeningService.listMyApplications(user.id).then(setApplications).catch(console.error).finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) return <Card className="p-8 text-center text-muted-foreground">Loading applications...</Card>;
  return <div className="mx-auto max-w-3xl space-y-5"><div><h1 className="text-2xl font-semibold">My applications</h1><p className="mt-1 text-sm text-muted-foreground">Track submitted rental applications and review decisions.</p></div>{applications.length ? applications.map((application) => <Card className="space-y-3 p-5" key={application.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Application {application.id.slice(0, 8)}</h2><p className="text-sm text-muted-foreground">Submitted {new Date(application.submitted_at).toLocaleDateString()}</p></div><Badge variant="outline" className="capitalize">{application.status}</Badge></div><div className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Household:</span> {application.household_size}</p><p><span className="text-muted-foreground">Email:</span> {application.applicant_email}</p></div>{application.review_note ? <p className="border-t pt-3 text-sm text-muted-foreground">Review note: {application.review_note}</p> : null}</Card>) : <Card className="p-8 text-center text-muted-foreground">No applications submitted yet.</Card>}</div>;
}