# Method: detail per step

The method came from a production SaaS where published privacy, cookie and terms pages made
concrete promises, and an audit later found many places where the code did something else. The
most useful finding of that audit: **the easiest breach to prove is the one you signed yourself.**
Everything here is about making the published text and the code agree, with evidence.

## 1. Inventory from the code

Where to look, in order:
- **Schema / models**: every table or collection and every field about a person (ids, email,
  names, IPs or their hashes, free text, uploads, timestamps that reveal behaviour).
- **SDK initialisations**: analytics, error monitoring, session replay, payments, email, auth.
  Note default settings that send PII (e.g. "send default PII", replay sampling).
- **Outbound calls**: every `fetch`/HTTP client call to a third party and what payload it carries,
  including AI prompts built from user data.
- **Device storage**: every cookie, `localStorage`, `sessionStorage`, IndexedDB write, and the
  third-party scripts that write their own.
- **Logs and job payloads**: what ends up in logs, queues and task runners, and for how long.
- **Webhooks**: what the provider sends and what is persisted (raw bodies are often kept forever).

Write `UNKNOWN` instead of guessing; a dashboard setting is not in the repo.

## 3. Discrepancies

- Read the published text, not a summary of it. Quote the sentence.
- Typical mismatches: a retention period with no job enforcing it; "we never share" next to an
  analytics identify call with the email; a cookie list missing a cookie the code writes; consent
  promised before a script that loads unconditionally; a vendor used in code and absent from the
  subprocessor list; a right (export, deletion) promised with no tool to fulfil it.
- A mismatch is closed by changing the code, changing the text (via the lawyer), or a recorded
  founder decision. Keep the entry with its resolution and date.

## 4. Questions for the founder

Typical baseline questions: minimum age; B2B or consumers; regulated use cases excluded; whether
customer data trains any model; tracking scope (product analytics only, or ads); merchant of
record and refund rules; where users are expected; support and legal contact.

## 5. Jurisdictions

Applicability depends on facts the code does not show: establishment, where users are, whether
the product targets a country, revenue and volume thresholds, and the business model. The skill
lists candidates and the facts that decide them; the lawyer decides.

## 6. Legitimate-interest assessment (three-part test)

Follow the official guidance cited in `jurisdictions.md` (EDPB Guidelines 1/2024; ICO guidance).
1. **Purpose**: the interest, whose it is, why it is legitimate.
2. **Necessity**: why this processing is needed and no less intrusive way works.
3. **Balancing**: what the data can contain, reasonable expectations, impact, safeguards
   (scrubbing, sampling, retention, access control), and the opt-out.
Record the decision owner and date; it is not a legal clearance.

## 7. Retention

A period on paper is a promise; a period with a scheduled deletion job and a test is a control.
Prefer measuring from a clear event ("12 months after the last use") and say which event.

## Pitfalls

- Writing "GDPR compliant" anywhere.
- Treating a vendor's marketing page as its DPA.
- Translating legal text with a model and publishing it.
- Re-running the audit from scratch instead of updating the files: they are the history.

Example (reference project, not a default): the audit produced an inventory of about 35 data flows, a
vendor matrix, more than 80 numbered discrepancies with resolutions, a founder decision log and an
LIA for server-side error monitoring written before the processing shipped.
