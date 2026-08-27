# QunjeeEats ↔ GPOS Bridge — Risk Mitigation Checklist

Companion to `AFO-GPOS-Scope.md`. Covers every step to make the API bridge
(Qunjee AFO booking → GPOS restaurant reservation/table-order) reliable, not
just "possible." Written before any code — use this as the implementation
checklist when the bridge is actually built.

**Direction of the bridge:** Qunjee (on confirmed + prepaid dine-in booking)
→ Cloud Function → GPOS's Firestore (that restaurant's own project).

---

## 0. The flow, end to end

1. Customer books + prepays on Qunjee (AFO). Qunjee's `appointments/{id}`
   doc is written/updated to `confirmed` with `paymentProofUrl` set.
2. That write **automatically triggers** a Cloud Function in Qunjee's
   `functions/index.js` (a Firestore `onWrite`/`onUpdate` trigger — nothing
   calls it manually).
3. The function reads the booking's data (name, phone, time, party size,
   pre-selected items if any) and connects to that restaurant's GPOS
   Firebase project using a stored service-account credential (§3).
4. It writes a new reservation/table-order into GPOS's Firestore, using the
   Qunjee `appointmentId` as the document ID (so a retry can't duplicate it
   — see §1).
5. GPOS staff open their own app (`Tables.jsx`) and just see the table
   marked "reserved" — indistinguishable from one their own staff created.
   They don't need to know Qunjee exists.
6. If step 3/4 fails, the function retries; if it still fails, it's written
   to `bridgeFailures` and a Sentry alert fires (§2, §9) so a human checks.

One trigger, one function, one write into the other system — everything
below is what makes that one write reliable and safe.

---

## 1. Duplicate-write prevention (idempotency)

Problem: Firestore/Cloud Function triggers are "at-least-once" — the same
event can fire more than once.

- [ ] Use the Qunjee `appointmentId` as a **deterministic document ID** for
      the reservation/order created in GPOS (not an auto-generated ID). If
      the bridge fires twice, the second write overwrites/no-ops the same
      document instead of creating a duplicate.
- [ ] Before creating, `get()` the doc by that ID first — if it already
      exists, treat as success and skip re-creation (don't error, don't
      duplicate).
- [ ] Never use "increment stock / append to array" style writes inside the
      bridge — always writes keyed by the deterministic ID, so retries are
      safe by construction.

## 2. Reliability & desync prevention

Problem: bridge fails silently after Qunjee already marked the booking
confirmed — customer has a valid booking, restaurant never sees it.

- [ ] Cloud Function must **retry on failure** (Firebase supports retryable
      background functions — enable it) rather than fail once and stop.
- [ ] After N retries, write the failure to a **dead-letter collection** in
      Qunjee (e.g. `bridgeFailures/{appointmentId}`) instead of silently
      dropping it.
- [ ] Wire a **Sentry alert** (already used in Qunjee, `src/sentry.js`) on
      every entry written to `bridgeFailures` — a human must be paged, not
      just logged.
- [ ] Build a small **reconciliation job** (scheduled Cloud Function, e.g.
      every 15 min) that scans confirmed+prepaid Qunjee bookings from the
      last 24h and checks each has a matching GPOS doc — catches anything
      that slipped past retries and dead-letter both.
- [ ] Do **not** block the customer's booking confirmation on the bridge
      succeeding. The booking is valid in Qunjee regardless of whether GPOS
      sync worked — the bridge failure is an ops problem to page someone
      about, not a reason to fail the customer's payment/booking.

## 3. Credentials & access control

Problem: a new secret (service account) now exists that didn't before, and
the bridge endpoint itself must not be callable by anyone else.

- [ ] Store GPOS's service-account key as a Cloud Functions **secret**
      (Firebase Secret Manager / `firebase functions:secrets:set`) — never in
      `.env`, never committed. Same rule as Qunjee's own admin SDK key.
- [ ] If the bridge is implemented as an HTTPS callable endpoint on GPOS's
      side (instead of Qunjee writing directly via admin SDK), that endpoint
      must **authenticate the caller** (shared secret / signed request) —
      it must not be a public URL anyone can POST to.
