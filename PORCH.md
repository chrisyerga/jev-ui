# Porch Deployment

This service is managed by Porch.

- Service id: `jev-ui`
- Domain: `jev-ui.newtricks.ai`
- Container: `jev-ui-web`
- Internal port: `3000`
- Host: `milo.newtricks.ai` (deploy path `/opt/jev-ui`)

Agents should update app build/runtime details in this repo, then use the generated deploy workflow. Host routing, DNS, TLS, and Caddy reloads are owned by `npx @lindale/porch service register --json` on the VPS.

## Workflows

- `.github/workflows/ci.yml`: typecheck, lint, build, and a Docker build on PRs and non-main pushes. Also called by the deploy workflow.
- `.github/workflows/deploy.yml`: on push to `main`, runs CI, pushes `ghcr.io/chrisyerga/jev-ui:<sha>`, then registers the service on the host over SSH.

## Repository secrets

| Secret | Value |
| --- | --- |
| `PORCH_HOST` | `milo.newtricks.ai` |
| `PORCH_USER` | `root`, since `/etc/porch` and `/opt` are root-owned on milo |
| `PORCH_SSH_KEY` | Private key whose public half is in the host user's `authorized_keys` |
| `DIGITALOCEAN_TOKEN` | DigitalOcean API token with write access to the `newtricks.ai` domain; Porch upserts the `jev-ui` A record with it |
| `TYPESAFE_API_KEY` | TypeSafe API key, passed to the container as a runtime env var |

## Host notes

- Node on milo is installed with nvm, which non-interactive SSH shells don't load, so the deploy script sources `~/.nvm/nvm.sh` before calling `npx`.
- Porch records `--env` values in `/etc/porch/services/jev-ui.json` on the host.
- The GHCR package must be public (or the host logged in to `ghcr.io`) for the host to pull the image.
