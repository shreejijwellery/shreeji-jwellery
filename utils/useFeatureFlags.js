import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook to fetch and check feature flags
 * @returns {Object} { featureFlags, loading, checkFeature, refreshFlags }
 */
export const useFeatureFlags = () => {
  const [featureFlags, setFeatureFlags] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFeatureFlags({});
        setLoading(false);
        return;
      }
      const { data } = await axios.get('/api/company/flags', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeatureFlags(data?.featureFlags || {});
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      setFeatureFlags({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
    
    // Listen for custom events to refresh flags
    const handleCustomEvent = () => {
      fetchFlags();
    };
    
    window.addEventListener('featureFlagsRefresh', handleCustomEvent);
    
    return () => {
      window.removeEventListener('featureFlagsRefresh', handleCustomEvent);
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

  const refreshFlags = useCallback(() => {
    setLoading(true);
    fetchFlags();
  }, [fetchFlags]);

  return { featureFlags, loading, checkFeature, refreshFlags };
};

