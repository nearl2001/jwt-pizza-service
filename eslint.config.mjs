import globals from "globals";
import pluginJs from "@eslint/js";
import pluginJest from 'eslint-plugin-jest';

export default [
  {
    files: ["**/*.js"], 
    languageOptions: {
      sourceType: "commonjs"
    },
    plugins: {
      jest: pluginJest
    }
  },
  {
    languageOptions: { 
      globals: {
        ...pluginJest.environments.globals.globals,
        ...globals.browser,
        ...globals.node
      }, 
    }
  },
  pluginJs.configs.recommended,

];