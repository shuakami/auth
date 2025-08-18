module.exports = {
  presets: ['next/babel'],
  plugins: ['macros'],
  // 处理大文件的Babel警告
  compact: false,
  // 增加文件大小限制以避免deoptimisation警告
  ignore: [
    /node_modules\/react-icons\/.*\/index\.mjs$/
  ]
}; 