# SSRF guard on server-side fetches

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

When the server fetches a URL a user supplied, the user can point it at internal addresses (loopback, private ranges, cloud metadata) and read what the server can reach.

## Principle

Before every request, and again on every redirect hop, resolve the host and allow only public unicast addresses over http(s). Follow redirects by hand so each hop is checked.

## When it applies

- Link previews, logo or image import, webhook senders with user-configured URLs, any "fetch this URL" feature.

## When it doesn't

- Fetches to fixed provider hosts.
- Fetches delegated to a third-party crawler that runs outside your network.

## Typical mistakes

- Checking only the first URL and letting the client follow redirects.
- String-matching hostnames instead of resolving and checking the IP range.
- Forgetting IPv6, IPv4-mapped IPv6 and decimal/octal IP notations.

## The check that verifies it

Unit tests for loopback, private ranges, metadata IPs, redirect to a private host and non-http schemes; a lint rule or review checklist that routes new user-URL fetches through the guard.

## Canonical source

- [OWASP Server Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

## Variants per stack

- **Node:** `ipaddr.js` range check plus `fetch(url, { redirect: "manual" })` in a loop with a hop cap.
- **Python:** `ipaddress` module plus `requests` with `allow_redirects=False`.
- **Go:** a custom `net.Dialer.Control` that rejects private IPs at connect time (also closes DNS rebinding).
- **Network:** an egress proxy with an allow list, when the platform supports one.

## Related

[input-validation-at-the-boundary](input-validation-at-the-boundary.md)