- [ ] Scope the service account's permissions to only what the bridge needs
      (write to the specific reservation/table-order paths) — not a
      full-project owner key.
- [ ] Rotate the key path documented somewhere (even just a note in this
      file) so it isn't forgotten — who owns rotating it, and when.

## 4. Data validation (don't trust the payload blindly)

Same principle as Qunjee's own rule: never trust client-supplied data as
authoritative. Applies here too, just server-to-server instead of client-to-server.

- [ ] GPOS-side handler must **re-validate** the incoming payload shape
      (required fields present, types correct, price/qty sane) before
      writing — don't assume Qunjee's side is always well-formed.
- [ ] Reject and dead-letter (don't silently drop) any payload that fails
      validation — this should also page/alert, since it likely means the
      two schemas have drifted (see §5).
- [ ] Sanitize customer PII sent across — send only what GPOS actually needs
      to seat/serve the table (name, phone, party size, items, time) — not
      Qunjee-internal fields (auth uid, internal flags, unrelated profile data).

## 5. Schema contract & drift prevention

Problem: two independent repos, no shared type system — either side can
change its schema without the other knowing.

- [ ] Write the payload shape down explicitly in **one shared reference
      doc** (this file or a new `BRIDGE_CONTRACT.md` in both repos) — field
      names, types, which are required vs optional.
- [ ] Version the payload: include a `bridgeVersion` field from day one, even
      if it's always `1` for now — so a future breaking change on either
      side can be detected and handled instead of silently misinterpreted.
- [ ] Before either GPOS or Qunjee changes the fields involved in this
      bridge (e.g. GPOS renames a field in `addTableOrder`), check this
      contract doc first — treat it as a real interface, not an internal
      implementation detail.

## 6. GPOS's own security rules (separate but related gap)

Already flagged in the scope doc: GPOS's `firestore.rules` isn't in version
control at all.

- [ ] Before the bridge goes live, GPOS's `firestore.rules` must be written,
      reviewed, and **checked into git** (remove it from `.gitignore`) —
      not because the bridge write goes through rules (admin SDK bypasses
      them), but because the same collections the bridge writes into are
      also read/written by GPOS's own staff app under those rules, and
      right now there's no record of what's actually enforced there.

## 7. Cancellation / reversal handling

Problem: what happens to the GPOS side if the Qunjee booking is later
cancelled or refunded.

- [ ] Bridge must also fire on **cancellation**, not just confirmation —
      update the GPOS table/reservation status (e.g. back to `empty`) rather
      than leaving a stale "reserved" table forever.
- [ ] Decide and document what happens if the restaurant has *already*
      seated/started the order in GPOS by the time a late cancellation
      comes through (edge case, but must have a defined behavior, not be
      undefined).

## 8. Environment safety

- [ ] Keep dev/staging Qunjee **strictly separated** from any restaurant's
      live production GPOS project — a test booking in Qunjee's dev
      environment must never be able to reach a real restaurant's real
      GPOS instance. Use per-environment config, not a hardcoded prod URL.
- [ ] Test the entire bridge against a **sandbox GPOS project** first (not
      a real client's live one) before connecting any real restaurant.

## 9. Monitoring, once live

- [ ] Sentry alert on: bridge function errors, anything landing in
      `bridgeFailures`, and payload-validation rejections (§4).
- [ ] A simple dashboard or daily count: bookings confirmed in Qunjee vs.
      reservations created in GPOS, for the restaurants using the bridge —
      any gap between these two numbers is the signal something's wrong.

---

## Order of implementation (do these in this order, not all at once)

1. Write the shared contract doc (§5) before writing any code.
2. Build the bridge against a sandbox GPOS project (§8), with idempotent
   writes (§1) and payload validation (§4) from the start — not bolted on later.
3. Add retry + dead-letter + Sentry alerting (§2, §9) before any real
   restaurant is connected — not after the first incident.
4. Write and commit GPOS's `firestore.rules` (§6) before go-live.
5. Add cancellation handling (§7) before go-live — this is easy to forget
   because the happy path (confirm → reserve) works without it.
6. Connect one real restaurant, watch the reconciliation job (§2) and
   dashboard (§9) for a week before adding a second.
