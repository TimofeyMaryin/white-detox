import { NativeModules, Platform } from 'react-native';

interface AppsFlyerModuleInterface {
  initSdk(devKey: string, appId: string, options?: any): Promise<void>;
  logEvent(eventName: string, eventValues?: Record<string, any>): Promise<void>;
  setUserId(userId: string): Promise<void>;
  setUserEmails(emails: string[], cryptMethod?: number): Promise<void>;
  setAdditionalData(additionalData: Record<string, any>): Promise<void>;
  setAppsFlyerDevKey(devKey: string): Promise<void>;
  setAppleAppID(appId: string): Promise<void>;
  setCustomerUserId(userId: string): Promise<void>;
  setCurrencyCode(currencyCode: string): Promise<void>;
  setOneLinkCustomDomain(domains: string[]): Promise<void>;
  setResolveDeepLinkURLs(urls: string[]): Promise<void>;
  setDisableCollectAppleAdSupport(disable: boolean): Promise<void>;
  setDisableCollectIAd(disable: boolean): Promise<void>;
  setDisableCollectASA(disable: boolean): Promise<void>;
  setUseReceiptValidationSandbox(useSandbox: boolean): Promise<void>;
  setUseUninstallSandbox(useSandbox: boolean): Promise<void>;
  setAnonymizeUser(anonymize: boolean): Promise<void>;
  setCollectIMEI(collect: boolean): Promise<void>;
  setCollectAndroidID(collect: boolean): Promise<void>;
  setCollectOaid(collect: boolean): Promise<void>;
  waitForATTUserAuthorization(timeoutInterval: number): Promise<void>;
  stop(isStopped: boolean): Promise<void>;
  start(): Promise<void>;
  setSharingFilter(sharingFilter: string[]): Promise<void>;
  setSharingFilterForAllPartners(): Promise<void>;
  setPartnerData(partnerId: string, partnerInfo: Record<string, any>): Promise<void>;
  generateInviteLink(inviteLinkParams: any): Promise<string>;
  validateAndLogInAppPurchase(productId: string, price: string, currency: string, transactionId: string, additionalParameters: Record<string, any>, callback: (error: any, result: any) => void): Promise<void>;
  logCrossPromotionImpression(appPromotedId: string, campaign: string, parameters?: Record<string, any>): Promise<void>;
  logCrossPromotionAndOpenStore(appPromotedId: string, campaign: string, parameters?: Record<string, any>): Promise<void>;
  setHost(hostPrefix: string, hostName: string): Promise<void>;
  setMinTimeBetweenSessions(seconds: number): Promise<void>;
  setPhoneNumber(phoneNumber: string): Promise<void>;
  setConsentData(consentData: any): Promise<void>;
  setConsent(shouldCollectConsent: boolean): Promise<void>;
  anonymizeUser(shouldAnonymize: boolean): Promise<void>;
  setDisableNetworkData(disable: boolean): Promise<void>;
  setOnDeepLinking(callback: (deepLink: any) => void): Promise<void>;
  setOnConversionData(callback: (data: any) => void): Promise<void>;
}

const { AppsFlyerLib: NativeAppsFlyerModule } = NativeModules;

// Fallback implementation for development
const fallbackAppsFlyerModule: AppsFlyerModuleInterface = {
  async initSdk() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async logEvent() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setUserId() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setUserEmails() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setAdditionalData() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setAppsFlyerDevKey() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setAppleAppID() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setCustomerUserId() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setCurrencyCode() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setOneLinkCustomDomain() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setResolveDeepLinkURLs() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setDisableCollectAppleAdSupport() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setDisableCollectIAd() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setDisableCollectASA() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setUseReceiptValidationSandbox() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setUseUninstallSandbox() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setAnonymizeUser() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setCollectIMEI() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setCollectAndroidID() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setCollectOaid() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async waitForATTUserAuthorization() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async stop() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async start() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setSharingFilter() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setSharingFilterForAllPartners() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setPartnerData() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async generateInviteLink() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
    return '';
  },
  async validateAndLogInAppPurchase() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async logCrossPromotionImpression() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async logCrossPromotionAndOpenStore() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setHost() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setMinTimeBetweenSessions() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setPhoneNumber() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setConsentData() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setConsent() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async anonymizeUser() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setDisableNetworkData() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setOnDeepLinking() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
  async setOnConversionData() {
    if (__DEV__) {
      console.warn('AppsFlyerModule not available - using fallback');
    }
  },
};

const AppsFlyerModule = (Platform.OS === 'ios' && NativeAppsFlyerModule)
  ? (NativeAppsFlyerModule as AppsFlyerModuleInterface)
  : fallbackAppsFlyerModule;

export default AppsFlyerModule;

