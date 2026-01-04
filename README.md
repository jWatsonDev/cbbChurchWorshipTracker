# Church Worship Song Tracker

A full-stack application for tracking worship songs used at CBB Church, featuring a NestJS API backend with Azure Table Storage and an Angular frontend.

## Features

- 🎵 Track songs by service date with complete song lists
- 📊 View song usage statistics and charts
- 🔐 JWT-based authentication for protected operations
- 📱 Responsive Angular UI with Material Design
- ☁️ Azure deployment ready (ACI + Table Storage)
- 🐳 Docker Compose for local development

## Architecture

- **API**: NestJS (Node.js/TypeScript) REST API
- **UI**: Angular 19 with standalone components
- **Database**: Azure Table Storage
- **Auth**: JWT with bcryptjs password hashing
- **Deployment**: Azure Container Instances + ACR

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Azure CLI (for deployment)

## Local Development

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jWatsonDev/cbbChurchWorshipTracker.git
   cd cbbChurchWorshipTracker
   ```

2. **Configure environment variables**
   ```bash
   cp api/.env.local.example api/.env.local
   ```
   
   Edit `api/.env.local` and set:
   - `JWT_SECRET`: Generate a strong secret (e.g., `openssl rand -base64 32`)
   - `TABLE_CONN`: Your Azure Storage connection string (from Azure Portal or CLI)
   
   To get your Azure Table Storage connection string:
   ```bash
   az storage account show-connection-string \
     --name <storage-account-name> \
     --resource-group <resource-group> \
     --query connectionString -o tsv
   ```

3. **Start services with Docker Compose**
   ```bash
   docker compose up -d
   ```
   This will build and start both API and UI containers.
   
   - **API**: http://localhost:3000
   - **UI**: http://localhost:4200
   - **API Health**: http://localhost:3000 (should return "Hello World!")

4. **Create initial users**
   
   The app requires authenticated users. Create your first user:
   ```bash
   cd api
   TABLE_CONN="<your-connection-string>" \
   USERS_TABLE_NAME=Users \
   npx ts-node scripts/create-user.ts \
     --username your.name \
     --password YourPassword \
     --role user
   ```
   
   Or use the connection from `.env.local`:
   ```bash
   cd api
   TABLE_CONN="$(grep '^TABLE_CONN=' .env.local | cut -d= -f2-)" \
   USERS_TABLE_NAME=Users \
   npx ts-node scripts/create-user.ts \
     --username your.name \
     --password YourPassword \
     --role user
   ```

### Development Workflow

**View logs:**
```bash
docker compose logs -f api    # API logs
docker compose logs -f ui     # UI logs
```

**Restart services:**
```bash
docker compose restart api
docker compose restart ui
```

**Rebuild after code changes:**
```bash
docker compose build api      # Rebuild API only
docker compose build ui       # Rebuild UI only
docker compose up -d          # Restart with new images
```

**Stop all services:**
```bash
docker compose down
```

**Run API locally (without Docker):**
```bash
cd api
npm install
npm run start:dev
```

**Run UI locally (without Docker):**
```bash
cd ui
npm install
npm start
```

### Testing the Application

1. Navigate to http://localhost:4200
2. Log in with the user you created
3. Add song entries via the dashboard
4. View charts and statistics

## Azure Deployment

### Prerequisites

- Azure CLI logged in: `az login`
- Docker with buildx support
- A resource group created: `az group create --name cbbChurchWorshipTracker --location eastus`

### Step 1: Deploy Infrastructure

The Bicep templates create:
- Azure Container Registry (ACR)
- Azure Storage Account with Table Storage
- Azure Container Instance for API
- Azure Container Instance for UI

```bash
cd infrastructure

# Deploy with your parameters
az deployment group create \
  --resource-group cbbChurchWorshipTracker \
  --template-file main.bicep \
  --parameters \
    namePrefix=cbbchurch \
    jwtSecret="<strong-secret-generate-with-openssl-rand-base64-32>" \
    jwtExpiresIn=15m \
    imageTag=latest
```

**Save the outputs:**
```bash
az deployment group show \
  --resource-group cbbChurchWorshipTracker \
  --name main \
  --query properties.outputs
```

You'll need:
- `acrLoginServer` (e.g., `cbbchurchacrXXXXXX.azurecr.io`)
- `apiUrl` (e.g., `http://cbbchurch-api-XXXXXX.eastus.azurecontainer.io:3000`)
- `uiUrl` (e.g., `http://cbbchurch-ui-XXXXXX.eastus.azurecontainer.io`)
- `tableStorageAccount` (name of storage account)

