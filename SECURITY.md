# Security policy

Aquila runs in the browser with direct access to the context brokers its users add. It reads their entities and creates, changes and deletes subscriptions, and every subscription makes the broker send entity data to a URI. A flaw in Aquila can therefore expose context data, send it to the wrong place, or change what a broker does without the user knowing. This document explains how to report security vulnerabilities in Aquila responsibly.

---

## Beta status

> [!WARNING]
> Aquila is in beta and has not been independently audited. Aquila has no logins of its own: anyone who can open it can see and change every subscription on the brokers it reaches. Do not expose it, or the brokers it uses, on a network you do not trust without an authenticating proxy in front of both.

The [known limitations](https://vela-tools.github.io/aquila/docs/known-limitations) describe what Aquila does not do yet. The missing logins and the broker behaviour listed there are not vulnerabilities in Aquila; access control is the job of the broker and of the proxy in front of it.

---

## What Aquila stores and calls

- **In the browser.** Aquila keeps the list of brokers, with the name, URL and JSON-LD context URL of each, and which one is selected, in the browser's local storage under `aquila.brokers`. It stores no credentials, and it sends no cookies or tokens to the brokers.
- **On the broker.** The subscriptions, with their notification URIs, are stored by the broker, not by Aquila. Everyone who can read the broker's subscriptions can read them.
- **Calls.** The browser calls Aquila's own origin and the brokers in the list. The broker, not Aquila, calls the notification URI of a subscription, from the broker's network, and sends entity data to it.
- **The container** serves the built app and a `/config.json` written from `AQUILA_BROKER_URL` and `AQUILA_BROKER_NAME`. It holds no secrets.

---

## Supported versions

Only the latest release receives security fixes during the beta.

---

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Report privately through [GitHub private vulnerability reporting](https://github.com/vela-tools/aquila/security/advisories/new), with:

- A description of the vulnerability
- Steps to reproduce, including the broker and its version, the brokers added in the app, the container environment (`AQUILA_BROKER_URL`, `AQUILA_BROKER_NAME`), and the requests the browser sent
- The version shown next to Aquila in the header, or the image tag you run
- Any potential impact you have identified
- Optionally, a suggested fix

Leave out real keys, tokens and private data.

You should receive an acknowledgement within **2 working days** (Monday to Friday, EU CET/CEST hours).

After triage, we will:

1. Confirm the vulnerability and determine its severity.
2. Develop and test a fix.
3. Coordinate a release that includes the fix.
4. Publicly disclose the vulnerability after users have had reasonable time to update.

---

## Disclosure timeline

We aim for the following timeline, though complex issues may take longer:

| Phase | Target |
|---|---|
| Initial response | 2 working days |
| Triage and severity assessment | 5 working days |
| Fix development and testing | 30 days for high/critical |
| Public disclosure | Within 90 days, or after fix is widely deployed |

We will keep you informed at each stage.

---

## Scope

This security policy covers:

- Code and dependencies in this repository
- Build and release artefacts published from this repository
- Documentation that could mislead users into insecure configurations

In Aquila, that includes in particular:

- Script execution through values that come from a broker, such as entity attributes, type names or subscription fields
- Requests to any origin other than Aquila itself and the brokers the user added, or a way around the content security policy
- Subscriptions created, changed or deleted, or notifications redirected, without the user's action
- The container: running as root, a writable web root, or values from the environment that change more than `/config.json`
- Broker URLs or context data leaking to anyone other than the broker they belong to

This policy does **not** cover:

- Vulnerabilities in third-party software Aquila depends on (please report those upstream)
- Issues with deployment infrastructure operated by individual users
- Social engineering, physical attacks, or denial-of-service against velacontext.com

---

## Recognition

We are happy to credit reporters in the release notes of the fix, unless you prefer to remain anonymous. Let us know your preference when you report.

We do not currently operate a paid bug bounty programme, but genuine security improvements are deeply appreciated and may be eligible for swag, public recognition, or commercial discounts on Vela Context Data Hub.

---

## Contact

- **Security reports:** [GitHub private vulnerability reporting](https://github.com/vela-tools/aquila/security/advisories/new)
- **General contact:** info@senlab.io
- **Commercial:** [velacontext.com/contact](https://velacontext.com/contactus)
