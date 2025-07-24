// 📊 ENTERPRISE PERFORMANCE MONITORING
// Console-based performance tracking without external dependencies

interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
  url?: string
  userAgent?: string
}

interface PerformanceStats {
  count: number
  avg: number
  max: number
  min: number
  p95: number
  slowOperations: number
  lastUpdated: string
}

class EnterprisePerformanceTracker {
  private static metrics: PerformanceMetric[] = []
  private static slowOperationThreshold = 1000 // 1 second
  private static maxMetrics = 1000 // Keep last 1000 metrics
  private static reportInterval: NodeJS.Timeout | null = null
  
  // 📊 Start performance timer
  static startTimer(operation: string, metadata?: Record<string, any>): () => void {
    const start = performance.now()
    const startTime = Date.now()
    
    return () => {
      const duration = performance.now() - start
      const metric: PerformanceMetric = {
        operation,
        duration,
        timestamp: startTime,
        metadata,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : undefined
      }
      
      this.recordMetric(metric)
    }
  }
  
  // 📊 Record performance metric
  private static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)
    
    // Log slow operations immediately
    if (metric.duration > this.slowOperationThreshold) {
      console.warn(`[SLOW OPERATION] ${metric.operation}: ${metric.duration.toFixed(2)}ms`, {
        metadata: metric.metadata,
        url: metric.url,
        timestamp: new Date(metric.timestamp).toISOString()
      })
    }
    
    // Log normal operations in development
    if (process.env.NODE_ENV === 'development' && metric.duration > 100) {
      console.info(`[PERFORMANCE] ${metric.operation}: ${metric.duration.toFixed(2)}ms`, metric.metadata)
    }
    
    // Maintain metrics array size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
    
    // Start automatic reporting if not already started
    this.ensureReporting()
  }
  
  // 📊 Get statistics for specific operation or all operations
  static getStats(operation?: string): PerformanceStats | null {
    const filtered = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics
      
    if (filtered.length === 0) return null
    
    const durations = filtered.map(m => m.duration)
    const sorted = [...durations].sort((a, b) => a - b)
    
    return {
      count: filtered.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      max: Math.max(...durations),
      min: Math.min(...durations),
      p95: this.percentile(sorted, 0.95),
      slowOperations: filtered.filter(m => m.duration > this.slowOperationThreshold).length,
      lastUpdated: new Date().toISOString()
    }
  }
  
  // 📊 Calculate percentile
  private static percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0
    const index = Math.ceil(arr.length * p) - 1
    return arr[Math.max(0, index)]
  }
  
  // 📊 Get all operations with their stats
  static getAllStats(): Record<string, PerformanceStats> {
    const operations = [...new Set(this.metrics.map(m => m.operation))]
    const stats: Record<string, PerformanceStats> = {}
    
    operations.forEach(op => {
      const opStats = this.getStats(op)
      if (opStats) {
        stats[op] = opStats
      }
    })
    
    return stats
  }
  
  // 📊 Performance report for development
  static logPerformanceReport(): void {
    if (this.metrics.length === 0) {
      console.info('[PERFORMANCE REPORT] No metrics collected yet')
      return
    }
    
    const allStats = this.getAllStats()
    const totalMetrics = this.metrics.length
    const slowOps = this.metrics.filter(m => m.duration > this.slowOperationThreshold).length
    
    console.group('[📊 ENTERPRISE PERFORMANCE REPORT]')
    console.info(`Total Operations: ${totalMetrics}`)
    console.info(`Slow Operations (>${this.slowOperationThreshold}ms): ${slowOps} (${((slowOps/totalMetrics)*100).toFixed(1)}%)`)
    console.info(`Tracking Period: ${this.getTrackingPeriod()}`)
    
    // Log top 10 slowest operations
    const sortedOps = Object.entries(allStats)
      .sort((a, b) => b[1].avg - a[1].avg)
      .slice(0, 10)
    
    if (sortedOps.length > 0) {
      console.group('Slowest Operations (by average):')
      sortedOps.forEach(([op, stats]) => {
        console.info(`${op}:`, {
          avg: `${stats.avg.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
          p95: `${stats.p95.toFixed(2)}ms`,
          count: stats.count,
          slowCount: stats.slowOperations
        })
      })
      console.groupEnd()
    }
    
    console.groupEnd()
  }
  
  // 📊 Get tracking period info
  private static getTrackingPeriod(): string {
    if (this.metrics.length === 0) return 'No data'
    
    const oldest = Math.min(...this.metrics.map(m => m.timestamp))
    const newest = Math.max(...this.metrics.map(m => m.timestamp))
    const duration = newest - oldest
    
    if (duration < 60000) return `${Math.round(duration/1000)}s`
    if (duration < 3600000) return `${Math.round(duration/60000)}m`
    return `${Math.round(duration/3600000)}h`
  }
  
  // 📊 Clear all metrics
  static clearMetrics(): void {
    this.metrics = []
    console.info('[PERFORMANCE] Metrics cleared')
  }
  
  // 📊 Set slow operation threshold
  static setSlowThreshold(ms: number): void {
    this.slowOperationThreshold = ms
    console.info(`[PERFORMANCE] Slow operation threshold set to ${ms}ms`)
  }
  
  // 📊 Get recent slow operations
  static getRecentSlowOperations(minutes: number = 5): PerformanceMetric[] {
    const cutoff = Date.now() - (minutes * 60 * 1000)
    return this.metrics
      .filter(m => m.timestamp > cutoff && m.duration > this.slowOperationThreshold)
      .sort((a, b) => b.duration - a.duration)
  }
  
  // 📊 Automatic performance reporting
  private static ensureReporting(): void {
    if (this.reportInterval || process.env.NODE_ENV !== 'development') return
    
    // Report every 5 minutes in development
    this.reportInterval = setInterval(() => {
      this.logPerformanceReport()
    }, 5 * 60 * 1000)
  }
  
  // 📊 Memory usage tracking (Chrome/Edge only)
  static getMemoryUsage(): { used: number, total: number, limit: number } | null {
    if (typeof window === 'undefined' || !(performance as any).memory) return null
    
    const memory = (performance as any).memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
    }
  }
  
  // 📊 Critical performance alert
  static checkCriticalPerformance(): void {
    const recentSlowOps = this.getRecentSlowOperations(2) // Last 2 minutes
    
    if (recentSlowOps.length > 5) {
      console.error(`[CRITICAL PERFORMANCE] ${recentSlowOps.length} slow operations in last 2 minutes:`, 
        recentSlowOps.map(op => ({ operation: op.operation, duration: op.duration }))
      )
    }
    
    const memory = this.getMemoryUsage()
    if (memory && memory.used > memory.limit * 0.9) {
      console.error(`[CRITICAL MEMORY] Memory usage at ${((memory.used/memory.limit)*100).toFixed(1)}%: ${memory.used}MB/${memory.limit}MB`)
    }
  }
}

// 📊 Export the singleton instance
export { EnterprisePerformanceTracker as PerformanceTracker }

// 📊 Development helpers
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Add to window for debugging
  (window as any).performanceTracker = PerformanceTracker
  
  // Auto-check critical performance every minute
  setInterval(() => {
    PerformanceTracker.checkCriticalPerformance()
  }, 60 * 1000)
  
  console.info('[PERFORMANCE] Enterprise Performance Tracker initialized. Use window.performanceTracker for debugging.')
} 