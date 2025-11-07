package us.ullberg.startpunkt.config;

import jakarta.annotation.Priority;
import org.eclipse.microprofile.config.spi.Converter;

/**
 * Converter for ClusterConfig to support configuration injection.
 *
 * <p>This converter is needed to deserialize ClusterConfig objects from application.yaml when
 * using @ConfigProperty injection.
 */
@Priority(300)
public class ClusterConfigConverter implements Converter<ClusterConfig> {

  @Override
  public ClusterConfig convert(String value) throws IllegalArgumentException, NullPointerException {
    if (value == null || value.trim().isEmpty()) {
      return null;
    }

    // This converter is primarily used for List<ClusterConfig> deserialization
    // The actual conversion is handled by SmallRye Config's mapping capabilities
    throw new UnsupportedOperationException(
        "ClusterConfig should be configured using @ConfigMapping, not individual string conversion");
  }
}
