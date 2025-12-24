# ⭐ Top Top Top - Family Rating App

A fun, mobile-first family voting application with animated star ratings, emoji rain effects, and real-time rankings. Built with vanilla JavaScript and Supabase.

## 🎨 Features

- **Icon-based Authentication**: Simple login with avatar selection
- **Star Rating System**: Interactive 1-5 star ratings with animations
- **Sound Effects**: Tone.js-powered audio feedback for each rating
- **Emoji Rain**: Celebratory 🎉 or sad 💩 emoji animations based on rating
- **Real-time Ranking**: Live leaderboard with all family members
- **Recent Votes**: Timeline of the last 10 votes with relative timestamps
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
├── assets/
│   ├── icons/          # Profile icons (PNG)
│   └── avatars/        # Animated GIFs
└── migrations/
    └── migration.sql   # Database schema
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

### 4. Create user accounts

In Supabase Auth, create users with:
- Email: `username@toptoptop.local`
- Password: (choose secure passwords)

### 5. Add assets

Place profile images in:
- `assets/icons/` - Static PNG icons (for login/ranking)
- `assets/avatars/` - Animated GIFs (for voting screen)

### 6. Serve locally

```bash
python3 -m http.server 8000
# or
npx serve
```

Visit `http://localhost:8000`

## 🎯 Usage

### Voting Flow

1. **Welcome Screen**: Click "INGRESAR"
2. **Select User**: Choose your avatar
3. **Enter Password**: Authenticate
4. **Home**: View your profile, select "VOTAR" or "RANKING"
5. **Vote**: Select family member, rate 1-5 stars
6. **Confirm**: See emoji animation and success message

### Rating System

- **1 Star** 💩: Sad trombone sound + poop rain
- **2-4 Stars** ⭐: Simple beep sound
- **5 Stars** 🎉: Power-up melody + confetti rain

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
- Spawns 30-40 emojis with random positions
- Falls with physics (gravity + horizontal drift)
- Auto-cleanup when off-screen

### Star Rating

- SVG animations with ring explosion and fill bounce
- Touch events with drag support
- Visual and audio feedback

### Ranking Display

- First place: Larger size, gold border, highlighted background
- Last place: Smaller size, grayscale, 💩 badge

## 📝 License

Private family project

## 🤝 Contributing

This is a private family application. For bug fixes or features, contact the repository owner.
