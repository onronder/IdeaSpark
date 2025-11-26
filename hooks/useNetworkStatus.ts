import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

/**
 * useNetworkStatus - Monitor network connectivity
 * Returns online/offline status for gating AI actions and displaying banners
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkNetwork = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        if (mounted) {
          setIsOnline(networkState.isConnected ?? true);
          setIsChecking(false);
        }
      } catch (error) {
        logger.error('Error checking network status:', error);
        if (mounted) {
          setIsOnline(true); // Default to online if check fails
          setIsChecking(false);
        }
      }
    };

    checkNetwork();

    // Poll every 5 seconds
    const interval = setInterval(checkNetwork, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    isChecking,
  };
};
