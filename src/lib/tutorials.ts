export type TutorialRole =
  | "consumer"
  | "property_owner"
  | "organization_owner"
  | "executive"
  | "head_property_management"
  | "property_manager"
  | "estate_officer"
  | "maintenance_manager"
  | "technician"
  | "finance"
  | "collections"
  | "sales"
  | "marketing"
  | "customer_service"
  | "platform_admin"
  | "devops";

export interface TutorialStep {
  title: string;
  description: string;
  target?: string;
  actionLabel?: string;
}

export interface TutorialDefinition {
  role: TutorialRole;
  label: string;
  intro: string;
  completion: string;
  steps: TutorialStep[];
  checklist: string[];
}

const definitions: Record<TutorialRole, TutorialDefinition> = {
  consumer: {
    role: "consumer", label: "I'm looking for property", intro: "Find, compare, and move through your first property journey with confidence.", completion: "You know everything you need for your first property journey.",
    steps: [
      { title: "Search for a property", description: "Start with a location, budget, and the kind of property you need.", target: "/search", actionLabel: "Start searching" },
      { title: "Save one", description: "Save a promising property so it is easy to compare later." },
      { title: "Send a message", description: "Ask the host, owner, or agent a question from the listing." },
      { title: "Request a viewing", description: "Choose a suitable time and keep the viewing in your journey." },
      { title: "Understand payments", description: "Review payment status, installments, and receipts from your dashboard." },
      { title: "Find your lease or stay", description: "Your active lease, booking, and documents stay together in your account." },
      { title: "Report maintenance", description: "Send an issue with enough detail for the right team to act." },
      { title: "Meet your AI", description: "Ask AI to search, summarize, or explain your next step. It never bypasses permissions or changes financial truth." },
    ], checklist: ["Complete your profile", "Explore your dashboard", "Save your first property", "Send your first message", "Try BaytMiftah AI"],
  },
  property_owner: {
    role: "property_owner", label: "I'm a property owner", intro: "Set up your properties, choose how they are managed, and stay close to performance.", completion: "Your property-management essentials are clear.",
    steps: ["My Properties", "Add units", "Add a tenant", "Set charges", "Monitor payments", "Manage maintenance", "Create notices", "View statements"].map((title) => ({ title, description: `Learn how to ${title.toLowerCase()} from your owner workspace.` })),
    checklist: ["Complete your profile", "Add your first property", "Review your units", "Review an arrears account", "Send a resident notice"],
  },
  organization_owner: {
    role: "organization_owner", label: "I own or set up an organization", intro: "Build the company foundation before your team starts operating.", completion: "Your organization setup path is clear.",
    steps: ["Company profile", "Add properties", "Invite employees", "Assign roles", "Configure departments", "Configure finance", "Configure maintenance", "Configure communication", "Configure AI", "Configure automation"].map((title) => ({ title, description: `Set up ${title.toLowerCase()} so the rest of your organization can work consistently.` })),
    checklist: ["Complete your profile", "Create the company profile", "Add your first property", "Invite a teammate", "Try BaytMiftah AI"],
  },
  executive: {
    role: "executive", label: "I'm an executive", intro: "Use the executive cockpit for health, decisions, exceptions, and briefings.", completion: "You do not need to manage every task. BaytMiftah brings exceptions and decisions to you.",
    steps: ["Company health", "Revenue and collections", "Occupancy", "Maintenance and sales", "Customer service and risks", "Exceptions and approvals", "AI briefing"].map((title) => ({ title, description: `See ${title.toLowerCase()} at the level needed for an executive decision.` })),
    checklist: ["Complete your profile", "Explore your dashboard", "Review company health", "Review one exception", "Try the AI briefing"],
  },
  head_property_management: {
    role: "head_property_management", label: "I lead property management", intro: "See the portfolio, team performance, SLAs, arrears, and escalation hierarchy.", completion: "You can see where the portfolio needs attention and why.",
    steps: ["Portfolio", "Property managers", "Occupancy", "Maintenance and SLA", "Arrears", "Escalations", "Performance and AI portfolio agent"].map((title) => ({ title, description: `Use ${title.toLowerCase()} to manage outcomes across the portfolio.` })),
    checklist: ["Complete your profile", "Explore your portfolio", "Review occupancy", "Review an SLA", "Open the AI portfolio briefing"],
  },
  property_manager: {
    role: "property_manager", label: "I manage properties", intro: "Run the everyday property workflow from properties to residents, maintenance, arrears, and messages.", completion: "You can run the core property workflow and escalate issues correctly.",
    steps: [
      { title: "Properties to units", description: "Start at the property, then move into the units and residents you manage.", target: "/workspace", actionLabel: "Open workspace" },
      { title: "Residents and leases", description: "Keep resident context and lease actions connected." },
      { title: "Message to ticket", description: "A resident reports a water leak. Turn the message into a maintenance ticket." },
      { title: "SLA to technician", description: "Set the SLA, route the issue, and follow the technician's progress." },
      { title: "Completion and evidence", description: "Confirm the work, evidence, materials, and resident update." },
      { title: "Escalation hierarchy", description: "If the SLA is missed, the issue moves from Property Manager to Head of Property Management through the configured escalation." },
      { title: "AI portfolio assistant", description: "Use AI to summarize exceptions and recommend the next action." },
    ], checklist: ["Complete your profile", "Review your units", "Assign a maintenance issue", "Review an arrears account", "Send a resident notice"],
  },
  estate_officer: {
    role: "estate_officer", label: "I work in estate operations", intro: "Practice the field workflow you will use every day.", completion: "Great. You know how to move an estate issue from report to action.",
    steps: ["My Estate", "My Tasks", "Report Issue", "Take Photo", "Meter Reading", "Inspection", "Notice"].map((title, index) => ({ title, description: index === 2 ? "Practice: report a leaking tap in Unit B14." : `Open ${title.toLowerCase()} when you need to complete this field action.` })),
    checklist: ["Complete your profile", "Review your tasks", "Report a leaking tap in Unit B14", "Complete an inspection", "Send a notice"],
  },
  maintenance_manager: {
    role: "maintenance_manager", label: "I manage maintenance", intro: "Coordinate work orders, people, schedules, SLAs, assets, contractors, and costs.", completion: "Your maintenance operating rhythm is clear.",
    steps: ["Work orders", "Team and scheduling", "SLA", "Assets and preventive maintenance", "Contractors", "Costs", "AI maintenance briefing"].map((title) => ({ title, description: `Use ${title.toLowerCase()} to keep maintenance moving and measurable.` })),
    checklist: ["Complete your profile", "Review open work orders", "Assign a maintenance issue", "Review an SLA", "Try BaytMiftah AI"],
  },
  technician: {
    role: "technician", label: "I work in maintenance", intro: "Finish a job safely and quickly, with evidence the team can trust.", completion: "You can complete a maintenance job from assignment to evidence in under three minutes.",
    steps: ["My Jobs", "Open Job", "Start", "Add Evidence", "Add Materials", "Complete", "Notifications"].map((title, index) => ({ title, description: index === 3 ? "Add a photo or note so the team can verify the work." : `Use ${title.toLowerCase()} to keep the job moving.` })),
    checklist: ["Complete your profile", "Open your first job", "Add evidence", "Record materials", "Complete a practice job"],
  },
  finance: {
    role: "finance", label: "I work in finance", intro: "Keep payments, reconciliation, charges, plans, payables, and statements accurate.", completion: "You know the finance workflow and where authoritative truth lives.",
    steps: ["Payments", "Reconciliation", "Charges and installments", "Arrears", "Payables", "Statements", "Reports and AI"].map((title, index) => ({ title, description: index === 1 ? "Practice: match this payment to the outstanding charge." : `Use ${title.toLowerCase()} to keep the books and operating decisions aligned.` })),
    checklist: ["Complete your profile", "Review payments", "Match a practice payment", "Create a practice payment plan", "Try the finance AI assistant"],
  },
  collections: {
    role: "collections", label: "I work in collections", intro: "Move overdue accounts from review to contact, promise, monitoring, and escalation.", completion: "You can manage an overdue account with a clear, respectful next action.",
    steps: ["Aging", "Overdue accounts", "Contact", "Promise to pay", "Payment plans", "Escalation", "Collection notes"].map((title, index) => ({ title, description: index === 0 ? "Practice case: Ama has GHS 4,500 overdue." : `Use ${title.toLowerCase()} to keep the account history and next action clear.` })),
    checklist: ["Complete your profile", "Review aging", "Contact a practice account", "Record a promise to pay", "Review escalation rules"],
  },
  sales: {
    role: "sales", label: "I work in sales", intro: "Turn a lead into a qualified viewing, offer, and completed deal.", completion: "You can move a lead through the pipeline with the right next action.",
    steps: ["Lead", "Contact", "Qualify", "Viewing", "Offer", "Deal", "AI sales assistant"].map((title) => ({ title, description: `Use ${title.toLowerCase()} to move the sample lead forward without losing context.` })),
    checklist: ["Complete your profile", "Review a sample lead", "Qualify a lead", "Schedule a viewing", "Try the AI sales assistant"],
  },
  marketing: {
    role: "marketing", label: "I work in marketing", intro: "Connect campaigns, listings, promotions, lead sources, analytics, and AI recommendations.", completion: "You can see how marketing activity turns into qualified property demand.",
    steps: ["Campaigns", "Listings", "Promotions", "Lead sources", "Analytics", "AI marketing assistant", "Notifications"].map((title) => ({ title, description: `Use ${title.toLowerCase()} to understand and improve the demand you create.` })),
    checklist: ["Complete your profile", "Review active listings", "Review a campaign", "Check lead sources", "Try the AI marketing assistant"],
  },
  customer_service: {
    role: "customer_service", label: "I manage customer service", intro: "Turn a customer message into an AI-assisted case and a clear action.", completion: "You understand the BaytMiftah service loop: Message, AI, Case, Action.",
    steps: ["Message", "AI recognition", "Case", "Customer and property link", "SLA", "Route to maintenance", "Action and follow-up"].map((title, index) => ({ title, description: index === 0 ? "Practice message: My water has stopped." : `See how ${title.toLowerCase()} keeps the customer and operating teams connected.` })),
    checklist: ["Complete your profile", "Open the service inbox", "Create a practice case", "Route a case", "Try BaytMiftah AI"],
  },
  platform_admin: {
    role: "platform_admin", label: "I'm a BaytMiftah administrator", intro: "Manage BaytMiftah itself: customers, platform health, trust, support, providers, security, and audit.", completion: "You know how to manage BaytMiftah itself, not a customer's Unit C14.",
    steps: ["Customer organizations", "Platform health", "Support and incidents", "Trust and safety", "AI operations", "Pay Angels and Resend status", "Security, deployments, and audit"].map((title) => ({ title, description: `Use ${title.toLowerCase()} to protect and operate the BaytMiftah platform.` })),
    checklist: ["Complete your profile", "Open the admin dashboard", "Review platform health", "Review one trust case", "Check provider status"],
  },
  devops: {
    role: "devops", label: "I manage systems and deployments", intro: "Practice the technical incident loop: detect, diagnose, mitigate, verify, close.", completion: "You can handle the Pay Angels webhook failure workflow from detection to closure.",
    steps: ["Service health", "Logs and metrics", "Incidents", "Deployments", "Queues and webhooks", "Database and backups", "Recovery and close"].map((title, index) => ({ title, description: index === 2 ? "Practice incident: Pay Angels webhook failure." : `Use ${title.toLowerCase()} to keep the platform reliable and recoverable.` })),
    checklist: ["Complete your profile", "Review service health", "Diagnose a practice webhook failure", "Verify recovery", "Review backups"],
  },
};