### Step 2: Build and Push Docker Images

**Login to ACR:**
```bash
az acr login --name <acrName>
```

**Build and push API:**
```bash
docker buildx build \
  --platform linux/amd64 \
  -t <acrLoginServer>/cbbchurch-api:latest \
  -f api/Dockerfile \
  api \
  --push
```

**Build and push UI:**
```bash
docker buildx build \
  --platform linux/amd64 \
  -t <acrLoginServer>/cbbchurch-ui:latest \
  -f ui/Dockerfile.prod \
  ui \
  --push
```

### Step 3: Create Users in Production

```bash
# Get connection string from deployed storage
TABLE_CONN=$(az storage account show-connection-string \
  --name <tableStorageAccount> \
  --resource-group cbbChurchWorshipTracker \
  --query connectionString -o tsv)

# Create users
cd api
TABLE_CONN="$TABLE_CONN" \
USERS_TABLE_NAME=Users \
npx ts-node scripts/create-user.ts \
  --username your.name \
  --password YourPassword \
  --role user
```

### Step 4: Restart Containers

After pushing new images, restart the ACI containers to pull latest:

```bash
# Restart API
az container restart \
  --resource-group cbbChurchWorshipTracker \
  --name cbbchurch-api-<suffix>

# Restart UI
az container restart \
  --resource-group cbbChurchWorshipTracker \
  --name cbbchurch-ui-<suffix>
```

### Step 5: Verify Deployment

1. Visit the UI URL from deployment outputs
2. Test login with created user
3. Check API health at the API URL

### Updating After Code Changes

```bash
# 1. Build and push new images (repeat Step 2)
docker buildx build --platform linux/amd64 -t <acrLoginServer>/cbbchurch-api:latest -f api/Dockerfile api --push
docker buildx build --platform linux/amd64 -t <acrLoginServer>/cbbchurch-ui:latest -f ui/Dockerfile.prod ui --push

# 2. Restart containers (repeat Step 4)
az container restart -g cbbChurchWorshipTracker -n cbbchurch-api-<suffix>
az container restart -g cbbChurchWorshipTracker -n cbbchurch-ui-<suffix>
```

### Viewing Production Logs

```bash
# API logs
az container logs \
  --resource-group cbbChurchWorshipTracker \
  --name cbbchurch-api-<suffix> \
  --container-name api

# UI logs
az container logs \
  --resource-group cbbChurchWorshipTracker \
  --name cbbchurch-ui-<suffix> \
  --container-name ui
```

### Cost Management

**Monitor costs:**
```bash
az consumption usage list \
  --query "[?resourceGroup=='cbbChurchWorshipTracker']"
```

**Stop containers (to save costs):**
```bash
az container stop -g cbbChurchWorshipTracker -n cbbchurch-api-<suffix>
az container stop -g cbbChurchWorshipTracker -n cbbchurch-ui-<suffix>
```

**Restart when needed:**
```bash
az container start -g cbbChurchWorshipTracker -n cbbchurch-api-<suffix>
az container start -g cbbChurchWorshipTracker -n cbbchurch-ui-<suffix>
```

## Project Structure

```
├── api/                  # NestJS backend
│   ├── src/
│   │   ├── auth/        # JWT authentication
│   │   ├── songs.controller.ts
│   │   ├── unique-songs.controller.ts
│   │   └── main.ts
│   ├── scripts/         # User creation scripts
│   └── Dockerfile
├── ui/                   # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   ├── login/
│   │   │   ├── songs-table/
│   │   │   ├── songs-charts/
│   │   │   └── unique-songs/
│   │   └── environments/
│   ├── nginx.conf
│   └── Dockerfile.prod
├── infrastructure/       # Bicep IaC templates
│   ├── main.bicep
│   └── modules/
│       ├── aci.bicep
│       ├── aci-ui.bicep
│       ├── acr.bicep
│       └── storage.bicep
└── docker-compose.yml
```

## API Endpoints

All routes (except `/auth/login`) require JWT authentication via `Authorization: Bearer <token>` header.

- `POST /auth/login` - Authenticate and receive JWT
- `GET /songs` - List all song entries
- `POST /songs` - Create song entry
- `PUT /songs/:date` - Update song entry
- `DELETE /songs/:date` - Delete song entry
- `GET /unique-songs` - List unique songs catalog
- `POST /unique-songs` - Add unique song
- `PUT /unique-songs/:id` - Update unique song
- `DELETE /unique-songs/:id` - Delete unique song

## License

Private - CBB Church
