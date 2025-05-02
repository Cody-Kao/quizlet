import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
});

/*
if using SWC mode, it's not currently possible to leverage on the React-Compiler, which uses bable
{
  babel: {
    plugins: [
      ["babel-plugin-react-compiler"],
    ],
  },
}
*/
