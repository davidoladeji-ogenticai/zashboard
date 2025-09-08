#!/bin/bash

# Zashboard Smart Development Server Startup Script
# Ensures the dashboard always runs on port 3000 by managing conflicting processes

set -e  # Exit on any error

PORT=3000
SCRIPT_NAME="Zashboard Dev Server"
FORCE_KILL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_KILL=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--force] [--help]"
            echo "  --force, -f    Force kill all processes on port 3000 without asking"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[${SCRIPT_NAME}]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[${SCRIPT_NAME}]${NC} $1"
}

print_error() {
    echo -e "${RED}[${SCRIPT_NAME}]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[${SCRIPT_NAME}]${NC} $1"
}

# Function to check if port is in use
check_port() {
    local port=$1
    if command -v lsof > /dev/null 2>&1; then
        lsof -ti:$port 2>/dev/null
    elif command -v netstat > /dev/null 2>&1; then
        netstat -tulpn 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d/ -f1
    else
        print_error "Neither lsof nor netstat found. Cannot check port usage."
        return 1
    fi
}

# Function to get process details
get_process_info() {
    local pid=$1
    if command -v ps > /dev/null 2>&1; then
        ps -p $pid -o pid,ppid,comm,args 2>/dev/null | tail -n +2
    else
        print_error "ps command not found. Cannot get process information."
        return 1
    fi
}

# Function to check if process is Node.js/Next.js related
is_node_process() {
    local pid=$1
    local process_info=$(get_process_info $pid 2>/dev/null)
    
    if [[ $process_info == *"node"* ]] || \
       [[ $process_info == *"next"* ]] || \
       [[ $process_info == *"next-server"* ]] || \
       [[ $process_info == *"npm"* ]] || \
       [[ $process_info == *"pnpm"* ]] || \
       [[ $process_info == *"yarn"* ]]; then
        return 0  # True - it's a Node.js process
    else
        return 1  # False - not a Node.js process
    fi
}

# Function to kill processes on port
kill_port_processes() {
    local port=$1
    local pids=$(check_port $port)
    
    if [ -z "$pids" ]; then
        print_status "Port $port is available."
        return 0
    fi
    
    print_warning "Port $port is in use by the following processes:"
    
    for pid in $pids; do
        local process_info=$(get_process_info $pid 2>/dev/null)
        echo "  PID $pid: $process_info"
        
        if is_node_process $pid; then
            print_status "Killing Node.js process $pid..."
            kill $pid 2>/dev/null || {
                print_warning "Failed to kill process $pid with SIGTERM, trying SIGKILL..."
                kill -9 $pid 2>/dev/null || print_error "Failed to kill process $pid"
            }
        else
            print_warning "Non-Node process detected on port $port (PID: $pid)"
            if [ "$FORCE_KILL" = true ]; then
                print_status "Force mode: Killing process $pid..."
                kill $pid 2>/dev/null || {
                    print_warning "Failed to kill process $pid with SIGTERM, trying SIGKILL..."
                    kill -9 $pid 2>/dev/null || print_error "Failed to kill process $pid"
                }
            else
                read -p "Do you want to kill this process? It might be important. (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    print_status "Killing process $pid..."
                    kill $pid 2>/dev/null || {
                        print_warning "Failed to kill process $pid with SIGTERM, trying SIGKILL..."
                        kill -9 $pid 2>/dev/null || print_error "Failed to kill process $pid"
                    }
                else
                    print_error "Cannot start server. Port $port is still in use."
                    print_info "Tip: Use --force flag to automatically kill all processes on port $port"
                    exit 1
                fi
            fi
        fi
    done
    
    # Wait a moment for processes to terminate
    sleep 2
    
    # Check again
    local remaining_pids=$(check_port $port)
    if [ -n "$remaining_pids" ]; then
        print_error "Some processes are still using port $port:"
        for pid in $remaining_pids; do
            local process_info=$(get_process_info $pid 2>/dev/null)
            echo "  PID $pid: $process_info"
        done
        print_error "Cannot start server. Please manually resolve the port conflict."
        exit 1
    fi
    
    print_status "Port $port is now available."
}

# Function to start the development server
start_server() {
    print_status "Starting Zashboard development server on port $PORT..."
    print_info "You can access the dashboard at: http://localhost:$PORT"
    print_info "Press Ctrl+C to stop the server"
    echo
    
    # Set explicit port to prevent Next.js from choosing alternatives
    export PORT=$PORT
    
    # Start Next.js development server with explicit port
    if command -v pnpm > /dev/null 2>&1; then
        exec pnpm next dev --turbopack --port $PORT
    elif command -v npm > /dev/null 2>&1; then
        exec npx next dev --turbopack --port $PORT
    else
        print_error "Neither pnpm nor npm found. Please install Node.js package manager."
        exit 1
    fi
}

# Main execution
main() {
    print_status "Starting Zashboard development environment..."
    print_info "Target port: $PORT"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the Zashboard project root directory."
        exit 1
    fi
    
    # Verify this is the Zashboard project
    if ! grep -q "\"name\": \"zashboard\"" package.json 2>/dev/null; then
        print_error "This doesn't appear to be the Zashboard project directory."
        exit 1
    fi
    
    # Kill any processes using our target port
    kill_port_processes $PORT
    
    # Start the server
    start_server
}

# Handle Ctrl+C gracefully
cleanup() {
    print_warning "Shutting down development server..."
    exit 0
}

trap cleanup INT TERM

# Run main function
main "$@"