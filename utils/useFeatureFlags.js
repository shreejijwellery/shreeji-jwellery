import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const CACHE_KEY = 'featureFlags_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day in milliseconds

/**
 * Custom hook to fetch and check feature flags with localStorage caching
 * @returns {Object} { featureFlags, loading, checkFeature, refreshFlags }
 */
export const useFeatureFlags = () => {
  const [featureFlags, setFeatureFlags] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Get cached flags from localStorage
   * @returns {Object|null} Cached flags or null if expired/missing
   */
  const getCachedFlags = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const { flags, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - timestamp < CACHE_DURATION) {
        return flags;
      }
      
      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error('Error reading cached flags:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  /**
   * Save flags to localStorage
   * @param {Object} flags - Feature flags to cache
   */
  const setCachedFlags = useCallback((flags) => {
    try {
      const cacheData = {
        flags,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching flags:', error);
    }
  }, []);

  /**
   * Fetch flags from API
   * @param {boolean} forceRefresh - If true, bypass cache
   */
  const fetchFlags = useCallback(async (forceRefresh = false) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFeatureFlags({});
        setLoading(false);
        return;
      }

      // Try to use cached flags first (unless force refresh)
      if (!forceRefresh) {
        const cachedFlags = getCachedFlags();
        if (cachedFlags) {
          setFeatureFlags(cachedFlags);
          setLoading(false);
          return;
        }
      }

      // Fetch from API
      const { data } = await axios.get('/api/company/flags', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const flags = data?.featureFlags || {};
      setFeatureFlags(flags);
      
      // Cache the flags
      setCachedFlags(flags);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      setFeatureFlags({});
    } finally {
      setLoading(false);
    }
  }, [getCachedFlags, setCachedFlags]);

  useEffect(() => {
    fetchFlags();
    
    // Listen for custom events to refresh flags
    const handleCustomEvent = () => {
      fetchFlags(true); // Force refresh on custom event
    };
    
    // Listen for login event to refresh flags
    const handleLogin = () => {
      localStorage.removeItem(CACHE_KEY); // Clear cache on login
      fetchFlags(true);
    };
    
    window.addEventListener('featureFlagsRefresh', handleCustomEvent);
    window.addEventListener('userLoggedIn', handleLogin);
    
    return () => {
      window.removeEventListener('featureFlagsRefresh', handleCustomEvent);
      window.removeEventListener('userLoggedIn', handleLogin);
    };
  }, [fetchFlags]);

  /**
   * Check if a feature flag is enabled
   * @param {string} flagName - Name of the feature flag (e.g., 'isExtractSKU')
   * @returns {boolean} - True if feature is enabled, false otherwise
   */
  const checkFeature = (flagName) => {
    try {
      if (!featureFlags || !flagName) return false;
      return Boolean(featureFlags[flagName]);
    } catch (error) {
      console.error('Error checking feature flag:', error);
      return false;
    }
  };

  /**
   * Force refresh flags from API (bypasses cache)
   */
  const refreshFlags = useCallback(() => {
    setLoading(true);
    localStorage.removeItem(CACHE_KEY); // Clear cache
    fetchFlags(true); // Force refresh
  }, [fetchFlags]);

  /**
   * Clear flags cache (useful on logout)
   */
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setFeatureFlags({});
  }, []);

  return { featureFlags, loading, checkFeature, refreshFlags, clearCache };
};

// Helper function to trigger flag refresh from anywhere
export const triggerFlagsRefresh = () => {
  window.dispatchEvent(new Event('featureFlagsRefresh'));
};

// Helper function to clear flags cache (use on logout)
export const clearFlagsCache = () => {
  localStorage.removeItem(CACHE_KEY);
};

