# AccessHub — standalone Docker edition

This package runs AccessHub on any Linux VPS with Docker Compose. It includes the web application, PostgreSQL, persistent uploads, database storage, and health checks.

## Install from GitHub

```sh
git clone https://github.com/YOUR_GITHUB_USERNAME/accesshub-docker.git
cd accesshub-docker
cp .env.docker.example .env
```

Edit `.env` and replace both passwords. Then start AccessHub:

```sh
docker compose up -d --build
```

Both values are required. Confirm Docker Compose can read them before starting:

```sh
docker compose config --quiet
```

If this reports that `POSTGRES_PASSWORD` or `INITIAL_ADMIN_PASSWORD` is missing, make sure the file is named exactly `.env` and is located beside `docker-compose.yml`.

Open `http://YOUR_VPS_IP:8000`. For a public deployment, connect the service to an HTTPS reverse proxy such as Caddy, Traefik, or Nginx Proxy Manager.

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
