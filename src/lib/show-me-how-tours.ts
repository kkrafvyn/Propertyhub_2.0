export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

export interface ShowMeHowTour {
  id: string;
  title: string;
  description: string;
  moduleRoute: string;
  steps: TourStep[];
}

export const SHOW_ME_HOW_TOURS: ShowMeHowTour[] = [
  {
    id: "post-journal-entry",
    title: "How to Post a Balanced Double-Entry Journal",
    description: "Step-by-step guidance on debit/credit validation and posting to the immutable general ledger.",
    moduleRoute: "journal-entries",
    steps: [
      {
        targetSelector: "input[type='date']",
        title: "1. Select Accounting Date",
        description: "Specify the transaction effective date. The system automatically validates that the period is open.",
        position: "bottom",
      },
      {
        targetSelector: "input[placeholder*='Memo']",
        title: "2. Enter Audit Memo",
        description: "Add a clear description explaining the transaction rationale for audit compliance.",
        position: "bottom",
      },
      {
        targetSelector: "button:has-text('Post to General Ledger')",
        title: "3. Verify Balance & Post",
        description: "Ensure Total Debits exactly equal Total Credits. The Post button unlocks once the entry is in mathematical balance.",
        position: "top",
      },
    ],
  },
  {
    id: "reconcile-owner-payout",
    title: "How to Run Owner Rental Waterfall Disbursements",
    description: "Calculate gross rental income, deduct 10% management fee, maintenance offsets, and 8% GRA Rent Tax.",
    moduleRoute: "owner-disbursements",
    steps: [
      {
        targetSelector: "button:has-text('Calculate Waterfall Distribution')",
        title: "1. Run Waterfall Calculations",
        description: "Evaluates all collected rent across the owner's units and calculates statutory deductions.",
        position: "bottom",
      },
      {
        targetSelector: "button:has-text('Disburse via MoMo / Bank')",
        title: "2. Authorize Bank / MoMo Settlement",
        description: "Dispatches automated payments via Pay Angels MoMo or bank rails directly to the owner's destination account.",
        position: "top",
      },
    ],
  },
  {
    id: "screen-lease-application",
    title: "How to AI-Screen a Tenant Lease Application",
    description: "Evaluate applicant Ghana Card, income verification, and Act 220 compliance.",
    moduleRoute: "leasing-applications",
    steps: [
      {
        targetSelector: "button:has-text('AI Risk Score')",
        title: "1. Run Autonomous Risk Assessment",
        description: "AI Leasing Agent scores the applicant's rent-to-income ratio, guarantor status, and credit history.",
        position: "bottom",
      },
      {
        targetSelector: "button:has-text('Approve')",
        title: "2. Approve & Generate Digital Contract",
        description: "Approving instantly dispatches a customized Ghana Tenancy Agreement via the eSignature hub.",
        position: "top",
      },
    ],
  },
];
