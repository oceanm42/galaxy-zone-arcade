# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sal's Galaxy Zone Arcade** - A complete web-based arcade site hosting 15 classic games recreated through AI collaboration. The site features the story of Sal "Pixel" Martinez, a retired arcade owner who used AI to rebuild his legendary arcade online.

### Core Features
- **Main Arcade** - Landing page showcasing all 15 games with SVG cover art and neon styling
- **Individual Games** - Each game in its own folder with complete HTML5 Canvas implementation  
- **Story Integration** - "How This Was Done" main story page featuring Sal Martinez's journey
- **Individual Game Stories** - Each game has its own "How I Did It" story page
- **Complete Navigation System** - Smart back buttons, ESC key support, cross-linking between all pages
- **Retro Aesthetic** - Classic arcade styling with neon colors, scanlines, and authentic typography
- **Interactive Elements** - Coin insertion animation, hover effects, and audio feedback

## Architecture

### Complete Site Structure
- **Main Arcade Page** (`index.html`) - Game gallery with SVG covers, coin insertion, and story access
- **Main Story Page** (`how-it-was-done.html`) - Sal's complete journey with clickable game list  
- **Individual Games** - Each game folder contains:
  - `index.html` - Game page with Canvas, UI, and navigation to story
  - `game.js` - Complete game implementation with authentic mechanics
  - `how-i-did-it.html` - Individual story page for that specific game
- **Navigation System** - Smart back buttons using `window.history.back()` with fallbacks
- **Interactive Elements** - Coin insertion animation, story buttons, ESC key support

### Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Game Engine**: HTML5 Canvas API with requestAnimationFrame
- **Styling**: CSS Variables for neon theme, Press Start 2P font
- **Audio**: Web Audio API for retro sound synthesis
- **Storage**: localStorage for high scores and game state
- **Navigation**: History API for smart back navigation
- **Graphics**: SVG cover art with CSS animations

## Development Guidelines

### When Creating New Games
1. Each game should be a standalone HTML file with embedded or linked JavaScript
2. Use HTML5 Canvas for game rendering
3. Maintain consistent retro/arcade aesthetic across all games
4. Ensure games are responsive and playable on different screen sizes
5. Add game cover images for the landing page gallery

### File Organization (Suggested)
```
/
├── index.html           # Landing page with game gallery
├── css/
│   └── styles.css      # Main stylesheet with arcade theme
├── js/
│   └── main.js         # Landing page functionality
├── games/
│   ├── game1/
│   │   ├── index.html
│   │   └── game.js
│   └── game2/
│       ├── index.html
│       └── game.js
└── assets/
    └── covers/         # Game cover images for gallery
```

## Game List

The AI Arcade features 15 classic arcade game recreations:

1. **Pac-Chase** - Inspired by Pac-Man (1980) - Navigate mazes, collect pellets, avoid ghosts
2. **Space Defenders** - Inspired by Space Invaders (1978) - Shoot descending alien waves
3. **Asteroid Blaster** - Inspired by Asteroids (1979) - Pilot ship, destroy asteroids
4. **Barrel Jump** - Inspired by Donkey Kong (1981) - Platform climbing, avoid barrels
5. **Road Hopper** - Inspired by Frogger (1981) - Cross roads and rivers safely
6. **Galaxy Raiders** - Inspired by Galaga (1981) - Fixed shooter with swooping aliens
7. **Brick Breaker** - Inspired by Breakout/Arkanoid (1976/1986) - Paddle and ball brick destruction
8. **Retro Tennis** - Inspired by Pong (1972) - Classic 2D paddle tennis
9. **Bug Shooter** - Inspired by Centipede (1980) - Shoot centipede through mushroom field
10. **City Defense** - Inspired by Missile Command (1980) - Defend cities from missiles
11. **Tunnel Hero** - Inspired by Dig Dug (1982) - Tunnel underground, defeat enemies
12. **Cube Hopper** - Inspired by Q*bert (1982) - Hop on cubes to change colors
13. **Knight Flyer** - Inspired by Joust (1982) - Flying ostrich knight combat
14. **Star Guardian** - Inspired by Defender (1981) - Side-scrolling space rescue
15. **Neon Cycles** - Inspired by Tron (1982) - Light cycle grid battles

## Complete File Organization
```
/
├── index.html                    # Main arcade with game gallery
├── how-it-was-done.html         # Sal's complete story with clickable games
├── CLAUDE.md                    # This documentation file
├── css/
│   └── styles.css              # Complete styling with neon theme & navigation
├── js/
│   └── main.js                 # Coin insertion, hover effects, audio
├── assets/
│   └── covers/                 # SVG game cover art (15 games)
└── games/
    ├── pac-chase/
    │   ├── index.html          # Game page with navigation
    │   ├── game.js             # Complete game implementation
    │   └── how-i-did-it.html   # Individual game story
    ├── space-defenders/
    │   ├── index.html
    │   ├── game.js
    │   └── how-i-did-it.html
    ├── [13 more games following same pattern]
    └── neon-cycles/
        ├── index.html
        ├── game.js
        └── how-i-did-it.html
```

