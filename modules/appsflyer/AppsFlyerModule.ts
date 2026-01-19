/**
 * AppsFlyer Native Module
 *
 * Wrapper for native AppsFlyer SDK.
 * Provides silent fallback for development.
 *
 * @module modules/appsflyer
 */

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
    // Silently fail - AppsFlyer may not be configured yet
  },
  async logEvent() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setUserId() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setUserEmails() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setAdditionalData() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setAppsFlyerDevKey() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setAppleAppID() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setCustomerUserId() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setCurrencyCode() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setOneLinkCustomDomain() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setResolveDeepLinkURLs() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setDisableCollectAppleAdSupport() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setDisableCollectIAd() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setDisableCollectASA() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setUseReceiptValidationSandbox() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setUseUninstallSandbox() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setAnonymizeUser() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setCollectIMEI() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setCollectAndroidID() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setCollectOaid() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async waitForATTUserAuthorization() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async stop() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async start() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setSharingFilter() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setSharingFilterForAllPartners() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setPartnerData() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async generateInviteLink() {
    // Silently fail - AppsFlyer may not be configured yet
    return '';
  },
  async validateAndLogInAppPurchase() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async logCrossPromotionImpression() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async logCrossPromotionAndOpenStore() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setHost() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setMinTimeBetweenSessions() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setPhoneNumber() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setConsentData() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setConsent() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async anonymizeUser() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setDisableNetworkData() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setOnDeepLinking() {
    // Silently fail - AppsFlyer may not be configured yet
  },
  async setOnConversionData() {
    // Silently fail - AppsFlyer may not be configured yet
  },
};

const AppsFlyerModule = (Platform.OS === 'ios' && NativeAppsFlyerModule)
  ? (NativeAppsFlyerModule as AppsFlyerModuleInterface)
  : fallbackAppsFlyerModule;

export default AppsFlyerModule;

