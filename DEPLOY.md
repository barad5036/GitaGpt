# Self-Hosting, LLM Setup & Encrypted Backup Guide (`DEPLOY.md`)

## 1. Generating Production Secrets

Never commit `.env` files to Git. Generate your 32-byte Master Key (`MASTER_KEK_HEX`) and JWT Secret on your production server:

```bash
export MASTER_KEK_HEX="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export JWT_ACCESS_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export POSTGRES_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
```

> **CRITICAL:** Back up `MASTER_KEK_HEX` in a secure offline vault. Without `MASTER_KEK_HEX`, per-user wrapped DEKs in PostgreSQL cannot be unwrapped.

---

## 2. Launching the Self-Hosted Stack (`docker-compose.prod.yml`)

1. Build the frontend static bundle:
   ```bash
   cd gita-frontend
   npm ci
   npm run build
   cd ..
   ```
2. Start PostgreSQL 16 (`pgvector`), the Node.js Backend, and Caddy (automatic Let's Encrypt TLS 1.2/1.3 + HSTS):
   ```bash
   DOMAIN="gitagpt.yourdomain.org" docker compose -f docker-compose.prod.yml up -d --build
   ```
3. Seed canonical Bhagavad Gita verses & `pgvector` embeddings:
   ```bash
   docker exec -it gitagpt-backend-prod npm run seed
   ```
4. Verify health:
   ```bash
   curl -fsSL https://gitagpt.yourdomain.org/health
   ```

---

## 3. Running with a Local Open-Source LLM (Ollama / vLLM)

To run 100% locally with zero external LLM calls:
1. Install Ollama and pull a multilingual Hindi/English model:
   ```bash
   ollama pull qwen2.5:7b
   ```
2. Set the backend environment variables in `backend/.env` or `docker-compose.prod.yml`:
   ```env
   LLM_BASE_URL=http://host.docker.internal:11434/v1/chat/completions
   LLM_MODEL=qwen2.5:7b
   LLM_API_KEY=ollama
   ```

---

## 4. Automated Daily Encrypted Backups & Restore Verification

### 4.1 Daily Encrypted Backup (`cron`)
Add to `/etc/crontab` to run every night at 02:30 UTC:
```cron
30 2 * * * root BACKUP_PASSPHRASE="your_strong_backup_passphrase" /path/to/GitaGpt/backend/scripts/backup.sh >> /var/log/gitagpt-backup.log 2>&1
```

### 4.2 Tested Restore Procedure
```bash
BACKUP_PASSPHRASE="your_strong_backup_passphrase" \
  DATABASE_URL="postgresql://gitagpt:password@localhost:5432/gitagpt" \
  ./backend/scripts/restore.sh ./backups/gitagpt_backup_YYYYMMDDTHHMMSSZ.sql.gz.enc
```

---

## 5. Zero-Downtime Master Key (KEK) Rotation

When rotating `MASTER_KEK_HEX` from `v1` to `v2`:
```bash
MASTER_KEK_PREV_HEX="<old_64_hex_key>" \
MASTER_KEK_PREV_VERSION=1 \
MASTER_KEK_HEX="<new_64_hex_key>" \
MASTER_KEK_VERSION=2 \
DATABASE_URL="postgresql://gitagpt:password@localhost:5432/gitagpt" \
  node backend/scripts/rotateKek.js
```
This re-wraps every user's `wrapped_dek` in a single atomic transaction without re-encrypting historical messages or memories.
