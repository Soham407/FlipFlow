import ReactGA from 'react-ga4';

const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;

let isInitialized = false;

export const initGA = () => {
  if (!GA4_MEASUREMENT_ID) {
    console.warn('GA4 Measurement ID not found. Analytics will be disabled.');
    return;
  }

  if (isInitialized) {
    return;
  }

  try {
    ReactGA.initialize(GA4_MEASUREMENT_ID);
    isInitialized = true;
    console.log('GA4 initialized successfully');
  } catch (error) {
    console.error('Failed to initialize GA4:', error);
  }
};

export const trackPageView = (page: string, title?: string) => {
  if (!isInitialized || !GA4_MEASUREMENT_ID) return;

  try {
    ReactGA.send({
      hitType: 'pageview',
      page,
      title: title || page,
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

export const trackEvent = (
  action: string,
  category: string = 'Flipbook',
  label?: string,
  value?: number
) => {
  if (!isInitialized || !GA4_MEASUREMENT_ID) return;

  try {
    ReactGA.event(action, {
      category,
      label,
      value,
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

export const trackFlipbookView = (flipbookId: string, flipbookTitle?: string) => {
  if (!isInitialized || !GA4_MEASUREMENT_ID) return;

  try {
    trackEvent('view_flipbook', 'Flipbook', flipbookId);
    trackPageView(`/view/${flipbookId}`, flipbookTitle);
  } catch (error) {
    console.error('Failed to track flipbook view:', error);
  }
};

export const trackTimeSpent = (flipbookId: string, seconds: number) => {
  if (!isInitialized || !GA4_MEASUREMENT_ID) return;

  try {
    trackEvent('time_spent', 'Flipbook', flipbookId, seconds);
  } catch (error) {
    console.error('Failed to track time spent:', error);
  }
};

