#!/bin/bash
while :
do
	rsync -aq ../musidex-ts-common/ ./common/
	sleep 1
done
