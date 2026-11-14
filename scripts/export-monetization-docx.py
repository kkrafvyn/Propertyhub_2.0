"""Export combined BaytMiftah monetization + revenue map DOCX."""
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

doc = Document()

for section in doc.sections:
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.85)
    section.left_margin = Inches(0.95)
    section.right_margin = Inches(0.95)


def set_run_font(run, size=11, bold=False, color=None):
    run.font.name = "Calibri"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    run.font.size = Pt(size)
    run.bold = bold
    if color:
        run.font.color.rgb = color


def add_heading_styled(text, level=1):
    p = doc.add_heading(text, level=level)
    for run in p.runs:
        set_run_font(run, size=16 if level == 1 else 13 if level == 2 else 12, bold=True)
    return p


def add_para(text, bold=False, size=11):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold)
    p.paragraph_format.space_after = Pt(6)
    return p


def add_bullet(text):
    p = doc.add_paragraph(text, style="List Bullet")
    for run in p.runs:
        set_run_font(run, size=11)
    return p


def add_numbered(text, n):
    p = doc.add_paragraph()
    run = p.add_run(f"{n}. {text}")
    set_run_font(run, size=11)
    p.paragraph_format.space_after = Pt(4)
    return p


def add_table(headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    hdr = table.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        cell.text = h
        for p in cell.paragraphs:
            for run in p.runs:
                set_run_font(run, size=9, bold=True, color=RGBColor(255, 255, 255))
        tc = cell._tc.get_or_add_tcPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:fill"), "1F4E79")
        shd.set(qn("w:val"), "clear")
        tc.append(shd)
    for r_i, row in enumerate(rows):
        for c_i, val in enumerate(row):
            cell = table.rows[r_i + 1].cells[c_i]
            cell.text = str(val)
            for p in cell.paragraphs:
                for run in p.runs:
                    set_run_font(run, size=9)
    doc.add_paragraph()
    return table


# ── Cover ──────────────────────────────────────────────────────────────────
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = title.add_run("BaytMiftah Monetization Plan")
set_run_font(r, size=22, bold=True, color=RGBColor(31, 78, 121))

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sub.add_run("Combined operating plan + revenue map and founder plan")
set_run_font(r, size=13, color=RGBColor(89, 89, 89))

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = meta.add_run(
    "BaytMiftah REOS  |  Payment rail: PayAngels  |  Updated November 2026\n"
    "Includes: Monetization Plan + REOS Revenue Map and Founder Plan (12 Nov 2026)"
)
set_run_font(r, size=10, color=RGBColor(120, 120, 120))

add_para(
    "BaytMiftah can charge on three surfaces: marketplace transactions, workspace SaaS, "
    "and add-on services. PayAngels is the sole payment rail. This document merges the "
    "operator monetization plan with the full 63-area revenue map and Paul Graham–style founder plan."
)

# ── Part A: Original monetization summary ───────────────────────────────────
add_heading_styled("Part A — Where to charge money (summary)", 1)

add_heading_styled("Money flow", 2)
add_bullet("Consumer payment → PayAngels → Landlord/Seller + BaytMiftah platform fee")
add_bullet("Workspace org (SaaS / boosts / modules) → PayAngels → BaytMiftah")

add_heading_styled("Charge now (wired)", 2)
add_table(
    ["Charge", "Who pays", "Default"],
    [
        ["Sale / purchase platform fee", "Seller", "1.0% founding / 1.5% standard"],
        ["Land sale fee", "Seller", "1.0% / 1.5%"],
        ["Rent / lease / deposit fee", "Landlord", "2.0%"],
        ["Buyer sale fee", "Buyer", "0% (ready to raise)"],
        ["Short-stay guest/host fees", "Guest / host", "Seeded; currently off"],
        ["Developer Basic / Pro / Enterprise", "Developer org", "Free / GHS 1,500/mo / custom"],
    ],
)
add_para("To start collecting:", bold=True)
add_bullet("Certify live PayAngels; keep platform_fees_enabled true; set active_pricing_tier")
add_bullet("Ensure org collect_platform_fees is on")
add_bullet("Wire subscription checkout for developer/agency plans (admin plans exist)")

add_heading_styled("Recommended go-live order", 2)
for i, s in enumerate(
    [
        "Certify PayAngels live.",
        "Turn on rent + sale platform fees at founding rates for pilot orgs.",
        "Sell Workspace / Estate SaaS (Starter / Pro / Estate).",
        "Enable featured listings, then short-stay dual fees.",
        "Add lead fees and payout fees once volume is steady.",
        "Enterprise / white-label as outbound sales.",
    ],
    1,
):
    add_numbered(s, i)

add_heading_styled("What not to charge for early", 2)
add_bullet("Consumer app download; basic search/browse")
add_bullet("Tenant messaging on free listings")
add_bullet("Unlimited free pilots with no end date")

# ── Part B: Full revenue map from PDF ───────────────────────────────────────
add_heading_styled("Part B — Full revenue map (63 areas)", 1)
add_para(
    "Prepared 12 November 2026 from a repository read-through (migrations and audit documents). "
    "Source = Seeded (in DB), Module (product exists), or New. Stage = Now / Next / Later / Not now."
)

add_heading_styled("A. Software subscriptions", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["1", "Per-unit plans for PMs/landlords", "Monthly fee per unit managed", "Module", "Now"],
        ["2", "Agency plans", "Starter GHS 150, Professional GHS 600/mo", "Seeded", "Later"],
        ["3", "Developer plans", "Basic free, Pro GHS 1,500/mo, Enterprise custom", "Seeded", "Later"],
        ["4", "Enterprise seats", "GHS 50/seat/mo + GHS 5,000 setup", "Seeded", "Later"],
        ["5", "Paid modules (GL, Trust, Procurement, Automation, AI, Analytics)", "Add-on subscriptions", "Module", "Next"],
        ["6", "White-label licences", "Setup + monthly licence", "Module", "Later"],
        ["7", "Desktop workspace licences", "Electron app licence", "Module", "Not now"],
        ["8", "Premium support / SLAs", "Faster response, dedicated contact", "New", "Next"],
    ],
)

