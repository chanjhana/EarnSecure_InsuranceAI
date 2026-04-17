#!/bin/sh
set -eu

API='http://127.0.0.1:8000'
PHONE='+919876543210'

json_get() {
  node -e "const fs=require('fs');const key=process.argv[1];const text=fs.readFileSync(0,'utf8');const obj=text?JSON.parse(text):{};const v=obj[key];process.stdout.write(v===undefined||v===null?'':String(v));" "$1"
}

post_json() {
  url="$1"
  token="$2"
  body="$3"
  if [ -n "$token" ]; then
    curl -s -X POST "$url" -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d "$body"
  else
    curl -s -X POST "$url" -H 'Content-Type: application/json' -d "$body"
  fi
}

put_json() {
  url="$1"
  token="$2"
  body="$3"
  curl -s -X PUT "$url" -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d "$body"
}

get_json() {
  url="$1"
  token="$2"
  if [ -n "$token" ]; then
    curl -s "$url" -H "Authorization: Bearer $token"
  else
    curl -s "$url"
  fi
}

SEND=$(post_json "$API/auth/send-otp" "" "{\"phone\":\"$PHONE\"}")
OTP=$(printf '%s' "$SEND" | json_get otp)
VERIFY=$(post_json "$API/auth/verify-otp" "" "{\"phone\":\"$PHONE\",\"otp\":\"$OTP\"}")
TOKEN=$(printf '%s' "$VERIFY" | json_get access_token)
RIDER=$(printf '%s' "$VERIFY" | json_get rider_id)

SIGNUP=$(post_json "$API/auth/complete-signup" "$TOKEN" "{\"rider_id\":\"$RIDER\",\"vehicle_number\":\"TN09AB1234\",\"legal_name\":\"Ravi Kumar\",\"password\":\"pass1234\"}")
LOGIN=$(post_json "$API/auth/rider/login" "" "{\"phone\":\"$PHONE\",\"password\":\"pass1234\"}")

LINK=$(post_json "$API/riders/link-platform" "$TOKEN" "{\"platform\":\"swiggy\",\"rider_id\":\"$RIDER\"}")
PROFILE=$(put_json "$API/riders/$RIDER/profile" "$TOKEN" "{\"rider_id\":\"$RIDER\",\"pin_code\":\"560034\",\"zones\":[\"Koramangala\",\"HSR\"],\"shift_windows\":[\"evening\"],\"upi_id\":\"ravi@upi\"}")
PREMIUM=$(post_json "$API/premium/calculate" "$TOKEN" "{\"rider_id\":\"$RIDER\",\"pin_code\":\"560034\",\"shift_windows\":[\"evening\"],\"zones\":[\"Koramangala\",\"HSR\"]}")
POLICY=$(post_json "$API/policies/activate" "$TOKEN" "{\"rider_id\":\"$RIDER\",\"upi_id\":\"ravi@upi\"}")

PAY_CREATE=$(post_json "$API/payments/upi-qr/create" "$TOKEN" "{\"rider_id\":\"$RIDER\",\"upi_id\":\"ravi@upi\",\"amount_paise\":6800,\"note\":\"weekly premium\"}")
PAYMENT_ID=$(printf '%s' "$PAY_CREATE" | json_get payment_id)
PAY_SUBMIT=$(post_json "$API/payments/upi-qr/submit" "$TOKEN" "{\"payment_id\":\"$PAYMENT_ID\",\"rider_id\":\"$RIDER\",\"upi_transaction_id\":\"UPIREF123\",\"payer_upi_id\":\"ravi@upi\"}")

ADMIN_LOGIN=$(post_json "$API/admin/login" "" "{\"password\":\"admin123\"}")
ADMIN_TOKEN=$(printf '%s' "$ADMIN_LOGIN" | json_get access_token)

PENDING=$(get_json "$API/admin/payments/pending" "$ADMIN_TOKEN")
CONFIRM=$(post_json "$API/admin/payments/$PAYMENT_ID/confirm" "$ADMIN_TOKEN" "{\"approve\":true,\"admin_note\":\"approved in smoke test\",\"account_status\":\"O7_PAYMENT_CONFIRMED_WEEK_ACTIVE\"}")
HISTORY=$(get_json "$API/admin/riders/$RIDER/status-history" "$ADMIN_TOKEN")

printf 'SEND=%s\n' "$SEND"
printf 'VERIFY=%s\n' "$VERIFY"
printf 'SIGNUP=%s\n' "$SIGNUP"
printf 'LOGIN=%s\n' "$LOGIN"
printf 'LINK=%s\n' "$LINK"
printf 'PROFILE=%s\n' "$PROFILE"
printf 'PREMIUM=%s\n' "$PREMIUM"
printf 'POLICY=%s\n' "$POLICY"
printf 'PAY_CREATE=%s\n' "$PAY_CREATE"
printf 'PAY_SUBMIT=%s\n' "$PAY_SUBMIT"
printf 'ADMIN_LOGIN=%s\n' "$ADMIN_LOGIN"
printf 'PENDING=%s\n' "$PENDING"
printf 'CONFIRM=%s\n' "$CONFIRM"
printf 'HISTORY=%s\n' "$HISTORY"
