#!/bin/sh
rm -rf static/builds/$1.ino.bin
cp -a builds/$1/build-esp8266/$1.ino.bin static/builds/.
