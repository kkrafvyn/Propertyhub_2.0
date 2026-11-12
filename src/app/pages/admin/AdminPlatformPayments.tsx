import { AdminSectionGate } from "./AdminSectionGate";
import { AdminRecordBrowser } from "./AdminRecordBrowser";
import { AdminCaseForm } from "./AdminCaseForm";
import { PropertyPaymentActions } from './PropertyPaymentActions';
export function AdminPlatformPayments() {
  return (
    <AdminSectionGate section="payments" label="Payments ledger">
      <div className="space-y-10"><AdminRecordBrowser kind="propertyPayments" title="Property payments" description="Inspect property payments, reconcile provider status, review refunds, or open follow-up." organizationFilter statuses={['initialized','pending','processing','success','failed','abandoned','reversal_pending','reversed']} columns={[{key:'created_at',label:'When'},{key:'organization_id',label:'Organization'},{key:'payer_user_id',label:'Payer'},{key:'amount_minor',label:'Amount',render:row=>`${String(row.currency)} ${(Number(row.amount_minor)/100).toFixed(2)}`},{key:'currency',label:'Currency'},{key:'status',label:'Status'},{key:'provider_reference',label:'Reference'}]} detail={(row,refresh)=><div className="space-y-5"><PropertyPaymentActions key={row.id} row={row} onSaved={refresh}/><AdminCaseForm category="payment_review" sourceId={row.id} sourceLedger="property"/></div>}/>
      <AdminRecordBrowser
        kind="payments"
        title="Payments ledger"
        description="Search the ledger, inspect payment history, and open reconciliation or dispute follow-up."
        statuses={["pending", "completed", "failed", "refunded"]}
        columns={[
          { key: "created_at", label: "When" },
          { key: "user_id", label: "Account" },
          { key: "amount", label: "Amount" },
          { key: "currency", label: "Currency" },
          { key: "status", label: "Status" },
          { key: "payment_provider", label: "Provider" },
          { key: "external_transaction_id", label: "Reference" },
        ]}
        detail={(row) => (
          <AdminCaseForm
            key={row.id}
            category="payment_review"
            sourceId={row.id}
            accountId={String(row.user_id || "")}
          />
        )}
      />
      </div>
    </AdminSectionGate>
  );
}
