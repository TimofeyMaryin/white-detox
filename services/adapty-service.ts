import { adapty } from 'react-native-adapty';
import { ADAPTY_CONFIG } from '@/config/adapty';
import analytics from './analytics';

class AdaptyService {
  private isInitialized = false;
  private profileUpdateListeners: Set<() => void> = new Set();
  
  /**
   * Subscribe to profile updates
   */
  onProfileUpdate(callback: () => void): () => void {
    this.profileUpdateListeners.add(callback);
    return () => {
      this.profileUpdateListeners.delete(callback);
    };
  }
  
  /**
   * Notify all listeners about profile update
   */
  private notifyProfileUpdate() {
    this.profileUpdateListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in profile update listener:', error);
      }
    });
  }

  /**
   * Initialize Adapty SDK
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if already activated to avoid double activation
      const isActivated = await adapty.isActivated();
      if (isActivated) {
        this.isInitialized = true;
        console.log('Adapty already activated');
        return;
      }

      await adapty.activate(ADAPTY_CONFIG.publicKey);
      this.isInitialized = true;
      console.log('Adapty initialized successfully');
    } catch (error: any) {
      // Ignore activation error if already activated
      if (error?.adaptyErrorCode === 3005) {
        this.isInitialized = true;
        console.log('Adapty already activated (ignoring duplicate activation error)');
        return;
      }
      console.error('Error initializing Adapty:', error);
    }
  }

  /**
   * Get paywall by placement ID
   */
  async getPaywall(placementId: string) {
    try {
      return await adapty.getPaywall(placementId);
    } catch (error) {
      console.error('Error getting paywall:', error);
      return null;
    }
  }

  /**
   * Get onboarding by placement ID
   */
  async getOnboarding(placementId: string) {
    try {
      return await adapty.getOnboarding(placementId);
    } catch (error) {
      console.error('Error getting onboarding:', error);
      return null;
    }
  }

  /**
   * Get user profile with retry logic
   */
  async getProfile(retryCount: number = 0): Promise<any> {
    try {
      // Ensure Adapty is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Check if profile API is available
      if (!adapty || !adapty.profile || typeof adapty.profile.getProfile !== 'function') {
        return null;
      }
      
      const profile = await adapty.profile.getProfile();
      
      // Notify listeners about profile update
      this.notifyProfileUpdate();
      
      return profile;
    } catch (error) {
      // Don't log errors if Adapty is not initialized yet
      if (error && typeof error === 'object' && 'message' in error && error.message?.includes('undefined')) {
        return null;
      }
      
      // Retry logic for network errors or temporary failures
      if (retryCount < 3 && error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message || '';
        if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('500')) {
          // Wait before retry: 500ms, 1000ms, 2000ms
          await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
          return this.getProfile(retryCount + 1);
        }
      }
      
      console.error('Error getting profile:', error);
      return null;
    }
  }
  
  /**
   * Force refresh profile (useful after purchase)
   */
  async refreshProfile(): Promise<any> {
    try {
      // Force re-fetch profile from Adapty
      return await this.getProfile(0);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      return null;
    }
  }

  /**
   * Check if user has active subscription with retry
   */
  async hasActiveSubscription(retryCount: number = 0): Promise<boolean> {
    try {
      // Ensure Adapty is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const profile = await this.getProfile();
      if (!profile) {
        // Retry if profile is null and we haven't retried yet
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
          return this.hasActiveSubscription(retryCount + 1);
        }
        return false;
      }
      
      const isActive = profile?.accessLevels?.premium?.isActive === true;
      
      // If not active but we just made a purchase, retry once more after delay
      if (!isActive && retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.hasActiveSubscription(1);
      }
      
      return isActive;
    } catch (error) {
      // Don't log errors if Adapty is not initialized yet
      if (error && typeof error === 'object' && 'message' in error && error.message?.includes('undefined')) {
        return false;
      }
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Make purchase
   */
  async makePurchase(product: any) {
    try {
      const result = await adapty.purchases.makePurchase(product);
      
      // Log purchase event
      if (result) {
        await analytics.logFirebaseEvent('purchase_completed', {
          product_id: product.vendorProductId,
        });
        await analytics.logAppsFlyerEvent('af_purchase', {
          product_id: product.vendorProductId,
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error making purchase:', error);
      throw error;
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases() {
    try {
      return await adapty.purchases.restorePurchases();
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }

  /**
   * Handle onboarding action
   */
  async handleOnboardingAction(actionId: string, screenId?: string) {
    try {
      // Log action to Firebase
      if (screenId) {
        await analytics.logOnboardingScreenView(screenId, actionId);
      }

      // Handle specific actions
      switch (actionId) {
        case ADAPTY_CONFIG.actionIds.pwOnboarding:
          // Navigate to paywall - handled in component
          return true;
        
        case ADAPTY_CONFIG.actionIds.closeOnboarding:
          // Close onboarding - handled in component
          return true;
        
        default:
          return null;
      }
    } catch (error) {
      console.error('Error handling onboarding action:', error);
      return null;
    }
  }
}

export default new AdaptyService();

