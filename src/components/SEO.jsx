import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO = ({ title, description, image, url }) => {
  const location = useLocation();
  const baseUrl = 'https://afrodate.co.za';
  const fullUrl = url || `${baseUrl}${location.pathname}`;
  const defaultTitle = 'AfroDate | Connect With Africans and People Who Love African Culture';
  const defaultDescription = 'AfroDate is a professional dating and connection platform bringing Africans and people who love African culture together.';
  const defaultImage = `${baseUrl}/og-image.png`;

  const pageTitle = title || defaultTitle;
  const pageDescription = description || defaultDescription;
  const pageImage = image || defaultImage;

  useEffect(() => {
    document.title = pageTitle;

    const updateMetaTag = (property, content) => {
      let element = document.querySelector(`meta[property="${property}"]`) || 
                    document.querySelector(`meta[name="${property}"]`);
      if (element) {
        element.setAttribute('content', content);
      }
    };

    updateMetaTag('description', pageDescription);
    updateMetaTag('og:title', pageTitle);
    updateMetaTag('og:description', pageDescription);
    updateMetaTag('og:url', fullUrl);
    updateMetaTag('og:image', pageImage);
    updateMetaTag('twitter:title', pageTitle);
    updateMetaTag('twitter:description', pageDescription);
    updateMetaTag('twitter:image', pageImage);
  }, [pageTitle, pageDescription, pageImage, fullUrl]);

  return null;
};

export default SEO;
