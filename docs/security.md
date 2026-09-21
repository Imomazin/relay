# Relay — Security

This repository is **public**. Everything committed is assumed to be world-readable.

## Never committed

- Credentials, tokens, API keys
- `DATABASE_URL` or any database connection string
- Private infrastructure details or private IP addresses
- Scottish Government confidential information
- Real production telemetry
- Real CrowdStrike, Exabeam, or Jira private data
- Private partner contracts or confidential partnership information

## How secrets are handled

- `.env` (and all `.env.*` except `.env.example`) are git-ignored.
- Only `.env.example` — with placeholder values — is tracked.
- `DATABASE_URL` is provided at runtime as an environment variable (locally in `.env`, on Vercel as a
  project environment variable / Neon integration). It is never hard-coded or logged.
- The optional re-seed endpoint `POST /api/seed` is disabled unless `SEED_TOKEN` is set, and requires
  that token; it returns 404 when unset to avoid an open write endpoint in a public deployment.

## Application security posture

- All synthetic data; no real telemetry or PII.
- Simulated connectors only — no outbound calls to real third-party systems, so no third-party
  credentials exist to leak.
- Server Actions and Route Handlers mutate only Relay's own demonstration rows.
- Input to filter/search endpoints is parameterised via the ORM (no string-concatenated SQL).
- Read/write DB access uses the Neon serverless driver over TLS.

## What a production deployment would add

- Secrets in a managed secrets store with rotation.
- Authentication/authorisation for operator actions (approvals, execution).
- Signature verification on inbound webhooks; least-privilege, short-lived tokens for outbound.
- Rate limiting, audit log integrity (tamper-evidence), and separation of duties.
- A security review and threat model before any real automation is enabled.

## Reporting

For a real deployment, security concerns would be routed to the owning team via a documented
disclosure process. This demonstrator contains no sensitive data.
