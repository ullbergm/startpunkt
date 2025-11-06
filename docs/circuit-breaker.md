# Circuit Breaker and Fault Tolerance

Startpunkt uses circuit breakers and fail-safe patterns to provide graceful degradation when external APIs are unavailable. This ensures the application continues to function even when external services fail.

## Overview

The application integrates with two main external APIs:
1. **Bing Image of the Day API** - Server-side integration with circuit breaker
2. **GitHub Releases API** - Client-side integration with error handling and fallback

## Bing Image of the Day Circuit Breaker (Server-Side)

The Bing Image API integration includes a circuit breaker that protects against API failures and provides a fallback mechanism.

### How It Works

1. **Normal Operation**: The service fetches Bing's Image of the Day from the Bing API
2. **Failure Detection**: If the API fails repeatedly (50% failure rate over 4 requests), the circuit breaker opens
3. **Fallback**: When the circuit is open, the service returns a default fallback image instead
4. **Recovery**: After 60 seconds, the circuit breaker allows 2 test requests to check if the API has recovered
5. **Automatic Healing**: If the test requests succeed, the circuit closes and normal operation resumes

### Configuration

The circuit breaker and fallback image can be configured in `application.yaml`:

```yaml
startpunkt:
  bingimage:
    fallback:
      # Default fallback image when Bing API is unavailable
      # This is a Bing image URL base that will be used with resolution suffix
      urlbase: "/th?id=OHR.BlueBells_EN-US3486393304"
      copyright: "Fallback Background Image"
      title: "Default Background"
```

### Circuit Breaker Parameters

The circuit breaker is configured with the following parameters (defined in code):

- **Request Volume Threshold**: 4 requests (minimum number of requests before evaluating failure ratio)
- **Failure Ratio**: 0.5 (50% - opens circuit if half of requests fail)
- **Delay**: 60000 ms (60 seconds - how long the circuit stays open)
- **Success Threshold**: 2 requests (number of successful requests needed to close the circuit)
- **Timeout**: 10000 ms (10 seconds - timeout for each API request)

### Customizing the Fallback Image

You can customize the fallback image by setting environment variables or updating `application.yaml`:

```yaml
startpunkt:
  bingimage:
    fallback:
      urlbase: "/th?id=OHR.YourImageId_EN-US1234567890"
      copyright: "Your Custom Copyright"
      title: "Your Custom Title"
```

The `urlbase` should be a valid Bing image path without the resolution suffix. The service will automatically append the appropriate resolution (e.g., `_1920x1080.jpg`) based on the client's screen size.

### Benefits

- **High Availability**: Users always get a background image, even when Bing's API is down
- **No User-Facing Errors**: Failures are handled gracefully without error messages
- **Automatic Recovery**: Service resumes normal operation when the API recovers
- **Reduced Load**: Circuit breaker prevents repeated failed requests to a failing API
- **Better Performance**: Cached responses and fast fallback improve response times

### Monitoring

The circuit breaker behavior is logged at the WARN level:

```
Using fallback data for Bing Image (circuit breaker open or API unavailable)
```

You can monitor circuit breaker state through application logs and metrics (if Micrometer is configured).

### Testing

The circuit breaker behavior is tested in `BingImageServiceTest`. The tests verify:

- Normal operation returns valid Bing images
- Resolution selection works correctly for different screen sizes
- Fallback mechanism provides valid images when API fails
- Service never throws exceptions (graceful degradation)

## GitHub Releases API Fail-Safe (Client-Side)

The GitHub Releases API is used by the frontend to fetch changelog information for the "What's New" feature. This integration includes a fail-safe mechanism implemented in `changelogService.js`.

### How It Works

1. **Cache First**: Checks local storage cache (1-hour duration) before making API calls
2. **API Call**: If cache is stale, fetches latest releases from GitHub API
3. **Error Handling**: Try-catch block captures any API failures
4. **Fallback**: Returns hardcoded fallback changelog data if API fails
5. **Rate Limiting**: Aware of GitHub's 60 requests/hour limit for unauthenticated requests

### Implementation Details

```javascript
export async function fetchChangelog() {
  // Try cache first
  const cached = getCachedChangelog();
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(GITHUB_API_URL);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const releases = await response.json();
    // ... process and cache results
    return changelog;
  } catch (error) {
    console.error('[Changelog] Failed to fetch from GitHub:', error);
    return FALLBACK_CHANGELOG; // Fallback data
  }
}
```

### Fallback Data

The fallback data includes:
- Recent release version
- Highlights of key features
- List of all changes
- Proper formatting with linkified issues and usernames

### Benefits

- **Always Available**: Users can see changelog even when GitHub API is down
- **Rate Limit Protection**: Cache reduces API calls to stay under GitHub's limits
- **No User-Facing Errors**: Failures are logged but don't interrupt user experience
- **Offline Support**: Cached data available even without internet connection

## Testing

### Backend Tests

The circuit breaker behavior is tested in `BingImageServiceTest`. The tests verify:

- Normal operation returns valid Bing images
- Resolution selection works correctly for different screen sizes
- Fallback mechanism provides valid images when API fails
- Service never throws exceptions (graceful degradation)

### Frontend Tests

The changelog service is tested in the frontend test suite to verify:
- Cache mechanism works correctly
- Fallback data is returned on API failures
- Error handling doesn't throw exceptions

## Future Enhancements

Additional external APIs can be protected with circuit breakers using the same pattern:

1. Add `@CircuitBreaker` annotation to the method calling the external API
2. Add `@Fallback` annotation with a fallback method
3. Configure timeout with `@Timeout`
4. Provide a reasonable fallback response
5. Configure fallback values in `application.yaml`

### Example Pattern

```java
@CircuitBreaker(
    requestVolumeThreshold = 4,
    failureRatio = 0.5,
    delay = 60000,
    successThreshold = 2)
@Timeout(value = 10000)
@Fallback(fallbackMethod = "getFallbackData")
public Data fetchFromExternalApi() throws Exception {
    // Call external API
}

public Data getFallbackData() {
    // Return fallback data
}
```

## Related Documentation

- [MicroProfile Fault Tolerance Specification](https://download.eclipse.org/microprofile/microprofile-fault-tolerance-4.1/microprofile-fault-tolerance-spec-4.1.html)
- [SmallRye Fault Tolerance Documentation](https://smallrye.io/docs/smallrye-fault-tolerance/6.9.3/index.html)
- [Quarkus Fault Tolerance Guide](https://quarkus.io/guides/smallrye-fault-tolerance)