add_heading_styled("B. Transaction and platform fees", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["9", "Rent, lease, deposit fee", "2% to landlord", "Seeded", "Next"],
        ["10", "Sale and land-sale fee", "1% founding / 1.5% standard to seller", "Seeded", "Later"],
        ["11", "Escrow fee", "1%", "Seeded (off)", "Later"],
        ["12", "Wallet top-up / payout", "0.5% top-up, GHS 5 payout", "Seeded (off)", "Later"],
        ["13", "Short-stay booking fees", "5% guest, 8% host", "Seeded (off)", "Later"],
        ["14", "Installment-purchase fees", "Fee on instalments", "Module", "Later"],
        ["15", "Owner disbursement fees", "Fee on owner distributions", "Module", "Later"],
    ],
)

add_heading_styled("C. Listings and marketing", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["16", "Premium listings", "GHS 200 fixed", "Seeded", "Later"],
        ["17", "Featured listing boosts", "GHS 75 fixed", "Seeded (off)", "Later"],
        ["18", "Verification badges", "Agency 300 / agent 150 / property 100 GHS", "Seeded", "Later"],
        ["19", "Paid lead routing / packs", "Per lead or plan bundle", "Module", "Later"],
        ["20", "Listing syndication", "Fee to push to other portals", "Module", "Later"],
        ["21", "Sponsored placements / ads", "Developers pay for visibility", "New", "Later"],
        ["22", "Off-plan marketing packages", "Campaign packages", "New", "Later"],
        ["23", "Referral commissions", "Reward/commission on referrals", "Module", "Later"],
    ],
)

add_heading_styled("D. Estates, HOAs and facilities", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["24", "Estate and HOA management", "Monthly per household or estate", "Module", "Now"],
        ["25", "Service-charge & arrears recovery", "Subscription or recovery fee", "Module", "Now"],
        ["26", "Utility sub-metering billing", "Monthly per meter", "Module", "Now"],
        ["27", "Gate and visitor kiosk", "Subscription + installation", "Module", "Now"],
        ["28", "Estate finance/payables/comms bundles", "Bundled add-ons", "Module", "Now"],
        ["29", "IoT meters / gate hardware", "Hardware margin + software plan", "New", "Now"],
        ["30", "Student hostel management", "Per-bed or per-hostel", "New", "Later"],
        ["31", "Co-living / serviced apartments", "Per-unit or revenue-share", "New", "Later"],
        ["32", "Commercial lease escalations & CAM", "Subscription for commercial portfolios", "Module", "Later"],
    ],
)

