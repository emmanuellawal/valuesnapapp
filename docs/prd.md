---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments: ['plan.md', 'docs/analysis/brainstorming-session-2025-12-08.md', 'docs/analysis/brainstorming-session-2025-12-09.md', 'docs/prototype-repomix.txt', 'docs/analysis/research/comprehensive-valuesnap-research-2025-12-09.md', 'docs/analysis/product-brief-valuesnapapp-2025-12-09.md']
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 2
  projectDocs: 2
workflowType: 'prd'
lastStep: 11
project_name: 'valuesnapapp'
user_name: 'Elawa'
date: '2025-12-10'
skippedSteps: [5]
status: 'complete'
completedAt: '2025-12-10'
---

# Product Requirements Document - valuesnapapp

**Author:** Elawa
**Date:** 2025-12-09

---

## Executive Summary

ValueSnap is an AI-powered platform that streamlines the entire reselling journey—from the moment someone thinks "I should sell this" to a completed listing on eBay. We eliminate the two biggest barriers to reselling: not knowing an item's value and not knowing how to list it effectively.

**The User Story:** For Sarah, who just inherited her grandmother's 200-item collection and doesn't know where to start, ValueSnap turns an overwhelming task into manageable progress—one photo at a time. No expertise required. No hours of research. Just capture, value, and list.

Our solution combines accurate market data valuation (70-80% accuracy with transparent confidence indicators) with frictionless listing creation, serving individuals who need to convert items into cash—primarily estate sellers clearing inherited collections, and secondarily casual collectors and thrift shoppers.

**When AI is uncertain, users aren't abandoned:** For items where market data is limited or identification confidence is low, ValueSnap transparently flags uncertainty and provides manual review options—guiding users rather than failing silently.

### Market Position

ValueSnap targets an **underserved niche** in the collectibles/antiques valuation space with limited direct competition. While professional appraisal tools exist, no solution combines instant AI-powered valuation with integrated listing creation for consumer users.

### Vision Alignment

This PRD defines the **V2 rebuild** of ValueSnap, evolving from the existing prototype to a production-ready platform. The core value proposition remains: **Photo → Value → List** in minutes, not hours.

### What Makes This Special

**The Integrated Valuation-to-Listing Pipeline**: ValueSnap is the only solution that combines accurate market data valuation with frictionless listing creation—eliminating both barriers to reselling in one seamless flow.

**Key Differentiators:**
- **Accurate Market Data Tool**: Statistical rigor (IQR outlier removal) + confidence scoring (High/Medium/Low) + transparent accuracy expectations
- **Frictionless Listing**: Pre-fills 6 of 8 required eBay fields (title, category, condition, pricing, description, photos), reducing listing creation from ~10 minutes to ~2 minutes
- **Trust Through Transparency**: Confidence indicators + manual review options—users know when to trust AI and when to verify
- **Multi-Platform Architecture**: Marketplace abstraction from day one enables future expansion without technical debt

### Platform Expansion Roadmap

| Phase | Platform | Focus |
|-------|----------|-------|
| **Phase 1 (MVP)** | eBay | Core valuation + listing integration |
| **Phase 2** | eBay (enhanced) | Batch processing + advanced trust features |
| **Phase 3** | eBay + Facebook Marketplace + Mercari | Multi-platform expansion |

## Project Classification

**Technical Type:** Mobile-First PWA (Progressive Web App)
**Design Approach:** Responsive design using Flexbox + Grid + Tailwind (NativeWind)
**Domain:** Consumer E-commerce / Marketplace Integration
**Complexity:** Medium (AI integration + marketplace APIs + multi-platform architecture)
**Project Context:** Brownfield - V2 rebuild extending existing prototype

### PWA Capabilities
- **Offline Support**: Cached appraisals viewable without internet
- **Camera Access**: Web Camera API with graceful fallback for photo capture
- **Installable**: Add-to-homescreen experience, no app store submission required
- **Single Codebase**: Serves all platforms (desktop, mobile web, installed PWA)

### Technical Stack (Existing)
- **Frontend:** Expo Router + React Native Web + NativeWind (Tailwind)
- **Backend:** FastAPI (Python, async)
- **Database:** Supabase (Postgres + Auth + Storage)
- **AI:** GPT-4o-mini for identification
- **Marketplace:** eBay Browse API (valuation) + Trading API (listing)

---

## Success Criteria

### User Success

#### The "Aha" Moment (Activation)

**Casual Collectors:** The first time they see an accurate valuation—the moment they realize "this AI actually knows what my stuff is worth." This is the true activation event, not the eventual sale.

**Estate Sellers:** The compound realization of making more money than expected while moving items faster than traditional methods. Success = financial win + velocity win.

#### User Success Metrics

| User Segment | Primary Success Metric | Target | Measurement |
|--------------|----------------------|--------|-------------|
| **Casual Collectors** | Time-to-First-Accurate-Valuation | < 5 minutes | First valuation with HIGH confidence |
| **Casual Collectors** | Listing Completion Rate | >50% → >60% | % of valuations that become listings |
| **Casual Collectors** | Repeat Usage | >30% list 3+ items | Within 30 days |
| **Estate Sellers** | Items Cleared per Month | 50+ items/month | Sustained over 2 months |
| **Estate Sellers** | Revenue vs. Expectation | Exceeds user's initial estimate | Post-sale survey |
| **Estate Sellers** | Batch Completion Rate | >80% | Items successfully processed per batch |

#### Emotional Success Indicators

- **Relief**: "I don't have to research every item manually"
- **Confidence**: "I know I'm not leaving money on the table"
- **Progress**: "I'm actually making a dent in this pile"
- **Trust**: "When it says LOW confidence, I know to double-check"

### Business Success

#### 3-Month Success (Early Signal)

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **New User Adoption** | 300+ users | Validates market demand |
| **Listing Completion Rate** | >40% | Users completing full flow |
| **Week-over-Week Growth** | >10% | Sustainable growth trajectory |
| **Free-to-Paid Conversion** | >3% | Revenue potential validation |

#### 6-Month Success (Validation)

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Total Users** | 1,000+ | Critical mass for data flywheel |
| **Free-to-Paid Conversion** | >5% | Sustainable business model |
| **D30 Retention** | >40% | Product-market fit indicator |
| **D90 Retention** | >25% | Long-term value delivery |

#### 12-Month Success (Scale)

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Monthly Active Users** | 5,000+ | Market penetration |
| **ARPU** | $8+ | Revenue health |
| **NPS** | >40 | World-class satisfaction |
| **Accuracy Rate** | >80% | Trust-building achieved |

### Technical Success

#### Phase 1 (MVP) Quality Gates

| Metric | Threshold | Consequence if Not Met |
|--------|-----------|----------------------|
| **Accuracy Rate** | >65% | Cannot proceed to Phase 2 |
| **System Uptime** | >99% | Trust erosion |
| **API Latency** | <3s valuation | User abandonment |
| **Cost per Valuation** | <$0.10 | Unsustainable economics |
| **Error Rate** | <2% | Poor user experience |

#### Technical Success Indicators

- **Reliability**: Users can depend on the system being available
- **Speed**: Valuations feel instant, not sluggish
- **Cost Efficiency**: Unit economics support scale
- **Graceful Degradation**: When AI fails, users are guided, not abandoned

### Measurable Outcomes

#### The Ultimate Success Test

**For Casual Collectors:**
> "I valued and listed an item in under 10 minutes, and it sold for what the app predicted."

**For Estate Sellers:**
> "I cleared 100 items in 2 months and made more than I expected. ValueSnap was worth every penny."

