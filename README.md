# AccessHub — standalone Docker edition

This package runs AccessHub on any Linux VPS with Docker Compose. It includes the web application, PostgreSQL, persistent uploads, database storage, and health checks.

## Install from GitHub

```sh
git clone https://github.com/kawika4783/accesshub-docker.git
cd accesshub-docker
```

### Hostinger Docker Manager

No environment variables are required. The deployment generates unique database and initial administrator passwords in a private persistent Docker volume.

Use this direct Compose URL in Hostinger:

```text
https://raw.githubusercontent.com/kawika4783/accesshub-docker/main/docker-compose.yml
```

The Compose deployment pulls the published `ghcr.io/kawika4783/accesshub:latest` image, so Hostinger does not need the repository source files during deployment.

After deployment, open the `accesshub` container logs and find the one-time `Created initial Admin account` message. Sign in with username `Admin` and the password shown there, then change it immediately from the account menu.

Then start AccessHub:

```sh
docker compose up -d --build
```

Confirm Docker Compose can read the deployment before starting:

```sh
docker compose config --quiet
```

On this Hostinger VPS, open AccessHub using Hostinger's generated HTTPS address:

```text
https://accesshub-docker.srv1831469.hstgr.cloud
```

Hostinger terminates HTTPS and forwards requests to AccessHub on port `8000`. Always sign in through the HTTPS hostname rather than the VPS IP address; the production session cookie is intentionally accepted only over HTTPS.

The Compose file registers `accesshub-docker.srv1831469.hstgr.cloud` with Hostinger's host-network Traefik service and does not publish port `8000` directly on the VPS.

## Storage

- `accesshub_database` contains PostgreSQL data.
- `accesshub_uploads` contains uploaded files and message photos.
- `accesshub_secrets` contains generated internal credentials.

Docker keeps both named volumes when the containers are recreated or updated.

## Update

```sh
git pull
docker compose up -d --build
```

## Back up

Back up both Docker volumes before major updates. PostgreSQL can also be exported with `pg_dump`.

## GitHub container publishing

Pushing a version tag such as `v0.6.1` runs the included GitHub workflow and publishes `ghcr.io/<your-github-username>/accesshub:0.6.1`.

Plain Docker does not use a JSON installation link. If your VPS has a management panel that asks for JSON, its required format is specific to that panel.
