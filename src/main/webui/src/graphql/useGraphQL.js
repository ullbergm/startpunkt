import { useState, useEffect } from 'preact/hooks';
import { client } from './client';

/**
 * Custom hook for executing GraphQL queries
 * @param {string} query - GraphQL query string
 * @param {object} variables - Query variables
 * @param {boolean} skip - Skip execution if true
 * @returns {object} - { data, error, loading, refetch }
 */
export function useQuery(query, variables = {}, skip = false) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!skip);

  const execute = async (vars = variables) => {
    if (skip) return;
    
    setLoading(true);
    setError(null);

    try {
      const result = await client.query(query, vars).toPromise();
      
      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    execute();
  }, [query, JSON.stringify(variables), skip]);

  return {
    data,
    error,
    loading,
    refetch: execute
  };
}

/**
 * Custom hook for executing GraphQL mutations
 * @param {string} mutation - GraphQL mutation string
 * @returns {array} - [executeMutation, { data, error, loading }]
 */
export function useMutation(mutation) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const execute = async (variables = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await client.mutation(mutation, variables).toPromise();
      
      if (result.error) {
        setError(result.error);
        setData(null);
        throw result.error;
      } else {
        setData(result.data);
        setError(null);
        return result.data;
      }
    } catch (err) {
      setError(err);
      setData(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return [execute, { data, error, loading }];
}
