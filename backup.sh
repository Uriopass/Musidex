cd /home/ubuntu/Musidex
/usr/bin/sqlite3 storage/db.db ".backup db.db.bak"
/usr/bin/gzip -f db.db.bak
/home/ubuntu/work/bin/gdrive upload db.db.bak.gz
/home/ubuntu/work/bin/gdrive list --no-header --order "modifiedTime desc" -q "name contains 'db.db.bak.gz'" | /usr/bin/awk 'NR > 1' | /usr/bin/awk '{print $1}' | /usr/bin/xargs -I '{}' -t /home/ubuntu/work/bin/gdrive delete {}
rm db.db.bak.gz