add_heading_styled("E. Services marketplace", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["33", "Vendor/contractor commission", "10% of marketplace jobs", "Seeded", "Later"],
        ["34", "Contractor subscriptions", "Monthly for priority job access", "New", "Later"],
        ["35", "Procurement supplier fees / rebates", "Listing fees, volume rebates", "Module+New", "Later"],
        ["36", "Field inspection services", "Per inspection", "Module", "Later"],
        ["37", "Cleaning/moving/furniture referrals", "Referral fee per job", "New", "Later"],
    ],
)

add_heading_styled("F. Trust, identity and compliance", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["38", "Tenant screening reports", "Per report", "Module", "Next"],
        ["39", "KYC checks (markup)", "Per check above vendor cost", "Module", "Next"],
        ["40", "E-signature", "Per envelope or lease", "Module", "Next"],
        ["41", "Fraud-alert / compliance subscriptions", "Monthly", "Module", "Later"],
        ["42", "Verified-transaction certificates", "Per certificate (Event Ledger)", "Module", "Not now"],
        ["43", "Document custody / retention packs", "Monthly storage tier", "Module", "Later"],
    ],
)

add_heading_styled("G. Finance and lending", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["44", "Mortgage / insurance / lender referrals", "Referral fee", "Module", "Later"],
        ["45", "Rent-guarantee / property insurance", "Referral from insurers", "New", "Later"],
        ["46", "Multi-currency / diaspora payments", "Fee or FX spread", "Module", "Later"],
        ["47", "Rent advance / deposit financing", "Share via licensed partner", "New", "Not now"],
        ["48", "Property tokenization / fractional", "Issuance/trading fees (needs legal)", "Module", "Not now"],
    ],
)

add_heading_styled("H. Data, AI and API", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["49", "Market / location intelligence", "Per report or subscription", "Module", "Later"],
        ["50", "Rent-yield / predictive analytics", "Reports for investors/banks", "Module", "Later"],
        ["51", "Developer API", "Usage-based", "Module", "Later"],
        ["52", "AI credit packs / lease analysis", "Credits or per analysis", "Module", "Next"],
        ["53", "Anonymised data licensing", "Licence to banks (DPA review)", "New", "Not now"],
        ["54", "Valuation / appraisal support", "Per valuation", "New", "Later"],
    ],
)

add_heading_styled("I. Messaging resale", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["55", "SMS credits", "Markup over Arkesel cost", "Module", "Next"],
        ["56", "WhatsApp automation bundles", "Monthly message allowance", "Module", "Next"],
        ["57", "Push / email / voice-video bundles", "Usage bundles", "Module", "Next"],
    ],
)

add_heading_styled("J. Services and partnerships", 2)
add_table(
    ["#", "Revenue area", "How it earns", "Source", "Stage"],
    [
        ["58", "Onboarding, migration, custom workflows", "One-off setup / day rate", "Module", "Now"],
        ["59", "Training / certification / workshops", "Per seat or cohort", "New", "Next"],
        ["60", "Reseller / partner programs", "Revenue share", "New", "Later"],
        ["61", "Telco / bank co-marketing", "Sponsorship or revenue share", "New", "Later"],
        ["62", "Government / housing-agency contracts", "Project or licence fees", "New", "Not now"],
        ["63", "Running properties / brokerage yourself", "Management fee or commission", "New", "Not now"],
    ],
)

