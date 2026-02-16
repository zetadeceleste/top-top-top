# ⭐ Top Top Top - Family Rating App

A fun, mobile-first family voting application with animated star ratings, emoji rain effects, and real-time rankings. Built with vanilla JavaScript and Supabase.

## 🎨 Features

- **Welcome Screen**: Animated wave text with smooth transitions
- **Two-step Login**: Icon selection + password authentication
- **Star Rating System**: Interactive 1-5 star ratings with animations and touch support
- **Sound Effects**: Tone.js-powered audio feedback for each rating
- **Emoji Rain**: Celebratory 🎉 or sad 💩 emoji animations based on rating
- **Ranking Badges**: 👑 crown for 1st place, 💩 poop for last place on home screen
- **Home Screen Celebration**: Emoji rain when entering home based on your ranking position
- **Real-time Ranking**: Live leaderboard showing all family members (even with no votes)
- **Recent Votes**: Separate screen showing the last 10 votes with relative timestamps
- **Password Change Flow**: First-time login requires password change
- **Password Recovery**: Email-based password reset with Supabase Auth
- **Real-time Notifications**: Get notified instantly when someone votes for you (in-app + browser push)
- **Mobile Optimized**: Designed for iPhone 13 mini and similar devices
- **Custom Modals**: Beautiful animated confirmation dialogs

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Audio**: Tone.js
- **Styling**: Custom CSS with Pixelify Sans font
- **Hosting**: Vercel (recommended)

## 📁 Project Structure

```
ranking-top-top-top/
├── index.html          # Main HTML file
├── app.js              # Application logic
├── config.js           # Configuration (Supabase + family data)
├── style.css           # All styles
├── vercel.json         # Vercel deployment config
├── package.json        # Node dependencies for scripts
├── .env                # Environment variables (DO NOT COMMIT)
├── assets/
│   ├── icons/          # Profile icons (PNG)
│   └── avatars/        # Animated GIFs
├── migrations/
│   └── migration.sql   # Database schema
└── scripts/
    └── recreate_users.js  # Utility to reset all users
```

## 🚀 Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd ranking-top-top-top
```

### 2. Configure Supabase

Create a `config.js` file:

```javascript
export const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
}

export const FAMILY_MEMBERS = [
  { username: 'john', name: 'John', icon: 'john.png', gif: 'john.gif', email: 'john@toptoptop.local' },
  // Add all family members...
]
```

### 3. Run database migrations

Execute `migrations/migration.sql` in your Supabase SQL editor:

```sql
-- Creates profiles and votes tables
-- Sets up RLS policies
-- Creates trigger to auto-populate profiles
```

### 4. Configure Email for Password Recovery

Go to Supabase Dashboard → **Settings** → **Auth** → **Email Templates**:

1. **SMTP Settings** (optional, recommended for production):
   - Configure a custom SMTP provider (Resend, SendGrid, etc.)
   - Or use Supabase's default email service (limited)

2. **Email Templates**:
   - Customize the "Reset Password" template if needed
   - Set "Confirm Email" to disabled if using local emails

3. **Enable Realtime** (for notifications):
   - Go to **Database** → **Publications**
   - Enable Realtime for the `votes` table

### 5. Create user accounts

**Option A - Automated (Recommended):**

Create a `.env` file in the project root:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

Install dependencies and run the script:

```bash
npm install
npm run recreate-users
```

This will create all 10 users with passwords `123{username}` and `needs_password_change: true`.

**Option B - Manual:**

In Supabase Dashboard → Authentication → Users, create users with:
- Email: `username@toptoptop.local`
- Password: `123{username}` (e.g., `123celes`, `123alfredo`)
- User Metadata: `{"display_name": "Name", "needs_password_change": true}`

### 6. Add assets

Place profile images in:
- `assets/icons/` - Static PNG icons (for login/ranking)
- `assets/avatars/` - Animated GIFs (for voting screen)

### 7. Deploy or serve locally

**Deploy to Vercel:**

```bash
# Connect your GitHub repo to Vercel
# Configure custom domain (e.g., top.zetadeceleste.dev)
# Vercel auto-deploys on git push
```

**Serve locally:**

```bash
python3 -m http.server 8000
# or
npx serve
```

Visit `http://localhost:8000`

