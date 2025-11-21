/**
 * Centralized user-facing messages and copy for the IdeaSpark app
 * All user-visible text should be defined here for consistency and easy updates
 */

export const Messages = {
  // App metadata
  APP: {
    NAME: 'IdeaSpark',
    TAGLINE: 'Transform your ideas with AI-powered insights',
    VERSION: '1.0.0',
  },

  // Authentication messages
  AUTH: {
    // Form labels
    LABELS: {
      EMAIL: 'Email address',
      PASSWORD: 'Password',
      CONFIRM_PASSWORD: 'Confirm password',
      FULL_NAME: 'Full name',
      MARKETING_CONSENT: 'I want to receive updates and marketing emails',
    },

    // Placeholders
    PLACEHOLDERS: {
      EMAIL: 'you@example.com',
      PASSWORD: 'Enter your password',
      CONFIRM_PASSWORD: 'Re-enter your password',
      NAME: 'John Doe',
    },

    // Screen titles
    TITLES: {
      LOGIN: 'Welcome back',
      SIGNUP: 'Create an account',
      FORGOT_PASSWORD: 'Reset Password',
    },

    // Screen subtitles
    SUBTITLES: {
      LOGIN: 'Sign in to continue to IdeaSpark',
      SIGNUP: 'Join IdeaSpark to start refining your ideas',
      FORGOT_PASSWORD: "Enter your email address and we'll send you instructions to reset your password.",
    },

    // Success messages
    SUCCESS: {
      LOGIN: 'Welcome back! Successfully signed in.',
      SIGNUP: 'Account created! Welcome to IdeaSpark.',
      LOGOUT: 'Signed out successfully. See you next time!',
      PASSWORD_RESET_SENT: 'Check your email for reset instructions.',
      PASSWORD_CHANGED: 'Your password has been successfully updated.',
      PROFILE_UPDATED: 'Your profile has been updated.',
    },

    // Error messages
    ERRORS: {
      INVALID_EMAIL: 'Please enter a valid email address',
      PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
      PASSWORDS_DONT_MATCH: 'Passwords do not match',
      NAME_REQUIRED: 'Name is required',
      INVALID_CREDENTIALS: 'Invalid email or password',
      SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
      NETWORK_ERROR: 'Connection error. Please check your internet and try again.',
      GENERIC: 'Authentication failed. Please try again.',
    },

    // Action buttons
    BUTTONS: {
      SIGN_IN: 'Sign In',
      SIGN_UP: 'Sign Up',
      SIGN_OUT: 'Sign Out',
      FORGOT_PASSWORD: 'Forgot your password?',
      RESET_PASSWORD: 'Send Reset Instructions',
      BACK_TO_LOGIN: 'Back to login',
      DONT_HAVE_ACCOUNT: "Don't have an account?",
      ALREADY_HAVE_ACCOUNT: 'Already have an account?',
    },
  },

  // Idea-related messages
  IDEAS: {
    // Form labels
    LABELS: {
      TITLE: 'Idea Title',
      DESCRIPTION: 'Description',
      CATEGORY: 'Category',
    },

    // Placeholders
    PLACEHOLDERS: {
      TITLE: 'Give your idea a catchy title...',
      DESCRIPTION: 'Describe your idea in detail... What problem does it solve? Who is it for?',
      MESSAGE: 'Type your message...',
      MESSAGE_DISABLED_QUOTA: 'Upgrade to Pro to continue chatting...',
    },

    // Categories
    CATEGORIES: {
      BUSINESS: { label: 'Business', icon: '💼' },
      TECHNOLOGY: { label: 'Technology', icon: '💻' },
      HEALTH: { label: 'Health', icon: '🏥' },
      EDUCATION: { label: 'Education', icon: '📚' },
      ENTERTAINMENT: { label: 'Entertainment', icon: '🎮' },
      OTHER: { label: 'Other', icon: '🔮' },
    },

    // Screen titles
    TITLES: {
      CREATE: 'Start Your Idea Journey',
      CHAT: 'Refine Your Idea',
      LIST: 'Your Ideas',
      EMPTY: 'No Ideas Yet',
    },

    // Screen subtitles
    SUBTITLES: {
      CREATE: 'Tell us about your concept and get AI-powered suggestions to improve it',
      EMPTY: 'Start brainstorming and bring your ideas to life!',
    },

    // Success messages
    SUCCESS: {
      CREATED: 'Idea created! Start chatting to refine it.',
      UPDATED: 'Your idea has been updated.',
      DELETED: 'Your idea has been deleted.',
      MESSAGE_SENT: 'Message sent',
    },

    // Error messages
    ERRORS: {
      TITLE_REQUIRED: 'Please enter a title for your idea',
      DESCRIPTION_REQUIRED: 'Please describe your idea',
      DESCRIPTION_TOO_SHORT: 'Please provide more detail about your idea (at least 10 characters)',
      CREATE_FAILED: 'Failed to create idea. Please try again.',
      LOAD_FAILED: 'Failed to load ideas. Please try again.',
      MESSAGE_FAILED: 'Failed to send message. Please try again.',
      NOT_FOUND: 'Idea not found',
    },

    // Action buttons
    BUTTONS: {
      CREATE: 'Refine My Idea with AI',
      SEND_MESSAGE: 'Send',
      VIEW_ALL: 'View All Ideas',
      CREATE_NEW: 'Create New Idea',
      GO_BACK: 'Go Back',
    },

    // Status labels
    STATUS: {
      ACTIVE: 'Active',
      PAUSED: 'Paused',
      COMPLETED: 'Completed',
    },
  },

  // Subscription/Quota messages
  SUBSCRIPTION: {
    // Plan names
    PLANS: {
      FREE: 'Free',
      PRO: 'Pro',
    },

    // Quota messages
    QUOTA: {
      IDEAS_REMAINING: (count: number) => `${count} idea${count !== 1 ? 's' : ''} remaining`,
      MESSAGES_REMAINING: (count: number) => `${count} AI ${count !== 1 ? 'replies' : 'reply'} remaining`,
      UNLIMITED: 'Unlimited',
      QUOTA_EXCEEDED: "You've reached your usage limit.",
      UPGRADE_PROMPT: 'Upgrade to Pro for unlimited access!',
      LOW_QUOTA_WARNING: 'You have limited messages remaining',
      LAST_MESSAGE_WARNING: 'This is your last free reply. Make it count!',
      NO_MESSAGES_LEFT: "You've used all your free replies. Upgrade to continue!",
    },

    // Upgrade screen
    UPGRADE: {
      TITLE: 'Upgrade to Pro',
      SUBTITLE: 'Unlock unlimited AI conversations and premium features',
      FEATURES: {
        UNLIMITED_IDEAS: 'Unlimited idea sessions',
        UNLIMITED_MESSAGES: 'Unlimited AI conversations',
        PRIORITY_SUPPORT: 'Priority support',
        ADVANCED_AI: 'Advanced AI models',
        EXPORT_FEATURES: 'Export your ideas',
        NO_ADS: 'Ad-free experience',
      },
      PRICING: {
        MONTHLY: '$9.99/month',
        YEARLY: '$99.99/year (Save 17%)',
      },
      BUTTONS: {
        UPGRADE_NOW: 'Upgrade Now',
        MAYBE_LATER: 'Maybe Later',
        RESTORE_PURCHASE: 'Restore Purchase',
      },
    },
  },

  // Profile/Settings messages
  PROFILE: {
    // Screen title
    TITLE: 'Profile',

    // Sections
    SECTIONS: {
      ACCOUNT: 'Account',
      PREFERENCES: 'Preferences',
      USAGE: 'Usage Statistics',
      DANGER: 'Danger Zone',
    },

    // Labels
    LABELS: {
      NAME: 'Name',
      EMAIL: 'Email',
      MEMBER_SINCE: 'Member Since',
      SUBSCRIPTION: 'Subscription',
      CURRENT_PASSWORD: 'Current Password',
      NEW_PASSWORD: 'New Password',
      CONFIRM_NEW_PASSWORD: 'Confirm New Password',
      NOTIFICATIONS: 'Push Notifications',
      DARK_MODE: 'Dark Mode',
      MARKETING_EMAILS: 'Marketing Emails',
    },

    // Stats
    STATS: {
      TOTAL_IDEAS: 'Total Ideas',
      TOTAL_MESSAGES: 'Total Messages',
      THIS_MONTH: 'This Month',
    },

    // Success messages
    SUCCESS: {
      PROFILE_UPDATED: 'Profile updated successfully',
      PASSWORD_CHANGED: 'Password changed successfully',
      PREFERENCES_SAVED: 'Preferences saved',
    },

    // Error messages
    ERRORS: {
      UPDATE_FAILED: 'Failed to update profile. Please try again.',
      PASSWORD_CHANGE_FAILED: 'Failed to change password. Please try again.',
      CURRENT_PASSWORD_WRONG: 'Current password is incorrect',
    },

    // Action buttons
    BUTTONS: {
      EDIT_PROFILE: 'Edit Profile',
      CHANGE_PASSWORD: 'Change Password',
      SAVE_CHANGES: 'Save Changes',
      CANCEL: 'Cancel',
      DELETE_ACCOUNT: 'Delete Account',
      SIGN_OUT: 'Sign Out',
    },

    // Confirmation dialogs
    CONFIRM: {
      DELETE_ACCOUNT: {
        TITLE: 'Delete Account',
        MESSAGE: 'Are you sure you want to delete your account? This action cannot be undone.',
        CONFIRM: 'Delete',
        CANCEL: 'Cancel',
      },
      SIGN_OUT: {
        TITLE: 'Sign Out',
        MESSAGE: 'Are you sure you want to sign out?',
        CONFIRM: 'Sign Out',
        CANCEL: 'Cancel',
      },
    },
  },

  // Common/Generic messages
  COMMON: {
    // Loading states
    LOADING: {
      DEFAULT: 'Loading...',
      IDEAS: 'Loading your ideas...',
      MESSAGES: 'Loading conversation...',
      PROFILE: 'Loading profile...',
      SAVING: 'Saving...',
      SENDING: 'Sending...',
      DELETING: 'Deleting...',
    },

    // Empty states
    EMPTY: {
      DEFAULT: 'No data available',
      IDEAS: "You haven't created any ideas yet",
      MESSAGES: 'Start a conversation to refine your idea',
      SEARCH: 'No results found',
    },

    // Error states
    ERRORS: {
      GENERIC: 'Something went wrong. Please try again.',
      NETWORK: 'Connection error. Please check your internet.',
      SERVER: 'Server error. Please try again later.',
      NOT_FOUND: 'Not found',
      UNAUTHORIZED: 'You are not authorized to perform this action.',
      VALIDATION: 'Please check your input and try again.',
    },

    // Action buttons
    BUTTONS: {
      OK: 'OK',
      CANCEL: 'Cancel',
      SAVE: 'Save',
      DELETE: 'Delete',
      EDIT: 'Edit',
      CLOSE: 'Close',
      RETRY: 'Try Again',
      REFRESH: 'Refresh',
      BACK: 'Back',
      NEXT: 'Next',
      DONE: 'Done',
      CONTINUE: 'Continue',
    },

    // Time
    TIME: {
      JUST_NOW: 'Just now',
      MINUTES_AGO: (n: number) => `${n}m ago`,
      HOURS_AGO: (n: number) => `${n}h ago`,
      DAYS_AGO: (n: number) => `${n}d ago`,
      WEEKS_AGO: (n: number) => `${n}w ago`,
    },
  },

  // Onboarding messages
  ONBOARDING: {
    WELCOME: {
      TITLE: 'Welcome to IdeaSpark',
      SUBTITLE: 'Transform your ideas with AI-powered insights',
    },
    FEATURES: [
      {
        TITLE: 'Share Your Ideas',
        DESCRIPTION: 'Describe your concept and get instant AI feedback',
      },
      {
        TITLE: 'Refine with AI',
        DESCRIPTION: 'Have conversations with AI to improve and expand your ideas',
      },
      {
        TITLE: 'Track Progress',
        DESCRIPTION: 'Keep all your ideas organized and see them evolve over time',
      },
    ],
    BUTTONS: {
      GET_STARTED: 'Get Started',
      SKIP: 'Skip',
    },
  },

  // Feedback messages
  FEEDBACK: {
    TITLE: 'Send Feedback',
    PLACEHOLDER: 'Tell us what you think...',
    SUCCESS: 'Thank you for your feedback!',
    ERROR: 'Failed to send feedback. Please try again.',
    BUTTONS: {
      SEND: 'Send Feedback',
    },
  },

  // Help/Support messages
  HELP: {
    TITLE: 'Help & Support',
    SECTIONS: {
      FAQ: 'Frequently Asked Questions',
      CONTACT: 'Contact Support',
      DOCS: 'Documentation',
    },
    CONTACT: {
      EMAIL: 'support@ideaspark.ai',
      RESPONSE_TIME: 'We typically respond within 24 hours',
    },
  },

  // Legal messages
  LEGAL: {
    TERMS: 'Terms of Service',
    PRIVACY: 'Privacy Policy',
    COPYRIGHT: '© 2024 IdeaSpark. All rights reserved.',
  },
};