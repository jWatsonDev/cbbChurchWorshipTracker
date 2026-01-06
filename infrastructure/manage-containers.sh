#!/bin/bash

# CBB Church Worship Tracker - Azure Container Instance Manager
# Manage start/stop of ACI containers to control costs

set -e

RESOURCE_GROUP="cbbChurchWorshipTracker"
API_CONTAINER="cbbchurch-api-me7zjwdj"
UI_CONTAINER="cbbchurch-ui-me7zjwdj"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Show usage
usage() {
    cat << EOF
Usage: ./manage-containers.sh [COMMAND]

Commands:
  start       Start both API and UI containers
  stop        Stop both API and UI containers
  restart     Restart both containers
  status      Show status of all containers
  api-start   Start API container only
  api-stop    Stop API container only
  ui-start    Start UI container only
  ui-stop     Stop UI container only
  info        Show container details and costs

Examples:
  ./manage-containers.sh stop      # Stop all containers
  ./manage-containers.sh start     # Start all containers
  ./manage-containers.sh status    # Check current status
  ./manage-containers.sh api-stop  # Stop API only
EOF
}

# Check if Azure CLI is installed
check_azure_cli() {
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first."
        echo "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
}

# Get container status
get_status() {
    local container=$1
    az container show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$container" \
        --query "instanceView.state" \
        --output tsv 2>/dev/null || echo "Not Found"
}

# Show status of all containers
show_status() {
    print_status "Fetching container status..."
    echo ""
    
    api_status=$(get_status "$API_CONTAINER")
    ui_status=$(get_status "$UI_CONTAINER")
    
    echo "Resource Group: $RESOURCE_GROUP"
    echo ""
    echo "API Container ($API_CONTAINER):"
    echo "  Status: $api_status"
    echo ""
    echo "UI Container ($UI_CONTAINER):"
    echo "  Status: $ui_status"
    echo ""
}

# Start container
start_container() {
    local container=$1
    print_status "Starting $container..."
    
    if az container start \
        --resource-group "$RESOURCE_GROUP" \
        --name "$container" &>/dev/null; then
        print_success "$container started"
    else
        print_error "Failed to start $container"
        exit 1
    fi
}

# Stop container
stop_container() {
    local container=$1
    print_status "Stopping $container..."
    
    if az container stop \
        --resource-group "$RESOURCE_GROUP" \
        --name "$container" &>/dev/null; then
        print_success "$container stopped"
    else
        print_error "Failed to stop $container"
        exit 1
    fi
}

# Show detailed info
show_info() {
    print_status "Fetching container details..."
    echo ""
    
    echo "=== API Container ==="
    az container show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$API_CONTAINER" \
        --query "{name: name, state: instanceView.state, image: containers[0].properties.image, cpu: containers[0].properties.resources.requests.cpu, memory: containers[0].properties.resources.requests.memoryInGb, fqdn: ipAddress.fqdn, ip: ipAddress.ip}" \
        --output table
    
    echo ""
    echo "=== UI Container ==="
    az container show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$UI_CONTAINER" \
        --query "{name: name, state: instanceView.state, image: containers[0].properties.image, cpu: containers[0].properties.resources.requests.cpu, memory: containers[0].properties.resources.requests.memoryInGb, fqdn: ipAddress.fqdn, ip: ipAddress.ip}" \
        --output table
    
    echo ""
    print_warning "Cost Savings Tips:"
    echo "  • Each container running 24/7 costs ~\$6-8/month per container"
    echo "  • Stopping when not in use can save 50-90% of costs"
    echo "  • Use 'stop' to pause, 'start' to resume instantly"
}

# Main script
main() {
    check_azure_cli
    
    if [[ $# -eq 0 ]]; then
        usage
        exit 0
    fi
    
    case "$1" in
        start)
            print_status "Starting all containers..."
            start_container "$API_CONTAINER"
            start_container "$UI_CONTAINER"
            echo ""
            show_status
            ;;
        stop)
            print_status "Stopping all containers..."
            stop_container "$API_CONTAINER"
            stop_container "$UI_CONTAINER"
            echo ""
            show_status
            ;;
        restart)
            print_status "Restarting all containers..."
            stop_container "$API_CONTAINER"
            stop_container "$UI_CONTAINER"
            sleep 2
            start_container "$API_CONTAINER"
            start_container "$UI_CONTAINER"
            echo ""
            show_status
            ;;
        status)
            show_status
            ;;
        api-start)
            start_container "$API_CONTAINER"
            echo ""
            show_status
            ;;
        api-stop)
            stop_container "$API_CONTAINER"
            echo ""
            show_status
            ;;
        ui-start)
            start_container "$UI_CONTAINER"
            echo ""
            show_status
            ;;
        ui-stop)
            stop_container "$UI_CONTAINER"
            echo ""
            show_status
            ;;
        info)
            show_info
            ;;
        -h|--help|help)
            usage
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            usage
            exit 1
            ;;
    esac
}

main "$@"
