# New!
* Sidebar is now responsive and also closes and opens (use `ctrl+b` or icon on the header)
* Sidebar navigation is also functioning
* Sidebar signout and user info moved from header to sidebar
* `ctrl+j` to open up the command
* Searching added to the command
* Implemented Dark mode

# Up Next...
* quick naviagation through the command

# TO-DO
* Have to think about logins and user access and controls
* Complete the following pages
    - [X] Signup
    - [ ] Add Batch
    - [ ] Credit Dues
    - [ ] Sales Report
    - [ ] Settings
    - [ ] Backup & Export

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
