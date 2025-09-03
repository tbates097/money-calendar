# Money Calendar

A web application for planning bills, paychecks, and financial projections with automated bank data import via Plaid.

## Features

- **Bill & Paycheck Management**: Add and schedule recurring bills and paychecks
- **Multiple Import Options**: 
  - CSV upload from bank statements (free)
  - Manual entry with recurring options (free)
  - Sample data for testing (free)
- **Smart Categorization**: Automatically identifies bills vs paychecks using keyword matching
- **Financial Projections**: Project account balance up to 3 years with carry-over calculations
- **Safe-to-Save Calculator**: Determine how much you can safely save each pay period
- **Data Persistence**: All data is stored locally in your browser
- **No API Keys Required**: Completely free to use

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

The app works completely without any API keys or external services. No environment variables are required!

### 3. Development

```bash
npm run dev
```

Visit [çhttp://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy! (No environment variables needed for the free features)

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
