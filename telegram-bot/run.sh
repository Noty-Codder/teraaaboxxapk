#!/usr/bin/env bash
# Beta Bot Hub - VPS runner
cd "$(dirname "$0")"
if [ ! -d venv ]; then
  python3 -m venv venv
fi
./venv/bin/pip install -q --upgrade pip
./venv/bin/pip install -q -r requirements.txt
exec ./venv/bin/python bot.py
