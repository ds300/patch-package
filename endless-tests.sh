#!/usr/bin/env bash
i=1
while true; do
  jest gener --silent
  echo many test thank $i
  i=$(( $i + 1 ))
done
