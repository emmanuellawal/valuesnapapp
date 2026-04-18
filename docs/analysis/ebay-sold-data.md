# eBay Sold-Listings API Investigation

**Date:** April 3, 2026  
**Time spent:** 30 minutes  
**Scope:** Repo-context review plus public eBay developer documentation links. No access to this project's live eBay developer console or credentials was available during the spike.

## Current State

ValueSnap's `search_sold_listings()` implementation in `backend/services/ebay.py` currently uses the Browse API and returns active listing data, not completed-sale data. The function name overstates what the integration can do today.

## API Options Investigated

### Option 1: Finding API `findCompletedItems`

- **Docs:** https://developer.ebay.com/devzone/finding/callref/findCompletedItems.html
- **What it offers:** A completed-items search endpoint intended for sold/completed marketplace results.
- **Auth model:** Public docs describe app-level use via eBay developer credentials, which is closer to the current `EBAY_APP_ID` model than OAuth-heavy Buy APIs.
- **Rate limits:** Not verified during this spike. Public docs confirm it is a distinct API surface, so ValueSnap should assume limits may differ from Browse until confirmed in the live developer console.
- **What could not be verified from the repo:** Whether this specific app already has the right Finding API access enabled, whether sandbox behavior is useful for ValueSnap's queries, and whether the endpoint remains a good long-term choice in eBay's current product direction.
- **Integration impact:** Moderate. It would require a new endpoint client, response-shape mapping, and confidence/caching recalibration because the response schema differs from Browse.

### Option 2: Marketplace Insights API

- **Docs:** https://developer.ebay.com/api-docs/buy/marketplace-insights/overview.html
- **What it offers:** Transaction-oriented pricing and marketplace insights, which is conceptually a better fit for fair-market valuation than active-listing Browse results.
- **Approval / access note:** The existing repo comment already flags that Marketplace Insights requires additional eBay approval, and nothing in this repo shows that approval is already in place.
- **Rate limits:** Not verified during this spike. Because Marketplace Insights appears entitlement-gated, any limit assumptions should be treated as unknown until approval and console visibility exist.
- **What could not be verified from the repo:** Whether this app has access today, what production approval lead time looks like, and whether sandbox or limited-test data would be enough to implement and validate the switch.
- **Integration impact:** Significant. The API is a stronger data-fit, but entitlement risk is higher than the Finding API path.

## Decision

**Accept the active-listing proxy for now and defer API switchover work until live eBay-console verification is available.**

Why:
- The current repo does not provide enough evidence to safely commit to either alternative.
- Finding API is plausible but not verified for this app.
- Marketplace Insights is strategically better but already appears approval-gated.
- Epic 5 can proceed without blocking on this investigation, while the limitation is now explicitly documented.

## Next Steps

1. When live eBay developer-console access is available, verify whether the current app has Finding API access and whether Marketplace Insights can be requested.
2. If Finding API access is available, prototype a one-keyword completed-items fetch outside production code and compare median price variance against the current Browse-based output.
3. If Marketplace Insights approval is feasible, treat that as a separate product/integration decision rather than a quick refactor.
4. Rename `search_sold_listings()` in a future maintenance pass if the integration continues to use active-listing Browse data, because the current name is misleading.
