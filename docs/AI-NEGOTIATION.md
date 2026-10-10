# How GNIS Engine's pricing intelligence works

This document describes what the code actually does, so it can be shown to a reviewer, an investor or a customer without overstating anything.

## The problem

Independent professionals (barbers, braiders, cleaners, tutors) price by instinct. Customers haggle by message, on the phone or at the door. The seller either loses the booking by saying no, or loses margin by saying yes. No-shows cost them a full slot. Booking tools such as Calendly or Fresha treat price as fixed and every booking as equally reliable.

## What is different

Three connected features, all inside the booking flow:

1. **Negotiation with a hard floor.** The seller sets a private lowest price per service. Customers can haggle in a chat. The system will never agree below that floor, and an agreed price is cryptographically locked to that booking.
2. **Demand-based price suggestions.** The dashboard compares demand across a seller's services and suggests raising a price or running a promotion.
3. **No-show risk scoring.** Each pending or approved booking gets a risk label and the plain-English reasons behind it.

## 1. Negotiation (`/api/site/negotiate`)

- The seller sets `negotiable` and `minPrice` for a service. `minPrice` is stripped from everything sent to the browser (`publicData`).
- The customer offers a price. The server decides, not the AI, using a concession ladder. With `margin = list - floor`, the lowest price accepted on rounds 1 to 4 is `list - margin x (0.25, 0.5, 0.75, 1.0)`, never below the floor. So the first offer must be within 25% of the discount range, the second within 50%, and so on. An offer at or above the current threshold is accepted. Otherwise the server counters at the threshold, and the fourth reply is a final price.
- Round state travels in a signed token (`typ: neg`, 1 hour), so a customer cannot reset the round count or skip rounds.
- On acceptance the server returns a signed lock token (`typ: lock`, 1 hour) containing the site, service and price. `/api/site/book` verifies the token and uses the locked price. It ignores any price sent by the browser. A customer cannot edit the page to pay less.
- Wording: if `ANTHROPIC_API_KEY` is set, a small language model writes the reply in the customer's language. It is given the decision and the price and cannot change either. Without a key, or if the call fails, a fixed multilingual template is used. AI calls are capped at 200 per site per day.
- Every negotiated booking is stored with `source = negotiated` and `list_price`, so the discount is measurable.

**What this is not:** the model does not learn each seller's optimal floor by itself yet. The ladder is a deliberate, explainable rule. See "Roadmap".

## 2. Demand-based price suggestions (`/api/site/analytics`)

For each service, over the last 30 days:

`demand index = bookings for this service / average bookings per service`

- Needs at least 5 bookings in total in 30 days, otherwise the dashboard says there is not enough data.
- Index of 1.5 or more: suggest raising the price by about 10% (rounded to a friendly number).
- Index of 0.5 or less, with at least 3 services and 10 bookings in total: suggest promoting it, or trying 10% off.
- Otherwise: keep the price.

Suggestions are shown with the reason. They are never applied automatically.

## 3. No-show risk (`lib/risk.js`)

A transparent scoring model, not a black box:

- Base rate: the seller's own no-show rate once they have 30 finished bookings, else a 10% prior.
- Adds risk for the customer's previous no-shows (up to +35%) and cancellations (up to +15%), bookings made more than 14 days ahead (+8%), deep negotiated discounts of 30% or more (+6%) and phone-only contacts (+3%).
- Removes risk for reliable repeat customers (-7%) and short-notice bookings (-4%).
- Result is clamped to 3% to 90% and shown as low (under 15%), medium (under 30%) or high, with the reasons listed.
- Sellers mark outcomes (completed, no show), which feeds the base rate and each customer's history. The customer also gets an automatic reminder the day before (email, and SMS if Twilio is set up) to cut no-shows.

## Honest limits

- The no-show model is a rule-based baseline. Its weights are reasoned estimates, not trained on a large dataset. They should be calibrated once there are a few thousand resolved bookings.
- Demand suggestions are simple and ignore seasonality and competitor prices.
- Claims about impact (for example "reduces no-shows by X%") must come from measured data from real sellers, not from this document.

## Roadmap to a stronger innovation case

1. Measure: log no-show rate with and without reminders, and revenue with and without negotiation, across real sellers.
2. Calibrate the risk weights by logistic regression on resolved bookings, and publish the accuracy.
3. Learn a recommended floor per service from accepted and rejected offers.
4. Add seasonality and day-of-week effects to the demand index.
5. Keep a changelog of experiments and results. Evidence like this is what makes the innovation claim credible.
