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

### Local Development

1. **Set up environment variables**
   - Copy `api/.env.local.example` to `api/.env.local`
   - Add your Azure Table Storage connection string and JWT secret

2. **Run with Docker Compose**
   ```bash
   docker compose up -d
   ```
   - API: http://localhost:3000
   - UI: http://localhost:4200

3. **Create users**
   ```bash
   cd api
   npm run create-user -- --username your.name --password YourPassword --role user
   ```

### Deployment

Infrastructure is managed with Bicep templates in `/infrastructure`.

```bash
cd infrastructure
az deployment group create \
  --resource-group <your-rg> \
  --template-file main.bicep \
  --parameters namePrefix=<prefix> jwtSecret=<strong-secret>
```

Then build/push images:
```bash
# Build and push API
docker buildx build --platform linux/amd64 -t <acr>.azurecr.io/cbbchurch-api:latest -f api/Dockerfile api --push

# Build and push UI
docker buildx build --platform linux/amd64 -t <acr>.azurecr.io/cbbchurch-ui:latest -f ui/Dockerfile.prod ui --push
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