#### Success Funnel Metrics

```
Capture → Identify → Value → Confirm → List → Sell
  100%  →   95%   →  90%  →   70%   → 50%  → 30%
```

Target: Improve each conversion point by 5-10% per quarter.

---

## Product Scope

### MVP - Minimum Viable Product (Phase 1)

**Core Deliverables:**
1. Single-item valuation flow (Photo → Value → List)
2. eBay OAuth integration for listing creation
3. Pre-filled listing (6 of 8 fields)
4. Confidence indicators (HIGH/MEDIUM/LOW)
5. Basic batch processing (web, up to 50 items)
6. User accounts with valuation history

**MVP Success Criteria:**
- Users can complete single-item valuation and listing in <15 minutes
- Estate sellers can process batch of 20+ items
- Accuracy validated at >65% in first 1,000 valuations
- Cost per valuation maintained at <$0.10

**Explicitly OUT of MVP:**
- API/export features
- Mobile batch processing
- Multi-platform (Facebook Marketplace, Mercari)
- Advanced analytics

### Growth Features (Phase 2)

**Focus:** Serve estate sellers better + build trust features

- Enhanced batch processing (parallel, unlimited)
- Mobile batch upload
- Advanced manual review workflows
- Accuracy tracking dashboard (user-facing)
- API access for power users
- Bulk export functionality

**Phase 2 Gate:** MVP must achieve >70% accuracy, NPS >35, D30 >35%

### Vision (Phase 3 and Beyond)

**Focus:** Multi-platform expansion + market leadership

- Facebook Marketplace integration
- Mercari integration
- Other marketplace support
- Unified reselling dashboard
- B2B features for estate companies
- International expansion

**Phase 3 Gate:** Phase 2 must achieve >75% accuracy, NPS >40, D30 >40%

### Scope Philosophy

**Quality over features.** Each phase must prove quality before expansion. Rushing features without quality = churn = death.

| Principle | Application |
|-----------|-------------|
| **Quality gates control expansion** | Cannot proceed until metrics met |
| **User success before business scale** | Focus on making users successful first |
| **Accuracy is the moat** | Invest in accuracy improvements continuously |
| **Trust compounds** | Every accurate valuation builds trust capital |

---

## User Journeys

### Journey 1: Sarah Santos - Clearing Grandma's Collection

Sarah is a 58-year-old accountant who just inherited her grandmother's 200-item collection of vintage cameras, antique jewelry, and assorted collectibles. The estate needs to be cleared in 6 weeks before the house sale closes. Sarah knows some pieces might be valuable, but she has no idea which ones—and she definitely doesn't have time to research each item individually.

**The Old Way:** Sarah called three local appraisers. One wanted $75 per item. Another would only look at "significant pieces" (how would she know which ones?). The third had a 3-week waiting list. Frustrated, she started manually searching eBay sold listings, but after an hour she'd only researched 4 items. At this rate, it would take 50 hours just to price everything.

**Discovering ValueSnap:** Her daughter mentions an app that can "photograph and price stuff automatically." Skeptical but desperate, Sarah downloads ValueSnap on her iPad.

**The Setup Moment:** After creating an account, ValueSnap prompts Sarah to connect her eBay account. "Connect eBay to enable one-tap listing." She hesitates—is this safe? The app explains: "We use eBay's official login. We never see your password." She connects, completing the one-time OAuth flow in 30 seconds.

**The First Session (Skeptical Phase):** Saturday morning, coffee in hand, Sarah photographs a vintage Kodak camera from the collection. In 8 seconds, ValueSnap identifies it: "Kodak Retina IIa, 35mm rangefinder camera, circa 1951. Condition: Good. **Estimated Value: $85-120** (HIGH confidence - based on 47 recent sales)."

Sarah's eyebrows raise. *That can't be right.* She was going to donate that camera. She opens eBay in another tab and searches "Kodak Retina IIa sold listings." The results: $79, $95, $110, $88, $125. **ValueSnap was right.** 

That's the moment Sarah starts to trust.

**Building Trust (Semi-Trust Phase):** She photographs three more items, spot-checking each against eBay. A brooch she thought was costume jewelry: ValueSnap says $180-240—eBay confirms $165-220 range. Close enough. A random decorative plate: $12-18—eBay shows $8-22. By the fifth item, Sarah stops verifying every single one. She glances at confidence levels instead.

**The High-Value Decision:** Sarah photographs an ornate antique ring. ValueSnap returns: "Victorian-era gold ring with gemstone. **Estimated Value: $400-800** (MEDIUM confidence - 6 recent sales with high variance). ⚠️ For items potentially worth $500+, consider professional appraisal for insurance or high-stakes sales."

Sarah pauses. This might have been grandma's engagement ring. She sets it aside for a local jeweler to appraise—ValueSnap gave her permission to NOT trust blindly on items that matter most.

**The Breakthrough (Earned Trust Phase):** By lunch, Sarah has valued 35 items without manual verification. She's found 6 items worth over $200, 12 items worth $50-200, and identified 17 items worth less than $20 (donation pile). More importantly, she has *confidence* in these numbers—she earned that trust through her own verification process.

**The Batch Experience:** The following weekend, Sarah uploads 50 camera-related items using ValueSnap's web batch feature. She drags and drops the photos, starts the batch, and goes to make lunch. When she returns, 47 items are valued with HIGH confidence, 2 are MEDIUM (she'll double-check those), and 1 came back LOW confidence ("Unable to identify specific model - consider manual eBay search").

**The Listing Flow:** For the valuable items, Sarah taps "List on eBay." The title, category, condition, price, and description are pre-filled. She adds one photo and adjusts the price slightly based on a scratch she noticed. Total time to list: 2 minutes instead of 10.

**The Resolution:** Six weeks later, Sarah has cleared 180 items. Total revenue: $4,200—far exceeding her initial expectation of "maybe a few hundred dollars." She kept her grandmother's ring (appraised at $650) and donated the low-value items guilt-free, *knowing* she wasn't giving away hidden treasures.

**Sarah's Testimonial:** "I cleared my grandmother's entire collection in 6 weeks while working full-time. The first camera I almost donated? Sold for $95. ValueSnap paid for itself immediately."

---

### Journey 2: Alex Chen - The Thrift Store Flip

Alex is a 28-year-old software developer who hits thrift stores every Saturday morning as a side hustle. He's got a good eye for vintage electronics and gaming gear, but pricing is always a gamble. Last month he bought a "vintage synthesizer" for $45 that turned out to be worth $15. The month before, he passed on a Game Boy that sold on eBay for $180 the next week.

**The Old Way:** Alex would photograph interesting finds, text them to his friend Dave (a reseller), and wait for a response. Sometimes Dave was busy. Sometimes Alex missed the item because someone else grabbed it while he was waiting. Manual eBay research takes 5-10 minutes per item—too slow when you're browsing a busy thrift store.

**Discovering ValueSnap:** Alex sees a TikTok of someone scanning items at a garage sale. "Instant price check?" He downloads the app immediately.

**The Setup:** Quick sign-up, eBay OAuth connection ("So I can list directly? Nice."), and Alex is ready to test.

**The First Use (Skeptical Phase):** Next Saturday at Goodwill, Alex spots a vintage Sony Walkman for $8. He opens ValueSnap, snaps a photo. **6 seconds later:** "Sony WM-F45, Sports Walkman, 1987. Condition: Good. **Estimated Value: $65-95** (HIGH confidence - 23 recent sales)."

