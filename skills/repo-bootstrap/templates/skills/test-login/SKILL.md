<!--
TEMPLATE: test-login skill (dev-env module). Generate it when the app has authentication and UI
behind it, so agents can verify a change in the running app without asking a human to log in.
Fill: <auth provider> and its test mode, <test email pattern>, <test code>, <billing sandbox>,
<local URL>, <dev command>, the state recipes. Never generate it for an auth provider without a
dev/test mode that is isolated from production. Strip this comment.
-->
---
name: test-login
description: >-
  Sign in to the locally running app as a throwaway test user and reach any in-app state
  (onboarding done, a settings page, a paid sandbox plan) with browser automation, without asking
  the user to log in. Use whenever a change must be seen in the real app: visual checks, flows
  behind auth, billing states.
targets: ["*"]
---

# Test login (local + dev instance + sandbox only)

Goal: verify a change in the running app yourself. Never claim a UI change is done from tests
alone when it can be seen here.

## Triple guard (all three, every time)

1. **Local host only.** Only `<local URL>` (`http://localhost:<port>`). Never a stage or production
   host, never a shared tunnel someone else is using.
2. **Dev auth instance only.** The sign-in page must belong to `<auth provider>`'s development
   instance (test mode on). If it does not, stop.
3. **Sandbox billing only.** Before paying, the checkout must show `<billing sandbox>`'s sandbox
   banner/URL. If it does not, stop. Never a real card, never a real person's email.

Close the browser when done; stop any server **you** started.

## 1. Server

1. Look for a running dev server first (`lsof -iTCP:<port range> -sTCP:LISTEN -P`) and reuse it.
2. If none, tell the user which mode you will use (local, or tunnel only when the flow needs a
   public URL) and why, ask, then start `<dev command>` (it prints the URL). If it wraps the
   secrets store, that needs the user's permission per the root rules.

## 2. Create and sign in a test user

- Email: `<purpose>+<test suffix>@<domain with mail servers>`; a new `<purpose>` per scenario.
  Test mode never sends mail and accepts the fixed code `<test code>`.
- Avoid `example.com`-style domains when a downstream provider (billing, email) validates MX
  records.
- Dismiss or reject the consent banner so analytics stay off.

## 3. Reach the state

| State | Recipe |
|---|---|
| <Onboarding done> | <the shortest path that avoids paid external calls, e.g. "describe it" instead of a website scrape> |
| <Paid plan> | <checkout in the sandbox with the provider's test card, after the banner check> |
| <Empty / error / quota exhausted> | <dev test data or a dev-only action; never edit production data> |

## 4. Evidence

Screenshots at the sizes the verification rule asks for (phone, tablet, desktop), every theme and
the relevant locales; name what could not be reached and why.

## 5. Clean up

Test users and their data accumulate and some keep generating paid work: pause or delete them with
`<cleanup skill or script>` when the scenario is done.
