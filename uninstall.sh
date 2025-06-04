#!/bin/bash

# Octoflow Automation Engine - Uninstall Script
# This script completely removes Octoflow and cleans up all related files and Docker resources

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE="docker compose"
PROJECT_NAME="octoflow"

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

# Function to ask for confirmation
confirm_uninstall() {
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║           ⚠️  WARNING: UNINSTALL ⚠️           ║"
    echo "║                                               ║"
    echo "║  This will completely remove Octoflow and    ║"
    echo "║  all associated data, including:              ║"
    echo "║                                               ║"
    echo "║  • All Docker containers and images           ║"
    echo "║  • All Docker volumes (DATABASE DATA LOST!)   ║"
    echo "║  • All node_modules directories               ║"
    echo "║  • All .env configuration files               ║"
    echo "║  • Docker networks                            ║"
    echo "║                                               ║"
    echo "║  This action is IRREVERSIBLE!                 ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""

    read -p "Are you sure you want to completely uninstall Octoflow? (type 'yes' to confirm): " confirm

    if [ "$confirm" != "yes" ]; then
        print_status "Uninstall cancelled by user"
        exit 0
    fi

    echo ""
    read -p "Are you REALLY sure? This will delete all your data! (type 'DELETE' to confirm): " confirm2

    if [ "$confirm2" != "DELETE" ]; then
        print_status "Uninstall cancelled by user"
        exit 0
    fi
}

# Function to get project name from environment or compose file
get_project_name() {
    # Try to get project name from .env file
    if [ -f ".env" ]; then
        PROJECT_NAME=$(grep "COMPOSE_PROJECT_NAME" .env 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo "")
        if [ ! -z "$PROJECT_NAME" ]; then
            echo "$PROJECT_NAME"
            return
        fi
    fi

    # Try to get from docker-compose.yml
    if [ -f "docker-compose.yml" ]; then
        # Use the directory name as project name (Docker Compose default behavior)
        echo "$(basename "$(pwd)")"
        return
    fi

    # Fallback to default
    echo "octoflow"
}

# Function to stop and remove containers
stop_containers() {
    print_status "Stopping and removing Octoflow Docker containers..."

    if [ -f "docker-compose.yml" ]; then
        # Stop and remove containers, but only for this project
        $DOCKER_COMPOSE down --volumes --remove-orphans >/dev/null 2>&1 || true
        print_success "Octoflow Docker containers stopped and removed"
    else
        print_warning "docker-compose.yml not found, checking for running containers manually..."

        # Look for containers with project-specific names
        PROJECT_PREFIX=$(get_project_name)
        CONTAINER_PATTERNS="${PROJECT_PREFIX}-backend ${PROJECT_PREFIX}-frontend ${PROJECT_PREFIX}-postgres ${PROJECT_PREFIX}-rabbitmq octoflow-backend octoflow-frontend octoflow-postgres octoflow-rabbitmq"

        for pattern in $CONTAINER_PATTERNS; do
            CONTAINERS=$(docker ps -a --filter "name=$pattern" -q 2>/dev/null || true)
            if [ ! -z "$CONTAINERS" ]; then
                docker stop $CONTAINERS >/dev/null 2>&1 || true
                docker rm $CONTAINERS >/dev/null 2>&1 || true
                print_success "Removed containers matching: $pattern"
            fi
        done
    fi
}

# Function to remove Docker images
remove_images() {
    print_status "Removing Octoflow Docker images..."

    # Get project name from .env or docker-compose.yml
    PROJECT_PREFIX=$(get_project_name)

    # Remove images built by this docker-compose project
    if [ -f "docker-compose.yml" ]; then
        # Get image names from docker-compose.yml
        COMPOSE_IMAGES=$($DOCKER_COMPOSE config --images 2>/dev/null || true)
        if [ ! -z "$COMPOSE_IMAGES" ]; then
            for image in $COMPOSE_IMAGES; do
                if docker images | grep -q "$image"; then
                    docker rmi -f "$image" >/dev/null 2>&1 || true
                    print_success "Removed image: $image"
                fi
            done
        fi
    fi

    # Remove images with project-specific naming patterns
    PATTERNS="${PROJECT_PREFIX}-backend ${PROJECT_PREFIX}-frontend octoflow-backend octoflow-frontend"
    for pattern in $PATTERNS; do
        IMAGES=$(docker images --filter "reference=*${pattern}*" -q 2>/dev/null || true)
        if [ ! -z "$IMAGES" ]; then
            docker rmi -f $IMAGES >/dev/null 2>&1 || true
            print_success "Removed images matching pattern: $pattern"
        fi
    done

    # Only remove dangling images that were created during this project's build
    # (Skip this to avoid affecting other projects)
    print_warning "Skipping dangling images cleanup to preserve other projects"
}