# ── Seeded prices reference ─────────────────────────────────────────────────
add_heading_styled("Part C — Prices already seeded in the database", 1)
add_table(
    ["Item", "Value"],
    [
        ["Rent / lease / deposit platform fee", "2% (landlord pays)"],
        ["Property sale platform fee", "1% founding / 1.5% standard (seller)"],
        ["Land sale platform fee", "1% founding / 1.5% standard (seller)"],
        ["Buyer fee on sales", "0%"],
        ["Premium listing", "GHS 200"],
        ["Featured boost", "GHS 75 (off)"],
        ["Escrow fee", "1% (off)"],
        ["Wallet top-up / payout", "0.5% / GHS 5 (off)"],
        ["Short-stay guest / host", "5% / 8% (off)"],
        ["Agency / agent / property verification", "GHS 300 / 150 / 100"],
        ["Vendor marketplace commission", "10%"],
        ["Enterprise setup / per-seat", "GHS 5,000 / GHS 50 per month"],
        ["Agency Starter / Professional", "GHS 150 / GHS 600 per month"],
        ["Developer Basic / Pro / Enterprise", "Free / GHS 1,500/mo / 0.5–1% success fee"],
        ["Gateway cost placeholder", "1.5% (confirm vs PayAngels schedule)"],
        ["Promo NEWAGENCY50", "50% off Agency Pro, expires 31 Dec 2026"],
    ],
)
add_para(
    "Note: the pricing framework describes a per-unit formula while the database holds flat plans. "
    "Choose one model before selling. Per-unit fits property managers better because revenue grows with portfolio."
)

# ── Founder plan ────────────────────────────────────────────────────────────
add_heading_styled("Part D — Founder plan (Paul Graham principles)", 1)

add_heading_styled("Principles", 2)
add_bullet("Make something people want — one customer type, one painful problem.")
add_bullet("Do things that don't scale — recruit by hand; migrate data yourself; answer on WhatsApp.")
add_bullet("Beware schlep blindness — service charges, arrears and utility bills are unglamorous and underserved.")
add_bullet("Growth rate is the measure — ~5–7% weekly is good; ~10% exceptional.")
add_bullet("Be default alive — know if current revenue/spend reaches profit before cash runs out.")
add_bullet("Reach ramen profitability — cover founder living costs from revenue.")
add_bullet("Charge early — a paying customer proves worth.")

add_heading_styled("How the 63 areas are staged", 2)
add_table(
    ["Stage", "Meaning", "Areas"],
    [
        ["Now", "The wedge. Sell this first. Invoice manually — does not wait on PayAngels.", "1, 24–29, 58"],
        ["Next", "Add once ~10 customers pay and the wedge works.", "5, 8, 9, 38–40, 52, 55–57, 59"],
        ["Later", "Needs traffic, scale, or a live payment rail.", "2–4, 6, 10–23, 30–37, 41, 43–46, 49–51, 54, 60–61"],
        ["Not now", "Distraction, heavy legal risk, or too early.", "7, 42, 47, 48, 53, 62, 63"],
    ],
)
add_para(
    "Item 9 (2% rent fee) is Next because it needs PayAngels live. "
    "Everything in Now can be invoiced manually."
)

add_heading_styled("The wedge: estates and HOAs", 2)
add_para("Why estates and HOAs:")
add_bullet("Modules already exist: HOA, CAM, Estate Finance/Payables/Comms, Utility Submetering, Gate Clearance.")
add_bullet("Painful recurring problem: service charges, arrears, utility billing, visitor control.")
add_bullet("Less crowded than pure listing marketplaces.")
add_bullet("Hardware (meters, gates) creates a moat software-only competitors lack.")
add_bullet("Does not depend on PayAngels to start.")
add_para(
    "Judgement call: if estates are hard to reach, use property management companies with 50–500 units "
    "as the first customer with the same plan."
)

add_heading_styled("12-week plan", 2)
add_table(
    ["Weeks", "Focus", "Actions"],
    [
        [
            "1–2",
            "Find first 3 customers by hand",
            "Visit 10 estates/HOA offices. Ask how they collect service charges. Offer one discounted 60-day pilot for weekly feedback. No deck needed.",
        ],
        [
            "3–6",
            "Do the work for them",
            "Import residents and balances yourself. Send statements/reminders if needed. Invoice by bank or MoMo from day one. Build only what blocks payment.",
        ],
        [
            "7–12",
            "Prove it and repeat",
            "Ask how disappointed they'd be if the product vanished. Add sub-metering and gate kiosk to paying estates. Get referrals to next 5–10. Add Next-stage items only when asked.",
        ],
    ],
)

add_heading_styled("Numbers to track", 2)
add_table(
    ["Weekly growth", "Approximate yearly multiple"],
    [["5%", "12.6×"], ["7%", "33.7×"], ["10%", "142×"]],
)
add_para(
    "Ramen profitability example: if you need GHS 10,000/mo and a customer pays GHS 600, you need ~17 paying customers. "
    "Replace with your real costs. Love test: ~40% 'very disappointed' is a common Sean Ellis benchmark (rough guide)."
)

