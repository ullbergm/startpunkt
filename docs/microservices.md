# Microservice Architecture

Startpunkt supports two deployment modes:

1. **Monolithic** (default): Single container with both backend and frontend
2. **Microservices**: Separate containers for backend and frontend

## Architecture Overview

### Monolithic Mode (Default)

```
┌─────────────────────────────┐
│   Startpunkt Container      │
│   ┌─────────────────────┐   │
│   │  Quarkus Backend    │   │
│   │  + Quinoa Frontend  │   │
│   └─────────────────────┘   │
│         Port 8080           │
└─────────────────────────────┘
```

### Microservices Mode

```
┌──────────────────────┐       ┌──────────────────────┐
│  Frontend Container  │       │  Backend Container   │
│  ┌────────────────┐  │       │  ┌────────────────┐  │
│  │ Nginx + SPA    │  │──────▶│  │ Quarkus API    │  │
│  │ Static Files   │  │       │  │ (No Frontend)  │  │
│  └────────────────┘  │       │  └────────────────┘  │
│     Port 8080        │       │     Port 8081        │
└──────────────────────┘       └──────────────────────┘
```

## Benefits of Microservices Mode

### Scalability
- **Independent scaling**: Scale frontend and backend independently based on load
- **Resource optimization**: Frontend (static files) requires minimal resources
- **Backend focus**: Scale API servers without replicating static assets

### Development
- **Faster iteration**: Update frontend without rebuilding backend
- **Team separation**: Frontend and backend teams can work independently
- **Technology flexibility**: Easier to replace frontend framework if needed

### Deployment
- **Smaller images**: Backend container ~200MB, Frontend ~30MB
- **Faster deployments**: Update only the changed service
- **Better caching**: Static assets cached at CDN/edge level

### 12-Factor App Compliance
- **III. Config**: API endpoint configured via environment variables
- **IV. Backing services**: Backend API treated as attached resource
- **V. Build, release, run**: Strict separation of build stages
- **VI. Processes**: Stateless services
- **VII. Port binding**: Services self-contained with port binding
- **VIII. Concurrency**: Scale via process model
- **IX. Disposability**: Fast startup, graceful shutdown
- **X. Dev/prod parity**: Docker Compose mirrors production
- **XI. Logs**: Services log to stdout
- **XII. Admin processes**: Run admin tasks in respective containers

## Deployment Guide

### Local Development with Docker Compose

1. Build the microservices:
   ```bash
   ./build-microservices.sh
   ```

2. Start the services:
   ```bash
   docker-compose up
   ```

3. Access the application:
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8081
   - API Documentation: http://localhost:8081/q/swagger-ui
   - Health: http://localhost:8081/q/health
   - Metrics: http://localhost:8081/q/metrics

### Kubernetes Deployment

#### Option 1: Single Pod with Multiple Containers (Sidecar Pattern)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: startpunkt
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: backend
        image: startpunkt-backend:latest
        ports:
        - containerPort: 8081
      - name: frontend
        image: startpunkt-frontend:latest
        ports:
        - containerPort: 8080
        env:
        - name: API_BASE_URL
          value: "http://localhost:8081"
```

#### Option 2: Separate Deployments (Recommended)

**Backend Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: startpunkt-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        image: startpunkt-backend:latest
        ports:
        - containerPort: 8081
        env:
        - name: KUBERNETES_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
---
apiVersion: v1
kind: Service
metadata:
  name: startpunkt-backend
spec:
  ports:
  - port: 8081
    targetPort: 8081
  selector:
    app: startpunkt-backend
```

**Frontend Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: startpunkt-frontend
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: frontend
        image: startpunkt-frontend:latest
        ports:
        - containerPort: 8080
        env:
        - name: API_BASE_URL
          value: "http://startpunkt-backend:8081"
---
apiVersion: v1
kind: Service
metadata:
  name: startpunkt-frontend
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: startpunkt-frontend
```

### Environment Variables

#### Frontend Container
- `API_BASE_URL`: Backend API URL (default: `http://localhost:8081`)

#### Backend Container
- `KUBERNETES_NAMESPACE`: Kubernetes namespace for resource discovery
- `QUARKUS_LOG_LEVEL`: Logging level (default: `INFO`)
- All standard Quarkus/Startpunkt configuration via environment variables

## Configuration

### CORS Settings

CORS is enabled by default in microservices mode. Configure via environment variables:

```bash
QUARKUS_HTTP_CORS_ORIGINS=https://example.com,https://app.example.com
QUARKUS_HTTP_CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
```

### Caching Strategy

**Frontend (Nginx):**
- Static assets (JS, CSS, images): 1 year cache with immutable flag
- index.html: no-cache to ensure updates
- API proxied requests: cache controlled by backend

**Backend (Quarkus):**
- Application data: Caffeine cache (30s TTL)
- Cache metrics exposed via Prometheus

## Monitoring

### Health Checks

**Frontend:**
```bash
curl http://localhost:8080/
```

**Backend:**
```bash
curl http://localhost:8081/q/health/live
curl http://localhost:8081/q/health/ready
```

### Metrics

Backend exposes Prometheus metrics at `/q/metrics`:
- HTTP request counts and durations
- Cache hit/miss ratios
- JVM metrics (heap, GC, threads)

## Troubleshooting

### Frontend can't reach backend

1. Check `API_BASE_URL` environment variable
2. Verify backend service is running and healthy
3. Check network connectivity between containers

### CORS errors

1. Ensure CORS is enabled in backend
2. Verify `quarkus.http.cors.origins` includes your frontend URL
3. Check browser console for specific CORS error messages

### Static files not found

1. Verify frontend container built successfully
2. Check Nginx logs: `docker logs startpunkt-frontend`
3. Ensure `dist/` directory exists in frontend build

## Migration from Monolithic

Existing monolithic deployments continue to work without changes. To migrate:

1. Build both microservice containers
2. Deploy backend with existing configuration
3. Deploy frontend with `API_BASE_URL` pointing to backend
4. Update ingress/route to point to frontend service
5. Scale backend independently as needed

## Performance Considerations

- **Latency**: Additional network hop from frontend to backend (typically < 1ms in-cluster)
- **Throughput**: Frontend Nginx can handle 10K+ req/s for static files
- **Resource usage**: Combined resources similar to monolithic, but more flexible allocation