Alex doesn't buy it immediately. Old habits. He opens eBay, searches "Sony WM-F45 sold." Results: $58, $72, $89, $95, $68. *Damn. It's actually right.*

He buys the Walkman. No texting Dave. No second-guessing. No missing the deal.

**Building Speed (Semi-Trust Phase):** Over the next 30 minutes, Alex scans 6 more items. He spot-checks the first two against eBay (both accurate). By item four, he's moving faster—just checking the confidence level. HIGH confidence = trust it. MEDIUM = quick glance at eBay. LOW = skip or investigate.

**The Workflow (Earned Trust Phase):** An hour in, Alex has developed a rhythm. Spot item → snap photo → 6 seconds → decision. The $25 "vintage" boombox? ValueSnap says $20-30 (pass—no margin). The $15 Nintendo controller? $45-60 (buy). The $50 turntable the store overpriced? $40-55 (pass).

He spends $28. He sells for $140. Net profit: $112 in one morning.

**The Listing Flow:** On Sunday, Alex lists his finds. For each item, he opens the valuation, taps "List on eBay," reviews the pre-filled listing (title, description, category, price—all done), adds his own photos, and posts. Four items listed in 12 minutes total.

**The New Reality:** Three months later, Alex's side hustle is averaging $400/month profit. He's become the guy in his friend group who "always knows what stuff is worth." Dave now texts HIM for pricing advice.

**Alex's Quote:** "First time I used it, I checked everything against eBay. Now I just check the confidence level. HIGH means buy. ValueSnap turned my hobby into actual income."

---

### Journey 3: Lisa Martinez - The Power Seller Upgrade

Lisa is a 45-year-old eBay Power Seller running a vintage clothing and accessories business from her garage. She lists 50-100 items per week and has been selling for 8 years. She knows her category well, but cross-category items (electronics, collectibles, jewelry that comes in estate lots) slow her down. Research time is eating into her listing velocity.

**The Old Way:** Lisa spends 2-3 hours every Monday researching prices for items outside her expertise. She has a system: eBay sold listings, WorthPoint for antiques, her own spreadsheet of past sales. It works, but it's tedious—and she suspects she's leaving money on the table on items she prices too conservatively.

**Discovering ValueSnap:** Another eBay seller in her Facebook group mentions "this AI thing that actually works." Lisa is skeptical—she's tried "smart pricing" tools before and found them useless. But she signs up for the free tier to test it.