add_heading_styled("Where to put prices first", 2)
add_table(
    ["#", "Area", "Charge by", "Repo anchor", "First-quote rule"],
    [
        ["1", "Per-unit plan", "Per unit/mo + minimum", "Starter 150 / Pro 600", "Quote per unit; minimum at Starter"],
        ["24", "Estate/HOA mgmt", "Base + per household", "None", "Test base + small % of service charges"],
        ["25", "Service charge / arrears", "Share of recovered arrears or plan", "Rent fee 2%", "Success fee so estate carries no risk"],
        ["26", "Sub-metering", "Per meter/mo", "None", "Per meter on top of base; hardware separate"],
        ["27", "Gate kiosk", "Install + monthly/gate", "None", "Install at cost+margin; monthly = software/support"],
        ["28", "Estate bundle 24–27", "One monthly / annual prepay", "None", "Quote bundle first; unbundle if they object"],
        ["29", "IoT / gate hardware", "Unit price", "None", "Parts + labour + warranty + margin; never below cost"],
        ["58", "Onboarding / migration", "Fixed setup", "Enterprise setup 5,000", "Fixed fee; 5,000 only for large portfolios"],
        ["5", "Paid modules", "Monthly add-on", "Seat GHS 50/mo", "Sell only after core plan is paid"],
        ["8", "Premium support", "Monthly tier", "None", "Response times + named contact"],
        ["9", "Rent fee", "% of rent via app", "2% landlord", "Only when PayAngels is live"],
        ["38–40", "Screening / KYC / e-sign", "Per report/check/lease", "Badges 100–300", "Price above Smile/Prembly/DocuSign cost"],
        ["52", "AI credit packs", "Monthly pack + cap", "None", "Cap so token cost cannot exceed pack"],
        ["55–57", "SMS / WhatsApp / calls", "Monthly bundle", "None", "Markup over Arkesel/Twilio/Meta"],
        ["59", "Training", "Per seat/cohort", "None", "Charge; do not bundle free"],
    ],
)

add_heading_styled("How to set the first prices", 2)
add_numbered("Quote a real price in the first meeting. A pilot ends on a date and is discounted, not free.", 1)
add_numbered("Quote high first; concede with annual prepay or a testimonial, not a lower rate. If everyone says yes, price is too low.", 2)
add_numbered("Set a floor: cost to serve + support time. Do not sell below it.", 3)
add_numbered("Price on value (arrears recovered, admin hours saved), then check against the floor.", 4)
add_numbered("Review after 5 quotes and again after 10 customers. Grandfather early customers when raising prices.", 5)

add_heading_styled("What to stop for now", 2)
add_bullet("Building new modules, surfaces, native apps, and Web3 features.")
add_bullet("Polishing production-readiness score — fix only what pilot estates hit.")
add_bullet("Waiting for PayAngels — collect manually until it is live.")
add_bullet("Selling outside Ghana until counsel signs off.")
add_bullet("Giving work away: open-ended pilots and free add-ons.")

add_heading_styled("Open decisions (answer before first quote)", 2)
add_numbered("First customer segment: estates/HOAs, property managers, or developers.", 1)
add_numbered("Estate pricing form: base + per-household, or % of service charges collected.", 2)
add_numbered("Floor price per customer (after vendor costs and support time).", 3)
add_numbered("Annual prepay: whether to offer it and what discount.", 4)
add_numbered("PayAngels: Live activation, settlement, split payments, payouts, refunds, webhook signing.", 5)
add_numbered("Billing: invoice manually now; when to build recurring subscription billing.", 6)
add_numbered("Legal/tax: holding landlord funds, data protection, tokenization, VAT/levy rates.", 7)

add_heading_styled("Notes", 1)
add_para(
    "Exact prices stay operator-defined and can mostly be edited in /admin/revenue. "
    "This document is an operating plan, not legal or tax advice."
)

out = Path(__file__).resolve().parents[1] / "docs" / "BaytMiftah_Monetization_Plan.docx"
out.parent.mkdir(parents=True, exist_ok=True)
doc.save(out)
print(out)
print("bytes", out.stat().st_size)
