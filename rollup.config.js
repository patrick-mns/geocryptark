import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/geocryptark.ts',
  output: [
    {
      file: 'dist/geocryptark.min.js',
      format: 'iife',
      name: 'geocryptark',
      sourcemap: true,
      plugins: [terser()]
    }
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true
    }),
    nodeResolve(),
    commonjs()
  ]
};