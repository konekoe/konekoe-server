#!/bin/bash

##Run using npm
declare -A var_arr

re='^[0-9]+$'

if ! [[ $1 =~ $re ]] ; then
   echo "error: Please give the number of clients you wish to create." >&2; exit 1
fi

for i in $(seq 1 $1)
do
  if [ -e ./test/clients/test_client ] ; then
    ./test/clients/test_client $RANDOM $i &
    var_arr[$i]=$!
  else
    echo "Client program not found. Did you remember to build it?"
  fi
done

for i in $(seq 1 $1)
do
  wait ${var_arr[$i]}
done
