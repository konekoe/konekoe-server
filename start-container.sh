#/bind/sh

#$1 should be an open port and $2 a valid exam code

docker run -d -p $1:$1 -v $HOME/konekoe-server/.data:/.data/ --env-file ./.env -e PORT=$1 -e EXAMCODE=$2 --name $2 huzla/konekoe-server:2.5
