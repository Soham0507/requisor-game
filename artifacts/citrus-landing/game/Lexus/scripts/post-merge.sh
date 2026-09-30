#!/bin/bash
set -e

npm install --omit=dev --yes 2>/dev/null || npm install --yes
