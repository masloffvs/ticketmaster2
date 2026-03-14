module.exports = {
  plugins: [
    ['postcss-preset-env', {
      // Это полифиллит новые фичи CSS для старых браузеров (включая autoprefixer)
      stage: 3,
      features: {
        'nesting-rules': true
      },
      autoprefixer: { flexbox: 'no-2009' }
    }],
    ['autoprefixer', {}]
  ]
};
