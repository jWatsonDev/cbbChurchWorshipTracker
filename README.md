# Church Worship Song Tracker

A full-stack application for tracking worship songs used at CBB Church, featuring an Azure Functions API backend with Azure Table Storage and an Angular frontend.

## Features

- Track songs by service date with complete song lists
- View song usage statistics and charts
- JWT-based authentication for protected operations
- Responsive Angular UI with Material Design
- Azure deployment (Functions + Blob Static Website)

## Architecture

- **API**: Azure Functions v4 (Node.js/TypeScript)
- **UI**: Angular 19 with standalone components
- **Database**: Azure Table Storage
- **Auth**: JWT with bcryptjs password hashing
- **Hosting**: Azure Blob Static Website (UI) + Azure Functions Consumption Plan (API)

## Getting Started

### Prerequisites

- Node.js 20+
- Azure Functions Core Tools v4 (`npm i -g azure-functions-core-tools@4`)
- Azure CLI (for deployment)

## Local Development

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jWatsonDev/cbbChurchWorshipTracker.git
   cd cbbChurchWorshipTracker
   ```

2. **Set up the API**
   ```bash
   cd api
   npm install
   cp local.settings.json.example local.settings.json
   ```

   Edit `api/local.settings.json` and set:
   - `TABLE_CONN`: Your Azure Storage connection string
   - `JWT_SECRET`: Generate a strong secret (e.g., `openssl rand -base64 32`)

   To get your Azure Table Storage connection string:
   ```bash
   az storage account show-connection-string \
     --name <storage-account-name> \
     --resource-group <resource-group> \
     --query connectionString -o tsv
   ```

3. **Set up the UI**
   ```bash
   cd ui
   npm install
   ```

4. **Create initial users**

   The app requires authenticated users. Create your first user:
   ```bash
   cd api
   TABLE_CONN="<your-connection-string>" \
   npx ts-node scripts/create-user.ts \
     --username your.name \
     --password YourPassword \
     --role user
   ```

### Running Locally

**Option A: Run API and UI separately (two terminals)**

```bash
# Terminal 1 - API (Azure Functions)
cd api
npm run build
npm run start
# API runs at http://localhost:7071/api/*

# Terminal 2 - UI (Angular dev server)
cd ui
ng serve
# UI runs at http://localhost:4200
```

Note: The UI `environment.ts` sets `apiUrl: '/api'`. When running separately, you'll need to either:
- Use the SWA CLI (Option B below) to proxy everything together
- Temporarily change `apiUrl` to `http://localhost:7071/api`

**Option B: Use SWA CLI (recommended)**

The SWA CLI proxies both the Angular dev server and Functions through a single port, so relative `/api` paths work seamlessly:

```bash
# Install SWA CLI (one-time)
npm install -g @azure/static-web-apps-cli

# Terminal 1 - Start Angular dev server
cd ui && ng serve

# Terminal 2 - Start SWA proxy
swa start http://localhost:4200 --api-location ./api
# Everything runs at http://localhost:4280
```

### Development Workflow

**Rebuild API after code changes:**
```bash
cd api
npm run build    # Compile TypeScript
npm run start    # Restart Functions runtime
```

**Watch mode for API:**
```bash
cd api
npm run watch    # Auto-recompile on changes (run func start in another terminal)
```

### Testing the Application

1. Navigate to http://localhost:4280 (SWA CLI) or http://localhost:4200 (Angular direct)
2. Log in with the user you created
3. Add song entries via the dashboard
4. View charts and statistics

## Azure Deployment

### Prerequisites

- Azure CLI logged in: `az login`
- A resource group created: `az group create --name cbbChurchWorshipTracker --location eastus`

### Step 1: Deploy Infrastructure

The Bicep templates create:
- Azure Storage Account with Table Storage + Static Website
- Azure Functions App (Consumption/Y1 plan)
- Application Insights

```bash
az deployment group create \
  --resource-group cbbChurchWorshipTracker \
  --template-file infrastructure/main.bicep \
  --parameters \
    namePrefix=cbbchurch \
    jwtSecret="$(openssl rand -base64 32)" \
    jwtExpiresIn=15m
```

**Save the outputs:**
```bash
az deployment group show \
  --resource-group cbbChurchWorshipTracker \
  --name main \
  --query properties.outputs
```

You'll need:
- `functionAppUrl` (e.g., `https://cbbchurch-func-XXXXXX.azurewebsites.net`)
- `staticSiteUrl` (e.g., `https://cbbchurchstXXXXXX.z13.web.core.windows.net`)
- `tableStorageAccount` (name of storage account)

### Step 2: Deploy the API (Azure Functions)

```bash
cd api
npm run build
func azure functionapp publish <functionAppName>
```

### Step 3: Deploy the UI (Blob Static Website)

Update `ui/src/environments/environment.prod.ts` with your Function App URL:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://<functionAppName>.azurewebsites.net/api'
};
```

Build and upload:
```bash
cd ui
ng build --configuration production

az storage blob upload-batch \
  --account-name <storageAccountName> \
  --destination '$web' \
  --source dist/ui/browser \
  --overwrite
```

### Step 4: Create Users in Production

```bash
TABLE_CONN=$(az storage account show-connection-string \
  --name <tableStorageAccount> \
  --resource-group cbbChurchWorshipTracker \
  --query connectionString -o tsv)

cd api
TABLE_CONN="$TABLE_CONN" \
npx ts-node scripts/create-user.ts \
  --username your.name \
  --password YourPassword \
  --role user
```

### Step 5: Verify Deployment

1. Visit the static site URL from deployment outputs
2. Test login with created user
3. Check API health at `https://<functionAppName>.azurewebsites.net/api/health`

### Updating After Code Changes

```bash
# Redeploy API
cd api && npm run build && func azure functionapp publish <functionAppName>

# Redeploy UI
cd ui && ng build --configuration production
az storage blob upload-batch --account-name <storageAccountName> --destination '$web' --source dist/ui/browser --overwrite
```

### Viewing Production Logs

```bash
func azure functionapp logstream <functionAppName>
```

Or via the Azure Portal under Function App > Log stream.

## Project Structure

```
├── api/                  # Azure Functions backend
│   ├── src/
│   │   ├── functions/   # HTTP-triggered functions (one per endpoint)
│   │   └── shared/      # Auth, table client, helpers, types
│   ├── scripts/         # User creation & seed scripts
│   ├── host.json
│   └── package.json
├── ui/                   # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   ├── login/
│   │   │   ├── songs-table/
│   │   │   ├── songs-charts/
│   │   │   └── unique-songs/
│   │   └── environments/
│   └── package.json
├── infrastructure/       # Bicep IaC templates
│   ├── main.bicep
│   └── modules/
│       ├── functionapp.bicep
│       └── storage.bicep
├── staticwebapp.config.json
└── utility/              # Data migration scripts
```

## API Endpoints

All routes (except `/api/auth/login`) require JWT authentication via `Authorization: Bearer <token>` header.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Authenticate and receive JWT |
| GET | `/api/songs` | List all song entries |
| POST | `/api/songs` | Create song entry |
| PUT | `/api/songs/:date` | Update song entry |
| DELETE | `/api/songs/:date` | Delete song entry |
| GET | `/api/unique-songs` | List unique songs catalog |
| POST | `/api/unique-songs` | Add unique song |
| PUT | `/api/unique-songs/:id` | Update unique song |
| DELETE | `/api/unique-songs/:id` | Delete unique song |

## License

Private - CBB Church
