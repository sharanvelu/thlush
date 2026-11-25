# Online order integration (Swiggy, Zomato, Petpooja)

Status: **draft for discussion. Nothing here is built.**
Written: 2026-11-16, from web research. Items marked **(unverified)** came from third-party pages, not from the platforms' own documentation, and must be confirmed before anyone relies on them.

## 1. Goal

1. Bring online orders (Swiggy, Zomato and similar) into this system, so sales reports show the whole storefront and not just walk-in billing.
2. Print the kitchen slip for an online order on the thermal printer connected to this app. The platforms' own tablets or apps cannot reach that printer.

## 2. What the platforms offer

| Platform | What exists                                                                                                                                                                                    | How a restaurant gets access                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swiggy   | An internal order-management platform that pushes orders to restaurant POS systems. No public API reference was found.                                                                         | Through Swiggy's partner team. Per a LimeTray guide, partners fill a sign-up form, then Swiggy contacts them for legal documents and verification. **(unverified)** |
| Zomato   | A "POS Developer Platform" for POS partners, with unified API docs and real-time testing.                                                                                                      | Partner sign-up and approval on Zomato's side.                                                                                                                      |
| Petpooja | An Online Ordering API: sync menu, push an order into Petpooja's POS (`save_order`), status callbacks (Accept, Reject, Food Ready), item stock and store availability toggles. Docs on Apiary. | Credentials issued by Petpooja support. **(unverified)**                                                                                                            |

Important points:

- **Petpooja's API is not a source of Swiggy/Zomato orders for us.** It is how aggregators push orders _into Petpooja's own POS_. It only helps if we ran Petpooja. We do not.
- **Single outlets are usually not onboarded directly.** Swiggy and Zomato approve POS vendors, not individual restaurants. A one-outlet shop should expect to go through a middleware company, or to apply as a POS vendor itself.
- Public documentation for Swiggy's and Zomato's partner APIs could not be found. The exact payloads, authentication and webhook formats are unknown until a partner agreement gives us the specs.

## 3. Ways to connect

### Option A: Middleware (recommended to start)

A middleware company is already approved by Swiggy and Zomato. It collects orders from the platforms and sends them to our system by webhook, and relays status changes back.

- **UrbanPiper**: receives Swiggy and Zomato orders and pushes them to a POS or its own store manager.
- **Deliverect**: connects Zomato (and others) to a POS or in-house order system, and sends status updates back. Its Zomato page says a Zomato subscription is needed as well. **(unverified)**

Pros: fastest, one integration covers several platforms, they handle platform changes.
Cons: monthly or per-order fees (not checked), a dependency on another company, and some middleware targets bigger chains.

### Option B: Become a POS partner directly

Apply through Zomato's POS Developer Platform and Swiggy's partner team.

Pros: no middleware fees, full control.
Cons: slow, needs a business case (several restaurants or a product to sell), separate integration per platform.

### Option C: Manual entry

A cashier types online orders into the existing billing screen with a "source" field. No API needed, so it could ship first.

Pros: no external dependency, immediate reporting.
Cons: double entry, errors, no automatic printing.

### Suggested order

1. Ask UrbanPiper and Deliverect for pricing and whether they take a single outlet (see section 9).
2. Meanwhile, consider Option C as a stop-gap, since it needs only the data-model changes in section 4.
3. Build the webhook receiver against whichever middleware is chosen.
4. Revisit Option B only if the product is sold to other restaurants.

## 4. Proposed design in this system

The design is deliberately independent of the provider. Only the "adapter" in step 2 changes.

### 4.1 Data model

- `bills.source`: enum or text, such as `pos`, `swiggy`, `zomato`. Defaults to `pos`, so existing bills are unchanged.
- `bills.external_ref`: the platform's order ID. Unique together with `source`, so a repeated webhook cannot create a second bill.
- `bills.online_status`: for online orders only: `new`, `accepted`, `preparing`, `ready`, `dispatched`, `delivered`, `rejected`, `cancelled`.
- `online_order_events`: the raw payload and a timestamp for every webhook received, so a disputed order can always be reconstructed.
- `online_item_map`: maps a platform's item or variant ID to a `menu_items` row. Required because platform names and prices will not match our menu.
- Payment: a new payment method such as `online`, with the platform as the reference. These orders are already paid by the customer. The platform pays the restaurant later, minus commission.

Open question: store commission and payout figures? Reconciling against the platform's payout statement is a separate feature (section 8).

### 4.2 Receiving orders

- One route per provider, for example `POST /api/integrations/<provider>/orders`.
- Verify the request (a shared secret or HMAC signature, depending on the provider) before reading the body.
- Idempotent: the same order ID twice returns success and changes nothing.
- Respond quickly, then do the work. Platforms retry on slow or failed responses.
- Unknown items do not drop the order. The order is saved with the unmatched line flagged, and the cashier maps it from the inbox.
- Stock is deducted the same way as for a walk-in sale, when the order is accepted.

### 4.3 Order inbox and status

