#!/bin/bash

set -e
set -x

rm -fr ./dist/*

tsc -p tsconfig.mjs.json
pnpx -y convert-extension mjs dist/node
tsc
tsc -p tsconfig.browser.json