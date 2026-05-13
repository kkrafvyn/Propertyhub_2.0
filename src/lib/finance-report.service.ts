export function downloadTextFile(filename: string, content: string, mimeType = "text/plain") {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatMoney(amountMinor = 0, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export const financeReportService = {
  summarize(payments: any[]) {
    const success = payments.filter((payment) => payment.status === "success");
    const pending = payments.filter((payment) =>
      ["initialized", "pending", "processing", "reversal_pending"].includes(payment.status)
    );
    const refunds = payments.flatMap((payment) => payment.refunds || []);
    const processedRefunds = refunds.filter((refund) => refund.status === "processed");
    const totalCollectedMinor = success.reduce(
      (total, payment) => total + Number(payment.amount_minor || 0),
      0
    );
    const totalRefundedMinor = processedRefunds.reduce(
      (total, refund) => total + Number(refund.amount_minor || 0),
      0
    );

    const purposeBreakdown = success.reduce<Record<string, number>>((acc, payment) => {
      const purpose = payment.purpose || "other";
      acc[purpose] = (acc[purpose] || 0) + Number(payment.amount_minor || 0);
      return acc;
    }, {});

    return {
      totalTransactions: payments.length,
      successfulTransactions: success.length,
      pendingTransactions: pending.length,
      totalCollectedMinor,
      totalRefundedMinor,
      netCollectedMinor: totalCollectedMinor - totalRefundedMinor,
      refundRate:
        success.length === 0 ? 0 : Number((processedRefunds.length / success.length).toFixed(2)),
      purposeBreakdown,
      formatted: {
        totalCollected: formatMoney(totalCollectedMinor),
        totalRefunded: formatMoney(totalRefundedMinor),
        netCollected: formatMoney(totalCollectedMinor - totalRefundedMinor),
      },
    };
  },

  exportPaymentsCsv(payments: any[]) {
    const header = [
      "Transaction ID",
      "Reference",
      "Payer",
      "Purpose",
      "Status",
      "Amount",
      "Refunded",
      "Payment Channel",
      "Paid At",
    ];
    const rows = payments.map((payment) => [
      payment.id,
      payment.provider_reference,
      payment.payer?.full_name || payment.payer?.email || "",
      payment.purpose || "",
      payment.status || "",
      formatMoney(Number(payment.amount_minor || 0), payment.currency || "GHS"),
      formatMoney(Number(payment.refunded_amount_minor || 0), payment.currency || "GHS"),
      payment.payment_channel || "",
      payment.paid_at || payment.created_at || "",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    downloadTextFile("finance-report.csv", csv, "text/csv;charset=utf-8");
  },

  openPrintableReport(summary: ReturnType<typeof financeReportService.summarize>, payments: any[]) {
    if (typeof window === "undefined") return;

    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=1080,height=900");
    if (!reportWindow) return;

    const html = `
      <html>
        <head>
          <title>Property Hub Finance Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            h1, h2 { margin-bottom: 8px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
            .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Finance Report</h1>
          <p>Generated ${new Date().toLocaleString()}</p>
          <div class="grid">
            <div class="card"><strong>Total Collected</strong><div>${summary.formatted.totalCollected}</div></div>
            <div class="card"><strong>Total Refunded</strong><div>${summary.formatted.totalRefunded}</div></div>
            <div class="card"><strong>Net Collected</strong><div>${summary.formatted.netCollected}</div></div>
          </div>
          <h2>Transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Payer</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${payments
                .map(
                  (payment) => `
                    <tr>
                      <td>${payment.provider_reference || ""}</td>
                      <td>${payment.payer?.full_name || payment.payer?.email || ""}</td>
                      <td>${payment.purpose || ""}</td>
                      <td>${payment.status || ""}</td>
                      <td>${formatMoney(Number(payment.amount_minor || 0), payment.currency || "GHS")}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  },
};
