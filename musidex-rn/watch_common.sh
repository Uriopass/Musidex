#!/bin/bash
while :
do
	rsync -rutq ../musidex-web/src/common/ ./common/
	rsync -rutq ./common/ ../musidex-web/src/common/
	sleep 1
done
