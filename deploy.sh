#!/bin/bash
# =============================================================================
# DEPLOY SCRIPT — TDA Network
# Verwendung:
#   ./deploy.sh           — Frontend + Backend
#   ./deploy.sh frontend  — Nur Frontend
#   ./deploy.sh backend   — Nur Backend
# =============================================================================

set -e

SSH_KEY="$HOME/.ssh/id_ed25519_dojo_deploy"
SSH_HOST="root@dojo.tda-intl.org"
SSH_PORT="2222"
SSH_OPT="-p $SSH_PORT -i $SSH_KEY"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_LOCAL="$SCRIPT_DIR/frontend"
FRONTEND_REMOTE="/var/www/network-frontend/"
REPO_REMOTE="/var/www/network-source"
PM2_APP="network-backend"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

MODE="${1:-all}"
if [[ "$MODE" != "all" && "$MODE" != "frontend" && "$MODE" != "backend" ]]; then
  echo "Verwendung: ./deploy.sh [all|frontend|backend]"
  exit 1
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════╗${NC}"
echo -e "${BLUE}║   TDA Network → Produktion       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════╝${NC}"
echo ""
echo -e "${RED}⚠️  PRODUKTIONSSERVER — network.tda-intl.org${NC}"
echo -e "   Modus: ${YELLOW}$MODE${NC}"
echo ""

# ── Git-Prüfung ───────────────────────────────────────────────────────────────
if [[ "$MODE" == "all" || "$MODE" == "backend" ]]; then
  cd "$SCRIPT_DIR"

  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${RED}⚠️  Es gibt uncommittete Änderungen!${NC}"
    git status --short
    echo ""
    read -p "Jetzt automatisch committen und pushen? (j/N) " autocommit
    if [[ "$autocommit" =~ ^[Jj]$ ]]; then
      read -p "Commit-Message: " msg
      [[ -z "$msg" ]] && msg="Deploy: $(date '+%Y-%m-%d %H:%M')"
      git add -A
      git commit -m "$msg"
    else
      echo -e "${RED}Abgebrochen. Bitte erst committen.${NC}"
      exit 1
    fi
  fi

  echo -e "${YELLOW}▶ Git push zu GitHub...${NC}"
  git push origin main
  echo -e "  ${GREEN}✓ GitHub aktuell${NC}"
  echo ""
fi

read -p "Auf Produktionsserver deployen? (j/N) " confirm
[[ "$confirm" =~ ^[Jj]$ ]] || { echo "Abgebrochen."; exit 0; }
echo ""

# ── Backend ────────────────────────────────────────────────────────────────────
if [[ "$MODE" == "all" || "$MODE" == "backend" ]]; then
  echo -e "${YELLOW}▶ [1/2] Backend deployen (git pull)...${NC}"

  ssh $SSH_OPT "$SSH_HOST" "
    set -e
    cd $REPO_REMOTE
    git pull origin main
    cd backend && npm install --production --silent
    pm2 restart $PM2_APP --silent
    sleep 2
    pm2 show $PM2_APP | grep -E 'status|uptime' | head -2
  "

  echo -e "  ${GREEN}✓ Backend deployed${NC}"
  echo ""
fi

# ── Frontend ───────────────────────────────────────────────────────────────────
if [[ "$MODE" == "all" || "$MODE" == "frontend" ]]; then
  echo -e "${YELLOW}▶ [2/2] Frontend bauen...${NC}"
  cd "$FRONTEND_LOCAL"
  CI=false npm run build 2>&1 | grep -E 'compiled|error|warning|Compiled' | head -5
  echo ""

  echo -e "${YELLOW}  Frontend deployen...${NC}"
  rsync -az \
    -e "ssh $SSH_OPT" \
    "$FRONTEND_LOCAL/build/" \
    "$SSH_HOST:$FRONTEND_REMOTE"
  echo -e "  ${GREEN}✓ Frontend deployed${NC}"
  echo ""
fi

echo -e "${GREEN}✅ Deploy abgeschlossen — https://network.tda-intl.org${NC}"
echo ""
