# Backend

## Configurate your MQTT server
Please adapt the file config/default.json to your needs.

## Init submodules
```
git submodule sync
git submodule update --init --recursive --remote
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