## 🎯 Usage

### First Time Login

1. **Welcome Screen**: Click "INGRESAR"
2. **Select User**: Choose your avatar
3. **Enter Password**: Use temporary password `123{username}`
4. **Change Password**: Create your new secure password
5. **Home**: View your profile with ranking badge (👑 or 💩) and celebration animation

### Voting Flow

1. **Home**: Click "VOTAR" button
2. **Select Member**: Choose who to rate
3. **Rate**: Drag or tap stars (1-5)
4. **Confirm**: See emoji animation based on rating
5. **Success**: Return to home

### Rating System

- **1 Star** 💩: Sad trombone sound + poop rain animation
- **2-4 Stars** ⭐: Simple musical beep
- **5 Stars** 🎉: Power-up melody + confetti rain animation

### Ranking Features

- **First Place**: Larger avatar, gold border, 👑 badge, crown rain on home screen
- **Last Place**: Smaller avatar, grayscale, 💩 badge, poop rain on home screen
- **Recent Votes**: Click "VER ÚLTIMOS VOTOS" to see vote history

## 📱 Design

### Color Scheme (Black Mirror: Nosedive inspired)

- Primary: `#5eb3d6` (Pastel blue)
- Background: `#e8f4f8` (Light blue)
- Accent: `#ff6b9d` (Pink)
- Success: `#a0d8b3` (Mint green)

### Typography

- Font: **Pixelify Sans** (retro adventure game style)
- All text: UPPERCASE

### Responsive

- Uses `100dvh` for proper mobile viewport
- Optimized for iPhone 13 mini
- Touch-friendly 48px minimum tap targets

## 🗄️ Database Schema

### `profiles`
```sql
- id (UUID, PK)
- email (TEXT)
- display_name (TEXT)
- created_at (TIMESTAMP)
```

### `votes`
```sql
- id (BIGINT, PK)
- voter_id (UUID, FK → profiles)
- voted_for_id (UUID, FK → profiles)
- rating (INTEGER, 1-5)
- timestamp (TIMESTAMP)
```

## 🎨 Key Features Implementation

### Emoji Rain Animation

Uses `requestAnimationFrame` for smooth 60fps animation:
- Spawns 20-50 emojis with random positions
- Falls with physics (gravity + horizontal drift)
- Auto-cleanup when off-screen
- Triggered on vote confirmation AND home screen entry (based on ranking)

### Star Rating

- SVG animations with ring explosion and fill bounce
- Touch events with drag support (touchmove detection)
- Visual and audio feedback
- Haptic feedback on mobile devices

### Ranking Display

- **First place**: Larger size (1.3rem name, 70px avatar), gold border, gradient background, 👑 badge
- **Last place**: Smaller size (0.9rem name, 40px avatar), grayscale filter, gray background, 💩 badge
- **All users shown**: Even users with 0 votes appear in ranking

### Home Screen Celebration

- Detects user's ranking position on every home screen load
- Crown rain (25 emojis) for 1st place
- Poop rain (20 emojis) for last place
- Badge shown next to username

## 🛠️ Maintenance Scripts

### Reset Database and Users

To clean the database and recreate all users:

1. Delete all data in Supabase SQL Editor:
```sql
DELETE FROM votes;
DELETE FROM profiles;
DELETE FROM auth.users WHERE email LIKE '%@toptoptop.local';
```

2. Recreate users:
```bash
npm run recreate-users
```

3. (Optional) Add initial votes for testing in SQL Editor

### Reset User Password

To manually reset a user's password:

```bash
npm run reset-password <username> <new_password>
```

Example:
```bash
npm run reset-password celes MyNewPassword123
```

This uses the Supabase Admin API to update passwords directly.

## 🌐 Deployment

**Live URL**: [https://top.zetadeceleste.dev](https://top.zetadeceleste.dev)

**Platform**: Vercel
**Custom Domain**: Configured with CNAME to `cname.vercel-dns.com`

## 📝 License

Private family project

## 👩‍💻 Created By

**Celes** - With assistance from Claude Code

🤖 Generated with [Claude Code](https://claude.com/claude-code)
