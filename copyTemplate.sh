#!/bin/sh
cp -a builds/TEMPLATE/. builds/$1
mv builds/$1/TEMPLATE.ino builds/$1/$1.ino
