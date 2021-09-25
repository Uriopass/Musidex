#!/bin/bash
while :
do
	rsync -rq ../musidex-ts-common/ ./common/
	sleep 1
done
