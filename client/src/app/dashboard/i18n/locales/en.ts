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
    set: 'Set',
    change: 'Change',
    linked: 'Linked',
  },

  // Navigation
  nav: {
    account: 'Account',
    security: 'Security',
    sessions: 'Sessions',
    user: 'User',
    oauth: 'OAuth',
    returnHome: 'Return to Home',
    logout: 'Log out',
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
    notSet: 'Not set',
    verified: 'Verified',
    unverified: 'Unverified',
    password: 'Password',
    passwordSet: 'Password set',
    passwordNotSet: 'No password',
    freePlan: 'Free',
    linkedAccount: 'Linked',
    setPasswordHint: 'Set a password to enable',

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

  // Docs
  docs: {
    title: 'Documentation',
    description: 'Developer guides and API references.',
    comingSoon: 'Coming Soon',
    needHelp: 'Need help?',
    oauthGuide: 'OAuth 2.0 Integration Guide',
    oauthGuideDesc: 'Complete guide to integrating with our OAuth 2.0 and OpenID Connect authentication service.',
    securityGuide: 'Security Best Practices',
    securityGuideDesc: '2FA, WebAuthn, session management',
    userApiGuide: 'User Management API',
    userApiGuideDesc: 'User CRUD, roles, batch operations',
    webhookGuide: 'Webhook Integration',
    webhookGuideDesc: 'Event notifications, callbacks',
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
    changePassword: 'Change password',
    currentPassword: 'Current password',
    currentPasswordPlaceholder: 'Enter current password',
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

  // Integration Guide
  integrationGuide: {
    // Page title
    pageTitle: 'OAuth 2.0 Integration Guide',
    pageSubtitle: 'A comprehensive guide to integrating with our OAuth 2.0 and OpenID Connect authentication service.',
    back: 'Back',

    // Navigation
    sections: {
      quickStart: 'Quick Start',
      architecture: 'Architecture',
      oidcDiscovery: 'OIDC Discovery',
      pkceFlow: 'PKCE Flow',
      apiEndpoints: 'API Endpoints',
      tokens: 'Token Details',
    },

    // Quick Start
    quickStart: {
      title: 'Quick Start',
      subtitle: 'Get your first Access Token in under 30 minutes.',
      step1Title: '1. Register Your Application',
      step1Desc: 'Register your application in the {link} dashboard to get started.',
      step1Link: 'OAuth Applications',
      step1Items: [
        'Application Name - The name users will see during authorization',
        'Redirect URI - Where users are redirected after authorization (HTTPS required)',
      ],
      securityTip: 'Security:',
      securityTipContent: 'Never expose Client Secret in frontend code. For SPAs and mobile apps, use PKCE flow.',
      step2Title: '2. Initiate Authorization',
      step2Desc: 'Redirect users to our authorization endpoint:',
      step3Title: '3. Exchange Code for Token',
      step3Desc: 'After user authorization, exchange the code for tokens:',
    },

    // Architecture
    architecture: {
      title: 'Architecture',
      subtitle: 'Our authentication system is built on a modular, layered architecture.',
      components: [
        { title: 'Authorization Server', desc: 'Handles user authentication, authorization requests, and token issuance' },
        { title: 'Token Service', desc: 'Manages Access Token and Refresh Token lifecycle' },
        { title: 'User Service', desc: 'Manages user identities and third-party account bindings' },
        { title: 'Security Service', desc: 'Provides 2FA, device fingerprinting, and session monitoring' },
      ],
    },

    // OIDC Discovery
    oidcDiscovery: {
      title: 'OIDC Discovery',
      subtitle: 'We support the OIDC Discovery specification for simplified client configuration.',
      returns: 'Returns configuration including:',
      fields: {
        issuer: 'Issuer URL',
        authorization_endpoint: 'Authorization endpoint',
        token_endpoint: 'Token endpoint',
        userinfo_endpoint: 'User info endpoint',
        jwks_uri: 'JSON Web Key Set URL',
      },
    },

    // PKCE Flow
    pkceFlow: {
      title: 'PKCE Flow',
      subtitle: 'For maximum security, we recommend using PKCE for all application types.',
      steps: [
        { title: 'Generate code_verifier', desc: 'High-entropy random string' },
        { title: 'Create code_challenge', desc: 'SHA-256 hash, then Base64Url encode' },
        { title: 'Include in authorization request', desc: 'Send code_challenge with method S256' },
        { title: 'Exchange with code_verifier', desc: 'Server verifies by hashing and comparing' },
      ],
      jsImplementation: 'JavaScript Implementation',
    },

    // API Endpoints
    apiEndpoints: {
      title: 'API Endpoints',
      authEndpoint: 'Authorization Endpoint',
      tokenEndpoint: 'Token Endpoint',
      userInfoEndpoint: 'User Info Endpoint',
      successResponse: 'Success Response',
      requiresBearer: 'Requires Bearer token in Authorization header.',
    },

    // Parameter table
    params: {
      parameter: 'Parameter',
      type: 'Type',
      description: 'Description',
      // Authorization endpoint params
      response_type: 'Must be "code"',
      client_id: 'Your application Client ID',
      redirect_uri: 'Callback URL after authorization',
      scope: 'Space-separated scopes (e.g., openid profile email)',
      state: 'Random string for CSRF protection',
      code_challenge: 'PKCE challenge code',
      code_challenge_method: 'Must be "S256"',
      // Token endpoint params
      grant_type: '"authorization_code" or "refresh_token"',
      code: 'Authorization code from callback',
      redirect_uri_token: 'Must match authorization request',
      client_id_token: 'Your Client ID',
      client_secret: 'Your Client Secret',
      code_verifier: 'Original PKCE verifier',
    },

    // Token Details
    tokens: {
      title: 'Token Details',
      format: 'Format',
      purpose: 'Purpose',
      lifecycle: 'Lifecycle',
      storage: 'Storage',
      accessToken: {
        title: 'Access Token',
        format: 'JWT (RS256)',
        purpose: 'Credential for accessing protected resources',
        lifecycle: 'Short-lived (1 hour recommended)',
        storage: 'Client memory, avoid Local Storage',
      },
      refreshToken: {
        title: 'Refresh Token',
        format: 'Opaque encrypted string',
        purpose: 'Obtain new Access Token without re-authentication',
        lifecycle: 'Long-lived (15 days), rotated on each use',
        storage: 'Server-side httpOnly, secure, sameSite=strict Cookie',
      },
      idToken: {
        title: 'ID Token',
        format: 'JWT (OIDC specification)',
        purpose: 'Verify user identity on client side',
        lifecycle: 'Same as Access Token',
        storage: 'Client memory',
      },
    },

    // Footer
    footer: {
      needHelp: 'Need help? Contact us at',
    },
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
    nameUpdated: 'Name updated',
    emailUpdated: 'Verification email sent',
  },
};