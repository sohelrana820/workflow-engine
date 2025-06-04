# Octoflow Automation Engine

Octoflow is a powerful workflow automation engine that enables you to design, execute, and monitor complex workflows with ease. Built with modern technologies, it provides a comprehensive solution for automating business processes, data pipelines, and task orchestration.

## Prerequisites

Before installing Octoflow, ensure you have the following installed on your system:

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository
- **Make**: (Optional) For using Makefile commands

## Installation

### Quick Start

For a rapid setup, use one of these automated installation methods:

```bash
# Clone the repository
git clone https://github.com/sohelrana820/workflow-engine.git
cd workflow-engine

# Option 1: Using installation script
chmod +x install.sh
./install.sh

# Option 2: Using Makefile
make install
```

### Manual Installation

For more control over the installation process, follow these detailed steps:

#### 1. Clone the Repository

```bash
git clone https://github.com/sohelrana820/workflow-engine.git
cd workflow-engine
```

#### 2. Environment Configuration

Set up environment files for all components:

```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit the main `.env` file to configure your deployment:

```bash
# Open with your preferred editor
nano .env
```

**Key Configuration Parameters:**

| Parameter          | Description            | Default | Required |
|-------------------|------------------------|---------|----------|
| BACK_ENT_PUBLISH_PORT  | HTTP port for the APIs | 3011    | Yes      |
| FRONT_ENT_PUBLISH_PORT | HTTP port for the app  | 3012    | Yes      |


> **Important:** If ports 3011 are already in use on your system, update `BACK_ENT_PUBLISH_PORT` and `FRONT_ENT_PUBLISH_PORT` to available ports.

#### 3. Create Docker Network

Create a dedicated Docker network for the application (skip if already exists):

```bash
docker network create octoflow-app
```

To check if the network already exists:

```bash
docker network ls | grep octoflow-app
```

#### 4. Build Application Containers

Build all Docker containers for the application:

```bash
docker compose build
```

#### 5. Install Dependencies

Install Node.js dependencies for both backend and frontend:

```bash
# Install backend dependencies
docker compose run --rm backend npm install

# Install frontend dependencies
docker compose run --rm frontend npm install
```

#### 6. Start the Application

Launch all services in detached mode:

```bash
docker compose up -d
```

#### 7. Verify Installation

Check that all services are running correctly:

```bash
# View running containers
docker compose ps

# Check application logs
docker compose logs -f

# Test application accessibility
curl http://localhost:3011/health
```

## Post-Installation

Once installed and running, you can access Octoflow at:

- **API Interface**: `http://localhost:3011`
- **Web Interface**: `http://localhost:3012`
- **RabbitMQ Admin**: `http://localhost:3011/api/docs`

## Video Demo
[Demo](https://youtu.be/JONbqOJeOW0)
