import nextConfig from '../../next.config';

describe('Next.js Security Headers (M-8)', () => {
    it('should define security headers configuration', () => {
        expect(nextConfig).toBeDefined();
        expect(nextConfig.headers).toBeDefined();
        expect(typeof nextConfig.headers).toBe('function');
    });

    it('should include Strict-Transport-Security header', async () => {
        const headers = await nextConfig.headers();
        const securityHeaders = headers[0];

        expect(securityHeaders).toBeDefined();
        expect(securityHeaders.source).toBe('/(.*)');

        const hstsHeader = securityHeaders.headers.find(h => h.key === 'Strict-Transport-Security');
        expect(hstsHeader).toBeDefined();
        expect(hstsHeader.value).toContain('max-age=');
        expect(hstsHeader.value).toContain('includeSubDomains');
    });

    it('should include X-Frame-Options header with DENY', async () => {
        const headers = await nextConfig.headers();
        const securityHeaders = headers[0];

        const xFrameHeader = securityHeaders.headers.find(h => h.key === 'X-Frame-Options');
        expect(xFrameHeader).toBeDefined();
        expect(xFrameHeader.value).toBe('DENY');
    });

    it('should include X-Content-Type-Options header with nosniff', async () => {
        const headers = await nextConfig.headers();
        const securityHeaders = headers[0];

        const xContentTypeHeader = securityHeaders.headers.find(h => h.key === 'X-Content-Type-Options');
        expect(xContentTypeHeader).toBeDefined();
        expect(xContentTypeHeader.value).toBe('nosniff');
    });

    it('should include Referrer-Policy header', async () => {
        const headers = await nextConfig.headers();
        const securityHeaders = headers[0];

        const referrerPolicyHeader = securityHeaders.headers.find(h => h.key === 'Referrer-Policy');
        expect(referrerPolicyHeader).toBeDefined();
        expect(referrerPolicyHeader.value).toContain('strict-origin');
    });

    it('should include Permissions-Policy header restricting sensitive features', async () => {
        const headers = await nextConfig.headers();
        const securityHeaders = headers[0];

        const permissionsPolicyHeader = securityHeaders.headers.find(h => h.key === 'Permissions-Policy');
        expect(permissionsPolicyHeader).toBeDefined();
        expect(permissionsPolicyHeader.value).toContain('camera=()');
        expect(permissionsPolicyHeader.value).toContain('microphone=()');
        expect(permissionsPolicyHeader.value).toContain('geolocation=()');
    });

    it('should include all required security headers', async () => {
        const headers = await nextConfig.headers();
        const securityHeaders = headers[0];
        const headerKeys = securityHeaders.headers.map(h => h.key);

        const requiredHeaders = [
            'Strict-Transport-Security',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Referrer-Policy',
            'Permissions-Policy'
        ];

        requiredHeaders.forEach(header => {
            expect(headerKeys).toContain(header);
        });
    });
});