#!/usr/bin/env bash
docker-compose up -d
while :
do
  echo "waiting for pg..."

  if [[ $(nc -z 127.0.0.1 5433) -eq 0 ]]; then
    break
  fi
  sleep 1
done
echo "pg ok"
while :
do
  echo "waiting for elastic..."

  if [[ $(nc -z 127.0.0.1 9200) -eq 0 ]]; then
    break
  fi
  sleep 1
done
echo "elastic ok"
cargo run --manifest-path musidex-daemon/Cargo.toml
