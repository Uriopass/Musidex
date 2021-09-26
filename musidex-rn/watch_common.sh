#!/bin/bash
while :
do
	rsync -rutq ../musidex-ts-common/ ./common/
	rsync -rutq ./common/ ../musidex-ts-common/
	sleep 1
done