**The Test (Trust Validation):** Lisa photographs 10 items she already knows the value of. She wants to see if ValueSnap matches her expertise. Results:
- 7 items: ValueSnap within 10% of her price (impressive)
- 2 items: ValueSnap higher than her price by 15-20% (she was underpricing!)
- 1 item: ValueSnap shows MEDIUM confidence with a wide range (fair—it's a rare piece)

**Lisa's verdict:** "It's not perfect, but it's better than most tools I've tried. And it caught two items I was underpricing."

**The Upgrade:** Lisa subscribes to the paid tier. She now runs every non-clothing item through ValueSnap before listing. Her pricing is more consistent, and she's stopped underpricing the items she doesn't know well.

**The Workflow Integration:** ValueSnap's pre-filled listings save Lisa time, but she has her own templates and style. She uses ValueSnap for pricing and category suggestions, then pastes into her own listing format. The hybrid approach works: AI accuracy + her personal touch.

**The Business Impact:** Three months in, Lisa's average sale price on cross-category items has increased 12%. She's spending 1 hour less per week on research. More importantly, she's confident enough to accept estate lots with mixed items—something she avoided before because "who has time to research 50 random things?"

**Lisa's Review:** "I've been selling on eBay for 8 years. I tested ValueSnap against items I already knew—it passed. Now I use it for everything I don't know. That's exactly what I needed."

---

### Journey 4: Alex's Bad Day - Error Recovery & Technical Resilience

It's a rainy Saturday, and Alex is at an indoor flea market with terrible lighting AND spotty cell service. He spots what looks like a vintage camera lens and snaps a quick photo with ValueSnap.

**The AI Confidence Issue:** ValueSnap returns: "**LOW Confidence** - Unable to identify specific model. Detected: Camera lens (generic). Estimated range: $20-200 (wide variance due to uncertain identification)."

**The Guidance:** Instead of failing silently, ValueSnap shows:
- "📸 **Photo Quality Issue Detected** - Try photographing the brand name or model number"
- "🔍 **Manual Search Suggested** - Search eBay for 'vintage camera lens [brand]'"
- "✏️ **Enter Manually** - If you know what this is, enter details for better valuation"

**Alex's Recovery:** He looks closer at the lens, finds "Canon FD 50mm f/1.4" printed on the side. He taps "Enter Manually," types the model, and resubmits. **3 seconds later:** "Canon FD 50mm f/1.4 SSC. **Estimated Value: $120-160** (HIGH confidence - 34 recent sales)."

The lens is priced at $40. Alex buys it.

**The Network Issue:** Later, Alex finds a vintage game console. He snaps a photo, but his cell signal drops to one bar. ValueSnap shows: "📶 **Connection unstable** - Request queued. We'll process when your connection improves."

Alex keeps browsing. Two minutes later, his phone buzzes: "✅ Valuation complete: Sega Genesis Model 1, $45-65 (HIGH confidence)."

**The Technical Resilience:** ValueSnap didn't crash. It didn't lose his photo. It queued the request and delivered results when it could. Alex bought the Genesis for $12.

**The Lesson:** ValueSnap handles both AI uncertainty AND technical failures gracefully. Users aren't abandoned—they're guided through problems and their work is preserved.

---

### Trust Progression Model

All user journeys follow the same trust-building arc:

| Phase | User Behavior | ValueSnap's Role |
|-------|--------------|------------------|
| **1. Skeptical** | Verify every valuation manually | Provide transparent confidence levels, encourage verification |
| **2. Semi-Trust** | Spot-check some valuations | Reward accuracy, build confidence through consistency |
| **3. Earned Trust** | Trust HIGH confidence, verify MEDIUM/LOW | Maintain accuracy, never betray earned trust |

**Key Insight:** Trust is earned, not assumed. Users who verify early and find ValueSnap accurate become the strongest advocates.

---

## Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| **Sarah (Estate Seller)** | Batch upload, progress tracking, confidence indicators, pre-filled listings, donation pile identification, eBay OAuth flow, high-value → professional appraisal guidance |
| **Alex (Casual Collector)** | Mobile-first camera, instant valuation (<10s), buy/pass decision support, quick listing flow, trust progression UX |
| **Lisa (Power Seller)** | Accuracy validation, pricing guidance, template compatibility, cross-category support, expert-verification workflow |
| **Error Recovery** | Photo quality detection, manual entry fallback, search suggestions, confidence transparency, network resilience, request queuing, graceful degradation |

### Critical UX Requirements from Journeys

1. **eBay OAuth Flow**: Must be smooth, trustworthy, one-time setup
2. **Trust Progression**: Design for skeptical → semi-trust → earned trust arc
3. **Confidence Communication**: HIGH/MEDIUM/LOW must be instantly scannable
4. **High-Value Guidance**: For items $500+, suggest professional appraisal
5. **Technical Resilience**: Queue requests on bad network, never lose user's work
6. **Error Recovery**: Guide users through problems, don't just show error messages

---

## Innovation & Novel Patterns

### Core Innovation Thesis

**Assumption Being Challenged:** "Accurate item valuations require expensive professional appraisers."

ValueSnap challenges this assumption by demonstrating that AI + market data can deliver valuations that are *good enough* for the majority of consumer reselling use cases—at a fraction of the cost and time.

**The Innovation Equation:**
```
Traditional: Expert knowledge + Manual research = Accurate valuation ($50-200, days)
ValueSnap: AI identification + Market data + Statistical analysis = "Good enough" valuation ($0.10, seconds)
```

### Detected Innovation Areas

#### 1. The Integrated Pipeline (Technical Innovation)

**What's Novel:** No existing solution combines all three capabilities:
- AI-powered visual item identification
- Statistical market data analysis (IQR outlier removal)
- Pre-filled marketplace listing creation

**Why It Matters:** Competitors offer pieces: WorthPoint has data but no AI. Google Lens identifies but doesn't price. eBay lists but doesn't value. ValueSnap integrates the entire workflow.

**Validation Needed:** End-to-end completion rate. Can users go from photo to listing faster than alternatives?

#### 2. Trust-Through-Transparency (UX Innovation)

**What's Novel:** Most AI tools demand blind trust ("trust our algorithm"). ValueSnap inverts this with explicit trust progression:
- **Skeptical Phase:** Encourage manual verification
- **Semi-Trust Phase:** Confidence indicators guide selective verification
- **Earned Trust Phase:** Users trust HIGH confidence, verify MEDIUM/LOW

**Why It Matters:** Trust is earned, not assumed. Users who verify early and find ValueSnap accurate become advocates, not skeptics.

**Validation Needed:** Track trust progression metrics. Do users verify less over time? Do verification rates correlate with retention?

#### 3. Consumer-First AI Appraisal (Market Innovation)

**What's Novel:** Professional appraisal tools exist (Valutico, Terapeak). Consumer-facing, mobile-first AI appraisal for casual resellers does not.

**Why It Matters:** The professional market is saturated. The consumer market is underserved. Estate sellers and thrift flippers don't need professional tools—they need fast, affordable, "good enough."

**Validation Needed:** User acquisition in target segments. Can we attract users who would never use professional tools?

### The Cold Start Problem

**Hidden Risk:** Accuracy varies significantly by item rarity.

ValueSnap's accuracy depends on eBay sold listings data. Common items have abundant data; rare items have little or none. This creates a stratified accuracy reality:

| Item Category | Data Availability | Expected Accuracy | % of Inventory |
|---------------|-------------------|-------------------|----------------|
| **Common** (vintage cameras, game consoles) | High (50+ sales) | 85-90% | ~50% |
| **Uncommon** (niche collectibles, older items) | Medium (10-50 sales) | 70-80% | ~30% |
| **Rare** (one-of-a-kind, obscure antiques) | Low (<10 sales) | 40-60% | ~20% |

**Critical Insight:** Overall accuracy might be 75%, but estate sellers (primary users) have the highest proportion of rare items. Their experience may be worse than average metrics suggest.

**Mitigation Strategy:**
1. **Category-aware confidence:** Factor data availability into confidence scoring (rare item + few sales = LOW confidence regardless of AI certainty)
2. **UX steering:** Guide rare items toward manual review, not blind AI trust
3. **Transparent messaging:** "Based on 3 recent sales—verify before listing" vs. "Based on 47 sales—high confidence"
4. **Expectation setting:** Help users understand that rare ≠ unreliable, just requires verification

### Validation Approach

#### The Accuracy Benchmark

**Critical Insight:** 50% accuracy is effectively 0%. Users need to trust valuations more than a coin flip for the product to have value.

**Benchmark Requirements:**
| Threshold | User Perception | Product Viability |
|-----------|-----------------|-------------------|
| <50% | "Worse than guessing" | Product failure |
| 50-65% | "Sometimes helpful" | Marginal—listing feature only |
| 65-75% | "Usually right" | Minimum viable accuracy |
| 75-85% | "Reliable guidance" | Strong product-market fit |
| >85% | "Trust completely" | Market leadership |

**Success Threshold:** ValueSnap must beat manual research (>70% accuracy) to deliver core value.

#### Data Collection Strategy

**Primary Method: eBay API Sale Tracking**

Since users connect eBay OAuth for listing, we can track actual sale outcomes:

| Data Point | Collection Method | Use Case |
|------------|-------------------|----------|
| **Sale Price** | eBay Trading API (GetSellerTransactions) | Compare to estimated value |
| **Sale Timing** | eBay API | Validate pricing competitiveness |
| **Listing Revisions** | eBay API | Detect user price adjustments (accuracy signal) |
| **Item Sold vs. Relisted** | eBay API | Proxy for pricing accuracy |

**Advantages:**
- Automatic—no user action required
- Accurate—real sale data, not self-reported
- OAuth already connected for listing feature

**Implementation:**
- Periodic API polling for sold items (daily batch)
- Match sale prices to original ValueSnap estimates
- Calculate accuracy metrics by category, confidence level, user segment

**Expansion Method: Proxy Metrics (for Mercari, Facebook Marketplace, etc.)**

For platforms without sale tracking APIs, use behavioral proxies:

| Proxy Metric | What It Indicates | Implementation |
|--------------|-------------------|----------------|
| **Listing Completion Rate** | Trust in valuation | Track % of valuations that become listings |
| **Re-listing Rate** | Initial price was wrong | Track items listed multiple times |
| **Price Adjustment Frequency** | User disagreed with estimate | Track edits before posting |
| **Time-to-Sale** | Competitive pricing | User-reported or manual tracking |

**Rationale:** Until platform APIs provide sale data, behavioral signals indicate whether valuations are trusted and effective.

### Risk Mitigation

#### If AI Accuracy Falls Short

**Internal Product Strategy (Not User-Facing):**

| Accuracy Level | Reality | Strategic Response |
|----------------|---------|-------------------|
| **>70% (target)** | Core innovation works | Full marketing as "AI valuation tool" |
| **50-70%** | Core innovation is broken | Pivot messaging to "smart listing tool with pricing suggestions"—valuation is guidance, not gospel |
| **<50%** | Valuation feature has negative value | Disable AI valuation, ship as listing tool only |

**Key Principle:** Be honest internally about what accuracy levels mean for the product, but user-facing messaging always frames ValueSnap positively:
- At 70%+: "Accurate valuations you can trust"
- At 50-70%: "Pricing guidance to help you decide"
- At <50%: "The fastest way to list on eBay" (valuation feature hidden/disabled)

**User Experience at Each Level:**

| Accuracy | User Experience | Churn Risk |
|----------|-----------------|------------|
| **>70%** | Users trust valuations, verify occasionally, high satisfaction | Low |
| **50-70%** | Users verify frequently, appreciate listing pre-fill, moderate satisfaction | Medium—retained by listing value |
| **<50%** | Users lose trust in valuations, some still use for listing convenience | High—only listing loyalists remain |

**Fallback Value Proposition:**
Even at failure-level accuracy, users retain:
- Pre-filled listings (6 of 8 fields)
- eBay OAuth integration
- Valuation history for reference
- Manual entry workflow

**The product degrades gracefully, never fails completely.**

### Competitive Moat Timeline

**Reality Check:** First-mover advantage is temporary. Current competitive gaps will close.

#### Competitive Moat Analysis

| Timeframe | Competitive Position | Risk Level |
|-----------|---------------------|------------|
| **0-6 months** | No direct competitor with integrated pipeline | 🟢 LOW—first mover |
| **6-12 months** | Existing players could add missing capabilities (Ximilar + valuation, iValuations + AI speed) | 🟡 MEDIUM—window closing |
| **12-24 months** | Copycats and well-funded competitors enter market | 🔴 HIGH—must have defensible moat |

#### Defense Strategy

**Build before competitors catch up:**

| Defense Layer | How It's Built | Timeline |
|---------------|----------------|----------|
| **User Trust** | Accuracy track record + transparency | Months 1-6 |
| **Data Accumulation** | Valuation history improves AI over time | Months 3-12 |
| **Network Effects** | More users = more data = better accuracy | Months 6-18 |
| **Platform Lock-In** | Multi-platform listing history | Phase 3 |

**Key Insight:** Technology is copyable. Data + trust + network effects are not. The 6-12 month window is critical for building defensible advantages before competitors enter.

### Innovation Success Criteria

| Innovation | Validation Metric | Success Threshold | Data Source |
|------------|-------------------|-------------------|-------------|
| Integrated Pipeline | End-to-end completion time | <15 minutes photo-to-listing | App analytics |
| Trust-Through-Transparency | Verification rate over time | Decreasing verification with retention | User behavior |
| Consumer-First AI | User acquisition cost | <$30 CAC in target segments | Marketing metrics |
| Accuracy Benchmark | Valuation vs. sale price variance | >70% within ±15% of sale price | eBay API tracking |
| Cold Start Handling | Rare item confidence accuracy | LOW confidence items have <50% accuracy complaints | User feedback |

---

## Web App (PWA) Specific Requirements

### Project-Type Overview

ValueSnap is a **Mobile-First Progressive Web App (PWA)** built with Expo Router + React Native Web + NativeWind. The architecture prioritizes responsive design across all screen sizes while maintaining camera functionality for the core capture-value-list workflow.

### Technical Architecture Considerations

#### Single-Stack Approach (No Framework Fragmentation)

**Decision:** Use Expo Router for everything. No Next.js, no separate marketing site.

| Route | Rendering | Implementation |
|-------|-----------|----------------|
| `/` (Landing Page) | Expo static export | Single marketing page, SSG |
| `/app/*` (App Routes) | Client-side SPA | Camera, results, history, settings |
| `/v/:id` (Future) | Defer decision | Only add SSR complexity when actually needed |

**Rationale:**
- One build system, one deployment pipeline, one codebase
- Expo Router supports static export for landing page
- Don't prematurely complicate the stack
- If SSR is needed later for public valuation pages, evaluate then

#### Responsiveness Architecture

**Root Cause of Prototype Issues:** The prototype's responsiveness broke due to:
1. Absolute positioning breaking flex layouts
2. Fixed dimensions not adapting to viewport
3. Scroll containers conflicting with native scrolling

**Solution Principles:**
- **Flexbox + Grid only** for layout (no absolute positioning for main content)
- **Relative units** (%, vh, vw, rem) instead of fixed pixels
- **Standard DOM flow** for scrolling (no nested scroll containers)
- **CSS-first** responsive design (Tailwind utilities)

### Design System: Swiss International Style

**Philosophy:** ValueSnap uses authentic Swiss International Style (Swiss Minimalist)—objective, grid-based, typography-driven, data-first. This isn't decoration; it's trust-building through clarity.

#### Core Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Grid-Based Layout** | Strict mathematical grid, asymmetric balance, consistent spacing scale |
| **High Contrast** | Black and white dominant, minimal color, maximum readability |
| **Objective Typography** | Clean sans-serif, hierarchy through weight and size only |
| **Data-First** | Numbers prominent, prices bold, confidence levels clear |
| **Functional Minimalism** | Every element serves a purpose, zero ornamentation |
| **Generous White Space** | Content breathes, no visual clutter |

#### Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Black | `#000000` | Text, icons, borders |
| **Background** | White | `#FFFFFF` | Primary background |
| **Surface** | Off-white | `#FAFAFA` | Cards, secondary surfaces |
| **Accent** | Signal Red | `#FF0000` | Primary CTA only (sparingly) |
| **Muted** | Gray | `#666666` | Secondary text, disabled states |

**No Traffic Light Colors:** Confidence levels use typography weight or grayscale intensity, not green/yellow/red.

#### Typography

| Element | Style | Example |
|---------|-------|---------|
| **Display** | Bold, 32-48px | Price: **$85-120** |
| **Heading** | Semi-bold, 20-24px | Section titles |
| **Body** | Regular, 16px | Descriptions, labels |
| **Caption** | Regular, 14px, muted | Metadata, timestamps |
| **Data** | Tabular figures | Prices, statistics |

**Font Stack:** Inter, Helvetica Neue, Helvetica, Arial, sans-serif

#### Navigation (Swiss Minimalist)

**Structure:** Responsive navigation system with bottom tabs on mobile and a restrained workstation rail on desktop

| Element | Design |
|---------|--------|
| **Mobile nav** | Bottom tab bar with Camera, History, Settings |
| **Desktop rail** | Left workstation rail with 1px divider, targeting ~10% of the layout width |
| **Nav items** | Line-weight icons, not filled |
| **Active State** | Simple underline or bold weight—no color change |
| **Consistency** | Same information architecture across breakpoints; desktop chrome adapts to a 10/45/45 workstation layout |

**Navigation Items:**
- **Camera** (primary action)
- **History** (past valuations)
- **Settings** (account, preferences)

**Desktop workstation rule:** At `lg` and above, appraisal screens target a **10/45/45** split for navigation, image review, and valuation data so the sidebar stays minimal and content remains dominant.

#### Component Patterns

**Valuation Card:**
- Item photo
- Item name (regular weight)
- Price range (bold, large)
- Confidence + sample size (caption, muted)
- Action button (text, underlined)

**Confidence Display (Swiss-Authentic):**
- Typography weight: `HIGH` (Bold) / `MEDIUM` (Regular) / `LOW` (Light)
- Or: Minimal data bar indicating confidence percentage (grayscale)

**Camera Screen:**
- Full-bleed viewfinder, no UI chrome
- Single capture button: high contrast circle
- Results appear post-capture, not overlaid

#### Spacing System

| Token | Size | Usage |
|-------|------|-------|
| `xs` | 4px | Icon padding |
| `sm` | 8px | Tight spacing |
| `md` | 16px | Standard spacing |
| `lg` | 24px | Section spacing |
| `xl` | 32px | Major sections |
| `2xl` | 48px | Page margins |

#### Iconography

- **Style:** Line icons, consistent 1.5-2px stroke weight
- **Set:** Lucide, Feather, or custom minimal set
- **Color:** Black only, muted gray for inactive

### Browser Support Matrix

**Target: Modern Browsers Only**

| Browser | Version | Priority |
|---------|---------|----------|
| **Chrome Mobile** | Last 2 versions | 🔴 Critical |
| **Safari Mobile** | iOS 15+ | 🔴 Critical |
| **Chrome Desktop** | Last 2 versions | 🟡 High |
| **Safari Desktop** | 14+ | 🟡 High |
| **Firefox** | Last 2 versions | 🟢 Low |
| **Edge** | Last 2 versions | 🟢 Low |

**Not Supported:** IE, pre-iOS 15, pre-Android 10, Opera Mini, UC Browser

### Camera Implementation Requirements

#### Core Camera Features

| Feature | Requirement | Priority |
|---------|-------------|----------|
| **Camera Capture** | `getUserMedia` API for live capture | 🔴 Required |
| **File Upload** | File picker for existing photos | 🔴 Required |
| **Photo Library Access** | Select from device gallery | 🔴 Required |
| **Permission Handling** | Graceful permission request flow | 🔴 Required |

#### Safari Camera Gotchas

| Issue | Solution |
|-------|----------|
| **HTTPS Required** | Ensure production is HTTPS |
| **User Gesture Required** | Always trigger from button tap |
| **Permission UI Differs** | Test on real Safari |
| **iOS PWA Camera Bugs** | Target iOS 15+ |

#### Camera Permission Denied Flow

| Scenario | UX Response |
|----------|-------------|
| **Permission Denied** | Friendly message + file upload button |
| **Permission Blocked** | Settings instructions + file upload fallback |
| **No Camera (Desktop)** | Auto-show file upload UI |

### Responsive Design Strategy

#### Responsive Testing Checklist

| Device | Width | Priority |
|--------|-------|----------|
| **iPhone SE** | 375px | 🔴 Critical |
| **iPhone 14 Pro** | 393px | 🔴 Critical |
| **Pixel 7** | 412px | 🔴 Critical |
| **iPad Mini** | 768px | 🟡 High |
| **iPad** | 820px | 🟡 High |
| **MacBook Air** | 1280px | 🟡 High |

#### Content Layout Strategy

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| **Valuation Card** | Full width | 2-up grid | 3-up grid |
| **Camera View** | Full screen | Full screen | Centered, max-width |
| **Batch Upload** | Stacked list | Card grid | Table option |

### Performance Targets

| Metric | Target |
|--------|--------|
| **First Contentful Paint** | < 1.5s |
| **Largest Contentful Paint** | < 2.5s |
| **Time to Interactive** | < 3.5s |
| **Cumulative Layout Shift** | < 0.1 |
| **Bundle Size (JS)** | < 500KB gzipped |
| **Valuation API Response** | < 3s |

### SEO Strategy (Minimal Scope)

| Page | SEO Priority | Approach |
|------|--------------|----------|
| **Marketing Landing Page** | 🔴 High | Expo static export, meta tags |
| **Public Valuation Results** (future) | 🟡 Defer | Add SSR when needed |
| **App Routes** | 🟢 None | Client-side SPA |

### Accessibility Requirements

**Target: Basic WCAG 2.1 Compliance (MVP-First)**

| Requirement | Priority |
|-------------|----------|
| **Color Contrast** (4.5:1) | 🔴 Must have |
| **Touch Targets** (44x44px) | 🔴 Must have |
| **Focus Indicators** | 🔴 Must have |
| **Alt Text** | 🔴 Must have |
| **Semantic HTML** | 🟡 Should have |
| **Screen Reader** | 🟡 Should have |

### Testing Strategy

#### Test Priority Order

| Priority | Test Area |
|----------|-----------|
| **P0** | Camera functionality |
| **P0** | Responsive layout |
| **P0** | Camera permission denied |
| **P1** | PWA install |
| **P1** | Offline mode |
| **P2** | Cross-browser |
| **P3** | Accessibility |

#### Real Device Requirements

| Test | Real Device Needed? |
|------|---------------------|
| Camera capture | 🔴 Required |
| PWA install | 🔴 Required |
| Safari quirks | 🔴 Required (real iPhone) |
| Layout/responsive | Nice to have |

#### PWA-Specific Test Cases

- Service worker registration
- Offline fallback page
- Add-to-homescreen prompt
- App update detection
- Cache invalidation

### Real-Time Features (Future Roadmap)

**Current State:** Not required for MVP.

**Future Candidates (Phase 2/3):**
- Batch progress updates (WebSocket/SSE)
- Sale notifications (Push + WebSocket)
- Price alerts

**Implementation:** Use Supabase Realtime when needed.

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving + Experience Hybrid

ValueSnap MVP solves the core problem ("What is this worth?") while delivering the seamless capture→value→list experience that differentiates from competitors. The goal is validated learning: do users trust AI valuations enough to list items based on them?

**Core Hypotheses Being Tested:**
- Users will trust AI-powered valuations enough to use them for actual listings
- The integrated pipeline (photo→value→list) is faster than manual research
- Confidence transparency builds trust rather than undermining it

**Resource Requirements:**
- **Team:** Solo developer or 2-person team
- **Skills:** React Native/Expo, AI integration (OpenAI), eBay API, Supabase
- **Timeline:** 6-8 weeks to functional MVP (see assumptions below)

#### Timeline Assumptions (Critical)

The 6-8 week estimate assumes:

| Assumption | Risk if Violated |
|------------|------------------|
| **Swiss UI design decisions complete** | UI design during dev adds 2-3 weeks |
| **No feature creep during implementation** | Each "small addition" compounds |
| **eBay API tested early (Week 1)** | API surprises late = schedule slip |
| **Prototype code reusable for core flow** | Full rewrite = timeline doubles |

**Recommendation:** Test eBay Browse API integration in Week 1. If issues found, address immediately or adjust scope.

### MVP Feature Set (Phase 1)

**Core User Journey Supported:** "User photographs item → receives AI valuation with confidence → creates eBay listing"

#### Must-Have Capabilities

| Feature | Description | Success Metric |
|---------|-------------|----------------|
| **Camera Capture** | Photo capture via Web Camera API | Works on iOS Safari + Chrome |
| **File Upload** | Select existing photos from device | Desktop fallback functional |
| **AI Item Identification** | GPT-4o-mini identifies item from photo | >80% correct identification |
| **AI Description Quality** | Generated text is grammatically correct, factually accurate | <10% user edits for errors |
| **eBay Market Data** | Real-time pricing from eBay Browse API (IQR analysis) | <3s response time |
| **Confidence Indicators** | HIGH/MEDIUM/LOW based on sample size + AI certainty | Clear visual hierarchy |
| **Valuation Display** | Price range, sample size, market velocity | Data-first Swiss design |
| **Listing Pre-Fill** | 6/8 eBay fields pre-populated (grammar-correct, accurate) | <2 min to complete listing |
| **Valuation History** | List of past valuations, persistent across sessions | Accessible from History tab |

#### Should-Have (MVP if feasible, else Growth)

| Feature | Description | Decision Factor |
|---------|-------------|-----------------|
| **Offline Viewing** | View cached valuations without network | PWA requirement, include if straightforward |

#### Explicitly Excluded from MVP

| Feature | Rationale | Phase |
|---------|-----------|-------|
| eBay OAuth posting | Convenience, not core value | Phase 2 |
| Batch processing | Nice-to-have, not core journey | Phase 2 |
| Mercari/FB Marketplace | Platform expansion | Phase 3 |
| Premium tier/payments | Revenue after validation | Phase 2 |
| Sale tracking/accuracy validation | Requires time + OAuth | Phase 2 |
| AI retraining on user data | Long-term moat, not MVP | Phase 3 |
| Push notifications | Not critical for core journey | Phase 2 |

### Post-MVP Features

#### Phase 2: Growth (Months 3-6)

**Goal:** Increase engagement, validate accuracy, introduce monetization

| Feature | User Value | Business Value |
|---------|------------|----------------|
| **eBay OAuth Posting** | Seamless listing without copy/paste | Conversion improvement |
| **Batch Processing** | Power users process multiple items | Higher engagement, premium upsell |
| **Sale Tracking (eBay API)** | See actual sale prices | Accuracy validation data |
| **Premium Tier** | Higher limits, priority processing | Revenue generation |
| **Enhanced History** | Search, filter, export valuations | Retention improvement |
| **Accuracy Dashboard** | Show accuracy stats to build trust | Trust metric, marketing |

#### Phase 3: Expansion (Months 6-12)

**Goal:** Platform expansion, defensible moat, market leadership

| Feature | User Value | Business Value |
|---------|------------|----------------|
| **Mercari Integration** | Cross-platform listing | Market expansion |
| **Facebook Marketplace** | Broader reach | User acquisition |
| **AI Model Improvement** | Better accuracy over time | Competitive moat |
| **Category Specialization** | Expert-level valuations (e.g., vintage cameras) | Premium positioning |
| **Community Features** | User corrections, expertise sharing | Network effects |

### Risk Mitigation Strategy

#### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **AI identification accuracy <70%** | Medium | Critical | Test on 100+ items pre-launch; have fallback messaging ready |
| **AI description quality issues** | Medium | High | Use template-slot approach vs. free-writing; test for hallucinations |
| **eBay API changes** | Low | High | Abstract API layer, monitor deprecation notices |
| **Safari Camera issues** | Medium | Medium | Test on real devices, file upload fallback |
| **Performance bottlenecks** | Low | Medium | Lighthouse audits, lazy loading |

**Riskiest Technical Assumption:** AI identification accuracy AND description quality are both good enough.

**AI Output Quality Strategy:**

| Quality Dimension | Test Method | Minimum Bar |
|-------------------|-------------|-------------|
| **Identification Accuracy** | Is this the correct item? | >80% correct |
| **Description Accuracy** | Are specs/details factually correct? | <10% factual errors |
| **Grammar/Tone** | Is text marketplace-appropriate? | <5% grammar issues |

**Mitigation Approach:** Consider **template-slot generation** where AI fills structured fields rather than free-writing descriptions. More predictable quality, fewer hallucinations.

Example:
```
Template: "[Brand] [Model] [Type] in [Condition] condition. [Key Feature 1]. [Key Feature 2]. [Included accessories]."

AI fills slots → "Canon EF 50mm f/1.4 USM Lens in Excellent condition. Ultra-fast autofocus. Great for portraits. Includes front and rear caps."
```

#### Market Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Users don't trust AI valuations** | Medium | Critical | Trust-Through-Transparency UX + validation metric |
| **Transparency backfires** | Medium | Medium | Track trust hypothesis metric (see below) |
| **Competitors launch similar product** | Medium | Medium | Move fast, build data moat, user loyalty |
| **eBay changes listing policies** | Low | Medium | Monitor policies, diversify platforms (Phase 3) |

**Trust Hypothesis Validation:**

The transparency approach ("MEDIUM confidence, 12 sales") could either:
- ✅ Increase trust (users appreciate honesty)
- ❌ Decrease trust (users see low sample size as unreliable)

**Validation Metric:** Track **listing completion rate by confidence level**

| Confidence | Expected Behavior | Warning Signal |
|------------|-------------------|----------------|
| HIGH | Highest completion rate | If LOW > HIGH, transparency hurting |
| MEDIUM | Moderate completion rate | If significantly lower than HIGH, adjust UX |
| LOW | Lowest completion rate (expected) | If users abandon entirely, reconsider display |

**Action:** If MEDIUM/LOW confidence items have disproportionately low completion rates, test alternative UX (e.g., hide exact sample size, use qualitative labels).

#### Resource Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Solo dev bandwidth** | Medium | Medium | Strict scope discipline, defer nice-to-haves |
| **API costs exceed budget** | Low | Medium | Usage monitoring, rate limiting, caching |
| **Burnout before launch** | Medium | High | 6-week sprint, clear scope, ship imperfect |
| **UI design during development** | Medium | Medium | Complete design decisions before coding |

**Contingency Plan:** If resources constrained, the absolute minimum viable product is:
- Camera capture + file upload
- AI identification + eBay pricing
- Display results (no listing pre-fill)
- Manual copy/paste to eBay

This "emergency MVP" proves core value in half the scope.

### Scope Philosophy

**Guiding Principle:** Ship fast, learn fast, improve fast.

| Principle | Application |
|-----------|-------------|
| **YAGNI** | Don't build batch processing until users demand it |
| **80/20** | Pre-filled listing is 80% of posting value, 20% of complexity |
| **Validated Learning** | MVP exists to test hypotheses, not be perfect |
| **Scope Discipline** | Every feature not in MVP is a decision, not an oversight |
| **Quality Bar** | AI output must be grammatically correct and factually accurate—non-negotiable |

**Red Lines (Do Not Cross):**
- No OAuth posting in MVP (deferred to Growth)
- No multi-platform in MVP (eBay only)
- No AI training on user data in MVP (privacy/complexity)
- No social features in MVP (not core value)
- No native app builds (PWA only until proven demand)

---

## Functional Requirements

### Image Capture & Input

- **FR1:** User can capture a photo of an item using the device camera
- **FR2:** User can upload an existing photo from their device's file system or photo library
- **FR3:** User can retake or replace a photo before submitting for valuation
- **FR4:** User can view a preview of the captured/uploaded image before submission
- **FR5:** System can detect when camera permission is denied and offer file upload alternative
- **FR6:** User can capture photos on both mobile and desktop devices
- **FR7:** User can receive feedback when photo quality is insufficient for accurate identification

### Item Identification & Valuation

- **FR8:** System can identify an item from a submitted photo using AI analysis
- **FR9:** System can retrieve recent sold prices for the identified item from eBay marketplace data
- **FR10:** System can calculate a price range estimate based on market data analysis
- **FR11:** System can determine confidence level (HIGH/MEDIUM/LOW) based on data quality and sample size
- **FR12:** User can view the identified item name, category, and key attributes
- **FR13:** User can view the estimated price range (low-high)
- **FR14:** User can view the confidence level for the valuation
- **FR15:** User can view the number of recent sales used to calculate the estimate
- **FR16:** User can view market velocity indicators (how quickly items sell)
- **FR17:** System can generate grammatically correct item descriptions
- **FR18:** User can view progress indication while valuation is being processed

### Marketplace Listing

- **FR19:** User can create an eBay listing pre-filled with valuation data
- **FR20:** System can pre-populate listing title from AI identification
- **FR21:** System can pre-populate listing description from AI-generated content
- **FR22:** System can pre-populate suggested listing price from valuation estimate
- **FR23:** System can pre-populate item category from AI classification
- **FR24:** System can pre-populate item condition based on AI assessment
- **FR25:** System can include the original item photo in the listing data
- **FR26:** User can edit any pre-filled listing field before finalizing
- **FR27:** User can copy listing data to clipboard for manual eBay entry
- **FR28:** User can distinguish between pre-filled fields and fields requiring manual input

### Valuation History & Management

- **FR29:** User can view a list of all their past valuations
- **FR30:** User can view details of any individual past valuation
- **FR31:** System can persist valuation history across sessions
- **FR32:** User can access valuation history from main navigation
- **FR33:** User can view when each valuation was created (date/time)
- **FR34:** User can view cached valuations when offline (if previously loaded)

### User Account & Authentication

- **FR35:** User can create an account to save their data
- **FR36:** User can sign in to access their saved valuations
- **FR37:** User can sign out of their account
- **FR38:** System can maintain user session across app restarts
- **FR39:** User can use the app without an account for basic valuation (limited history)
- **FR40:** User can view their account information in Settings
- **FR41:** User can access support/help information
- **FR42:** User can delete their account and associated data

### Application & Platform

- **FR43:** User can install the app to their device home screen (PWA)
- **FR44:** User can navigate between Camera, History, and Settings views
- **FR45:** User can access the app on mobile devices (phones, tablets)
- **FR46:** User can access the app on desktop browsers
- **FR47:** System can display responsive layouts appropriate to screen size
- **FR48:** User can access the marketing landing page to learn about the product
- **FR49:** User can launch the app from the landing page

### Error Handling & Feedback

- **FR50:** User can receive feedback when AI cannot identify an item
- **FR51:** User can receive feedback when insufficient market data exists for pricing
- **FR52:** System can display appropriate messaging based on confidence level
- **FR53:** User can receive feedback when network connectivity is unavailable
- **FR54:** User can retry a failed valuation request
- **FR55:** User can receive feedback when API rate limits are reached

---

## Non-Functional Requirements

### Performance

| Requirement | Metric | Target | Measurement |
|-------------|--------|--------|-------------|
| **NFR-P1:** Valuation response time | End-to-end from submit to result | < 3 seconds | Backend metrics |
| **NFR-P2:** First Contentful Paint | Time to first meaningful content | < 1.5 seconds | Lighthouse |
| **NFR-P3:** Largest Contentful Paint | Time to largest content element | < 2.5 seconds | Lighthouse |
| **NFR-P4:** Time to Interactive | Time until app is fully usable | < 3.5 seconds | Lighthouse |
| **NFR-P5:** Cumulative Layout Shift | Visual stability during load | < 0.1 | Lighthouse |
| **NFR-P6:** Bundle size | JavaScript payload (gzipped) | < 500KB | Build analysis |
| **NFR-P7:** Image processing | Client-side photo compression | < 1 second | App metrics |

**Performance Philosophy:** Speed is trust. Users processing multiple items need fast feedback. If valuation takes >5 seconds, users will abandon.

### Security

| Requirement | Description | Target |
|-------------|-------------|--------|
| **NFR-S1:** Data encryption in transit | All network traffic uses HTTPS | TLS 1.2+ required |
| **NFR-S2:** Data encryption at rest | User data encrypted in database | Supabase default encryption |
| **NFR-S3:** Authentication security | Secure session management | Supabase Auth with secure tokens |
| **NFR-S4:** API credential protection | Third-party API keys not exposed to client | Server-side API calls only |
| **NFR-S5:** Input validation | All user inputs validated and sanitized | Prevent injection attacks |
| **NFR-S6:** Image retention | User photos deleted from server after processing | Within 24 hours; thumbnail only retained in history |
| **NFR-S7:** Account deletion | User data fully removed on request | GDPR-compliant deletion |
| **NFR-S8:** Rate limiting | Prevent API abuse and resource exhaustion | 10 valuations/hour (guest), 100/hour (authenticated) |
| **NFR-S9:** Session timeout | Inactive session expiration | 7 days of inactivity |
| **NFR-S10:** Concurrent sessions | Active sessions per user | Maximum 3 simultaneous sessions |

**Security Philosophy:** Protect user data without over-engineering. No payment processing in MVP = lower security complexity. Rate limiting protects both users and API quotas.

### Scalability

| Requirement | Description | Target |
|-------------|-------------|--------|
| **NFR-SC1:** Concurrent users | System handles simultaneous valuations | 100 concurrent users (MVP) |
| **NFR-SC2:** Database capacity | Valuation history storage | 10,000 valuations/user |
| **NFR-SC3:** API rate limiting | Graceful handling of API limits | Queue + retry with user feedback |
| **NFR-SC4:** Growth headroom | Architecture supports growth | 10x users without major refactoring |
| **NFR-SC5:** API call efficiency | External API calls per valuation | ≤ 2 eBay API calls per valuation |
| **NFR-SC6:** Load testing | System validated under load | 100 concurrent users, <5% error rate, <5s p95 response |

**Scalability Philosophy:** Build for MVP scale, architect for growth. API efficiency is critical—eBay limits are 5,000 calls/day. Caching and batching are mandatory.

### Accessibility

| Requirement | Standard | Target |
|-------------|----------|--------|
| **NFR-A1:** Color contrast | WCAG 2.1 AA | 4.5:1 ratio for normal text |
| **NFR-A2:** Touch targets | Mobile accessibility | Minimum 44x44px |
| **NFR-A3:** Focus indicators | Keyboard navigation | Visible focus states on all interactive elements |
| **NFR-A4:** Alt text | Screen reader support | Meaningful descriptions for all images |
| **NFR-A5:** Semantic markup | Assistive technology | Proper heading hierarchy, landmarks |
| **NFR-A6:** Error messaging | Screen reader accessible | Errors announced, not just visual |

**Accessibility Philosophy:** Basic compliance for MVP, improve iteratively. Swiss minimalist design naturally supports accessibility (high contrast, clear hierarchy).

### Integration

| Requirement | Integration | Specification |
|-------------|-------------|---------------|
| **NFR-I1:** eBay Browse API | Market data retrieval | Handle rate limits (5,000 calls/day), implement caching |
| **NFR-I2:** OpenAI API | Item identification | Handle rate limits, timeout gracefully, retry logic |
| **NFR-I3:** API fallback | Degraded operation | If API unavailable, show cached data or clear error |
| **NFR-I4:** API versioning | Future compatibility | Abstract API calls to handle version changes |
| **NFR-I5:** OAuth standards | eBay OAuth (Phase 2) | Follow OAuth 2.0 best practices when implemented |

**Integration Philosophy:** External APIs are dependencies, not guarantees. Build resilience—cache aggressively, fail gracefully.

### Reliability

| Requirement | Description | Target |
|-------------|-------------|--------|
| **NFR-R1:** System availability | Uptime target | 99% (allows ~7 hours downtime/month) |
| **NFR-R2:** Error recovery | Graceful error handling | No unhandled exceptions shown to users |
| **NFR-R3:** Offline capability | PWA offline mode | Cached valuations viewable offline |
| **NFR-R4:** Data persistence | No data loss | Valuations saved before network issues |
| **NFR-R5:** Session recovery | App restart handling | Session maintained across app restarts |
| **NFR-R6:** Valuation success rate | Submitted photos result in valuation | > 95% success rate (not error) |

**Reliability Philosophy:** Users shouldn't lose work. Save early, cache locally, sync when possible. Track success rate to catch systemic issues.

### AI Quality

| Requirement | Description | Target | Measurement |
|-------------|-------------|--------|-------------|
| **NFR-AI1:** Identification accuracy | AI correctly identifies item | > 80% correct | Manual validation sample |
| **NFR-AI2:** Description accuracy | Generated text factually correct | < 10% factual errors | Manual review sample |
| **NFR-AI3:** Grammar quality | Generated text grammatically correct | < 5% grammar issues | Automated + manual review |
| **NFR-AI4:** Valuation accuracy | Estimate within range of actual sale | > 70% within ±15% | eBay sale tracking (Phase 2) |
| **NFR-AI5:** Confidence calibration | HIGH confidence more accurate than LOW | Correlation validated | Analytics tracking |
| **NFR-AI6:** User correction rate | Users manually edit AI-identified name | < 20% of valuations | App analytics (proxy metric) |
| **NFR-AI7:** Photo quality detection | System flags low-quality photos | Minimum 800x600 resolution | Automated detection |

**AI Quality Philosophy:** AI must be trustworthy. User correction rate is a continuous proxy for accuracy. If users edit >20% of identifications, accuracy is failing.

### Guest User Limitations

| Requirement | Description | Limit |
|-------------|-------------|-------|
| **NFR-G1:** Guest valuation history | Valuations stored locally only | Last 5 valuations |
| **NFR-G2:** Guest session duration | Local data retention | Until browser cache cleared |
| **NFR-G3:** Guest feature access | Listing pre-fill requires account | Drives account creation |

**Guest Philosophy:** Let users try before committing. Full valuation demonstrates value; listing pre-fill incentivizes account creation.

