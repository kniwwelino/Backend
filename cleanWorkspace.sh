#!/bin/sh
rm -rf builds/$1/build-esp8266/$1.ino.*
rm -rf builds/$1/build-esp8266/preproc
rm -rf builds/$1/build-esp8266/sketch

if [ ! -f builds/$1/makefile ]; then
    cp -a builds/TEMPLATE/makefile builds/$1
fi
