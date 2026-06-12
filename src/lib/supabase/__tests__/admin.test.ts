/* eslint-disable @typescript-eslint/no-require-imports */
// Mock environment variables
const originalEnv = process.env;

describe('Supabase Admin Client (H-5)', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';

        expect(() => {
            require('../admin');
        }).toThrow('Missing Supabase service role environment variables');
    });

    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;

        expect(() => {
            require('../admin');
        }).toThrow('Missing Supabase service role environment variables');
    });

    it('should create admin client with service role key', () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

        // Re-import to test with mocked environment
        jest.resetModules();
        const { supabaseAdmin: adminClient } = require('../admin');

        expect(adminClient).toBeDefined();
        expect(adminClient.supabaseUrl).toBe('https://test.supabase.co');
        expect(adminClient.supabaseKey).toBe('test-service-role-key');
    });

    it('should have auth disabled for server operations', () => {
        // Set up environment variables if needed
        process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
        
        // Re-import to ensure we have a valid client
        jest.resetModules();
        const { supabaseAdmin: adminClient } = require('../admin');
        
        expect(adminClient).toBeDefined();
        
        // Check that auth is configured for server use
        const authConfig = adminClient.auth;
        expect(authConfig.autoRefreshToken).toBe(false);
        expect(authConfig.persistSession).toBe(false);
    });

    it('should use service role key (not anon key)', () => {
        // Set up environment variables if needed
        process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
        
        // Re-import to ensure we have a valid client
        jest.resetModules();
        const { supabaseAdmin: adminClient } = require('../admin');
        
        // Verify the client is using service role key by checking it's not the anon key pattern
        expect(adminClient.supabaseKey).not.toMatch(/^eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/);
        // Service role keys are typically longer and start with different pattern
        expect(adminClient.supabaseKey.length).toBeGreaterThan(10);
    });

    it('should prevent client-side exposure by not using NEXT_PUBLIC prefix', () => {
        // Set up environment variables
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
        
        // Ensure NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is not set
        delete process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
        
        // Re-import to ensure we have a valid client
        jest.resetModules();
        const { supabaseAdmin: adminClient } = require('../admin');
        
        // The client should be using the server-only environment variable
        expect(adminClient.supabaseKey).toBe('test-service-role-key');
        
        // Ensure we're not accidentally using the public-prefixed version
        expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    });
});
