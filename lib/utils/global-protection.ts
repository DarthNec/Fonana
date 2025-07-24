/**
 * 🔥 M7 PHASE 3: Global setState Protection
 * Prevents setState calls during app freeze states to eliminate React Error #185
 */

export class GlobalStateProtection {
  private static isAppFrozen = false
  private static freezeTimestamp = 0
  private static freezeReason = ''
  
  /**
   * Freeze app-wide setState operations
   */
  static freezeApp(reason: string) {
    this.isAppFrozen = true
    this.freezeTimestamp = Date.now()
    this.freezeReason = reason
    console.warn(`[GlobalProtection] App frozen: ${reason}`)
    
    // Auto-unfreeze after 5 seconds to prevent permanent freeze
    setTimeout(() => {
      this.unfreezeApp('timeout')
    }, 5000)
  }
  
  /**
   * Unfreeze app-wide setState operations
   */
  static unfreezeApp(reason: string) {
    if (this.isAppFrozen) {
      this.isAppFrozen = false
      const freezeDuration = Date.now() - this.freezeTimestamp
      console.log(`[GlobalProtection] App unfrozen: ${reason} (was frozen for ${freezeDuration}ms due to: ${this.freezeReason})`)
    }
  }
  
  /**
   * Check if setState operations are allowed
   */
  static canSetState(componentName: string): boolean {
    if (this.isAppFrozen) {
      console.warn(`[GlobalProtection] setState blocked for ${componentName} - app frozen due to: ${this.freezeReason}`)
      return false
    }
    return true
  }
  
  /**
   * Get current freeze status
   */
  static getStatus() {
    return {
      isFrozen: this.isAppFrozen,
      reason: this.freezeReason,
      freezeTimestamp: this.freezeTimestamp,
      freezeDuration: this.isAppFrozen ? Date.now() - this.freezeTimestamp : 0
    }
  }
} 