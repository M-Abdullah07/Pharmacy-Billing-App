# Electron

## Normal Startup
```sh
npm start
```

## DEBUG mode (if startup fails)
```sh
DEBUG=electron-forge:* npm start 
```
This starts electron app and sets the env variable DEBUG to log for all the namespaces under electron-forge

## Specific Debugging

### 1. Logs from Forge plugins like webpack, vite etc 
```sh
DEBUG=electron-forge:plugin:* npm start
```

### 2. Logs from Core logic for packaging, starting, etc.
```sh
DEBUG=electron-forege:core:* npm start
```
### 3. Logs for	Config loading and resolving

```sh
DEBUG=electron-forge:config
```
