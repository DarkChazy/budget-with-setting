# Self-Hosting Deployment

## Stack
Nginx (port 80) -> TanStack Start Node app (port 3000) -> PostgreSQL 16. No external services.

## Quick start
```bash
git clone <your-repo> && cd <repo>
cp .env.example .env && nano .env       # set POSTGRES_PASSWORD
bash install.sh
# open http://<host>/register and create users Helly and Chazy
```

## Verification checklist
1. `curl -I http://localhost/` -> 200
2. Register a user at `/register`
3. Login at `/`
4. Private Account -> add an expense
5. House Account -> add an expense, edit % split
6. Credit Card -> add a charge
7. Settings > Monthly Templates -> add, edit, delete
8. Settings > Categories -> add, rename, delete
9. Settings > Savings -> add, rename balance, delete
10. Settings > House Defaults -> change percentages (auto-saves)
11. Year chart renders on Private + House
12. Logout returns to login page

## Backup / Restore
```bash
./backup.sh
./restore.sh backups/budget-YYYYMMDD-HHMMSS.sql.gz
```

## TLS
Add a `listen 443 ssl` block + Let's Encrypt certs in `nginx.conf` (use `certbot --nginx` on the host).