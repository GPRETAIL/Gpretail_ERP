#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "================================================================="
echo "  GP Retail ERP - Silent Printer Connector Service"
echo "================================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

if [ "$1" == "configure" ]; then
    node configure.js
    exit 0
fi

if [ ! -d "node_modules" ]; then
    echo "Installing required dependencies..."
    npm install --no-audit --no-fund
    echo ""
fi

echo "Starting Local Silent Printer Service on ws://127.0.0.1:5001 ..."
node server.js
