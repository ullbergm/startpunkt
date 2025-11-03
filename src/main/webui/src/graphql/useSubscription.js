import { useEffect, useState, useRef, useMemo } from 'preact/hooks';
import { gql } from '@apollo/client';
import { client } from './client';

/**
 * Custom hook for GraphQL subscriptions using Apollo Client
 * 
 * @param {string} subscription - The GraphQL subscription query string
 * @param {object} variables - Variables for the subscription query
 * @param {boolean} enabled - Whether the subscription is enabled (default: true)
 * @returns {object} Subscription state with data, error, and loading status
 * 
 * @example
 * const { data, error, loading } = useSubscription(
 *   APPLICATION_UPDATES_SUBSCRIPTION, 
 *   { namespace: 'default', tags: ['production'] }
 * );
 */
export function useSubscription(subscription, variables = {}, enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use refs to track subscription and mounted state
  const subscriptionRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Parse the subscription string into a DocumentNode if needed
  const subscriptionDoc = useMemo(() => {
    if (typeof subscription === 'string') {
      return gql(subscription);
    }
    return subscription;
  }, [subscription]);
  
  // Memoize variables to avoid unnecessary re-subscriptions
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)]);
  
  useEffect(() => {
    mountedRef.current = true;
    
    // Don't subscribe if not enabled
    if (!enabled) {
      setLoading(false);
      return;
    }
    
    // Reset state when starting new subscription
    setLoading(true);
    setError(null);
    
    // Create subscription using Apollo Client
    const observable = client.subscribe({
      query: subscriptionDoc,
      variables: stableVariables,
    });
    
    subscriptionRef.current = observable.subscribe({
      next: (result) => {
        if (!mountedRef.current) return;
        
        if (result.errors) {
          console.error('[useSubscription] Subscription errors:', result.errors);
          setError(result.errors[0]);
          setLoading(false);
        } else if (result.data) {
          setData(result.data);
          setError(null);
          setLoading(false);
        }
      },
      error: (err) => {
        if (!mountedRef.current) return;
        
        console.error('[useSubscription] Subscription error:', err);
        setError(err);
        setLoading(false);
      },
      complete: () => {
        if (!mountedRef.current) return;
        setLoading(false);
      }
    });
    
    // Cleanup function
    return () => {
      mountedRef.current = false;
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [subscriptionDoc, stableVariables, enabled]);
  
  return {
    data,
    error,
    loading,
    isSubscribed: !loading && !error,
  };
}