const roleAliases: Record<string, TutorialRole> = {
  consumer: "consumer", host: "property_owner", owner: "organization_owner", property_owner: "property_owner", property_manager: "property_manager", manager: "property_manager", estate_officer: "estate_officer", technician: "technician", maintenance_manager: "maintenance_manager", finance: "finance", finance_officer: "finance", collections: "collections", sales: "sales", agent: "sales", marketing: "marketing", customer_service: "customer_service", support: "customer_service", admin: "platform_admin", platform_admin: "platform_admin", developer: "devops", devops: "devops", executive: "executive", enterprise_operator: "executive", head_property_management: "head_property_management",
};

export function resolveTutorialRole(role?: string | null): TutorialRole | null {
  return role ? roleAliases[role] || null : null;
}

export function getTutorialDefinition(role: TutorialRole): TutorialDefinition {
  const definition = definitions[role];
  if (definition.steps.some((step) => step.title.toLowerCase().includes("ai"))) {
    return definition;
  }

  return {
    ...definition,
    steps: [
      ...definition.steps,
      {
        title: "Meet your AI",
        description: "AI can search, summarize, draft, recommend, create tasks, automate, escalate, and report. It cannot bypass permissions, policies, financial truth, or human-only decisions.",
      },
    ],
  };
}

export function getTutorialStorageKey(userId: string): string {
  return `baytmiftah:tutorial:${userId}`;
}
