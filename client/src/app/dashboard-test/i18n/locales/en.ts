/**
 * English Language Pack
 */

import type { Locale } from './zh';

export const en: Locale = {
  // Common
  common: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    create: 'Create',
    add: 'Add',
    enable: 'Enable',
    disable: 'Disable',
    connect: 'Connect',
    upgrade: 'Upgrade',
    processing: 'Processing...',
    saving: 'Saving...',
    loading: 'Loading...',
    copy: 'Copy',
    copied: 'Copied',
    setup: 'Set up',
    manage: 'Manage',
    remove: 'Remove',
  },

  // Navigation
  nav: {
    account: 'Account',
    security: 'Security',
    sessions: 'Sessions',
    user: 'User',
    oauth: 'OAuth',
    returnHome: 'Return to Home',
  },

  // Welcome
  welcome: {
    greeting: 'Welcome, {name}.',
    subtitle: 'Manage your account.',
  },

  // Account Page
  account: {
    title: 'Your account',
    description: 'Manage your account information.',
    fullName: 'Full name',
    email: 'Email',
    subscription: 'Subscription',
    manageSubscription: 'Manage your subscription',
    accountCreated: 'Account created',
    editName: 'Edit name',
    updateEmail: 'Update email',
    manage: 'Manage',
    language: 'Language',
    languageDescription: 'Choose your preferred language',

    // Sign-in methods
    signInMethods: 'Sign-in methods',
    signInMethodsDesc: 'Manage your ways of logging into your account.',
    emailPassword: 'Email and password',
    emailPasswordDesc: 'Enable login with email',
    connectAccount: 'Connect your {provider} account',
  },

  // Security Page
  security: {
    title: 'Account security',
    description: 'Manage your account security below.',
    addMfaDevice: 'Add MFA device',
    addMfaDesc: 'Choose between an authenticator app or biometric authentication using your device\'s built-in security.',
    authenticatorApp: 'Authenticator app',
    biometricAuth: 'Biometric authentication',

    // Password
    loginWithPassword: 'Login with password',
    loginWithPasswordDesc: 'Manage the password for your account.',
    setPassword: 'Set password',

    // MFA
    mfa: 'Multi-factor authentication',
    mfaDesc: 'Add an extra layer of security using authenticator apps or biometric authentication.',
    setupMfa: 'Set up MFA',

    // MFA device types
    deviceTypeApp: 'Authenticator app',
    deviceTypeBiometric: 'Biometric',
    deviceType: 'Type',
    addedOn: 'Added on',
    recoveryCodes: 'Recovery codes',
    recoveryCodesDesc: 'You need to have at least one multi-factor method enabled to generate recovery codes.',
    recoveryCodesExist: 'You have generated recovery codes. Regenerating will invalidate the old ones.',
    recoveryCodesGenerate: 'Generate recovery codes to restore account access when MFA devices are unavailable.',
    recoveryCodesHint: 'Save these recovery codes in a safe place. Each code can only be used once and will not be shown again after closing this window.',
    generateCodes: 'Generate codes',
    regenerateCodes: 'Regenerate',
    regenerateWarning: 'Regenerating recovery codes will invalidate all existing codes. Are you sure you want to continue?',
    mfaSetupComplete: 'Setup complete',
    authenticatorEnabled: 'Authenticator app enabled',
    biometricEnabled: 'Biometric authentication enabled',

    // Authenticator app
    scanQrCode: 'Scan with your authenticator app',
    qrCodeHint: 'Google Authenticator, Microsoft Authenticator, or any TOTP-compatible app',
    enterCode: 'Enter the 6-digit code',
    verifyAndEnable: 'Verify and enable',

    // Biometric
    addBiometric: 'Add biometric device',
    setupBiometric: 'Set up biometric authentication',
    biometricDesc: 'Use your device\'s built-in biometric authentication for secure sign-in',

    deviceName: 'Device name',
    deviceNamePlaceholder: 'e.g., iPhone 15, MacBook Pro',
    deviceNameHint: 'Choose a name to help you identify this device',
    startBiometricSetup: 'Start biometric setup',
  },

  // Sessions Page
  sessions: {
    title: 'Your sessions',
    description: 'Manage your active sessions below.',
    currentSession: 'Current session',
    activeSessions: 'Active sessions',
    location: 'Location',
    createdOn: 'Created on',
    expiresOn: 'Expires on',
    ipAddress: 'IP Address',
    timezone: 'Timezone',
    signOutAll: 'Sign out of all devices',
  },

  // User Management Page
  users: {
    title: 'User management',
    description: 'Manage system users and permissions.',
    systemUsers: 'System users',
    systemUsersDesc: 'View and manage all system users',
    addUser: 'Add user',
    searchUsers: 'Search users',
    email: 'Email',
    name: 'Name',
    role: 'Role',
    status: 'Status',
    created: 'Created',
    emailVerified: 'Email verified',
    twoFactorEnabled: '2FA enabled',
    biometricEnabled: 'Biometric enabled',
    providers: 'Providers',

    // Roles
    roles: {
      user: 'User',
      admin: 'Admin',
      super_admin: 'Super Admin',
    },
  },

  // OAuth Page
  oauth: {
    title: 'OAuth applications',
    description: 'Secure authorization framework for third-party integrations.',
    applications: 'Applications',
    applicationsDesc: 'Manage your OAuth applications and credentials',
    searchApps: 'Search applications',
    application: 'Application',
    clientId: 'Client ID',
    clientSecret: 'Client Secret',
    usage: 'Usage',
    authorizations: 'Authorizations',
    viewGuide: 'View integration guide',

    // Create app
    createApp: 'Create OAuth application',
    createAppDesc: 'Set up a new OAuth 2.0 application for your integration.',
    appName: 'Application name',
    appNamePlaceholder: 'My Application',
    appNameHint: 'A recognizable name for your application',
    descriptionOptional: 'Description (optional)',
    descriptionPlaceholder: 'What does this application do?',
    descriptionHint: 'Brief description of your application\'s purpose',
    redirectUris: 'Redirect URIs',
    redirectUrisPlaceholder: 'https://example.com/callback',
    redirectUrisHint: 'One URI per line. Users will be redirected here after authorization.',

    // Permissions
    permissions: 'Permissions',
    permissionsDesc: 'Choose what information your application can access',
    requiredScope: 'Required',
    scopes: {
      openid: 'OpenID Connect',
      openidDesc: 'Basic identity authentication',
      profile: 'Profile',
      profileDesc: 'Username, avatar',
      email: 'Email address',
      emailDesc: 'User\'s email address',
      phone: 'Phone number',
      phoneDesc: 'User\'s phone number',
      address: 'Address',
      addressDesc: 'User\'s address information',
      offline_access: 'Offline access',
      offline_accessDesc: 'Issue Refresh Token',
    },

    // Create success
    appCreated: 'Application created',
    saveCredentials: 'Save your credentials securely. The client secret won\'t be shown again.',
    documentation: 'Documentation',
    integrationGuide: 'Integration guide',
    apiReference: 'API reference',
    codeExamples: 'Code examples',
    backToApps: 'Back to applications',
    createApplication: 'Create application',
  },

  // Modals
  modals: {
    // Edit name
    editName: 'Edit name',
    fullNameLabel: 'Full name',
    fullNamePlaceholder: 'Enter your full name',

    // Update email
    updateEmail: 'Update email',
    emailLabel: 'Email address',
    emailPlaceholder: 'Enter your email',
    emailVerificationHint: 'We\'ll send a verification link to your new email address.',

    // Subscription
    subscription: 'Subscription',
    free: 'Free',
    forever: 'forever',
    since: 'Since',
    active: 'Active',
    noPlansAvailable: 'No plans available at the moment',

    // Set password
    setPassword: 'Set password',
    newPassword: 'New password',
    newPasswordPlaceholder: 'Enter new password',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: 'Confirm new password',
    updatePassword: 'Update password',

    // Sign out all
    signOutAllTitle: 'Sign out of all devices?',
    signOutAllDesc: 'This will sign you out of all devices except this one. You\'ll need to sign in again on those devices.',
    signOutAll: 'Sign out all',

    // Disable method
    disableMethodTitle: 'Disable {method}?',
    disableMethodDesc: 'You won\'t be able to sign in using this method until you enable it again.',

    // Connect method
    connectMethodTitle: 'Connect {method}?',
    connectMethodDesc: 'You\'ll be redirected to {method} to authorize the connection.',

    // User detail
    username: 'Username',
    usernamePlaceholder: 'Enter username',
    password: 'Password',
    passwordPlaceholder: 'Enter password',

    // OAuth settings
    editApplication: 'Edit application',
    optionalDescription: 'Optional description',
  },

  // Toast messages
  toast: {
    disabled: '{method} disabled',
    disabling: 'Disabling...',
    connected: '{method} connected',
    connecting: 'Connecting...',
    passwordUpdated: 'Password updated',
    updatingPassword: 'Updating password...',
    signedOutAll: 'Signed out of all devices',
    signingOut: 'Signing out...',
    userUpdated: 'User updated',
    userAdded: 'User added',
    addingUser: 'Adding user...',
    appUpdated: 'Application updated',
  },
};