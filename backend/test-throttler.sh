#!/bin/bash
ls -la node_modules/@nestjs/ 2>/dev/null | grep throttler || echo "Not in node_modules/@nestjs/"
ls -la node_modules/.pnpm/@nestjs+throttler* 2>/dev/null || echo "Not in pnpm store"
