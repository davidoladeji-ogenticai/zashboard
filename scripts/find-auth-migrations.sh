#!/bin/bash

# Script to find files that still need to be migrated to Clerk authentication

echo "========================================="
echo "Clerk Migration - Files to Update"
echo "========================================="
echo ""

echo "1. API Routes using validateAuthHeader:"
echo "-----------------------------------------"
grep -r "validateAuthHeader" src/app/api/ 2>/dev/null | cut -d: -f1 | sort -u
echo ""

echo "2. Client code using localStorage token:"
echo "-----------------------------------------"
grep -r "localStorage.getItem('token')" src/ 2>/dev/null | cut -d: -f1 | sort -u
echo ""

echo "3. API calls with Authorization headers:"
echo "-----------------------------------------"
grep -r "Authorization.*Bearer" src/ 2>/dev/null | grep -v "node_modules" | cut -d: -f1 | sort -u
echo ""

echo "4. Old auth imports:"
echo "-----------------------------------------"
grep -r "from '@/lib/auth'" src/ 2>/dev/null | grep -v "auth-clerk" | grep -v "node_modules" | cut -d: -f1 | sort -u
echo ""

echo "5. Password-related code (should be removed):"
echo "-----------------------------------------"
grep -r "password" src/app/api/ 2>/dev/null | grep -i "hash\|verify\|bcrypt" | cut -d: -f1 | sort -u
echo ""

echo "========================================="
echo "Summary"
echo "========================================="
echo "Run this script periodically to track migration progress."
echo "As you update files, they should disappear from this list."
