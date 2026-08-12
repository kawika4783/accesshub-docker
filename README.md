# AccessHub — standalone Docker edition

This package runs AccessHub on any Linux VPS with Docker Compose. It includes the web application, PostgreSQL, persistent uploads, database storage, and health checks.

## Install from GitHub

```sh
git clone https://github.com/kawika4783/accesshub-docker.git
cd accesshub-docker
cp .env.docker.example .env
```

Edit `.env`, replace both passwords, and set the hostname you want AccessHub to use. Do not include `http://`, `https://`, or a path:

```text
POSTGRES_PASSWORD=your-long-database-password
INITIAL_ADMIN_PASSWORD=your-long-admin-password
APP_DOMAIN=accesshub.yourdomain.com
```

At your DNS provider, create an **A record** for that hostname pointing to the VPS public IPv4 address. Make sure ports **80** and **443** are open. Then start AccessHub:

```sh
docker compose up -d --build
```

All three values are required. Confirm Docker Compose can read them before starting:

```sh
docker compose config --quiet
```

If this reports that a required value is missing, make sure the file is named exactly `.env` and is located beside `docker-compose.yml`.

Open `https://YOUR_APP_DOMAIN`. The included Caddy proxy obtains and renews HTTPS automatically. AccessHub is no longer exposed directly on the VPS IP or port `8000`.

If another service already uses ports 80 or 443, connect AccessHub to that existing reverse proxy instead of starting the included `proxy` service.

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
