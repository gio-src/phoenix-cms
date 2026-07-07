import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedExecutableTypes = [
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const isProd = env('NODE_ENV') === 'production';

  return {
    'users-permissions': {
      config: {
        jwtManagement: 'refresh',
        sessions: {
          httpOnly: true,
        },
      },
    },

    upload: {
      config: {
        // Security applies in every environment, regardless of provider
        security: {
          allowedTypes: allowedMediaTypes,
          deniedTypes: deniedExecutableTypes,
        },

        // Production: R2 via the S3-compatible provider.
        // Local dev: omit provider config entirely, which falls back to
        // Strapi's default local provider (files land in public/uploads).
        ...(isProd && {
          provider: 'aws-s3',
          providerOptions: {
            baseUrl: env('R2_PUBLIC_URL'),
            s3Options: {
              credentials: {
                accessKeyId: env('R2_ACCESS_KEY_ID'),
                secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
              },
              endpoint: env('R2_ENDPOINT'),
              region: 'auto',
              params: {
                Bucket: env('R2_BUCKET'),
              },
            },
          },
          actionOptions: {
            upload: {},
            uploadStream: {},
            delete: {},
          },
        }),
      },
    },

    // Local dev: all outbound mail captured by Mailpit on the workstation.
    // When production email is wired (Postmark), this block gets the same
    // isProd treatment.
    email: {
      config: {
        provider: 'nodemailer',
        providerOptions: {
          host: env('SMTP_HOST', 'localhost'),
          port: env.int('SMTP_PORT', 1025),
          ignoreTLS: true,
        },
        settings: {
          defaultFrom: 'dev@phoenixpaper.local',
          defaultReplyTo: 'dev@phoenixpaper.local',
        },
      },
    },

    // Meilisearch sync plugin. Host and key come from .env locally
    // (VM at .105) and from App Platform env vars in production
    // (droplet private IP). Collection config gets added here once
    // content types exist.
    meilisearch: {
      config: {
        host: env('MEILI_HOST', 'http://localhost:7700'),
        apiKey: env('MEILI_MASTER_KEY', ''),
      },
    },
  };
};

export default config;
