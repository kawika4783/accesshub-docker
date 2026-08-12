# AccessHub — standalone Docker edition

This package runs AccessHub on any Linux VPS with Docker Compose. It includes the web application, PostgreSQL, persistent uploads, database storage, and health checks.

## Install from GitHub

```sh
git clone https://github.com/kawika4783/accesshub-docker.git
cd accesshub-docker
cp .env.docker.example .env
```

Edit `.env` and replace both passwords:

```text
POSTGRES_PASSWORD=your-long-database-password
INITIAL_ADMIN_PASSWORD=your-long-admin-password
```

Then start AccessHub:

```sh
docker compose up -d --build
```

Both values are required. Confirm Docker Compose can read them before starting:

```sh
docker compose config --quiet
```

If this reports that a required value is missing, make sure the file is named exactly `.env` and is located beside `docker-compose.yml`.

On this Hostinger VPS, open AccessHub using Hostinger's generated HTTPS address:

```text
https://accesshub-docker.srv1831469.hstgr.cloud
```

Hostinger terminates HTTPS and forwards requests to AccessHub on port `8000`. Always sign in through the HTTPS hostname rather than the VPS IP address; the production session cookie is intentionally accepted only over HTTPS.

## Storage

- `accesshub_database` contains PostgreSQL data.
- `accesshub_uploads` contains uploaded files and message photos.

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
