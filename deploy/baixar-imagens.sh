#!/bin/bash
# Baixa as imagens do projeto (logo, mascote, selos) que a Lovable servia em /__l5e/assets-v1/.
# Rodar na VPS, na pasta do projeto: bash deploy/baixar-imagens.sh
set -e
for f in $(find src -name '*.asset.json'); do
  u=$(grep -oE '"url": *"[^"]+"' "$f" | cut -d'"' -f4)
  mkdir -p "/var/www/nexa-assets$(dirname "${u#/__l5e/assets-v1}")"
  curl -s -f -o "/var/www/nexa-assets${u#/__l5e/assets-v1}" "https://cloudnexapro.site$u" && echo "ok $u" || echo "FALHOU $u"
done
