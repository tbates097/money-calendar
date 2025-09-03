# Money Calendar

A web application for planning bills, paychecks, and financial projections with **multi-device sync** and **SimpleFIN banking integration**.

## Features

### 🔐 **Multi-Device Sync**
- **User Accounts**: Create an account to sync data across all your devices
- **Automatic Backup**: Never lose your financial data again
- **Guest Mode**: Try the app without an account (localStorage only)
- **Secure Authentication**: Email/password with encrypted data storage

### 💳 **Banking Integration**
- **SimpleFIN Integration**: Connect your bank accounts securely
- **Real-time Data**: Import transactions automatically
- **Persistent Connections**: Bank connections sync across devices
- **Transaction Filtering**: Smart filtering prevents duplicate imports

### 📊 **Financial Planning**
- **Bill & Paycheck Management**: Add and schedule recurring transactions
- **Multiple Import Options**: 
  - SimpleFIN bank integration (recommended)
  - CSV upload from bank statements
  - Manual entry with recurring options
- **Smart Categorization**: Automatically identifies bills vs paychecks
- **Financial Projections**: Project account balance up to 3 years
- **Safe-to-Save Calculator**: Determine how much you can safely save each pay period

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

For local development with authentication:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values:
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Guest Mode**: The app works without authentication - just visit the site and click "Continue as Guest"

### 3. Development

```bash
npm run dev
```

Visit [çhttp://localhost:3000](http://localhost:3000)

### 4. Initialize Database (for authentication)

```bash
# Generate Prisma client
npx prisma generate

# Create and migrate database
npx prisma db push
```

### 5. Deploy to Vercel

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions with authentication and database setup.

## Vercel GitHub Auto-Deploy Setup

1. **Connect Repository**: In Vercel dashboard, click "New Project" and select your GitHub repo
2. **Configure Build**: 
   - Framework Preset: Next.js
   - Root Directory: `/` (leave blank)
   - Build Command: `npm run build`
   - Output Directory: `.next`
3. **Deploy**: Vercel will automatically deploy on every push to `main` branch

## How It Works

### Transaction Import
- **CSV Upload**: Export bank statements as CSV and upload them
- **Manual Entry**: Add bills and paychecks manually with recurring options
- **Sample Data**: Try the app with sample data instantly
- Automatically categorize transactions as bills or paychecks
- Import selected transactions into your calendar

### Projection Algorithm
1. **Period Calculation**: Divides time into pay periods
2. **Income Tracking**: Sums all paychecks in each period
3. **Bill Management**: Deducts bills from available funds
4. **Carry-Over Logic**: Maintains buffer for future shortages
5. **Safe-to-Save**: Calculates remaining funds after all obligations

### Keyword Matching
The app uses intelligent keyword matching to categorize transactions:

**Bills**: electric, power, energy, utility, water, gas, internet, wifi, phone, mobile, cable, tv, rent, mortgage, insurance, car, auto, loan, credit card, netflix, spotify, amazon prime, gym, membership, subscription, tax, fees, service charge

**Paychecks**: payroll, salary, direct deposit, paycheck, wages, income, deposit, transfer in, credit

## API Routes

The app uses client-side processing for all data import. No server-side API routes are required for the core functionality.

## Data Structure

```typescript
interface Bill {
  id: string;
  name: string;
  amount: number;
  date: string;
  recurring: boolean;
  schedule: ScheduleConfig | null;
}

interface Paycheck {
  id: string;
  name: string;
  amount: number;
  date: string;
  recurring: boolean;
  schedule: ScheduleConfig | null;
}
```

## Security

- All data is stored locally in your browser
- No sensitive data is sent to external servers
- CSV files are processed locally and not uploaded
- No bank credentials or API keys required for free features

## Bank Integration

For information about legal bank integration options and why automated scraping isn't recommended, see our [Bank Integration Guide](docs/bank-integration-guide.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT
