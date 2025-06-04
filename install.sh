#!/bin/bash

# Octoflow Automation Engine - Installation Script
# This script automates the installation process for Octoflow

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE="docker compose"
DEFAULT_HTTP_PORT=3012
DEFAULT_HTTPS_PORT=3012

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi

    print_success "Docker is installed and running"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Function to prepare environment files
prepare_environment() {
    print_status "Preparing environment files..."

    # Copy main .env file
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Main .env file created"
    else
        print_warning ".env.example not found, creating basic .env file"
        cat > .env << EOF
# Project Configuration
COMPOSE_PROJECT_NAME=octoflow
DOCKER_BUILD_MODE=dev
NODE_ENV=development

# Port Configuration
BACK_ENT_PUBLISH_PORT=3001
FRONT_ENT_PUBLISH_PORT=3000
HTTP_PUBLISH_PORT=3012
HTTPS_PUBLISH_PORT=3012

# Database Configuration
POSTGRES_DB_TYPE=postgres
POSTGRES_DB_HOST=postgres
POSTGRES_DB_PORT=5432
POSTGRES_DB_USER=postgres
POSTGRES_DB_PASS=octoflow_secure_pass
POSTGRES_DB_NAME=octoflow_db

# RabbitMQ Configuration
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASS=octoflow_rabbitmq_pass
RABBITMQ_ADMIN_PORT=15672
EOF
    fi

    # Copy backend .env file
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        print_success "Backend .env file created"
    else
        print_warning "backend/.env.example not found, creating basic backend .env file"
        mkdir -p backend
        cat > backend/.env << EOF
# Application Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
POSTGRES_DB_TYPE=postgres
POSTGRES_DB_HOST=localhost
POSTGRES_DB_PORT=5432
POSTGRES_DB_USER=postgres
POSTGRES_DB_PASS=octoflow_secure_pass
POSTGRES_DB_NAME=octoflow_db

# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASS=octoflow_rabbitmq_pass

# Security
JWT_SECRET=your_jwt_secret_here_change_in_production
EOF
    fi

    # Copy frontend .env file
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env
        print_success "Frontend .env file created"
    else
        print_warning "frontend/.env.example not found, creating basic frontend .env file"
        mkdir -p frontend
        cat > frontend/.env << EOF
# React App Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENV=development
EOF
    fi
}

# Function to create Docker network
create_network() {
    print_status "Creating Docker network..."

    if docker network ls | grep -q "octoflow-app"; then
        print_warning "Docker network 'octoflow-app' already exists"
    else
        docker network create octoflow-app
        print_success "Docker network 'octoflow-app' created"
    fi
}

# Function to build containers
build_containers() {
    print_status "Building Docker containers... (this may take a few minutes)"

    $DOCKER_COMPOSE build --no-cache
    print_success "Docker containers built successfully"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."

    # Install backend dependencies
    print_status "Installing backend dependencies..."
    $DOCKER_COMPOSE run --rm backend npm install

    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    $DOCKER_COMPOSE run --rm frontend npm install

    print_success "Dependencies installed successfully"
}

# Function to start the application
start_application() {
    print_status "Starting Octoflow application..."

    # Clean up any existing containers first
    print_status "Cleaning up any existing containers..."
    $DOCKER_COMPOSE down --remove-orphans >/dev/null 2>&1 || true

    # Start containers
    if $DOCKER_COMPOSE up -d --remove-orphans; then
        print_success "Docker containers started"
    else
        print_error "Failed to start containers"
        print_status "Checking for errors..."
        $DOCKER_COMPOSE logs --tail=20
        return 1
    fi
}

