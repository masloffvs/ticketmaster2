import { defineConfig } from "@rspack/cli";
import { type Compiler, rspack, type SwcLoaderOptions } from "@rspack/core";
import { ReactRefreshRspackPlugin } from "@rspack/plugin-react-refresh";
import path from "node:path";

// Пользовательский плагин для инлайна критического CSS прямо в HTML
class InlineCriticalCssPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap("InlineCriticalCssPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "InlineCriticalCssPlugin",
          stage:
            compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
        },
        (assets) => {
          // Ищем имена сгенерированных ассетов
          const htmlAssetKey = Object.keys(assets).find((k) =>
            k.endsWith(".html"),
          );
          const criticalCssKey = Object.keys(assets).find(
            (k) => k.startsWith("critical") && k.endsWith(".css"),
          );

          if (htmlAssetKey && criticalCssKey) {
            const cssContent = assets[criticalCssKey].source().toString();
            let htmlString = assets[htmlAssetKey].source().toString();

            // 1. Встраиваем CSS прямо перед </head>
            htmlString = htmlString.replace(
              "</head>",
              `<style id="critical-css">\n${cssContent}\n</style></head>`,
            );

            // 2. Удаляем ссылку на этот внешний файл, так как мы его уже заинлайнили
            // escape string
            const safeCssKey = criticalCssKey.replace(
              /[-[\]{}()*+?.,\\^$|#\s]/g,
              "\\$&",
            );
            const linkRegex = new RegExp(
              `<link[^>]*href="[^"]*${safeCssKey}"[^>]*>`,
            );
            htmlString = htmlString.replace(linkRegex, "");

            // 3. Аналогично вырезаем JS-чанк, который Rspack генерирует для точки входа critical
            const criticalJsKey = Object.keys(assets).find(
              (k) => k.startsWith("critical") && k.endsWith(".js"),
            );
            if (criticalJsKey) {
              const safeJsKey = criticalJsKey.replace(
                /[-[\]{}()*+?.,\\^$|#\s]/g,
                "\\$&",
              );
              const scriptRegex = new RegExp(
                `<script[^>]*src="[^"]*${safeJsKey}"[^>]*><\\/script>`,
              );
              htmlString = htmlString.replace(scriptRegex, "");
              compilation.deleteAsset(criticalJsKey); // Удаляем файл из финальной сборки
            }

            // Обновляем HTML
            compilation.updateAsset(
              htmlAssetKey,
              new compiler.webpack.sources.RawSource(htmlString),
            );

            // Удаляем файл critical.css из финальной сборки, он больше не нужен
            compilation.deleteAsset(criticalCssKey);
          }
        },
      );
    });
  }
}

const isDev = process.env.NODE_ENV === "development";

// Target browsers, see: https://github.com/browserslist/browserslist
const targets = [
  "last 1 Chrome major version",
  "last 1 Edge major version",
  "last 1 Firefox major version",
  "last 1 Safari major version",
  "iOS >= 16",
  "Android >= 12",
];

export default defineConfig({
  mode: isDev ? "development" : "production",
  devServer: {
    historyApiFallback: true,
  },
  output: {
    publicPath: "/weblayer/",
  },
  entry: {
    critical: "./src/styles/critical.less",
    main: "./src/main.tsx",
  },
  resolve: {
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
    extensions: ["...", ".ts", ".tsx", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.svg$/,
        type: "asset",
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
      {
        test: /\.less$/,
        use: ["postcss-loader", "less-loader"],
        type: "css",
      },
      {
        test: /\.(jsx?|tsx?)$/,
        use: [
          {
            loader: "builtin:swc-loader",
            options: {
              jsc: {
                parser: {
                  syntax: "typescript",
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: "automatic",
                    development: isDev,
                    refresh: isDev,
                  },
                },
              },
              env: { targets },
            } satisfies SwcLoaderOptions,
          },
        ],
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: "./index.html",
    }),
    new InlineCriticalCssPlugin(),
    isDev ? new ReactRefreshRspackPlugin() : null,
  ],
  optimization: {
    sideEffects: true,
    usedExports: true,
    runtimeChunk: "single",
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "initial",
          priority: 20,
          enforce: true,
        },
        asyncVendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "async-vendors",
          chunks: "async",
          priority: 15,
          reuseExistingChunk: true,
        },
        common: {
          name: "common",
          minChunks: 2,
          chunks: "async",
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin(),
      new rspack.LightningCssMinimizerRspackPlugin({
        minimizerOptions: { targets },
      }),
    ],
  },
  performance: {
    hints: "warning",
    maxAssetSize: 256 * 1024,
    maxEntrypointSize: 288 * 1024,
  },
  experiments: {
    css: true,
  },
});