## Game Development Standards

### Core Game Structure
Each game should follow this pattern:
```javascript
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = 'menu'; // menu, playing, paused, gameover
        this.score = 0;
        this.highScore = localStorage.getItem('gameName_highScore') || 0;
    }
    
    init() { /* Initialize game objects */ }
    update(deltaTime) { /* Update game logic */ }
    render() { /* Draw game state */ }
    handleInput(key, isPressed) { /* Process input */ }
}
```

### Visual Standards
- **Canvas**: 800x600 (responsive scaling)
- **Color Palette**: CSS Variables
  - `--neon-cyan: #00FFFF`
  - `--neon-magenta: #FF00FF` 
  - `--neon-yellow: #FFFF00`
  - `--neon-lime: #00FF00`
  - `--dark-bg: #0a0a0a`
  - `--dark-card: #1a1a1a`
- **Background**: Dark with subtle horizontal scanlines effect
- **Typography**: "Press Start 2P" font for authentic arcade feel
- **Effects**: Glow shadows, neon borders, hover animations

### Audio Implementation
- Use Web Audio API for retro sound synthesis
- Sound effects: beeps, boops, explosions, power-ups
- Keep sounds short and punchy (8-bit style)

### Controls
- **Keyboard**: Arrow keys for movement, Space for action, ESC for navigation
- **Touch**: Virtual D-pad and action buttons for mobile (where implemented)
- **Mouse**: Game-specific controls, navigation buttons, coin insertion

## Story System & Navigation

### Character: Sal "Pixel" Martinez
- **Role**: Retired arcade owner who rebuilt his arcade using AI
- **Backstory**: Ran "Galaxy Zone" arcade from 1982, now uses AI to recreate classic games
- **Voice**: Nostalgic, knowledgeable, enthusiastic about both classic games and modern AI

### Story Structure
- **Main Story** (`how-it-was-done.html`): Complete journey with clickable game list
- **Individual Stories** (`games/*/how-i-did-it.html`): Each game's recreation story
- **Common Elements**: Sal's quotes, technical challenges, breakthrough moments

### Navigation System
- **Smart Back Buttons**: Use `window.history.back()` with fallback to appropriate page
- **ESC Key Support**: Universal back navigation on all pages  
- **Cross-Linking**: Games ↔ Stories ↔ Main pages all interconnected
- **Story Navigation**: From main story → individual stories → back to main story

### Navigation Implementation
```javascript
function goBack() {
    if (document.referrer && document.referrer.includes(window.location.hostname)) {
        window.history.back(); // Smart back to calling page
    } else {
        window.location.href = '../../index.html'; // Fallback
    }
}
```

## Current Status: Complete Implementation ✅

**Sal's Galaxy Zone Arcade** is now a fully realized retro arcade experience featuring:

### ✅ Complete Features
- **15 Fully Playable Games** - Each with authentic mechanics recreating classic arcade favorites
- **Complete Story Integration** - Sal Martinez's journey with individual game development stories  
- **Smart Navigation System** - Seamless flow between all pages with history-aware back buttons
- **Retro Aesthetic** - Full neon styling with scanlines, glows, and authentic typography
- **Interactive Elements** - Coin insertion, hover effects, audio feedback, ASCII art portrait
- **Cross-Platform** - Responsive design works on desktop and mobile
- **Persistent Data** - High scores saved via localStorage

### 🎮 All Games Implemented
Every game recreates authentic arcade mechanics from the original classics:
- Grid-based movement (Pac-Man, Frogger, Q*bert)
- Physics-based gameplay (Asteroids, Breakout) 
- Formation flying AI (Galaga)
- Strategic gameplay (Missile Command, Centipede)
- Platform mechanics (Donkey Kong, Joust)

### 📖 Complete Story System
- **Main Story**: Sal's complete journey rebuilding Galaxy Zone with AI
- **15 Individual Stories**: Each game's specific development challenges and breakthroughs
- **Character Development**: Sal "Pixel" Martinez with ASCII art portrait and authentic voice
- **Navigation Integration**: All stories cross-link with games and main pages

### 🎨 Professional Presentation  
- **Visual Hierarchy**: Clear information architecture across all pages
- **Consistent Theming**: Neon colors, retro fonts, authentic arcade aesthetic
- **Smooth Interactions**: Hover effects, transitions, audio feedback
- **Accessibility**: ESC key navigation, clear visual feedback, responsive design

The project represents a complete, professional-quality arcade site that successfully bridges nostalgic gaming with modern AI collaboration through compelling storytelling and authentic game recreation.