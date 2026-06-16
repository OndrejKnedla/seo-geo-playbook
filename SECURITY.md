# Security policy

## Scope

This project is a set of local, read-only tools. The Node scripts (`audit.mjs`, `chunk-sim.mjs`,
`gen-llms-txt.mjs`) only fetch public pages over HTTP and write local files; they take no untrusted
input beyond a URL. The optional `serp-enrich.mjs` and `tools/dataforseo/` talk to the DataForSEO API
using credentials you provide.

## Handling credentials

- Never commit `.env`, `site.yaml`, or API keys. They are listed in `.gitignore`.
- DataForSEO credentials are read from the environment or a local `.env` file only.

## Reporting a vulnerability

If you find a security issue, please open a private report via GitHub Security Advisories on this
repository, or contact the maintainer through their GitHub profile. Please do not open a public issue
for anything exploitable until it has been addressed.
