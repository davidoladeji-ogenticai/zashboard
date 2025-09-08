# Zashboard - Zing Analytics Dashboard

A comprehensive analytics dashboard for Zing browser applications, built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- **Real-time Analytics**: Live monitoring of user activity, performance metrics, and system health
- **Geographic Insights**: User distribution and regional growth analytics  
- **Performance Tracking**: Startup times, memory usage, crash rates, and response time monitoring
- **Version Management**: Track app versions, update success rates, and adoption metrics
- **User Analytics**: Active users, new user acquisition, retention, and session analytics
- **Authentication System**: Secure JWT-based authentication with user registration and login
- **Database Integration**: PostgreSQL support with automatic schema migration

## Quick Start

### Prerequisites

- Node.js 18+ (recommended: 20+)
- pnpm (recommended) or npm/yarn
- PostgreSQL 13+ (optional - falls back to in-memory storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd zashboard
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Initialize database (optional)**
   ```bash
   pnpm db:init
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

The dashboard will be available at [http://localhost:3000](http://localhost:3000).

## Port Management

Zashboard is configured to **always run on port 3000**. The project includes intelligent port management to ensure consistency:

### Development Commands

```bash
# Standard development (with smart port management)
pnpm dev

# Alternative commands
pnpm dev:force    # Force kill port 3000 and start
pnpm dev:direct   # Direct Next.js start (may use alternative port)
pnpm dev:check    # Check if port 3000 is available
pnpm port:kill    # Manually kill processes on port 3000
```

### How Port Management Works

1. **Smart Process Detection**: Automatically identifies and kills Node.js/Next.js processes using port 3000
2. **Safety Checks**: Asks for confirmation before killing non-Node processes
3. **Fallback Prevention**: Configured to fail rather than use alternative ports
4. **Clear Feedback**: Shows exactly what processes are found and what actions are taken

### Troubleshooting Port Issues

If you see `Port 3000 is in use`, the startup script will handle it automatically. For manual troubleshooting:

```bash
# Check what's using port 3000
pnpm dev:check

# Force kill all processes on port 3000
pnpm port:kill

# Or manually with system commands
lsof -ti:3000 | xargs kill -9
```

### Configuration Files

Port enforcement is configured in multiple places for maximum reliability:

- **`start-dev.sh`**: Smart startup script with process management
- **`next.config.ts`**: Next.js configuration with `strictPort` experimental feature
- **`.env.local`**: Environment variables (`PORT=3000`)
- **`package.json`**: Updated scripts that use the startup script

## Environment Variables

Create a `.env.local` file with the following configuration:

```bash
# Port Configuration (required)
PORT=3000
NEXT_PUBLIC_APP_PORT=3000

# Analytics Configuration
ZING_ANALYTICS_KEY=demo-key
NEXT_PUBLIC_ZING_ANALYTICS_KEY=demo-key

# Authentication (for production)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# Database Configuration (optional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zashboard
DB_USER=postgres
DB_PASSWORD=your-password
```

## API Endpoints

### Analytics Endpoints

- `POST /api/analytics/events` - Receive analytics events from Zing applications
- `GET /api/analytics/health` - System health check

### Dashboard Metrics

- `GET /api/dashboard/metrics/users` - User analytics and activity data
- `GET /api/dashboard/metrics/performance` - Performance benchmarks and metrics
- `GET /api/dashboard/metrics/geographic` - Geographic distribution data
- `GET /api/dashboard/metrics/versions` - Version adoption and update metrics
- `GET /api/dashboard/metrics/system` - System health and infrastructure metrics
- `GET /api/dashboard/metrics/realtime` - Real-time activity metrics

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT token)
- `GET /api/auth/profile` - Get user profile (requires authentication)

## Database Setup

Zashboard supports PostgreSQL for persistent data storage:

### Quick Database Setup

```bash
# Initialize database schema
pnpm db:init

# Test database connection
pnpm db:test
```

### Manual Database Setup

1. Create PostgreSQL database:
   ```sql
   CREATE DATABASE zashboard;
   CREATE USER zashboard_user WITH PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE zashboard TO zashboard_user;
   ```

2. Update `.env.local` with database credentials

3. Run initialization script:
   ```bash
   pnpm db:init
   ```

See [DATABASE.md](DATABASE.md) for detailed database documentation.

## Project Structure

```
zashboard/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── users/             # User analytics page
│   │   ├── performance/       # Performance metrics page
│   │   ├── geographic/        # Geographic analytics page
│   │   └── ...               # Other dashboard pages
│   ├── components/            # Reusable UI components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility libraries
│   │   ├── analytics-store.ts # In-memory analytics processing
│   │   ├── database/          # Database integration
│   │   └── auth.ts           # Authentication utilities
│   └── types/                # TypeScript type definitions
├── scripts/                  # Database and utility scripts
├── start-dev.sh             # Smart development server startup
└── package.json             # Project dependencies and scripts
```

## Development

### Available Scripts

```bash
pnpm dev          # Start development server (port 3000)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm db:init      # Initialize database
pnpm db:test      # Test database connection
```

### Adding New Analytics Events

1. Update TypeScript types in `src/types/analytics.ts`
2. Add event processing logic in `src/lib/analytics-store.ts`
3. Create or update API endpoints in `src/app/api/`
4. Update dashboard pages to display new metrics

### Code Style

- **TypeScript**: Strict typing enabled
- **ESLint**: Code linting and formatting
- **Tailwind CSS**: Utility-first styling
- **Component Architecture**: Modular, reusable components

## Deployment

### Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive production deployment instructions including:

- Database setup (PostgreSQL, AWS RDS, Supabase)
- Environment configuration
- Vercel, Railway, and custom server deployment
- Security considerations
- Monitoring and maintenance

### Quick Vercel Deployment

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic builds

## Security

- **JWT Authentication**: Secure token-based authentication
- **Environment Variables**: Sensitive data stored in environment variables
- **Input Validation**: All API inputs validated and sanitized  
- **CORS Configuration**: Properly configured cross-origin requests
- **Database Security**: Parameterized queries prevent SQL injection

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes following the coding standards
4. Test your changes: `pnpm dev` and verify functionality
5. Commit your changes: `git commit -m 'Add your feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

## Analytics Integration

### Zing Browser Integration

To integrate with Zing browser applications, send analytics events to:

```javascript
POST http://localhost:3000/api/analytics/events

// Event payload example
{
  "event": "zing_session_heartbeat",
  "user_id": "unique-user-id",
  "hardware_id": "unique-hardware-id", 
  "app_version": "1.3.5",
  "timestamp": 1234567890,
  "properties": {
    "platform": "darwin",
    "session_id": "session-123"
  }
}
```

### Event Types

- `zing_session_start` - Session started
- `zing_session_end` - Session ended  
- `zing_session_heartbeat` - Periodic session activity
- `zing_app_launch` - Application launched
- `zing_version_install_complete` - Version installation completed
- `zing_performance_metric` - Performance data point

## License

This project is licensed under the MIT License.

## Support

For questions, issues, or contributions:

1. Check existing [Issues](link-to-issues)
2. Create a new issue with detailed description
3. For security issues, email [security@yourcompany.com]

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**