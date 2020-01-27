# Backend

## Install Arduino from scratch
Copy a working Arduino portable installation that you testet to compile with KniwwelinoLib. Make also sure to not only add all dependencies needed by KniwwelinoLib itself, but also to add all Libraries needed for the Blocks of KniwwelinoBlockly.

Adapt the folder name in the file ```builds/TEMPLATE/makefile``` to the path name your Arduino portable is installed.

## Alternatively Install our prepacked Arduino

We provide a prepacked Arduino 1.8.5 for Linux on our Wiki. To use it for your server.

```
cd Backend
wget https://doku.kniwwelino.lu/_media/stuff/arduino-1.8.5_linux.tar.gz
tar -xzf arduino-1.8.5_linux.tar.gz
```

In case we add new dependencies to the Arduino instance, we recommend to download the tar again. If there is only a change in KniwwelinoLib, you can update it by:
```
cd Backend/arduino-1.8.5/portable/sketchbook/libraries/KniwwelinoLib/
git pull

```

## Configurate your MQTT server
Install mosquitto or any other MQTT broker. Create there a user for the backend to connect to.
Please adapt the file config/default.json to your needs.

## Init submodules
```
git submodule update --init --recursive
```
It seam that the submodule closure that is used by KniwwelinoBlockly is not compatible any more. So please manually downgrade to https://github.com/google/closure-library/releases/tag/v20160125

## Install NodeJS packages
You need to have NodeJS installed in Version 8.17.0

```
npm install
```

## Run the server
```
node app.js
```
