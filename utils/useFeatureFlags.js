import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook to fetch and check feature flags
 * @returns {Object} { featureFlags, loading, checkFeature }
 */
export const useFeatureFlags = () => {
  const [featureFlags, setFeatureFlags] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
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
    };

    fetchFlags();
  }, []);

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

  return { featureFlags, loading, checkFeature };
};