- A "New online orders" list on the billing screen, with a sound and a badge.
- Buttons: Accept, Reject (with a reason), Mark ready. Each calls the provider's status API through the adapter.
- Orders that nobody accepts within the platform's time limit are auto-rejected by the platform, so show a countdown if the provider sends one.

### 4.4 Printing

The printer is attached to one computer and reached over WebUSB from the browser tab (or the local print agent). The server cannot print by itself. So:

**Phase 1: open tab prints.** The billing page on the printer computer listens for new online orders (polling or server-sent events) and prints the kitchen slip through the existing print path. The existing running-order slips (KOT) already print only the items in one batch, so an online order is one slip. An optional customer copy for the delivery rider is also possible.

Limits: the tab must stay open and the printer connected on that computer. A sleeping or closed browser prints nothing. Mitigations: a visible "printer not connected" warning, a sound on every new order, and an "unprinted orders" list with a Print button.

**Phase 2 (optional): a printer that polls the cloud.** Printers that support server-driven printing (for example Star CloudPRNT or Epson Server Direct Print) print without any open tab. Whether the current Caysn KPC307 supports anything like this was **not checked**. Buying a compatible printer is the robust option as volume grows.

### 4.5 Reporting

Because online orders are bills with a `source`, existing reports work with a filter: sales by channel, item popularity by channel, and so on. Cash drawer figures must exclude online orders.

## 5. Constraints and risks

- **Credentials and approval are the critical path.** Nothing can be tested against real orders until a provider issues credentials and a sandbox.
- **Menu mapping is manual work** and must be kept up to date when the menu changes.
- **Money:** platform price, taxes and packaging charges may not equal our calculated totals. Decide which side wins (likely the platform's totals as they are what the customer paid).
- **Tax:** some platforms collect and remit GST themselves on food delivery. Check with an accountant how those orders should appear in tax reports. This is not a technical decision.
- **Availability:** if the app is down, orders still reach the platform's own tablet, but our records and slips miss them. A catch-up fetch (if the provider offers one) would close gaps.
- **Security:** webhook endpoints are public. Verify every request and never log secrets.

## 6. What this needs from the business

1. A decision on the route in section 3.
2. A Swiggy and Zomato merchant account in good standing, and a person who can talk to their partner or account managers.
3. A list of which platforms matter (Swiggy and Zomato only, or also others such as ONDC).
4. A computer left on at the counter with the printer connected, for phase 1 printing.

## 7. Implementation outline (once a provider is chosen)

1. Migration: `bills.source`, `bills.external_ref`, `bills.online_status`, `online_order_events`, `online_item_map`, `online` payment method. Backfill nothing.
2. Webhook route and provider adapter, with signature check and idempotency.
3. Mapping screen for unmatched items.
4. Order inbox with accept, reject and ready actions, and status callbacks.
5. Auto-print of new orders in the open billing tab, and an unprinted list.
6. Reports: a channel filter and a channel breakdown.
7. Tests: webhook idempotency, signature rejection, unmatched items, status transitions, stock deduction.

Rough size: steps 1 to 5 are the bulk of the work. Provider-specific details (payload shape, status names, retries) could change step 2 and 4 noticeably.

## 8. Out of scope for now

- Reconciling platform payouts and commission.
- Menu and price sync back to the platforms, and toggling item availability or store open/closed from this app (Petpooja's API and middleware support this; worth adding later).
- Delivery rider tracking.
- A customer-facing website or app of our own.

## 9. Questions to ask UrbanPiper and Deliverect

1. Do you onboard a single-outlet restaurant? Is there a minimum order volume or contract length?
2. What does it cost (setup, monthly, per order, per platform)?
3. Can you send orders to a webhook URL we host, and what are the payload, authentication and retry rules? Is there a sandbox?
4. Which statuses can we send back (accept, reject, ready, dispatched) and what are the platforms' time limits?
5. Can we also push menu, price and availability changes?
6. Do you offer a fetch endpoint to recover orders missed while our server was unreachable?
7. How are Swiggy and Zomato taxes, charges and discounts represented in the order payload?
8. How long does onboarding take with Swiggy and Zomato?

## 10. Sources

- Swiggy order management background: <https://asadabrar.substack.com/p/2-building-the-3rd-party-order-management>
- Swiggy and Zomato integration guide (LimeTray): <https://limetray.com/blog/zomato-swiggy-api-online-ordering-integrations-guide/>
- Zomato POS Developer Platform (BW Disrupt): <https://bwdisrupt.com/article/zomato-introduces-pos-developer-platform-for-restaurants-532618>
- UrbanPiper, Swiggy integration overview: <https://help.urbanpiper.com/ordering-channels/swiggy/integration-overview>
- UrbanPiper, Zomato integration overview: <https://help.urbanpiper.com/ordering-channels/zomato/integration-overview>
- Deliverect, Zomato integration: <https://deliverect.com/en-gb/integrations/zomato>
- Petpooja Orders API catalog entry: <https://apis.io/apis/petpooja/petpooja-orders-api/>
- Petpooja online ordering integration glossary: <https://blog.petpooja.com/glossary/online-food-ordering-integration/>
