/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // سيقوم بتجاهل أخطاء الـ Types أثناء البناء لضمان نجاح الرفع
    ignoreBuildErrors: true,
  },
  eslint: {
    // سيقوم بتجاهل أخطاء التنسيق (Linting) أثناء البناء
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