# Function to remove Docker volumes
remove_volumes() {
    print_status "Removing Octoflow Docker volumes..."

    # Get project name for more precise targeting
    PROJECT_PREFIX=$(get_project_name)

    # Remove volumes created by this docker-compose project
    if [ -f "docker-compose.yml" ]; then
        # Get volume names from docker-compose
        COMPOSE_VOLUMES=$($DOCKER_COMPOSE config --volumes 2>/dev/null || true)
        if [ ! -z "$COMPOSE_VOLUMES" ]; then
            for volume in $COMPOSE_VOLUMES; do
                FULL_VOLUME_NAME="${PROJECT_PREFIX}_${volume}"
                if docker volume ls | grep -q "$FULL_VOLUME_NAME"; then
                    docker volume rm "$FULL_VOLUME_NAME" >/dev/null 2>&1 || true
                    print_success "Volume '$FULL_VOLUME_NAME' removed"
                fi
            done
        fi
    fi

    # Remove project-specific named volumes
    VOLUME_PATTERNS="${PROJECT_PREFIX}_postgres_data ${PROJECT_PREFIX}_rabbitmq_data postgres_data rabbitmq_data"
    for pattern in $VOLUME_PATTERNS; do
        # Only remove if it matches our project prefix or is in current directory context
        MATCHING_VOLUMES=$(docker volume ls --filter "name=${pattern}" -q 2>/dev/null || true)
        if [ ! -z "$MATCHING_VOLUMES" ]; then
            for vol in $MATCHING_VOLUMES; do
                # Double-check this volume belongs to our project
                if [[ "$vol" == *"$PROJECT_PREFIX"* ]] || [[ "$vol" == "postgres_data" ]] || [[ "$vol" == "rabbitmq_data" ]]; then
                    # Additional safety: check if volume is used by our compose project
                    if $DOCKER_COMPOSE config | grep -q "$vol" 2>/dev/null; then
                        docker volume rm "$vol" >/dev/null 2>&1 || true
                        print_success "Volume '$vol' removed"
                    fi
                fi
            done
        fi
    done
}

