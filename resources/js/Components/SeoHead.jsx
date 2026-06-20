import { Head } from '@inertiajs/react';

/**
 * Renders page title, favicon, and SEO / Open Graph meta tags from shared branding.
 */
export default function SeoHead({ title, branding = {} }) {
    const seo = branding.seo || {};
    const siteName = seo.title || branding.app_name || 'mWiFi';
    const pageTitle = title || siteName;
    const description = seo.description || branding.company_tagline || '';
    const keywords = seo.keywords || '';
    const robots = seo.robots || 'index,follow';
    const ogTitle = title ? `${title} — ${siteName}` : siteName;

    const faviconHref = branding.favicon_url || branding.logo_url
        ? `/favicon.ico?v=${branding.version || '1'}`
        : null;

    return (
        <Head title={pageTitle}>
            {faviconHref ? (
                <link rel="icon" href={faviconHref} head-key={`favicon-${branding.version || '1'}`} />
            ) : null}
            {description && (
                <meta head-key="description" name="description" content={description} />
            )}
            {keywords && (
                <meta head-key="keywords" name="keywords" content={keywords} />
            )}
            <meta head-key="robots" name="robots" content={robots} />
            <meta head-key="og:type" property="og:type" content="website" />
            <meta head-key="og:title" property="og:title" content={ogTitle} />
            {description && (
                <meta head-key="og:description" property="og:description" content={description} />
            )}
            {branding.logo_url && (
                <meta head-key="og:image" property="og:image" content={branding.logo_url} />
            )}
            {branding.company_website && (
                <meta head-key="og:url" property="og:url" content={branding.company_website} />
            )}
        </Head>
    );
}
