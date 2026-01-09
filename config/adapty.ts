// Adapty Configuration
export const ADAPTY_CONFIG = {
  publicKey: 'public_live_RzrYDLBV.x15sUnwPSFPZcOhqIoGO',
  placements: {
    paywall: {
      onboarding: 'pw_onboarding',
      main: 'pw_main',
      offer: 'pw_offer',
    },
    onboarding: {
      main: 'ob_main_1',
    },
  },
  actionIds: {
    allowScreenTime: 'allowScreenTime',
    allowRateApp: 'allowRateApp',
    pwOnboarding: 'pw_onboarding',
    closeOnboarding: 'CloseOnboarding',
  },
} as const;