# Function to remove Docker networks
remove_networks() {
    print_status "Removing Octoflow Docker networks..."

    PROJECT_PREFIX=$(get_project_name)

    # Remove project-specific networks
    NETWORK_PATTERNS="${PROJECT_PREFIX}-app ${PROJECT_PREFIX}_default octoflow-app"
    for pattern in $NETWORK_PATTERNS; do
        if docker network ls | grep -q "$pattern"; then
            # Additional safety: check if network is used by other containers
            NETWORK_CONTAINERS=$(docker network inspect "$pattern" --format='{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || true)
            if [ -z "$NETWORK_CONTAINERS" ]; then
                docker network rm "$pattern" >/dev/null 2>&1 || true
                print_success "Docker network '$pattern' removed"
            else
                print_warning "Network '$pattern' still has containers attached, skipping"
            fi
        fi
    done
}

# Function to remove node_modules directories
remove_node_modules() {
    print_status "Removing node_modules directories..."

    # Remove backend node_modules
    if [ -d "backend/node_modules" ]; then
        rm -rf backend/node_modules
        print_success "Backend node_modules removed"
    else
        print_warning "Backend node_modules not found"
    fi

    # Remove frontend node_modules
    if [ -d "frontend/node_modules" ]; then
        rm -rf frontend/node_modules
        print_success "Frontend node_modules removed"
    else
        print_warning "Frontend node_modules not found"
    fi

    # Remove root node_modules if exists
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        print_success "Root node_modules removed"
    fi
}

# Function to remove .env files
remove_env_files() {
    print_status "Removing .env configuration files..."

    # Remove main .env file
    if [ -f ".env" ]; then
        rm -f .env
        print_success "Main .env file removed"
    else
        print_warning "Main .env file not found"
    fi

    # Remove backend .env file
    if [ -f "backend/.env" ]; then
        rm -f backend/.env
        print_success "Backend .env file removed"
    else
        print_warning "Backend .env file not found"
    fi

    # Remove frontend .env file
    if [ -f "frontend/.env" ]; then
        rm -f frontend/.env
        print_success "Frontend .env file removed"
    else
        print_warning "Frontend .env file not found"
    fi
}

# Function to remove additional build artifacts
remove_build_artifacts() {
    print_status "Removing build artifacts and cache..."

    # Remove build directories
    BUILD_DIRS="backend/dist frontend/build frontend/.next backend/build"
    for dir in $BUILD_DIRS; do
        if [ -d "$dir" ]; then
            rm -rf "$dir"
            print_success "Build directory '$dir' removed"
        fi
    done

    # Remove package-lock files (optional - user might want to keep these)
    # if [ -f "backend/package-lock.json" ]; then
    #     rm -f backend/package-lock.json
    #     print_success "Backend package-lock.json removed"
    # fi

    # if [ -f "frontend/package-lock.json" ]; then
    #     rm -f frontend/package-lock.json
    #     print_success "Frontend package-lock.json removed"
    # fi
}

# Function to clean up Docker system (optional)
cleanup_docker_system() {
    read -p "Do you want to run Docker system cleanup? This will remove ONLY unused Docker data. (y/N): " cleanup_confirm

    if [ "$cleanup_confirm" = "y" ] || [ "$cleanup_confirm" = "Y" ]; then
        print_warning "This will only remove unused Docker resources (not affecting other projects)"
        read -p "Continue with Docker cleanup? (y/N): " final_confirm

        if [ "$final_confirm" = "y" ] || [ "$final_confirm" = "Y" ]; then
            print_status "Running safe Docker cleanup (unused resources only)..."
            # Use --filter to be more selective, avoiding removal of resources in use
            docker system prune -f --filter "until=1h" >/dev/null 2>&1 || true
            print_success "Docker cleanup completed (unused resources only)"
        else
            print_status "Skipping Docker system cleanup"
        fi
    else
        print_status "Skipping Docker system cleanup"
    fi
}

# Function to display removal summary
show_summary() {
    echo ""
    print_success "🗑️  Octoflow uninstallation completed!"
    echo ""
    print_status "What was removed:"
    echo "  ✅ Octoflow Docker containers and services"
    echo "  ✅ Octoflow Docker images (project-specific only)"
    echo "  ✅ Octoflow Docker volumes (including database data)"
    echo "  ✅ Octoflow Docker networks"
    echo "  ✅ node_modules directories"
    echo "  ✅ .env configuration files"
    echo "  ✅ Build artifacts and cache"
    echo ""
    print_status "What was preserved:"
    echo "  📁 Source code files"
    echo "  📁 package.json files"
    echo "  📁 package-lock.json files"
    echo "  🐳 Other Docker projects (images, volumes, networks)"
    echo "  🔒 Other project data and containers"
    echo ""
    print_warning "Note: All database data has been permanently deleted!"
    echo ""
    print_status "To reinstall Octoflow, run: ${GREEN}./install.sh${NC}"
}

# Main uninstall function
main() {
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║        Octoflow Automation Engine             ║"
    echo "║              Uninstall Script                 ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""

    # Confirm uninstall
    confirm_uninstall

    print_status "Starting Octoflow uninstallation..."
    echo ""

    # Run uninstall steps
    stop_containers
    remove_images
    remove_volumes
    remove_networks
    remove_node_modules
    remove_env_files
    remove_build_artifacts
    cleanup_docker_system

    # Show summary
    show_summary
}

# Handle script interruption
trap 'print_error "Uninstall interrupted by user"; exit 1' INT

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "docker-compose.yml" ]; then
    print_warning "This doesn't appear to be an Octoflow project directory"
    print_status "Make sure you're in the correct directory before running uninstall"
    read -p "Continue anyway? (y/N): " continue_confirm
    if [ "$continue_confirm" != "y" ] && [ "$continue_confirm" != "Y" ]; then
        print_status "Uninstall cancelled"
        exit 0
    fi
fi

# Run main function
main

echo ""
print_success "Uninstall script completed. Octoflow has been completely removed! 🧹"