# IdeaSpark Design System

## Design Philosophy

### Core Principles
- **Simplicity First**: Clean, minimal interfaces that reduce cognitive load
- **Mobile-Optimized**: Every design decision prioritizes mobile experience
- **Progressive Disclosure**: Show only what's necessary, reveal complexity gradually
- **Accessibility-First**: WCAG 2.1 AA compliance built into every component
- **Performance-Driven**: Lightweight designs that feel instant and responsive

### Visual Language
- **Modern Editorial Aesthetic**: Inspired by contemporary design publications
- **Sophisticated Color Palette**: Muted tones with surgical precision
- **Bold Typography Hierarchy**: Strong contrast between display and body text
- **Purposeful Whitespace**: Generous spacing that guides attention
- **Subtle Motion**: Micro-interactions that feel natural and meaningful

## Color System

### Primary Palette
- **Primary**: #1A1A1A (Rich Black)
- **Secondary**: #404040 (Charcoal)
- **Accent**: #D4AF37 (Gold)
- **Success**: #059669 (Emerald)
- **Warning**: #D97706 (Amber)
- **Error**: #DC2626 (Red)

### Neutral Scale
- **50**: #FAFAFA
- **100**: #F5F5F5
- **200**: #E5E5E5
- **300**: #D4D4D4
- **400**: #A3A3A3
- **500**: #737373
- **600**: #525252
- **700**: #404040
- **800**: #262626
- **900**: #171717

### Semantic Colors
- **Background**: #FFFFFF
- **Surface**: #FAFAFA
- **Text Primary**: #1A1A1A
- **Text Secondary**: #404040
- **Text Tertiary**: #737373
- **Border**: #E5E5E5
- **Focus Ring**: #D4AF37

## Typography Scale

### Display Typography
- **Display Large**: 32px / 40px line-height / Bold
- **Display Medium**: 28px / 36px line-height / Semibold
- **Display Small**: 24px / 32px line-height / Semibold

### Heading Typography
- **H1**: 24px / 32px line-height / Bold
- **H2**: 20px / 28px line-height / Semibold
- **H3**: 18px / 24px line-height / Semibold
- **H4**: 16px / 24px line-height / Medium
- **H5**: 14px / 20px line-height / Medium
- **H6**: 12px / 16px line-height / Medium

### Body Typography
- **Body Large**: 16px / 24px line-height / Regular
- **Body Medium**: 14px / 20px line-height / Regular
- **Body Small**: 12px / 16px line-height / Regular

### Label Typography
- **Label Large**: 14px / 20px line-height / Medium
- **Label Medium**: 12px / 16px line-height / Medium
- **Label Small**: 10px / 12px line-height / Medium

## Spacing System

### Base Unit: 4px
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 20px
- **2xl**: 24px
- **3xl**: 32px
- **4xl**: 48px
- **5xl**: 64px

## Component Specifications

### Button System
- **Primary Button**: Background #1A1A1A, Text #FFFFFF, 48px height
- **Secondary Button**: Background #F5F5F5, Text #1A1A1A, 48px height
- **Ghost Button**: Background transparent, Text #1A1A1A, 48px height
- **Icon Button**: 40px x 40px, centered icon

### Card System
- **Elevation**: 0-4px shadow with 0.1 opacity
- **Border Radius**: 12px
- **Padding**: 16px
- **Background**: #FFFFFF

### Input System
- **Height**: 48px
- **Border**: 1px solid #E5E5E5
- **Focus Border**: 2px solid #D4AF37
- **Border Radius**: 8px
- **Padding**: 12px 16px

### Navigation System
- **Bottom Tab Height**: 80px
- **Safe Area**: 20px top, 34px bottom
- **Icon Size**: 24px x 24px
- **Active Color**: #1A1A1A
- **Inactive Color**: #737373

## Interaction Design

### Micro-interactions
- **Button Press**: Scale 0.95, 150ms duration
- **Card Hover**: Elevation increase, 200ms duration
- **Input Focus**: Border color transition, 200ms duration
- **Loading States**: Skeleton screens with shimmer effect

### Gesture Support
- **Swipe Actions**: Left/right swipe for contextual actions
- **Pull to Refresh**: Standard iOS/Android patterns
- **Long Press**: Context menus and additional options
- **Pinch to Zoom**: Image and content scaling

### Feedback Systems
- **Haptic Feedback**: Light impact for buttons, medium for confirmations
- **Visual Feedback**: Subtle animations for state changes
- **Audio Feedback**: Optional system sounds for key actions

## Layout Principles

### Grid System
- **Container**: 16px horizontal padding
- **Columns**: Flexible grid based on content needs
- **Gutters**: 16px between major elements
- **Breakpoints**: Mobile-first responsive design

### Content Hierarchy
- **Hero Section**: Full-width with 16px padding
- **Content Blocks**: Max-width with centered alignment
- **Cards**: Horizontal scrolling when needed
- **Lists**: Full-width with dividers

### Safe Areas
- **Top**: 44px (includes status bar)
- **Bottom**: 34px (includes home indicator)
- **Horizontal**: 16px minimum padding

## Accessibility Standards

### Color Contrast
- **Normal Text**: 4.5:1 minimum ratio
- **Large Text**: 3:1 minimum ratio
- **Interactive Elements**: 3:1 minimum ratio

### Touch Targets
- **Minimum Size**: 44px x 44px
- **Spacing**: 8px minimum between targets
- **Visual Feedback**: Clear pressed states

### Screen Reader Support
- **Labels**: Descriptive text for all interactive elements
- **Hints**: Contextual help for complex interactions
- **Roles**: Proper ARIA roles for custom components

## Performance Guidelines

### Image Optimization
- **Format**: WebP with JPEG fallback
- **Sizes**: Multiple sizes for different densities
- **Loading**: Progressive loading with placeholders
- **Caching**: Aggressive caching for repeat views

### Animation Performance
- **Duration**: 150-300ms for most transitions
- **Easing**: Standard iOS/Android easing curves
- **Hardware Acceleration**: Use transform and opacity
- **Reduced Motion**: Respect user preferences

### Bundle Size
- **Code Splitting**: Lazy load non-critical components
- **Asset Optimization**: Compress images and fonts
- **Tree Shaking**: Remove unused code
- **CDN**: Serve static assets from CDN