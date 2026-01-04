# Infrastructure

This folder contains Bicep modules for a low-cost Azure setup:

- `modules/storage.bicep` — Storage account (Static Website optional) + Table creation; outputs connection string and static site URL.
- `modules/functionapp.bicep` — Consumption Function App with its own storage and App Insights; injects table connection string as an app setting.
- `main.bicep` — Orchestrates two storage accounts (one for static site + tables, one for functions) and the Function App. Outputs static site URL, connection strings, and function host.

## Deploy

From the `infrastructure` folder:
```sh
az deployment group create \
  --resource-group cbbChurchWorshipTracker \
  --template-file main.bicep \
  --parameters namePrefix=cbbChurch
```
Notes:
- Keep `namePrefix` short (<= 12 chars) to satisfy storage name length limits.
- Outputs include:
  - `staticSiteUrl` — static website endpoint
  - `staticStorageConnection` — connection string for static/table storage
  - `tableStorageAccount` — name of the storage hosting tables
  - `functionAppHost` — Function App hostname
  - `functionAppName` — Function App name
