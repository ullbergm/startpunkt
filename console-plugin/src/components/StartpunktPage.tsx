import * as React from 'react';
import {
  Page,
  PageSection,
  Title,
  Spinner,
} from '@patternfly/react-core';
import './StartpunktPage.css';

const StartpunktPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // The iframe will handle its own loading state
    setLoading(false);
  }, []);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setError('Failed to load Startpunkt application');
    setLoading(false);
  };

  // Get the Startpunkt service URL
  // In production, this should be configured via ConfigMap
  const startpunktUrl = process.env.STARTPUNKT_URL || '/api/startpunkt-proxy';

  return (
    <Page>
      <PageSection variant="light">
        <Title headingLevel="h1" size="lg">
          Startpunkt - Application Dashboard
        </Title>
      </PageSection>
      <PageSection isFilled className="startpunkt-content">
        {loading && (
          <div className="startpunkt-loading">
            <Spinner size="lg" />
          </div>
        )}
        {error && (
          <div className="startpunkt-error">
            <p>{error}</p>
          </div>
        )}
        <iframe
          id="startpunkt-iframe"
          src={startpunktUrl}
          className="startpunkt-iframe"
          title="Startpunkt Application Dashboard"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </PageSection>
    </Page>
  );
};

export default StartpunktPage;