# Function to verify installation
verify_installation() {
    print_status "Verifying installation..."

    # Wait for containers to start
    print_status "Waiting for containers to start..."
    sleep 10

    # Check if containers are running
    RUNNING_CONTAINERS=$($DOCKER_COMPOSE ps --services --filter "status=running" 2>/dev/null | wc -l)
    ALL_CONTAINERS=$($DOCKER_COMPOSE ps --services 2>/dev/null | wc -l)

    if [ "$RUNNING_CONTAINERS" -gt 0 ]; then
        print_success "Containers are running ($RUNNING_CONTAINERS/$ALL_CONTAINERS)"

        # Display running containers
        echo ""
        print_status "Container status:"
        $DOCKER_COMPOSE ps

        # Check specific services
        check_service_health

        echo ""
        print_success "🎉 Octoflow installation completed successfully!"
        echo ""
        print_status "Access your application at:"
        echo -e "  ${GREEN}Main Application:${NC} http://localhost:3012"
        echo -e "  ${GREEN}Frontend (Dev):${NC}  http://localhost:3000"
        echo -e "  ${GREEN}Backend API:${NC}     http://localhost:3001"
        echo -e "  ${GREEN}RabbitMQ Management:${NC} http://localhost:15672 (admin/octoflow_rabbitmq_pass)"
        echo ""
        print_status "To stop the application, run: ${YELLOW}docker compose down${NC}"
        echo ""

        # Open browser to main application at port 3012
        APP_URL="http://localhost:3012"
        if command -v xdg-open &> /dev/null; then
            print_status "Opening Octoflow application in browser..."
            xdg-open "$APP_URL" &
        elif command -v open &> /dev/null; then
            print_status "Opening Octoflow application in browser..."
            open "$APP_URL" &
        else
            print_status "Please open $APP_URL in your browser to access Octoflow"
        fi

    else
        print_error "No containers are running"
        print_status "Container status:"
        $DOCKER_COMPOSE ps
        echo ""
        print_status "Checking for errors..."
        troubleshoot_installation
        exit 1
    fi
}

# Function to check service health
check_service_health() {
    print_status "Checking service health..."

    # Check if backend is responding
    sleep 5
    if curl -s http://localhost:3001/health >/dev/null 2>&1 || curl -s http://localhost:3001 >/dev/null 2>&1; then
        print_success "Backend service is responding"
    else
        print_warning "Backend service may still be starting up"
    fi

    # Check if frontend is responding
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend service is responding"
    else
        print_warning "Frontend service may still be starting up"
    fi
}

# Function to troubleshoot installation issues
troubleshoot_installation() {
    print_status "Running diagnostics..."

    # Check Docker Compose file exists
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml file not found!"
        print_status "Make sure you're in the correct directory"
        return
    fi

    # Check for build errors
    print_status "Checking for build errors..."
    $DOCKER_COMPOSE logs --tail=50

    # Check port conflicts
    print_status "Checking for port conflicts..."
    if check_port 3000; then
        print_success "Port 3000 is available"
    else
        print_warning "Port 3000 is in use by another process"
    fi

    if check_port 3001; then
        print_success "Port 3001 is available"
    else
        print_warning "Port 3001 is in use by another process"
    fi

    if check_port 5432; then
        print_success "Port 5432 is available"
    else
        print_warning "Port 5432 is in use by another process"
    fi

    # Suggest solutions
    echo ""
    print_status "Troubleshooting suggestions:"
    echo "1. Check Docker logs: docker compose logs"
    echo "2. Restart Docker: sudo systemctl restart docker"
    echo "3. Clean Docker: docker system prune -a"
    echo "4. Check port usage: lsof -i :3000,3001,5432"
    echo "5. Try rebuilding: docker compose down && docker compose build --no-cache"
    echo ""
    print_status "For detailed logs, run: docker compose logs -f"
}

# Main installation function
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║        Octoflow Automation Engine             ║"
    echo "║              Installation Script              ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""

    # Check prerequisites
    check_docker

    # Run installation steps
    prepare_environment
    create_network
    build_containers
    install_dependencies
    start_application
    verify_installation
}

# Handle script interruption
trap 'print_error "Installation interrupted by user"; exit 1' INT

# Run main function
main

echo ""
print_success "Installation script completed. Enjoy using Octoflow! 🚀"